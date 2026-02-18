mod util;
mod wss;

#[tokio::main]
async fn main() {
    wss::handler::start_websocket("127.0.0.1:8080")
        .await
        .unwrap();
}
