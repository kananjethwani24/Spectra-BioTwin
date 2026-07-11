use axum::{routing::get, Router, Json};
use serde_json::json;
use std::net::SocketAddr;

pub mod types;

#[tokio::main]
async fn main() {
    let app = Router::new().route("/health", get(health_check));
    
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> Json<serde_json::Value> {
    Json(json!({ "status": "ok" }))
}
