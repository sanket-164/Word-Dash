use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::{Mutex, mpsc};
use tokio_tungstenite::tungstenite::Message;

pub type Sender = mpsc::UnboundedSender<Message>;

#[derive(Clone)]
pub struct SenderWrapper {
    pub sender: Sender,
    pub pub_key: String,
}

pub struct Room {
    pub player1: Option<SenderWrapper>,
    pub player2: Option<SenderWrapper>,
}

pub struct Opponent {
    pub channel_name: String,
    pub pub_key: Option<String>,
}

pub struct ChannelManager {
    channels: Arc<Mutex<HashMap<String, Room>>>,
    available_channels: Arc<Mutex<HashSet<String>>>,
}

impl ChannelManager {
    pub fn new() -> Self {
        ChannelManager {
            channels: Arc::new(Mutex::new(HashMap::new())),
            available_channels: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    pub async fn create_channel(&self, channel_name: &str) {
        self.channels.lock().await.insert(
            channel_name.to_string(),
            Room {
                player1: None,
                player2: None,
            },
        );
    }

    pub async fn available_channel(&self) -> Option<String> {
        self.available_channels.lock().await.iter().next().cloned()
    }

    pub async fn add_available_channel(&self, channel_name: &str) {
        self.available_channels
            .lock()
            .await
            .insert(channel_name.to_string());
    }

    pub async fn remove_available_channel(&self, channel_name: &str) {
        self.available_channels.lock().await.remove(channel_name);
    }

    pub async fn join_channel(
        &self,
        channel_name: &str,
        sender: Sender,
        pub_key: String,
    ) -> Opponent {
        let mut channels = self.channels.lock().await;

        let channel_name = channel_name.to_string();

        channels.entry(channel_name.clone()).and_modify(|players| {
            if players.player1.is_none() {
                players.player1 = Some(SenderWrapper { sender, pub_key });
            } else if players.player2.is_none() {
                players.player2 = Some(SenderWrapper { sender, pub_key });
            }
        });

        let opponent_pub_key = channels.get(&channel_name).and_then(|room| {
            if room.player1.is_some() && room.player2.is_some() {
                room.player1.as_ref().map(|p| p.pub_key.clone())
            } else {
                None
            }
        });

        if opponent_pub_key.is_some() {
            return Opponent {
                pub_key: opponent_pub_key,
                channel_name: channel_name,
            };
        }

        Opponent {
            pub_key: None,
            channel_name: channel_name,
        }
    }

    pub async fn send_message(&self, channel_name: &str, sender: Sender, message: Message) {
        let senders = {
            let channels = self.channels.lock().await;

            channels.get(channel_name).map(|room| {
                [
                    room.player1.as_ref().map(|s| s.sender.clone()),
                    room.player2.as_ref().map(|s| s.sender.clone()),
                ]
            })
        };

        if let Some(senders) = senders {
            for s in senders.into_iter().flatten() {
                if !s.same_channel(&sender) {
                    if let Err(e) = s.send(message.clone()) {
                        eprintln!("Error while sending message: {}", e);
                    }
                }
            }
        }
    }

    pub async fn broadcast_message(&self, channel_name: &str, message: Message) {
        let senders = {
            let channels = self.channels.lock().await;

            channels.get(channel_name).map(|room| {
                [
                    room.player1.as_ref().map(|s| s.sender.clone()),
                    room.player2.as_ref().map(|s| s.sender.clone()),
                ]
            })
        };

        if let Some(senders) = senders {
            for sender in senders.into_iter().flatten() {
                if let Err(e) = sender.send(message.clone()) {
                    eprintln!("Error while broadcasting message: {}", e);
                }
            }
        }
    }

    pub async fn leave_channel(&self, channel_name: &str, sender: Sender) {
        let mut channels = self.channels.lock().await;

        let mut should_remove = false;
        let mut add_available_channel = false;

        if let Some(room) = channels.get_mut(channel_name) {
            if room
                .player1
                .as_ref()
                .map_or(false, |s| s.sender.same_channel(&sender))
            {
                room.player1 = None;
            } else if room
                .player2
                .as_ref()
                .map_or(false, |s| s.sender.same_channel(&sender))
            {
                room.player2 = None;
            }

            if room.player1.is_none() && room.player2.is_none() {
                should_remove = true;
            }

            if room.player1.is_some() && room.player2.is_none() {
                add_available_channel = true;
            }
        }

        if should_remove {
            channels.remove(channel_name);
            // Remove available channel if player 1 leaves before game starts
            self.available_channels.lock().await.remove(channel_name);
        }

        if add_available_channel {
            self.available_channels
                .lock()
                .await
                .insert(channel_name.to_string());
        }
    }

    pub async fn delete_channel(&self, channel_name: &str) {
        self.channels.lock().await.remove(channel_name);
    }

    pub async fn channel_exists(&self, channel_name: &str) -> bool {
        self.channels.lock().await.contains_key(channel_name)
    }

    pub async fn channel_full(&self, channel_name: &str) -> bool {
        let channels = self.channels.lock().await;

        channels.get(channel_name).map_or(false, |room| {
            room.player1.is_some() && room.player2.is_some()
        })
    }

    pub async fn channel_empty(&self, channel_name: &str) -> bool {
        let channels = self.channels.lock().await;

        channels.get(channel_name).map_or(false, |room| {
            room.player1.is_none() && room.player2.is_none()
        })
    }

    pub async fn get_player_pub_key(&self, channel_name: &str, sender: &Sender) -> Option<String> {
        let channels = self.channels.lock().await;

        channels.get(channel_name).and_then(|room| {
            if room
                .player1
                .as_ref()
                .map_or(false, |s| s.sender.same_channel(sender))
            {
                room.player1.as_ref().map(|s| s.pub_key.clone())
            } else if room
                .player2
                .as_ref()
                .map_or(false, |s| s.sender.same_channel(sender))
            {
                room.player2.as_ref().map(|s| s.pub_key.clone())
            } else {
                None
            }
        })
    }
}
