use crate::util::types::Player;
use crate::util::types::ServerMessage;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

pub fn send_json_message(tx: &mpsc::UnboundedSender<Message>, msg: &ServerMessage) {
    if let Ok(text) = serde_json::to_string(msg) {
        if let Err(e) = tx.send(Message::Text(text.into())) {
            eprintln!("Failed to send message: {}", e);
        }
    }
}

pub async fn insert_player(player_map: &Arc<Mutex<HashMap<String, Player>>>, player: Player) {
    player_map
        .lock()
        .await
        .insert(player.pub_key.clone(), player);
}
