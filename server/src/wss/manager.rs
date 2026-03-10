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
    available_channels: Arc<Mutex<Vec<String>>>,
}

impl ChannelManager {
    pub fn new() -> Self {
        ChannelManager {
            channels: Arc::new(Mutex::new(HashMap::new())),
            available_channels: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub async fn create_channel(&self, channel_name: String) {
        let mut channels = self.channels.lock().await;
        channels.insert(channel_name.clone(), Vec::new());
    }

    pub async fn available_channel(&self) -> String {
        return self
            .available_channels
            .lock()
            .await
            .first()
            .cloned()
            .unwrap_or_else(|| String::new());
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
            self.available_channels
                .lock()
                .await
                .retain(|c| c != &channel_name);
            return Opponent {
                pub_key: opponent_sender.map(|s| s.pub_key),
                channel_name: channel_name,
            };
        }

        if channel_name.starts_with("room_") {
            self.available_channels
                .lock()
                .await
                .push(channel_name.clone());
        }

        return Opponent {
            pub_key: None,
            channel_name: channel_name,
        };
    }

    pub async fn send_message(&self, channel_name: &str, sender: Sender, message: Message) {
        let mut channels = self.channels.lock().await;

        if let Some(subscribers) = channels.get_mut(channel_name) {
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

    pub async fn broadcast_message(&self, channel_name: &str, message: Message) {
        let senders = {
            let channels = self.channels.lock().await;

            channels
                .get(channel_name)
                .map(|subs| subs.iter().map(|s| s.sender.clone()).collect::<Vec<_>>())
        };

        if let Some(senders) = senders {
            for sender in senders {
                if let Err(e) = sender.send(message.clone()) {
                    eprintln!("Send failed: {}", e);
                }
            }
        }
    }

    pub async fn leave_channel(&self, channel_name: &str, sender: Sender) {
        let mut channels = self.channels.lock().await;

        if let Some(subscribers) = channels.get_mut(channel_name) {
            subscribers.retain(|s| !s.sender.same_channel(&sender));
        }

        if let Some(subscribers) = channels.get(channel_name) {
            if subscribers.is_empty() {
                channels.remove(channel_name);
            }
        }
    }

    pub async fn delete_channel(&self, channel_name: &str) {
        let mut channels = self.channels.lock().await;
        channels.remove(channel_name);
    }

    pub async fn channel_exists(&self, channel_name: &str) -> bool {
        let channels = self.channels.lock().await;
        channels.contains_key(channel_name)
    }

    pub async fn channel_subscribers_count(&self, channel_name: &str) -> usize {
        let channels = self.channels.lock().await;
        if let Some(subscribers) = channels.get(channel_name) {
            subscribers.len()
        } else {
            0
        }
    }

    pub async fn get_player_pub_key(&self, channel_name: &str, sender: &Sender) -> Option<String> {
        let channels = self.channels.lock().await;

        channels
            .get(channel_name)?
            .iter()
            .find(|subscriber| subscriber.sender.same_channel(sender))
            .map(|subscriber| subscriber.pub_key.clone())
    }
}
