use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::tungstenite::Message;

pub type Sender = mpsc::UnboundedSender<Message>;

#[derive(Clone)]
pub struct SenderWrapper {
    pub sender: Sender,
    pub pub_key: String,
}

pub struct Opponent {
    pub channel_name: String,
    pub pub_key: Option<String>,
}

pub struct ChannelManager {
    channels: Arc<Mutex<HashMap<String, Vec<SenderWrapper>>>>,
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

    pub async fn available_channel(&self) -> Option<Opponent> {
        let channels = self.channels.lock().await;

        for key in channels.keys() {
            if key.starts_with("room_") && channels.get(key).unwrap().len() == 1 {
                let available_channel = key.clone();

                let opponent_sender = channels.get(&available_channel).unwrap().first().cloned();

                return Some(Opponent {
                    pub_key: opponent_sender.map(|s| s.pub_key),
                    channel_name: available_channel,
                });
            }
        }

        return None;
    }

    pub async fn join_channel(
        &self,
        channel_name: String,
        sender: Sender,
        pub_key: String,
    ) -> Opponent {
        let mut channels = self.channels.lock().await;
        channels
            .entry(channel_name.clone())
            .or_default()
            .push(SenderWrapper { sender, pub_key });

        if channels.get(&channel_name).unwrap().len() == 2 {
            let opponent_sender = channels.get_mut(&channel_name).unwrap().first().cloned();
            return Opponent {
                pub_key: opponent_sender.map(|s| s.pub_key),
                channel_name: channel_name,
            };
        }

        return Opponent {
            pub_key: None,
            channel_name: channel_name,
        };
    }

    pub async fn send_message(&self, channel_name: String, sender: Sender, message: Message) {
        let mut channels = self.channels.lock().await;

        if let Some(subscribers) = channels.get_mut(&channel_name) {
            for subscriber in subscribers.iter() {
                if subscriber.sender.same_channel(&sender) {
                    continue;
                }
                subscriber
                    .sender
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
                    .sender
                    .send(message.clone())
                    .expect("Failed to broadcast message");
            }
        }
    }

    pub async fn leave_channel(&self, channel_name: String, sender: Sender) {
        let mut channels = self.channels.lock().await;

        if let Some(subscribers) = channels.get_mut(&channel_name) {
            subscribers.retain(|s| !s.sender.same_channel(&sender));
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
