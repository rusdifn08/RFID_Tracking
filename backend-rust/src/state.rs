use std::collections::VecDeque;
use std::sync::atomic::{AtomicU64, Ordering};
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
static LOGIN_EVENT_SEQ: AtomicU64 = AtomicU64::new(1);

#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct LoginSystemEvent {
    pub id: u64,
    pub device_uid: String,
    pub machine_code: String,
    pub login_required: bool,
    pub status: String,
    pub message: String,
    pub at: chrono::DateTime<chrono::Utc>,
}

impl LoginSystemEvent {
    pub fn new(
        device_uid: String,
        machine_code: String,
        login_required: bool,
        status: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            id: LOGIN_EVENT_SEQ.fetch_add(1, Ordering::Relaxed),
            device_uid,
            machine_code,
            login_required,
            status: status.into(),
            message: message.into(),
            at: chrono::Utc::now(),
        }
    }
}

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
    /// Popup System Login di /devices (ACK dari ESP).
    pub login_events: Arc<RwLock<VecDeque<LoginSystemEvent>>>,
    pub ws_tx: broadcast::Sender<WsEvent>,
    pub mqtt_cmd_tx: broadcast::Sender<MqttOut>,
}

#[derive(Clone, Debug)]
pub struct MqttOut {
    pub topic: String,
    pub payload: String,
    pub retain: bool,
}

impl MqttOut {
    pub fn cmd(topic: String, payload: String) -> Self {
        Self {
            topic,
            payload,
            retain: false,
        }
    }

    pub fn retained(topic: String, payload: String) -> Self {
        Self {
            topic,
            payload,
            retain: true,
        }
    }
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
            login_events: Arc::new(RwLock::new(VecDeque::new())),
            ws_tx,
            mqtt_cmd_tx,
        }
    }
}
