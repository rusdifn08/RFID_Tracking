//! Monitor Zigbee mesh — prioritas snapshot MQTT dari Coordinator, fallback DB.

use axum::{extract::State, Json};
use chrono::{DateTime, Utc};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::state::{AppState, ZigbeeMeshSnap};

const ONLINE_SEC: i64 = 90;
const MESH_CACHE_MAX_AGE_SEC: i64 = 20;

#[derive(sqlx::FromRow)]
struct MeshRow {
    id: Uuid,
    code: String,
    name: String,
    brand: String,
    process_name: String,
    status_pzem: String,
    device_uid: Option<String>,
    last_seen_at: Option<DateTime<Utc>>,
    is_online: bool,
    rssi: Option<i32>,
    wifi_ok: Option<bool>,
    mqtt_ok: Option<bool>,
    ip_addr: Option<String>,
    last_v: Option<f64>,
    last_a: Option<f64>,
    last_w: Option<f64>,
    tel_ts: Option<DateTime<Utc>>,
}

fn internal(e: sqlx::Error) -> (axum::http::StatusCode, String) {
    tracing::error!("{e:#}");
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}

fn signal_from_lqi(v: Option<i32>) -> (&'static str, Option<i32>) {
    match v {
        Some(x) if x > 0 => {
            let q = if x >= 200 {
                "excellent"
            } else if x >= 150 {
                "good"
            } else if x >= 100 {
                "fair"
            } else {
                "weak"
            };
            (q, Some(x))
        }
        Some(0) => ("unknown", Some(0)),
        None => ("unknown", None),
        Some(x) => ("unknown", Some(x)),
    }
}

fn mesh_from_coordinator(state: &AppState, snap: &ZigbeeMeshSnap) -> Value {
    let now = Utc::now();
    let nodes: Vec<Value> = snap
        .nodes
        .iter()
        .map(|n| {
            let uid = n
                .get("device_uid")
                .and_then(|x| x.as_str())
                .unwrap_or("");
            let code = n
                .get("machine_code")
                .and_then(|x| x.as_str())
                .unwrap_or("");
            let online = n.get("online").and_then(|x| x.as_bool()).unwrap_or(false);
            let op_status = n
                .get("op_status")
                .and_then(|x| x.as_str())
                .unwrap_or("unknown");
            let voltage_v = n.get("voltage_v").and_then(|x| x.as_f64()).unwrap_or(0.0);
            let current_a = n.get("current_a").and_then(|x| x.as_f64()).unwrap_or(0.0);
            let power_w = n.get("power_w").and_then(|x| x.as_f64()).unwrap_or(0.0);
            let lqi = n.get("lqi").and_then(|x| x.as_i64()).map(|x| x as i32);
            let (signal, lqi_out) = signal_from_lqi(lqi);
            let age_sec = n.get("age_sec").and_then(|x| x.as_u64()).unwrap_or(0);
            let last_seen_at = if age_sec > 0 {
                Some(now - chrono::Duration::seconds(age_sec as i64))
            } else {
                Some(now)
            };

            // Enrich nama dari cache mesin jika ada
            let machine = state
                .machine_cache
                .get(code)
                .or_else(|| state.machine_cache.get(uid));
            let (name, display_name) = if let Some(m) = machine {
                let b = m.brand.trim();
                let p = m.process_name.trim();
                let display = if !b.is_empty() && !p.is_empty() {
                    format!("{b} {p}")
                } else if !p.is_empty() {
                    p.to_string()
                } else if !b.is_empty() {
                    b.to_string()
                } else {
                    m.name.clone()
                };
                (m.name.clone(), display)
            } else {
                (code.to_string(), code.to_string())
            };

            json!({
                "id": uid,
                "code": code,
                "name": name,
                "display_name": display_name,
                "device_uid": uid,
                "role": "router_node",
                "transport": "zigbee_mqtt_bridge",
                "online": online,
                "last_seen_at": last_seen_at,
                "mqtt_ok": snap.mqtt_ok,
                "wifi_ok": snap.wifi_ok,
                "lqi": lqi_out,
                "signal": signal,
                "voltage_v": voltage_v,
                "current_a": current_a,
                "power_w": power_w,
                "op_status": op_status,
                "source": "coordinator",
            })
        })
        .collect();

    json!({
        "coordinator": {
            "role": "gateway",
            "transport": "wifi_mqtt",
            "mqtt_host": state.cfg.mqtt_host,
            "mqtt_port": state.cfg.mqtt_port,
            "topic_prefix": state.cfg.mqtt_topic_prefix,
            "online": snap.wifi_ok && snap.mqtt_ok,
            "wifi_ok": snap.wifi_ok,
            "mqtt_ok": snap.mqtt_ok,
            "detail": "Live snapshot dari Coordinator (MQTT mesh)"
        },
        "summary": {
            "nodes_total": snap.nodes_total,
            "nodes_online": snap.nodes_online,
            "nodes_offline": snap.nodes_total.saturating_sub(snap.nodes_online),
        },
        "nodes": nodes,
        "polled_at": now,
        "source": "coordinator",
        "coordinator_at": snap.updated_at,
    })
}

async fn mesh_from_db(state: &AppState) -> Result<Value, (axum::http::StatusCode, String)> {
    let rows = sqlx::query_as::<_, MeshRow>(
        r#"SELECT
              m.id, m.code, m.name,
              COALESCE(m.brand, '') AS brand,
              COALESCE(m.process_name, '') AS process_name,
              COALESCE(m.status_pzem, 'offline') AS status_pzem,
              d.device_uid, d.last_seen_at,
              COALESCE(d.is_online, FALSE) AS is_online,
              d.rssi, d.wifi_ok, d.mqtt_ok, d.ip_addr,
              t.voltage_v AS last_v,
              t.current_a AS last_a,
              t.power_w AS last_w,
              t.ts AS tel_ts
           FROM machines m
           INNER JOIN LATERAL (
             SELECT device_uid, last_seen_at, is_online,
                    rssi, wifi_ok, mqtt_ok, ip_addr
             FROM devices
             WHERE machine_id = m.id
               AND device_uid IS NOT NULL AND TRIM(device_uid) <> ''
               AND link_type = 'zigbee'
               AND TRIM(device_uid) ~ '^[0-9]{4,}$'
             ORDER BY last_seen_at DESC NULLS LAST
             LIMIT 1
           ) d ON TRUE
           LEFT JOIN LATERAL (
             SELECT voltage_v, current_a, power_w, ts
             FROM telemetry_pzem
             WHERE machine_id = m.id
             ORDER BY ts DESC
             LIMIT 1
           ) t ON TRUE
           ORDER BY d.last_seen_at DESC NULLS LAST, m.code"#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let now = Utc::now();
    let mut online_n = 0u32;
    let nodes: Vec<Value> = rows
        .into_iter()
        .map(|r| {
            let live = state
                .runtime
                .get(&r.id)
                .and_then(|rt| rt.last_seen.or(rt.pzem.last_seen))
                .map(|t| (now - t).num_seconds() < 30)
                .unwrap_or(false);
            let seen_ok = r
                .last_seen_at
                .map(|t| (now - t).num_seconds() < ONLINE_SEC)
                .unwrap_or(false);
            let online = r.is_online || live || seen_ok;
            if online {
                online_n += 1;
            }

            let (current_a, voltage_v, power_w, op_status) = state
                .runtime
                .get(&r.id)
                .map(|rt| {
                    (
                        rt.last_current_a.unwrap_or(r.last_a.unwrap_or(0.0)),
                        r.last_v.unwrap_or(0.0),
                        rt.last_power_w.unwrap_or(r.last_w.unwrap_or(0.0)),
                        if !rt.pzem.status.is_empty() {
                            rt.pzem.status.clone()
                        } else {
                            r.status_pzem.clone()
                        },
                    )
                })
                .unwrap_or_else(|| {
                    (
                        r.last_a.unwrap_or(0.0),
                        r.last_v.unwrap_or(0.0),
                        r.last_w.unwrap_or(0.0),
                        r.status_pzem.clone(),
                    )
                });

            let (signal, lqi) = signal_from_lqi(r.rssi);

            let display = {
                let b = r.brand.trim();
                let p = r.process_name.trim();
                if !b.is_empty() && !p.is_empty() {
                    format!("{b} {p}")
                } else if !p.is_empty() {
                    p.to_string()
                } else if !b.is_empty() {
                    b.to_string()
                } else {
                    r.name.clone()
                }
            };

            json!({
                "id": r.id,
                "code": r.code,
                "name": r.name,
                "display_name": display,
                "device_uid": r.device_uid,
                "role": "router_node",
                "transport": "zigbee_mqtt_bridge",
                "online": online,
                "last_seen_at": r.last_seen_at,
                "mqtt_ok": r.mqtt_ok,
                "wifi_ok": r.wifi_ok,
                "lqi": lqi,
                "signal": signal,
                "ip_addr": r.ip_addr,
                "voltage_v": voltage_v,
                "current_a": current_a,
                "power_w": power_w,
                "op_status": op_status,
                "telemetry_at": r.tel_ts,
                "source": "db",
            })
        })
        .collect();

    let total = nodes.len() as u32;

    Ok(json!({
        "coordinator": {
            "role": "gateway",
            "transport": "wifi_mqtt",
            "mqtt_host": state.cfg.mqtt_host,
            "mqtt_port": state.cfg.mqtt_port,
            "topic_prefix": state.cfg.mqtt_topic_prefix,
            "online": false,
            "detail": "Snapshot Coordinator belum diterima — tampil data DB"
        },
        "summary": {
            "nodes_total": total,
            "nodes_online": online_n,
            "nodes_offline": total.saturating_sub(online_n),
        },
        "nodes": nodes,
        "polled_at": now,
        "source": "db",
    }))
}

/// GET /api/zigbee/mesh — live dari Coordinator MQTT, fallback DB.
pub async fn mesh_status(State(state): State<AppState>) -> Result<Json<Value>, (axum::http::StatusCode, String)> {
    if let Some(snap) = state.zigbee_mesh.read().await.clone() {
        let age = (Utc::now() - snap.updated_at).num_seconds();
        if age <= MESH_CACHE_MAX_AGE_SEC {
            return Ok(Json(mesh_from_coordinator(&state, &snap)));
        }
    }
    Ok(Json(mesh_from_db(&state).await?))
}
