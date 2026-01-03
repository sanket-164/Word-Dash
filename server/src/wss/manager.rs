use std::collections::HashMap;
use std::sync::Arc;
use std::time::SystemTime;
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::tungstenite::Message;

pub type Sender = mpsc::UnboundedSender<Message>;

pub struct ChannelManager {
    channels: Arc<Mutex<HashMap<String, Vec<Sender>>>>,
}

impl ChannelManager {
    pub fn new() -> Self {
        ChannelManager {
            channels: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn create_channel(&self, channel_name: String) {
        let mut channels = self.channels.lock().await;
        channels.insert(channel_name.clone(), Vec::new());
    }

    pub async fn random_channel(&self, sender: Sender) -> String {
        let mut channels = self.channels.lock().await;

        for key in channels.keys() {
            if key.starts_with("room_") && channels.get(key).unwrap().len() < 2 {
                let available_channel = key.clone();
                channels.get_mut(&available_channel).unwrap().push(sender);

                return available_channel;
            }
        }

        let new_channel_name = format!(
            "room_{}",
            SystemTime::now()
                .duration_since(SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_secs()
        );
        channels.insert(new_channel_name.clone(), vec![sender]);

        return new_channel_name;
    }

    pub async fn join_channel(&self, channel_name: String, sender: Sender) {
        let mut channels = self.channels.lock().await;
        channels.entry(channel_name).or_default().push(sender);
    }

    pub async fn send_message(&self, channel_name: String, sender: Sender, message: Message) {
        let mut channels = self.channels.lock().await;

        if let Some(subscribers) = channels.get_mut(&channel_name) {
            for subscriber in subscribers.iter() {
                if subscriber.same_channel(&sender) {
                    continue;
                }
                subscriber
                    .send(message.clone())
                    .expect("Failed to broadcast message");
            }
        }
    }

    pub async fn broadcast_message(&self, channel_name: String, message: Message) {
        let mut channels = self.channels.lock().await;

        if let Some(subscribers) = channels.get_mut(&channel_name) {
            for subscriber in subscribers.iter() {
                subscriber
                    .send(message.clone())
                    .expect("Failed to broadcast message");
            }
        }
    }

    pub async fn leave_channel(&self, channel_name: String, sender: Sender) {
        let mut channels = self.channels.lock().await;

        if let Some(subscribers) = channels.get_mut(&channel_name) {
            subscribers.retain(|s| !s.same_channel(&sender));
        }

        if let Some(subscribers) = channels.get(&channel_name) {
            if subscribers.is_empty() {
                channels.remove(&channel_name);
            }
        }
    }

    pub async fn delete_channel(&self, channel_name: String) {
        let mut channels = self.channels.lock().await;
        channels.remove(&channel_name);
    }

    pub async fn channel_exists(&self, channel_name: String) -> bool {
        let channels = self.channels.lock().await;
        channels.contains_key(&channel_name)
    }

    pub async fn channel_subscribers_count(&self, channel_name: String) -> usize {
        let channels = self.channels.lock().await;
        if let Some(subscribers) = channels.get(&channel_name) {
            subscribers.len()
        } else {
            0
        }
    }
}
