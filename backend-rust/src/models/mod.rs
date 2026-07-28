use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Machine {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub machine_type: String,
    pub location_note: Option<String>,
    pub status: String,
    pub status_adxl: String,
    pub status_pzem: String,
    pub g_force_threshold: f64,
    pub filter_aktif_ms: i32,
    pub filter_diam_ms: i32,
    pub power_threshold_w: f64,
    pub current_threshold_a: f64,
    #[serde(default)]
    pub adxl_force_off: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMachine {
    pub code: String,
    pub name: String,
    #[serde(default = "default_type")]
    pub machine_type: String,
    pub location_note: Option<String>,
    pub device_uid: Option<String>,
}

fn default_type() -> String {
    "sewing".into()
}

#[derive(Debug, Deserialize)]
pub struct UpdateMachine {
    pub name: Option<String>,
    pub location_note: Option<String>,
    pub g_force_threshold: Option<f64>,
    pub filter_aktif_ms: Option<i32>,
    pub filter_diam_ms: Option<i32>,
    pub power_threshold_w: Option<f64>,
    pub current_threshold_a: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct UpsertOperator {
    pub nik: String,
    pub name: String,
}

#[derive(Debug, Deserialize)]
pub struct AssignShift {
    pub nik: String,
    pub name: String,
    pub work_date: Option<chrono::NaiveDate>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Operator {
    pub id: Uuid,
    pub nik: String,
    pub name: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct AdxlPayload {
    pub device_uid: String,
    pub machine_code: Option<String>,
    pub ax: f64,
    pub ay: f64,
    pub az: f64,
    /// Peak |dx|+|dy|+|dz| dari ESP (algoritma legacy)
    #[serde(default, alias = "vib", alias = "peak")]
    pub vibration: Option<f64>,
    /// false = ESP hidup tapi ADXL I2C/kabel gagal
    #[serde(default)]
    pub sensor_ok: Option<bool>,
    /// Counter lokal ESP (sumber KPI dashboard jika ada)
    #[serde(default)]
    pub run_sec: Option<u32>,
    #[serde(default)]
    pub loss_sec: Option<u32>,
    #[serde(default)]
    pub off_sec: Option<u32>,
    #[serde(default)]
    pub ts: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct PzemPayload {
    pub device_uid: String,
    pub machine_code: Option<String>,
    pub voltage_v: f64,
    pub current_a: f64,
    pub power_w: f64,
    pub energy_kwh: f64,
    pub frequency_hz: Option<f64>,
    pub power_factor: Option<f64>,
    /// false = ESP hidup tapi baca modul PZEM gagal (NaN)
    #[serde(default)]
    pub pzem_ok: Option<bool>,
    #[serde(default)]
    pub sensor_ok: Option<bool>,
    /// Counter lokal ESP (sumber KPI dashboard jika ada)
    #[serde(default)]
    pub run_sec: Option<u32>,
    #[serde(default)]
    pub loss_sec: Option<u32>,
    #[serde(default)]
    pub off_sec: Option<u32>,
    #[serde(default)]
    pub ts: Option<DateTime<Utc>>,
}

/// Health dari topic `…/status/{pzem|adxl}`
#[derive(Debug, Deserialize)]
#[allow(dead_code)] // field opsional dari ESP; dipakai deserialize + log ke depan
pub struct DeviceStatusPayload {
    pub device_uid: String,
    pub machine_code: Option<String>,
    pub sensor: Option<String>,
    pub state: String,
    #[serde(default)]
    pub online: Option<bool>,
    #[serde(default)]
    pub wifi_ok: Option<bool>,
    #[serde(default)]
    pub mqtt_ok: Option<bool>,
    #[serde(default)]
    pub sensor_ok: Option<bool>,
    #[serde(default)]
    pub detail: Option<String>,
    #[serde(default)]
    pub rssi: Option<i32>,
    #[serde(default)]
    pub ip: Option<String>,
    #[serde(default)]
    pub uptime_sec: Option<u64>,
    #[serde(default)]
    pub fail_count: Option<u32>,
    #[serde(default)]
    pub mqtt_fail_count: Option<u32>,
    #[serde(default)]
    pub wifi_fail_count: Option<u32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum WsEvent {
    MachineStatus {
        machine_id: Uuid,
        code: String,
        status: String,
        status_adxl: String,
        status_pzem: String,
        magnitude_g: Option<f64>,
        current_a: Option<f64>,
        power_w: Option<f64>,
        ts: DateTime<Utc>,
    },
    TelemetryAdxl {
        machine_id: Uuid,
        magnitude_g: f64,
        ax: f64,
        ay: f64,
        az: f64,
        sensor_ok: Option<bool>,
        running_sec: i32,
        idle_sec: i32,
        off_sec: i32,
        running_pct: f64,
        idle_pct: f64,
        off_pct: f64,
        ts: DateTime<Utc>,
    },
    TelemetryPzem {
        machine_id: Uuid,
        power_w: f64,
        voltage_v: f64,
        current_a: f64,
        energy_kwh: f64,
        frequency_hz: Option<f64>,
        power_factor: Option<f64>,
        sensor_ok: Option<bool>,
        running_sec: i32,
        idle_sec: i32,
        off_sec: i32,
        running_pct: f64,
        idle_pct: f64,
        off_pct: f64,
        ts: DateTime<Utc>,
    },
    DeviceHealth {
        machine_id: Uuid,
        code: String,
        sensor: String,
        state: String,
        online: bool,
        wifi_ok: bool,
        mqtt_ok: bool,
        sensor_ok: bool,
        detail: String,
        rssi: Option<i32>,
        fail_count: Option<u32>,
        ts: DateTime<Utc>,
    },
    DetectionCompare {
        machine_id: Uuid,
        status_adxl: String,
        status_pzem: String,
        agree: bool,
        magnitude_g: Option<f64>,
        current_a: Option<f64>,
        ts: DateTime<Utc>,
    },
}

#[derive(Debug, Deserialize)]
pub struct DeviceCommandBody {
    pub command: String,
    pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Default)]
pub struct SensorRuntime {
    pub status: String,
    pub active_since: Option<DateTime<Utc>>,
    pub idle_since: Option<DateTime<Utc>>,
    pub last_seen: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Default)]
pub struct MachineRuntime {
    pub adxl: SensorRuntime,
    pub pzem: SensorRuntime,
    pub last_magnitude_g: Option<f64>,
    pub last_adxl_xyz: Option<(f64, f64, f64)>,
    /// Sama firmware HTML: timestamp terakhir peak ≥ threshold (sticky idleDelay).
    pub last_adxl_peak_above_at: Option<DateTime<Utc>>,
    /// Cache waktu harian ADXL untuk WS cepat (tanpa query Neon).
    pub last_adxl_totals: Option<(i32, i32, i32)>,
    pub last_adxl_tick_at: Option<DateTime<Utc>>,
    pub last_adxl_db_at: Option<DateTime<Utc>>,
    /// Cache waktu harian PZEM (sama alasan: Neon lag setelah reset).
    pub last_pzem_totals: Option<(i32, i32, i32)>,
    pub last_pzem_tick_at: Option<DateTime<Utc>>,
    /// Setelah "Reset hari ini": jangan terima run/loss ESP lama sampai ESP ack reset / timeout.
    pub pzem_ignore_esp_until: Option<DateTime<Utc>>,
    pub adxl_ignore_esp_until: Option<DateTime<Utc>>,
    pub last_current_a: Option<f64>,
    pub last_power_w: Option<f64>,
    pub last_energy_kwh: Option<f64>,
    pub last_seen: Option<DateTime<Utc>>,
    pub open_session_id: Option<Uuid>,
    pub last_compare_at: Option<DateTime<Utc>>,
}

impl SensorRuntime {
    pub fn new_offline() -> Self {
        Self {
            status: "offline".into(),
            ..Default::default()
        }
    }
}

impl MachineRuntime {
    pub fn new() -> Self {
        Self {
            adxl: SensorRuntime::new_offline(),
            pzem: SensorRuntime::new_offline(),
            ..Default::default()
        }
    }
}
