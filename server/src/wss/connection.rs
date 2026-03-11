use crate::util::types::Player;
use crate::wss::handler::handle_connection;
use crate::wss::manager::ChannelManager;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::Mutex;

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
