use crate::util::{
    error,
    rand_text::get_random_text,
    types::{ClientMessage, Player, ServerMessage},
};
use crate::wss::manager::ChannelManager;
use futures::{SinkExt, stream::StreamExt};
use std::collections::HashMap;
use std::time::SystemTime;
use std::{net::SocketAddr, sync::Arc};
use tokio::{
    net::{TcpListener, TcpStream},
    sync::{Mutex, mpsc},
};
use tokio_tungstenite::{accept_async, tungstenite::Message};

async fn handle_connection(
    stream: TcpStream,
    address: SocketAddr,
    channel_manager: Arc<ChannelManager>,
    player_map: Arc<Mutex<HashMap<String, Player>>>,
) {
    let ws_stream = accept_async(stream)
        .await
        .expect("Error during the websocket handshake");

    println!("New WebSocket connection: {}", address);

    let (mut write, mut read) = ws_stream.split();

    let (tx, mut rx) = mpsc::unbounded_channel();

    let channel_manager = channel_manager.clone();
    let player_map = player_map.clone();

    tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            write.send(message).await.expect("Failed to send message");
        }
    });

    let mut current_channel = String::new();

    while let Some(message) = read.next().await {
        match message {
            Ok(Message::Text(text)) => {
                let msg = serde_json::from_str(&text);

                if msg.is_err() {
                    let error_message = ServerMessage::Error {
                        content: msg.err().unwrap().to_string(),
                    };
                    tx.send(Message::Text(
                        serde_json::to_string(&error_message)
                            .expect("Failed to serialize error message")
                            .into(),
                    ))
                    .expect("Failed to send message");
                    continue;
                }

                let msg: ClientMessage = msg.unwrap();

                match msg {
                    ClientMessage::CreateRoom {
                        player_name,
                        room_name,
                        game_pda,
                        vault_pda,
                        pub_key,
                    } => {
                        if !current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::already_in_room(room_name),
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
                            let error_message = ServerMessage::Error {
                                content: error::room_already_exists(room_name),
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

                        let created_room_message = ServerMessage::CreatedRoom {
                            room_name: current_channel.clone(),
                            game_pda: game_pda.clone(),
                            vault_pda: vault_pda.clone(),
                        };

                        tx.send(Message::Text(
                            serde_json::to_string(&created_room_message)
                                .expect("Failed to serialize room name message")
                                .into(),
                        ))
                        .expect("Failed to send message");

                        channel_manager
                            .join_channel(room_name.to_string(), tx.clone(), pub_key.clone())
                            .await;

                        current_channel = room_name.to_string();

                        player_map.lock().await.insert(
                            pub_key.clone(),
                            Player {
                                player_name: player_name.clone(),
                                game_pda: game_pda.clone(),
                                vault_pda: vault_pda.clone(),
                                pub_key: pub_key.clone(),
                            },
                        );

                        let joined_room_message = ServerMessage::JoinedRoom {
                            room_name: current_channel.clone(),
                            game_pda: game_pda.clone(),
                            vault_pda: vault_pda.clone(),
                        };

                        tx.send(Message::Text(
                            serde_json::to_string(&joined_room_message)
                                .expect("Failed to serialize room name message")
                                .into(),
                        ))
                        .expect("Failed to send message");

                        println!("Room {} created & joined", room_name);
                    }

                    ClientMessage::GetRoom {} => {
                        if !current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::already_in_room(current_channel.clone()),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        let channel_opponent = channel_manager.available_channel().await;

                        let room_name_message;

                        match channel_opponent {
                            Some(opponent) => {
                                let opponent_pub_key = opponent.pub_key.clone().unwrap();

                                println!("Opponent pub_key: {}", opponent_pub_key.clone());

                                let opponent_player = {
                                    let map = player_map.lock().await;
                                    map.get(&opponent_pub_key)
                                        .cloned()
                                        .expect("Opponent player not found")
                                };

                                room_name_message = ServerMessage::AvailableRoom {
                                    room_name: opponent.channel_name.clone(),
                                    game_pda: opponent_player.game_pda.clone(),
                                    vault_pda: opponent_player.vault_pda.clone(),
                                };
                            }
                            _ => {
                                let new_channel_name = format!(
                                    "room_{}",
                                    SystemTime::now()
                                        .duration_since(SystemTime::UNIX_EPOCH)
                                        .unwrap()
                                        .as_secs()
                                );

                                room_name_message = ServerMessage::NewRoom {
                                    room_name: new_channel_name,
                                };
                            }
                        }

                        tx.send(Message::Text(
                            serde_json::to_string(&room_name_message)
                                .expect("Failed to serialize room name message")
                                .into(),
                        ))
                        .expect("Failed to send message");

                        println!("Joined from GET_ROOM {}", current_channel);
                    }

                    ClientMessage::JoinRoom {
                        player_name,
                        room_name,
                        game_pda,
                        vault_pda,
                        pub_key,
                    } => {
                        if !current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::already_in_room(current_channel.clone()),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        if channel_manager
                            .channel_subscribers_count(room_name.to_string())
                            .await
                            == 2
                        {
                            let error_message = ServerMessage::Error {
                                content: error::room_is_full(room_name),
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
                            let error_message = ServerMessage::Error {
                                content: error::room_not_found(room_name),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        let channel_opponent = channel_manager
                            .join_channel(room_name.to_string(), tx.clone(), pub_key.clone())
                            .await;

                        current_channel = channel_opponent.channel_name;

                        let joined_room_message;

                        if channel_opponent.pub_key.is_some() {
                            let opponent_pub_key = channel_opponent.pub_key.clone().unwrap();

                            println!("Opponent pub_key: {}", opponent_pub_key.clone());

                            let opponent_player = {
                                let map = player_map.lock().await;
                                map.get(&opponent_pub_key)
                                    .cloned()
                                    .expect("Opponent player not found")
                            };

                            joined_room_message = ServerMessage::JoinedRoom {
                                room_name: current_channel.clone(),
                                game_pda: opponent_player.game_pda.clone(),
                                vault_pda: opponent_player.vault_pda.clone(),
                            };

                            player_map.lock().await.insert(
                                pub_key.clone(),
                                Player {
                                    player_name: player_name.clone(),
                                    game_pda: game_pda.clone(),
                                    vault_pda: vault_pda.clone(),
                                    pub_key: pub_key.clone(),
                                },
                            );
                        } else {
                            joined_room_message = ServerMessage::NewRoom {
                                room_name: current_channel.clone(),
                            };

                            player_map.lock().await.insert(
                                pub_key.clone(),
                                Player {
                                    player_name: player_name.clone(),
                                    game_pda: game_pda.clone(),
                                    vault_pda: vault_pda.clone(),
                                    pub_key: pub_key.clone(),
                                },
                            );
                        }

                        channel_manager
                            .broadcast_message(
                                current_channel.clone(),
                                Message::Text(
                                    serde_json::to_string(&joined_room_message)
                                        .expect("Failed to serialize room name message")
                                        .into(),
                                ),
                            )
                            .await;

                        let opponent_joined_message = ServerMessage::OpponentJoined {
                            player_name: player_name.clone(),
                        };

                        channel_manager
                            .send_message(
                                current_channel.clone(),
                                tx.clone(),
                                Message::Text(
                                    serde_json::to_string(&opponent_joined_message)
                                        .expect("Failed to serialize room name message")
                                        .into(),
                                ),
                            )
                            .await;

                        println!("Joined room {}", room_name);
                    }

                    ClientMessage::StartDash {} => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::not_in_room(),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        let text_message = ServerMessage::Text {
                            content: String::from(get_random_text()),
                        };

                        channel_manager
                            .broadcast_message(
                                current_channel.clone(),
                                Message::Text(
                                    serde_json::to_string(&text_message)
                                        .expect("Failed to serialize text message")
                                        .into(),
                                ),
                            )
                            .await;
                    }

                    ClientMessage::LeaveRoom { room_name } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::not_in_room(),
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
                            let error_message = ServerMessage::Error {
                                content: error::room_not_found(room_name),
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

                    ClientMessage::SendProgress {
                        player_name,
                        progress,
                    } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::not_in_room(),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        let progress_message = ServerMessage::OpponentProgress {
                            player_name,
                            progress,
                        };

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

                        println!("Broadcasted progress to {}: {}", current_channel, progress);
                    }

                    ClientMessage::GameWinner {
                        player_name,
                        game_pda,
                        vault_pda,
                        pub_key,
                    } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::not_in_room(),
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
                            let error_message = ServerMessage::Error {
                                content: error::room_not_found(current_channel.clone()),
                            };

                            tx.send(Message::Text(
                                serde_json::to_string(&error_message)
                                    .expect("Failed to serialize error message")
                                    .into(),
                            ))
                            .expect("Failed to send message");
                            continue;
                        }

                        let winner_message = ServerMessage::GameWinner {
                            player_name: player_name.clone(),
                            game_pda: game_pda.clone(),
                            vault_pda: vault_pda.clone(),
                            pub_key: pub_key.clone(),
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

                    ClientMessage::Broadcast { content } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::not_in_room(),
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
                            let error_message = ServerMessage::Error {
                                content: error::room_not_found(current_channel.clone()),
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
        let error_message = ServerMessage::OpponentLeft {};

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

    let player_map: Arc<Mutex<HashMap<String, Player>>> = Arc::new(Mutex::new(HashMap::new()));

    println!("Websocket Server running on {}", addr);

    while let Ok((stream, address)) = listener.accept().await {
        let channel_manager = channel_manager.clone();
        let player_map = player_map.clone();

        tokio::spawn(async move {
            handle_connection(stream, address, channel_manager, player_map).await;
        });
    }

    Ok(())
}
