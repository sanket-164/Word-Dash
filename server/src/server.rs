use futures::{SinkExt, stream::StreamExt};
use std::collections::HashMap;
use std::{net::SocketAddr, sync::Arc};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::{Mutex, mpsc},
};
use tokio_tungstenite::{accept_async, tungstenite::Message};

type Sender = mpsc::UnboundedSender<Message>;

struct ChannelManager {
    channels: Arc<Mutex<HashMap<String, Vec<Sender>>>>,
}

impl ChannelManager {
    fn new() -> Self {
        ChannelManager {
            channels: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    async fn create_channel(&self, channel_name: String) {
        let mut channels = self.channels.lock().await;
        channels.insert(channel_name.clone(), Vec::new());
    }

    async fn subscribe(&self, channel_name: String, sender: Sender) {
        let mut channels = self.channels.lock().await;
        channels.entry(channel_name).or_default().push(sender);
    }

    async fn broadcast(&self, channel_name: String, sender: Sender, message: Message) {
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

    async fn unsubscribe(&self, channel_name: String, sender: Sender) {
        let mut channels = self.channels.lock().await;

        if let Some(subscribers) = channels.get_mut(&channel_name) {
            subscribers.retain(|s| !s.same_channel(&sender));
        }
    }

    async fn delete_channel(&self, channel_name: String) {
        let mut channels = self.channels.lock().await;
        channels.remove(&channel_name);
    }
}

async fn handle_connection(
    stream: TcpStream,
    address: SocketAddr,
    channel_manager: Arc<ChannelManager>,
) {
    let ws_stream = accept_async(stream)
        .await
        .expect("Error during the websocket handshake");

    println!("New WebSocket connection: {}", address);

    let (mut write, mut read) = ws_stream.split();

    let (tx, mut rx) = mpsc::unbounded_channel();

    let channel_manager = channel_manager.clone();

    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            write.send(message).await.expect("Failed to send message");
        }
    });

    let mut current_channel = String::new();

    while let Some(message) = read.next().await {
        match message {
            Ok(Message::Text(text)) => {
                if text.starts_with("CREATE_ROOM:") {
                    let room_name = &text["CREATE_ROOM:".len()..];

                    channel_manager.create_channel(room_name.to_string()).await;
                    channel_manager
                        .subscribe(room_name.to_string(), tx.clone())
                        .await;
                    current_channel = room_name.to_string();

                    println!("Room {} created and joined", room_name);
                }

                if text.starts_with("JOIN_ROOM:") {
                    let room_name = &text["JOIN_ROOM:".len()..];

                    channel_manager
                        .subscribe(room_name.to_string(), tx.clone())
                        .await;
                    current_channel = room_name.to_string();

                    println!("Joined room {}", room_name);
                }

                if text.starts_with("LEAVE_ROOM:") {
                    let room_name = &text["LEAVE_ROOM:".len()..];

                    channel_manager
                        .unsubscribe(room_name.to_string(), tx.clone())
                        .await;
                    current_channel.clear();

                    println!("Left room {}", room_name);
                }

                if text.starts_with("DELETE_ROOM:") {
                    let room_name = &text["DELETE_ROOM:".len()..];

                    channel_manager.delete_channel(room_name.to_string()).await;
                    current_channel.clear();

                    println!("Deleted room {}", room_name);
                }

                if text.starts_with("MESSAGE:") {
                    let msg_content = &text["MESSAGE:".len()..];

                    if !current_channel.is_empty() {
                        channel_manager
                            .broadcast(
                                current_channel.clone(),
                                tx.clone(),
                                Message::Text(msg_content.into()),
                            )
                            .await;

                        println!(
                            "Broadcasted message to room {}: {}",
                            current_channel, msg_content
                        );
                    }
                }
            }
            Err(e) => {
                eprintln!("Error processing message: {}", e);
                break;
            }
            Ok(_) => {}
        }
    }
}

pub async fn start_websocket(addr: &str) -> Result<(), Box<dyn std::error::Error>> {
    let listener = TcpListener::bind(addr)
        .await
        .expect("Failed to bind to address");

    let channel_manager = Arc::new(ChannelManager::new());

    println!("Websocket Server running on {}", addr);

    while let Ok((stream, address)) = listener.accept().await {
        let channel_manager = channel_manager.clone();

        tokio::spawn(async move {
            handle_connection(stream, address, channel_manager).await;
        });
    }

    Ok(())
}
