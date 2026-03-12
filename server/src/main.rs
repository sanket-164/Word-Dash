mod util;
mod wss;

#[tokio::main]
async fn main() {
    wss::connection::start_websocket("0.0.0.0:8000")
        .await
        .unwrap();
}
