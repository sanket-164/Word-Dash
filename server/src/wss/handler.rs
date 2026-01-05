use crate::wss::{manager::ChannelManager, rand_text::get_random_text};
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
                    if !current_channel.is_empty() {
                        tx.send(
                            Message::Text(format!(
                                "ERROR:You are already in a room: {}. Leave it before creating a room.",
                                current_channel
                            ).into()),
                        )
                        .expect("Failed to send message");
                        continue;
                    }

                    let room_name = &text["CREATE_ROOM:".len()..];

                    if channel_manager.channel_exists(room_name.to_string()).await {
                        tx.send(Message::Text(
                            format!(
                                "ERROR:Room {} already exists. Choose a different name.",
                                &text["CREATE_ROOM:".len()..]
                            )
                            .into(),
                        ))
                        .expect("Failed to send message");
                        continue;
                    }

                    channel_manager.create_channel(room_name.to_string()).await;
                    channel_manager
                        .join_channel(room_name.to_string(), tx.clone())
                        .await;
                    current_channel = room_name.to_string();

                    println!("Room {} created and joined", room_name);
                }

                if text.starts_with("JOIN_ROOM:") {
                    if !current_channel.is_empty() {
                        tx.send(
                            Message::Text(format!(
                                "ERROR:You are already in a room: {}. Leave it before joining a room.",
                                current_channel
                            ).into()),
                        )
                        .expect("Failed to send message");
                        continue;
                    }

                    let room_name = &text["JOIN_ROOM:".len()..];

                    if channel_manager
                        .channel_subscribers_count(room_name.to_string())
                        .await
                        == 2
                    {
                        tx.send(Message::Text(
                            format!("ERROR:Room {} is full. Join a different room.", room_name)
                                .into(),
                        ))
                        .expect("Failed to send message");
                        continue;
                    }

                    if !channel_manager.channel_exists(room_name.to_string()).await {
                        tx.send(Message::Text(
                            format!(
                                "ERROR:Room {} does not exist. Create it before joining.",
                                room_name
                            )
                            .into(),
                        ))
                        .expect("Failed to send message");
                        continue;
                    }

                    channel_manager
                        .join_channel(room_name.to_string(), tx.clone())
                        .await;
                    current_channel = room_name.to_string();

                    channel_manager
                        .broadcast_message(
                            current_channel.clone(),
                            Message::Text(format!("RANDOM_TEXT:{}", get_random_text()).into()),
                        )
                        .await;

                    println!("Joined room {}", room_name);
                }

                if text.starts_with("RANDOM_ROOM") {
                    if !current_channel.is_empty() {
                        tx.send(
                            Message::Text(format!(
                                "ERROR:You are already in a room: {}. Leave it before joining a random room.",
                                current_channel
                            ).into()),
                        )
                        .expect("Failed to send message");
                        continue;
                    }

                    current_channel = channel_manager.random_channel(tx.clone()).await;

                    if channel_manager
                        .channel_subscribers_count(current_channel.clone())
                        .await
                        < 2
                    {
                        continue;
                    }

                    channel_manager
                        .broadcast_message(
                            current_channel.clone(),
                            Message::Text(format!("ROOM:{}", current_channel.to_string()).into()),
                        )
                        .await;

                    channel_manager
                        .broadcast_message(
                            current_channel.clone(),
                            Message::Text(format!("RANDOM_TEXT:{}", get_random_text()).into()),
                        )
                        .await;

                    println!("Joined a random room {}", current_channel);
                }

                if text.starts_with("LEAVE_ROOM:") {
                    if current_channel.is_empty() {
                        tx.send(Message::Text(
                            "ERROR:You are not in any room to leave.".into(),
                        ))
                        .expect("Failed to send message");
                        continue;
                    }

                    let room_name = &text["LEAVE_ROOM:".len()..];

                    println!("Attempting to leave room {}", room_name);

                    if !channel_manager.channel_exists(room_name.to_string()).await {
                        tx.send(Message::Text(
                            format!("ERROR:Room {} does not exist.", room_name).into(),
                        ))
                        .expect("Failed to send message");
                        continue;
                    }

                    channel_manager
                        .leave_channel(room_name.to_string(), tx.clone())
                        .await;

                    if channel_manager
                        .channel_subscribers_count(room_name.to_string())
                        .await
                        == 0
                    {
                        channel_manager.delete_channel(room_name.to_string()).await;
                        println!("Room {} deleted as it became empty", room_name);
                    }

                    current_channel.clear();

                    println!("Left room {}", room_name);
                }

                if text.starts_with("PROGRESS:") {
                    if current_channel.is_empty() {
                        tx.send(Message::Text(
                            "ERROR:You are not in any room. Join a room to send messages.".into(),
                        ))
                        .expect("Failed to send message");
                        continue;
                    }

                    let msg_content = &text["PROGRESS:".len()..];

                    channel_manager
                        .send_message(
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

                if text.starts_with("BROADCAST:") {
                    if current_channel.is_empty() {
                        tx.send(Message::Text(
                            "ERROR:You are not in any room. Join a room to send messages.".into(),
                        ))
                        .expect("Failed to send message");
                        continue;
                    }

                    if !channel_manager
                        .channel_exists(current_channel.to_string())
                        .await
                    {
                        tx.send(Message::Text(
                            format!(
                                "ERROR:Room {} does not exist. Join a room to broadcast messages.",
                                current_channel
                            )
                            .into(),
                        ))
                        .expect("Failed to send message");
                        continue;
                    }

                    let msg_content = &text["BROADCAST:".len()..];

                    channel_manager
                        .broadcast_message(
                            current_channel.clone(),
                            Message::Text(msg_content.into()),
                        )
                        .await;

                    if msg_content.starts_with("WINNER:") {
                        channel_manager
                            .delete_channel(current_channel.clone())
                            .await;
                        current_channel.clear();
                    }

                    println!(
                        "Broadcasted message to {}: {}",
                        current_channel, msg_content
                    );
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
            .send_message(
                current_channel.clone(),
                tx.clone(),
                Message::Text("ERROR: User disconnected".into()),
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
