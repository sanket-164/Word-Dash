use crate::wss::manager::ChannelManager;
use futures::{SinkExt, stream::StreamExt};
use std::{net::SocketAddr, sync::Arc};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::mpsc,
};
use tokio_tungstenite::{accept_async, tungstenite::Message};

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
                        .join_channel(room_name.to_string(), tx.clone())
                        .await;
                    current_channel = room_name.to_string();

                    println!("Room {} created and joined", room_name);
                }

                if text.starts_with("JOIN_ROOM:") {
                    let room_name = &text["JOIN_ROOM:".len()..];

                    channel_manager
                        .join_channel(room_name.to_string(), tx.clone())
                        .await;
                    current_channel = room_name.to_string();

                    println!("Joined room {}", room_name);
                }

                if text.starts_with("RANDOM_ROOM") {
                    current_channel = channel_manager.random_channel(tx.clone()).await;

                    println!("Joined a random room {}", current_channel);
                }

                if text.starts_with("LEAVE_ROOM:") {
                    let room_name = &text["LEAVE_ROOM:".len()..];

                    channel_manager
                        .leave_channel(room_name.to_string(), tx.clone())
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
                            "Broadcasted message to {}: {}",
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

    if !current_channel.is_empty() {
        channel_manager
            .broadcast(
                current_channel.clone(),
                tx.clone(),
                Message::Text("User disconnected".into()),
            )
            .await;

        channel_manager
            .leave_channel(current_channel.clone(), tx.clone())
            .await;

        println!(
            "User {} disconnected and removed from room {}",
            address, current_channel
        );
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
