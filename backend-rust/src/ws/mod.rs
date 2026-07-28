use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures_util::{SinkExt, StreamExt};

use crate::state::AppState;

pub async fn ws_handler(ws: WebSocketUpgrade, State(state): State<AppState>) -> impl IntoResponse {
    ws.on_upgrade(move |socket| client_ws(socket, state))
}

async fn client_ws(socket: WebSocket, state: AppState) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.ws_tx.subscribe();

    let send_task = tokio::spawn(async move {
        while let Ok(ev) = rx.recv().await {
            let Ok(text) = serde_json::to_string(&ev) else {
                continue;
            };
            if sender.send(Message::Text(text.into())).await.is_err() {
                break;
            }
        }
    });

    while let Some(Ok(msg)) = receiver.next().await {
        match msg {
            Message::Close(_) => break,
            Message::Ping(d) => {
                // axum handles pong via sink in other half; ignore if split
                let _ = d;
            }
            Message::Text(t) => {
                tracing::debug!("ws client msg: {t}");
            }
            _ => {}
        }
    }

    send_task.abort();
}
