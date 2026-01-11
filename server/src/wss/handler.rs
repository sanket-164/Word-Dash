use crate::wss::{manager::ChannelManager, rand_text::get_random_text};
use futures::{SinkExt, stream::StreamExt};
use serde::Deserialize;
use std::{net::SocketAddr, sync::Arc};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::mpsc,
};
use tokio_tungstenite::{accept_async, tungstenite::Message};

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
enum ClientMessage {
    CREATE { room_name: String },
    JOIN { room_name: String },
    LEAVE { room_name: String },
    PROGRESS { content: i32 },
    WINNER { content: String },
    BROADCAST { content: String },
}

#[derive(Debug, serde::Serialize)]
#[serde(tag = "type")]
enum ServerMessage {
    ERROR { content: String },
    ROOM { room_name: String },
    TEXT { content: String },
    WINNER { content: String },
    PROGRESS { content: i32 },
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
                let msg: ClientMessage =
                    serde_json::from_str(&text).expect("Failed to parse message");

                match msg {
                    ClientMessage::CREATE { room_name } => {
                        if !current_channel.is_empty() {
                            let error_message = ServerMessage::ERROR {
                                content: format!(
                                    "You are already in a room: {}. Leave it before creating a room.",
                                    current_channel
                                ),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        if channel_manager.channel_exists(room_name.to_string()).await {
                            let error_message = ServerMessage::ERROR {
                                content: format!(
                                    "Room {} already exists. Choose a different name.",
                                    &room_name
                                ),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
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

                    ClientMessage::JOIN { room_name } => {
                        if !current_channel.is_empty() {
                            let error_message = ServerMessage::ERROR {
                                content: format!(
                                    "You are already in a room: {}. Leave it before creating a room.",
                                    current_channel
                                ),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        if room_name != "RANDOM_ROOM" {
                            if channel_manager
                                .channel_subscribers_count(room_name.to_string())
                                .await
                                == 2
                            {
                                let error_message = ServerMessage::ERROR {
                                    content: format!(
                                        "Room {} is full. Join a different room.",
                                        &room_name
                                    ),
                                };

                                tx.send(Message::Text(
                                    serde_json::to_string(&error_message)
                                        .expect("Failed to serialize error message")
                                        .into(),
                                ))
                                .expect("Failed to send message");
                                continue;
                            }

                            if !channel_manager.channel_exists(room_name.to_string()).await {
                                let error_message = ServerMessage::ERROR {
                                    content: format!(
                                        "Room {} does not exist. Create it before joining.",
                                        &room_name
                                    ),
                                };

                                tx.send(Message::Text(
                                    serde_json::to_string(&error_message)
                                        .expect("Failed to serialize error message")
                                        .into(),
                                ))
                                .expect("Failed to send message");
                                continue;
                            }

                            channel_manager
                                .join_channel(room_name.to_string(), tx.clone())
                                .await;
                            current_channel = room_name.to_string();
                        } else {
                            current_channel = channel_manager.random_channel(tx.clone()).await;

                            if channel_manager
                                .channel_subscribers_count(current_channel.clone())
                                .await
                                < 2
                            {
                                continue;
                            }

                            let room_name_message = ServerMessage::ROOM {
                                room_name: current_channel.clone(),
                            };

                            channel_manager
                                .broadcast_message(
                                    current_channel.clone(),
                                    Message::Text(
                                        serde_json::to_string(&room_name_message)
                                            .expect("Failed to serialize room name message")
                                            .into(),
                                    ),
                                )
                                .await;
                        }

                        let random_text_message = ServerMessage::TEXT {
                            content: String::from(get_random_text()),
                        };

                        channel_manager
                            .broadcast_message(
                                current_channel.clone(),
                                Message::Text(
                                    serde_json::to_string(&random_text_message)
                                        .expect("Failed to serialize random text message")
                                        .into(),
                                ),
                            )
                            .await;

                        println!("Joined room {}", room_name);
                    }

                    ClientMessage::LEAVE { room_name } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::ERROR {
                                content: String::from("You are not in any room to leave."),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        println!("Attempting to leave room {}", room_name);

                        if !channel_manager.channel_exists(room_name.to_string()).await {
                            let error_message = ServerMessage::ERROR {
                                content: format!("Room {} does not exist.", room_name),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
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

                    ClientMessage::PROGRESS { content } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::ERROR {
                                content: String::from(
                                    "You are not in any room. Join a room to send progress.",
                                ),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        let progress_message = ServerMessage::PROGRESS { content };

                        channel_manager
                            .send_message(
                                current_channel.clone(),
                                tx.clone(),
                                Message::Text(
                                    serde_json::to_string(&progress_message)
                                        .expect("Failed to serialize progress message")
                                        .into(),
                                ),
                            )
                            .await;

                        println!("Broadcasted message to {}: {}", current_channel, content);
                    }

                    ClientMessage::WINNER { content } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::ERROR {
                                content: String::from(
                                    "You are not in any room. Join a room to send messages.",
                                ),
                            };
                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        if !channel_manager
                            .channel_exists(current_channel.to_string())
                            .await
                        {
                            let error_message = ServerMessage::ERROR {
                                content: format!(
                                    "Room {} does not exist. Join a room to broadcast messages.",
                                    current_channel
                                ),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        let winner_message = ServerMessage::WINNER {
                            content: content.clone(),
                        };

                        channel_manager
                            .broadcast_message(
                                current_channel.clone(),
                                Message::Text(
                                    serde_json::to_string(&winner_message)
                                        .expect("Failed to serialize winner message")
                                        .into(),
                                ),
                            )
                            .await;

                        channel_manager
                            .delete_channel(current_channel.clone())
                            .await;
                        current_channel.clear();
                    }

                    ClientMessage::BROADCAST { content } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::ERROR {
                                content: String::from(
                                    "You are not in any room. Join a room to send messages.",
                                ),
                            };
                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        if !channel_manager
                            .channel_exists(current_channel.to_string())
                            .await
                        {
                            let error_message = ServerMessage::ERROR {
                                content: format!(
                                    "Room {} does not exist. Join a room to broadcast messages.",
                                    current_channel
                                ),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        channel_manager
                            .broadcast_message(
                                current_channel.clone(),
                                Message::Text(content.clone().into()),
                            )
                            .await;
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
        let error_message = ServerMessage::ERROR {
            content: String::from("Opponent disconnected"),
        };

        channel_manager
            .send_message(
                current_channel.clone(),
                tx.clone(),
                Message::Text(
                    serde_json::to_string(&error_message)
                        .expect("Failed to serialize error message")
                        .into(),
                ),
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
