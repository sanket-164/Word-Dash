mod server;

#[tokio::main]
async fn main() {
    server::start_websocket("127.0.0.1:8080").await.unwrap();
}
