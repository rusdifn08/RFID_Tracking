use std::sync::Arc;

use dashmap::DashMap;
use sqlx::PgPool;
use tokio::sync::{broadcast, RwLock};
use uuid::Uuid;

use crate::config::Config;
use crate::models::{Machine, MachineRuntime, WsEvent};

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct WifiScanAp {
    pub ssid: String,
    pub rssi: i32,
    pub secure: bool,
    pub channel: i32,
}

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct WifiScanResult {
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub list: Vec<WifiScanAp>,
}

/// Snapshot langsung dari Coordinator (`…/coordinator/mesh`).
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct ZigbeeMeshSnap {
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub wifi_ok: bool,
    pub mqtt_ok: bool,
    pub nodes_total: u32,
    pub nodes_online: u32,
    pub nodes: Vec<serde_json::Value>,
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub cfg: Config,
    pub runtime: Arc<DashMap<Uuid, MachineRuntime>>,
    /// Cache mesin by code / device_uid — hindari query Neon tiap paket MQTT.
    pub machine_cache: Arc<DashMap<String, Machine>>,
    /// Cache hasil scan WiFi per device_uid (untuk dashboard /devices).
    pub wifi_scans: Arc<DashMap<String, WifiScanResult>>,
    /// Cache mesh dari Coordinator MQTT (realtime).
    pub zigbee_mesh: Arc<RwLock<Option<ZigbeeMeshSnap>>>,
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
            wifi_scans: Arc::new(DashMap::new()),
            zigbee_mesh: Arc::new(RwLock::new(None)),
            ws_tx,
            mqtt_cmd_tx,
        }
    }
}
