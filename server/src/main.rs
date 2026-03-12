mod util;
mod wss;

#[tokio::main]
async fn main() {
    wss::connection::start_websocket("127.0.0.1:8000")
        .await
        .unwrap();
}
