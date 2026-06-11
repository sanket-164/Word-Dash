use crate::util::{
    error,
    helper::{insert_player, send_json_message},
    rand_text::get_random_text,
    types::{ClientMessage, Player, ServerMessage},
};
use crate::wss::manager::ChannelManager;
use futures::{SinkExt, stream::StreamExt};
use std::collections::HashMap;
use std::time::SystemTime;
use std::{net::SocketAddr, sync::Arc};
use tokio::{
    net::TcpStream,
    sync::{Mutex, mpsc},
};
use tokio_tungstenite::{accept_async, tungstenite::Message};

pub async fn handle_connection(
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
            if let Err(e) = write.send(message).await {
                eprintln!("Websocket send error: {}", e);
                break;
            }
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
                    send_json_message(&tx, &error_message);
                    continue;
                }

                let msg: ClientMessage = msg.unwrap();

                match msg {
                    ClientMessage::CreateRoom { room_name, pub_key } => {
                        if !current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::ALREADY_IN_ROOM.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        if channel_manager.channel_exists(room_name.as_str()).await {
                            let error_message = ServerMessage::Error {
                                content: error::ROOM_ALREADY_EXISTS.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        channel_manager.create_channel(room_name.as_str()).await;

                        let created_room_message = ServerMessage::CreatedRoom {
                            room_name: room_name.clone(),
                        };

                        send_json_message(&tx, &created_room_message);

                        channel_manager
                            .join_channel(room_name.as_str(), tx.clone(), pub_key.clone())
                            .await;

                        current_channel = room_name.to_string();

                        println!("CREATED & JOINED: {} ", room_name);
                    }

                    ClientMessage::FundCreateRoom {
                        player_name,
                        room_name,
                        game_pda,
                        vault_pda,
                        pub_key,
                    } => {
                        if current_channel != room_name
                            && !channel_manager.channel_exists(room_name.as_str()).await
                        {
                            let error_message = ServerMessage::Error {
                                content: error::ROOM_NOT_FOUND.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        if room_name.starts_with("room_") {
                            channel_manager
                                .add_available_channel(room_name.as_str())
                                .await;
                        }

                        insert_player(
                            &player_map,
                            Player {
                                player_name: player_name.clone(),
                                game_pda: game_pda.clone(),
                                vault_pda: vault_pda.clone(),
                                pub_key: pub_key.clone(),
                            },
                        )
                        .await;

                        let room_funded_message = ServerMessage::CreateRoomFunded {
                            room_name: room_name.clone(),
                            game_pda: game_pda.clone(),
                            vault_pda: vault_pda.clone(),
                        };

                        send_json_message(&tx, &room_funded_message);

                        println!("CREATED ROOM FUNDED: {} ", room_name);
                    }

                    ClientMessage::GetRoom {} => {
                        if !current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::ALREADY_IN_ROOM.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        let available_channel = channel_manager.available_channel().await;

                        match available_channel {
                            Some(channel_to_join) => {
                                println!("OPPONENT found: {}", channel_to_join);

                                let opponent = channel_manager
                                    .join_channel(
                                        channel_to_join.as_str(),
                                        tx.clone(),
                                        String::new(),
                                    )
                                    .await;

                                let opponent_pub_key = opponent.pub_key.clone().unwrap();

                                println!("OPPONENT pub_key: {}", opponent_pub_key.clone());

                                let opponent_player = {
                                    let map = player_map.lock().await;
                                    map.get(&opponent_pub_key)
                                        .cloned()
                                        .expect("Opponent player not found")
                                };

                                let joined_room_message = ServerMessage::JoinedRoom {
                                    opponent_name: opponent_player.player_name.clone(),
                                    opponent_pubkey: opponent_pub_key.clone(),
                                    room_name: channel_to_join.clone(),
                                    game_pda: opponent_player.game_pda.clone(),
                                    vault_pda: opponent_player.vault_pda.clone(),
                                };

                                send_json_message(&tx, &joined_room_message);

                                current_channel = channel_to_join;

                                println!("JOINED from GET_ROOM: {}", current_channel);
                            }
                            None => {
                                let new_channel_name = format!(
                                    "room_{}",
                                    SystemTime::now()
                                        .duration_since(SystemTime::UNIX_EPOCH)
                                        .unwrap()
                                        .as_secs()
                                );

                                let new_room_message = ServerMessage::NewRoom {
                                    room_name: new_channel_name,
                                };

                                send_json_message(&tx, &new_room_message);
                            }
                        }
                    }

                    ClientMessage::JoinRoom { room_name, pub_key } => {
                        if !current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::ALREADY_IN_ROOM.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        if !channel_manager.channel_exists(room_name.as_str()).await {
                            let error_message = ServerMessage::Error {
                                content: error::ROOM_NOT_FOUND.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        if channel_manager.channel_full(room_name.as_str()).await {
                            let error_message = ServerMessage::Error {
                                content: error::ROOM_IS_FULL.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        let channel_opponent = channel_manager
                            .join_channel(room_name.as_str(), tx.clone(), pub_key.clone())
                            .await;

                        current_channel = channel_opponent.channel_name;

                        if channel_opponent.pub_key.is_some() {
                            let opponent_pub_key = channel_opponent.pub_key.clone().unwrap();

                            println!("OPPONENT pub_key: {}", opponent_pub_key.clone());

                            let opponent_player = {
                                let map = player_map.lock().await;
                                map.get(&opponent_pub_key)
                                    .cloned()
                                    .expect("Opponent player not found")
                            };

                            let joined_room_message = ServerMessage::JoinedRoom {
                                opponent_name: opponent_player.player_name.clone(),
                                opponent_pubkey: opponent_pub_key.clone(),
                                room_name: current_channel.clone(),
                                game_pda: opponent_player.game_pda.clone(),
                                vault_pda: opponent_player.vault_pda.clone(),
                            };

                            send_json_message(&tx, &joined_room_message);
                        }

                        println!("JOINED: {}", room_name);
                    }

                    ClientMessage::FundJoinRoom {
                        player_name,
                        room_name,
                        game_pda,
                        vault_pda,
                        pub_key,
                    } => {
                        if current_channel != room_name
                            && !channel_manager.channel_exists(room_name.as_str()).await
                        {
                            let error_message = ServerMessage::Error {
                                content: error::ROOM_NOT_FOUND.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        if room_name.starts_with("room_") {
                            channel_manager
                                .remove_available_channel(room_name.as_str())
                                .await;
                        }

                        let room_funded_message = ServerMessage::JoinRoomFunded {
                            room_name: room_name.clone(),
                            game_pda: game_pda.clone(),
                            vault_pda: vault_pda.clone(),
                        };

                        send_json_message(&tx, &room_funded_message);

                        insert_player(
                            &player_map,
                            Player {
                                player_name: player_name.clone(),
                                game_pda: game_pda.clone(),
                                vault_pda: vault_pda.clone(),
                                pub_key: pub_key.clone(),
                            },
                        )
                        .await;

                        let opponent_joined_message = ServerMessage::OpponentJoined {
                            player_name: player_name.clone(),
                        };

                        channel_manager
                            .send_message(
                                current_channel.as_str(),
                                tx.clone(),
                                Message::Text(
                                    serde_json::to_string(&opponent_joined_message)
                                        .expect("Failed to serialize room name message")
                                        .into(),
                                ),
                            )
                            .await;

                        println!("OPPONENT JOINED: {}", room_name);

                        println!("JOINED ROOM FUNDED: {} ", room_name);
                    }

                    ClientMessage::StartDash {} => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::NOT_IN_ROOM.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        let text_message = ServerMessage::Text {
                            content: String::from(get_random_text()),
                        };

                        channel_manager
                            .broadcast_message(
                                current_channel.as_str(),
                                Message::Text(
                                    serde_json::to_string(&text_message)
                                        .expect("Failed to serialize text message")
                                        .into(),
                                ),
                            )
                            .await;

                        println!("DASH STARTS: {}", current_channel)
                    }

                    ClientMessage::LeaveRoom { room_name } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::NOT_IN_ROOM.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        if !channel_manager.channel_exists(room_name.as_str()).await {
                            let error_message = ServerMessage::Error {
                                content: error::ROOM_NOT_FOUND.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        let player_pub_key = channel_manager
                            .get_player_pub_key(current_channel.as_str(), &tx)
                            .await;

                        match player_pub_key {
                            Some(pub_key) => {
                                player_map.lock().await.remove(&pub_key);
                            }
                            None => {
                                eprintln!(
                                    "Could not find player pub key for channel {}",
                                    current_channel
                                );
                            }
                        }

                        channel_manager
                            .leave_channel(room_name.as_str(), tx.clone())
                            .await;

                        if channel_manager.channel_empty(room_name.as_str()).await {
                            channel_manager.delete_channel(room_name.as_str()).await;
                            println!("\"{}\" deleted as it became empty", room_name);
                        }

                        current_channel.clear();

                        println!("LEFT: {}", room_name);
                    }

                    ClientMessage::SendProgress {
                        player_name,
                        progress,
                    } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::NOT_IN_ROOM.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        let progress_message = ServerMessage::OpponentProgress {
                            player_name: player_name.clone(),
                            progress,
                        };

                        channel_manager
                            .send_message(
                                current_channel.as_str(),
                                tx.clone(),
                                Message::Text(
                                    serde_json::to_string(&progress_message)
                                        .expect("Failed to serialize progress message")
                                        .into(),
                                ),
                            )
                            .await;

                        println!("PROGRESS: {}-{}", player_name, progress);
                    }

                    ClientMessage::GameWinner {
                        player_name,
                        game_pda,
                        vault_pda,
                        pub_key,
                    } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::NOT_IN_ROOM.to_string(),
                            };
                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        if !channel_manager
                            .channel_exists(current_channel.as_str())
                            .await
                        {
                            let error_message = ServerMessage::Error {
                                content: error::ROOM_NOT_FOUND.to_string(),
                            };

                            send_json_message(&tx, &error_message);
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
                                current_channel.as_str(),
                                Message::Text(
                                    serde_json::to_string(&winner_message)
                                        .expect("Failed to serialize winner message")
                                        .into(),
                                ),
                            )
                            .await;

                        println!(
                            "WINNER: \"{}\" in room \"{}\"",
                            player_name, current_channel
                        );
                    }

                    ClientMessage::Broadcast { content } => {
                        if current_channel.is_empty() {
                            let error_message = ServerMessage::Error {
                                content: error::NOT_IN_ROOM.to_string(),
                            };
                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        if !channel_manager
                            .channel_exists(current_channel.as_str())
                            .await
                        {
                            let error_message = ServerMessage::Error {
                                content: error::ROOM_NOT_FOUND.to_string(),
                            };

                            send_json_message(&tx, &error_message);
                            continue;
                        }

                        channel_manager
                            .broadcast_message(
                                current_channel.as_str(),
                                Message::Text(content.clone().into()),
                            )
                            .await;

                        println!("BROADCAST: \"{}\" - {}", current_channel, content);
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
                current_channel.as_str(),
                tx.clone(),
                Message::Text(
                    serde_json::to_string(&error_message)
                        .expect("Failed to serialize error message")
                        .into(),
                ),
            )
            .await;

        let player_pub_key = channel_manager
            .get_player_pub_key(current_channel.as_str(), &tx)
            .await;

        match player_pub_key {
            Some(pub_key) => {
                player_map.lock().await.remove(&pub_key);
            }
            None => {
                eprintln!(
                    "Could not find player pub key for channel {}",
                    current_channel
                );
            }
        }

        channel_manager
            .leave_channel(current_channel.as_str(), tx.clone())
            .await;

        println!(
            "DISCONNECTED: User {} disconnected and removed from room {}",
            address, current_channel
        );
    }
}
