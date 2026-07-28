use std::sync::Arc;

use dashmap::DashMap;
use sqlx::PgPool;
use tokio::sync::broadcast;
use uuid::Uuid;

use crate::config::Config;
use crate::models::{Machine, MachineRuntime, WsEvent};

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub cfg: Config,
    pub runtime: Arc<DashMap<Uuid, MachineRuntime>>,
    /// Cache mesin by code / device_uid — hindari query Neon tiap paket MQTT.
    pub machine_cache: Arc<DashMap<String, Machine>>,
    pub ws_tx: broadcast::Sender<WsEvent>,
    pub mqtt_cmd_tx: broadcast::Sender<MqttOut>,
}

#[derive(Clone, Debug)]
pub struct MqttOut {
    pub topic: String,
    pub payload: String,
}

impl AppState {
    pub fn new(pool: PgPool, cfg: Config) -> Self {
        let (ws_tx, _) = broadcast::channel(512);
        let (mqtt_cmd_tx, _) = broadcast::channel(64);
        Self {
            pool,
            cfg,
            runtime: Arc::new(DashMap::new()),
            machine_cache: Arc::new(DashMap::new()),
            ws_tx,
            mqtt_cmd_tx,
        }
    }
}
