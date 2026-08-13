use std::time::Duration;

use rumqttc::{AsyncClient, Event, Incoming, MqttOptions, QoS};
use tokio::sync::broadcast;

use crate::logbuf;
use crate::models::{AdxlPayload, DeviceStatusPayload, PzemPayload, WsEvent};
use crate::services::{detection, machine as machine_svc, magnitude_g};
use crate::state::{AppState, MqttOut, WifiScanAp, WifiScanResult, ZigbeeMeshSnap};

/// UID Zigbee baru: 0001, 0002, … (min 4 digit). UID 001–008 = Wi‑Fi lama.
fn is_zigbee_uid(uid: &str) -> bool {
    let u = uid.trim();
    u.len() >= 4 && u.bytes().all(|b| b.is_ascii_digit())
}

async fn ingest_coordinator_mesh(state: &AppState, payload: &str) -> anyhow::Result<()> {
    let v: serde_json::Value = serde_json::from_str(payload)?;
    let wifi_ok = v.get("wifi_ok").and_then(|x| x.as_bool()).unwrap_or(false);
    let mqtt_ok = v.get("mqtt_ok").and_then(|x| x.as_bool()).unwrap_or(true);
    let nodes_total = v
        .get("nodes_total")
        .and_then(|x| x.as_u64())
        .unwrap_or(0) as u32;
    let nodes_online = v
        .get("nodes_online")
        .and_then(|x| x.as_u64())
        .unwrap_or(nodes_total as u64) as u32;
    let nodes = v
        .get("nodes")
        .and_then(|x| x.as_array())
        .cloned()
        .unwrap_or_default();
    let snap = ZigbeeMeshSnap {
        updated_at: chrono::Utc::now(),
        wifi_ok,
        mqtt_ok,
        nodes_total,
        nodes_online,
        nodes,
    };
    *state.zigbee_mesh.write().await = Some(snap);
    Ok(())
}

async fn subscribe_all(client: &AsyncClient, prefix: &str) -> anyhow::Result<()> {
    client
        .subscribe(format!("{prefix}/+/telemetry/+"), QoS::AtLeastOnce)
        .await?;
    client
        .subscribe(format!("{prefix}/+/status/+"), QoS::AtLeastOnce)
        .await?;
    client
        .subscribe(format!("{prefix}/+/ack"), QoS::AtLeastOnce)
        .await?;
    client
        .subscribe(format!("{prefix}/coordinator/mesh"), QoS::AtLeastOnce)
        .await?;
    logbuf::info(format!("MQTT subscribed {prefix}/+/telemetry/+ and …/coordinator/mesh"));
    Ok(())
}

fn new_client(state: &AppState, suffix: u32) -> (AsyncClient, rumqttc::EventLoop) {
    let id = if suffix == 0 {
        state.cfg.mqtt_client_id.clone()
    } else {
        format!("{}-{}", state.cfg.mqtt_client_id, suffix)
    };
    let mut opts = MqttOptions::new(id, state.cfg.mqtt_host.clone(), state.cfg.mqtt_port);
    opts.set_keep_alive(Duration::from_secs(30));
    AsyncClient::new(opts, 64)
}

pub async fn run_mqtt_loop(state: AppState) -> anyhow::Result<()> {
    let prefix = state.cfg.mqtt_topic_prefix.clone();
    let mut reconnect = 0u32;
    let cmd_rx = state.mqtt_cmd_tx.subscribe();

    let state_offline = state.clone();
    tokio::spawn(async move {
        let mut tick = tokio::time::interval(Duration::from_secs(10));
        loop {
            tick.tick().await;
            if let Err(e) = machine_svc::mark_offline_stale(&state_offline).await {
                logbuf::warn(format!("offline check: {e:#}"));
            }
        }
    });

    loop {
        let (client, mut eventloop) = new_client(&state, reconnect);
        reconnect += 1;

        if let Err(e) = subscribe_all(&client, &prefix).await {
            logbuf::error(format!("MQTT subscribe failed: {e:#}"));
            tokio::time::sleep(Duration::from_secs(3)).await;
            continue;
        }

        logbuf::info(format!(
            "MQTT broker {}:{} prefix={}",
            state.cfg.mqtt_host,
            state.cfg.mqtt_port,
            prefix
        ));

        let client_pub = client.clone();
        let mut cmd_rx_loop = cmd_rx.resubscribe();

        let pub_task = tokio::spawn(async move {
            loop {
                match cmd_rx_loop.recv().await {
                    Ok(MqttOut { topic, payload }) => {
                        if let Err(e) = client_pub
                            .publish(topic, QoS::AtLeastOnce, false, payload)
                            .await
                        {
                            logbuf::warn(format!("MQTT publish failed: {e}"));
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        loop {
            match eventloop.poll().await {
                Ok(Event::Incoming(Incoming::ConnAck(_))) => {
                    let _ = subscribe_all(&client, &prefix).await;
                }
                Ok(Event::Incoming(Incoming::Publish(p))) => {
                    let topic = p.topic.clone();
                    let payload = String::from_utf8_lossy(&p.payload)
                        .trim_start_matches('\u{feff}')
                        .trim()
                        .to_string();
                    if payload.is_empty() {
                        continue;
                    }
                    if let Err(e) = handle_message(&state, &topic, &payload).await {
                        logbuf::warn(format!(
                            "MQTT handle {topic}: {e:#} | payload={}",
                            if payload.len() > 120 {
                                format!("{}...", &payload[..120])
                            } else {
                                payload.clone()
                            }
                        ));
                    }
                }
                Ok(_) => {}
                Err(e) => {
                    logbuf::error(format!("MQTT disconnected: {e}; reconnecting..."));
                    break;
                }
            }
        }

        pub_task.abort();
        tokio::time::sleep(Duration::from_secs(2)).await;
    }
}

async fn handle_message(state: &AppState, topic: &str, payload: &str) -> anyhow::Result<()> {
    let prefix = state.cfg.mqtt_topic_prefix.as_str();
    let mesh_topic = format!("{prefix}/coordinator/mesh");
    if topic == mesh_topic {
        ingest_coordinator_mesh(state, payload).await?;
        return Ok(());
    }

    let parts: Vec<&str> = topic.split('/').collect();
    if parts.len() < 3 {
        return Ok(());
    }

    if parts.last() == Some(&"ack") {
        logbuf::info(format!("device ack: {payload}"));
        // topic: {prefix}/{CODE}/ack — setelah boot, dorong kalibrasi DB ke ESP
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(payload) {
            let cmd = v.get("command").and_then(|c| c.as_str()).unwrap_or("");
            if cmd == "wifi_scan" {
                let uid = v
                    .get("device_uid")
                    .and_then(|x| x.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();
                if !uid.is_empty() {
                    let list = v
                        .get("wifi_list")
                        .and_then(|arr| arr.as_array())
                        .map(|arr| {
                            arr.iter()
                                .filter_map(|it| {
                                    let ssid = it.get("ssid")?.as_str()?.trim().to_string();
                                    if ssid.is_empty() {
                                        return None;
                                    }
                                    Some(WifiScanAp {
                                        ssid,
                                        rssi: it.get("rssi").and_then(|x| x.as_i64()).unwrap_or(-127) as i32,
                                        secure: it.get("secure").and_then(|x| x.as_bool()).unwrap_or(true),
                                        channel: it.get("channel").and_then(|x| x.as_i64()).unwrap_or(0) as i32,
                                    })
                                })
                                .collect::<Vec<_>>()
                        })
                        .unwrap_or_default();
                    state.wifi_scans.insert(
                        uid.clone(),
                        WifiScanResult {
                            updated_at: chrono::Utc::now(),
                            list: list.clone(),
                        },
                    );
                    logbuf::info(format!("wifi_scan {} networks={} (uid={})", parts[parts.len() - 2], list.len(), uid));
                }
            }
            if cmd == "boot" && parts.len() >= 2 {
                let machine_code = parts[parts.len() - 2];
                if let Ok(Some(m)) =
                    machine_svc::find_by_code_or_device(state, Some(machine_code), "").await
                {
                    let push = serde_json::json!({
                        "command": "set_calibration",
                        "g_force_threshold": m.g_force_threshold,
                        "filter_aktif_ms": m.filter_aktif_ms,
                        "filter_diam_ms": m.filter_diam_ms,
                        "power_threshold_w": m.power_threshold_w,
                        "current_threshold_a": m.current_threshold_a,
                        "off_current_a": m.off_current_a,
                    });
                    publish_command(state, &m.code, &push.to_string());
                    let lcd_name = {
                        let b = m.brand.trim();
                        let p = m.process_name.trim();
                        if !b.is_empty() && !p.is_empty() {
                            format!("{b} {p}")
                        } else if !p.is_empty() {
                            p.to_string()
                        } else {
                            m.name.clone()
                        }
                    };
                    let disp = serde_json::json!({
                        "command": "set_display",
                        "machine_name": lcd_name,
                        "process_name": m.process_name,
                        "operator_name": m.default_operator_name,
                        "machine_code": m.code,
                        "lcd_auto_ms": m.lcd_auto_ms,
                    });
                    publish_command(state, &m.code, &disp.to_string());
                    if m.kpi_source == "telemetry" {
                        if let Ok(map) = detection::pzem_band_totals_from_telemetry(
                            state,
                            detection::work_date_wib(),
                            detection::work_date_wib(),
                        )
                        .await
                        {
                            let (run, loss, off) =
                                map.get(&(m.id, detection::work_date_wib())).copied().unwrap_or((0, 0, 0));
                            let sync = serde_json::json!({
                                "command": "sync_kpi",
                                "source": "backend",
                                "run_sec": run,
                                "loss_sec": loss,
                                "off_sec": off,
                            });
                            publish_command(state, &m.code, &sync.to_string());
                        }
                    } else {
                        let sync = serde_json::json!({
                            "command": "sync_kpi",
                            "source": "esp",
                        });
                        publish_command(state, &m.code, &sync.to_string());
                    }

                    // Cek login harian → ESP tampil "OPERATOR BELUM…" jika belum
                    let today = detection::work_date_wib();
                    let shift = sqlx::query_as::<_, (String, String, Option<String>, Option<String>)>(
                        r#"SELECT operator_nik, operator_name, garment_style, shift_status
                           FROM daily_shifts
                           WHERE machine_id = $1 AND work_date = $2"#,
                    )
                    .bind(m.id)
                    .bind(today)
                    .fetch_optional(&state.pool)
                    .await
                    .ok()
                    .flatten();

                    let login_push = if !m.login_required {
                        if let Some((nik, name, style, st)) = shift.clone() {
                            serde_json::json!({
                                "command": "login_status",
                                "logged_in": true,
                                "login_required": false,
                                "operator_nik": nik,
                                "operator_name": name,
                                "garment_style": style,
                                "shift_status": st.unwrap_or_else(|| "work".into()),
                            })
                        } else {
                            serde_json::json!({
                                "command": "login_status",
                                "logged_in": true,
                                "login_required": false,
                                "operator_nik": m.default_operator_nik,
                                "operator_name": m.default_operator_name,
                            })
                        }
                    } else if let Some((nik, name, style, st)) = shift {
                        serde_json::json!({
                            "command": "login_status",
                            "logged_in": true,
                            "login_required": true,
                            "operator_nik": nik,
                            "operator_name": name,
                            "garment_style": style,
                            "shift_status": st.unwrap_or_else(|| "work".into()),
                        })
                    } else {
                        serde_json::json!({
                            "command": "login_status",
                            "logged_in": false,
                            "login_required": true,
                        })
                    };
                    publish_command(state, &m.code, &login_push.to_string());

                    // set_login_system eksplisit (ON/OFF) + channel device
                    let sys = serde_json::json!({
                        "command": "set_login_system",
                        "login_required": m.login_required,
                        "enabled": m.login_required,
                        "message": if m.login_required {
                            "System Login Di Aktifkan"
                        } else {
                            "System Login Non-Aktifkan"
                        },
                        "machine_code": m.code,
                    });
                    let sys_s = sys.to_string();
                    publish_command(state, &m.code, &sys_s);
                    if let Ok(Some(uid)) = sqlx::query_scalar::<_, String>(
                        r#"SELECT device_uid FROM devices WHERE machine_id = $1
                           ORDER BY last_seen_at DESC NULLS LAST LIMIT 1"#,
                    )
                    .bind(m.id)
                    .fetch_optional(&state.pool)
                    .await
                    {
                        publish_device_command(state, &uid, &login_push.to_string());
                        publish_device_command(state, &uid, &sys_s);
                    }

                    logbuf::info(format!(
                        "re-push calibration+display+login {} thrA={} kpi={} login_required={}",
                        m.code,
                        m.current_threshold_a,
                        m.kpi_source,
                        m.login_required
                    ));
                }
            }
        }
        return Ok(());
    }

    if parts.len() < 5 {
        return Ok(());
    }
    let channel = parts[parts.len() - 2];
    let kind = parts[parts.len() - 1];
    let machine_code = parts[parts.len() - 3];

    match channel {
        "status" => {
            let mut msg: DeviceStatusPayload = serde_json::from_str(payload)?;
            if msg.machine_code.is_none() {
                msg.machine_code = Some(machine_code.to_string());
            }
            if msg.sensor.is_none() {
                msg.sensor = Some(kind.to_string());
            }
            ingest_device_status(state, msg).await?;
        }
        "telemetry" => match kind {
            "adxl" => {
                let mut msg: AdxlPayload = serde_json::from_str(payload)?;
                if msg.machine_code.is_none() {
                    msg.machine_code = Some(machine_code.to_string());
                }
                ingest_adxl(state, msg).await?;
            }
            "pzem" => {
                let mut msg: PzemPayload = serde_json::from_str(payload)?;
                if msg.machine_code.is_none() {
                    msg.machine_code = Some(machine_code.to_string());
                }
                ingest_pzem(state, msg).await?;
            }
            _ => {}
        },
        _ => {}
    }
    Ok(())
}

async fn ingest_device_status(state: &AppState, msg: DeviceStatusPayload) -> anyhow::Result<()> {
    let machine =
        machine_svc::find_or_provision(state, msg.machine_code.as_deref(), &msg.device_uid).await?;

    let sensor = msg
        .sensor
        .clone()
        .unwrap_or_else(|| "unknown".into())
        .to_ascii_lowercase();
    let online = msg.online.unwrap_or(true);
    let wifi_ok = msg.wifi_ok.unwrap_or(false);
    let mqtt_ok = msg.mqtt_ok.unwrap_or(online);
    let sensor_ok = msg.sensor_ok.unwrap_or(false);
    let detail = msg.detail.clone().unwrap_or_default();
    let ts = chrono::Utc::now();

    // ESP masih hidup (kecuali LWT mqtt_lost) → touch last_seen
    if online || msg.state != "mqtt_lost" {
        if let Some(mut rt) = state.runtime.get_mut(&machine.id) {
            rt.last_seen = Some(ts);
            if sensor == "pzem" {
                rt.pzem.last_seen = Some(ts);
            } else if sensor == "adxl" {
                rt.adxl.last_seen = Some(ts);
            }
        }
        if online && (sensor == "pzem" || sensor == "adxl") {
            let st = if sensor == "pzem" {
                machine.status_pzem.as_str()
            } else {
                machine.status_adxl.as_str()
            };
            if st == "offline" {
                let _ = detection::mark_sensor_online(state, machine.id, &sensor).await;
            }
        }
    }

    logbuf::info(format!(
        "HEALTH {}/{} state={} sensor_ok={} rssi={:?} — {}",
        machine.code, sensor, msg.state, sensor_ok, msg.rssi, detail
    ));

    let link_zigbee = msg
        .transport
        .as_deref()
        .map(|t| t.eq_ignore_ascii_case("zigbee"))
        .unwrap_or(false)
        && is_zigbee_uid(&msg.device_uid);

    // Persist link quality ke devices (RSSI/LQI tiap status; IP hanya jika dikirim)
    let _ = sqlx::query(
        r#"UPDATE devices SET
             last_seen_at = NOW(),
             is_online = $2,
             rssi = COALESCE($3, rssi),
             wifi_ok = COALESCE($4, wifi_ok),
             mqtt_ok = COALESCE($5, mqtt_ok),
             ip_addr = COALESCE(NULLIF($6, ''), ip_addr),
             wifi_ssid = COALESCE(NULLIF($7, ''), wifi_ssid),
             last_health_at = NOW(),
             link_type = CASE WHEN $8 THEN 'zigbee' ELSE link_type END
           WHERE device_uid = $1"#,
    )
    .bind(&msg.device_uid)
    .bind(online)
    .bind(msg.rssi)
    .bind(if online { msg.wifi_ok } else { Some(false) })
    .bind(if online { Some(mqtt_ok) } else { Some(false) })
    .bind(msg.ip.as_deref().unwrap_or(""))
    .bind(msg.wifi_ssid.as_deref().unwrap_or(""))
    .bind(link_zigbee)
    .execute(&state.pool)
    .await;

    let _ = state.ws_tx.send(WsEvent::DeviceHealth {
        machine_id: machine.id,
        code: machine.code.clone(),
        sensor,
        state: msg.state.clone(),
        online,
        wifi_ok,
        mqtt_ok,
        sensor_ok,
        detail,
        rssi: msg.rssi,
        fail_count: msg.fail_count,
        ts,
    });

    // Periode deep sleep ESP (OFF lama) — 1 baris: enter buka, exit tutup
    if msg.state == "deep_sleep_enter" || msg.state == "deep_sleep_exit" {
        record_deep_sleep(state, &machine, &msg, ts).await;
        if msg.state == "deep_sleep_exit" && machine.kpi_source == "esp" {
            if let (Some(run), Some(loss)) = (msg.run_sec, msg.loss_sec) {
                let off = msg.off_sec.unwrap_or(0);
                let _ = detection::set_pzem_totals_from_esp(
                    state,
                    machine.id,
                    run as i32,
                    loss as i32,
                    off as i32,
                )
                .await;
            }
        }
    }

    Ok(())
}

async fn record_deep_sleep(
    state: &AppState,
    machine: &crate::models::Machine,
    msg: &DeviceStatusPayload,
    ts: chrono::DateTime<chrono::Utc>,
) {
    let from = parse_status_ts(&msg.deep_sleep_from).unwrap_or(ts);
    let to = parse_status_ts(&msg.deep_sleep_to);
    if msg.state == "deep_sleep_exit" {
        let dur = msg.duration_sec.or_else(|| to.map(|t| (t - from).num_seconds().max(0)));
        let res = sqlx::query(
            r#"UPDATE device_deep_sleep SET
                 sleep_to = COALESCE($1, NOW()),
                 duration_sec = $2,
                 reason = 'deep_sleep_exit'
               WHERE id = (
                 SELECT id FROM device_deep_sleep
                 WHERE machine_id = $3 AND sleep_to IS NULL
                 ORDER BY sleep_from DESC LIMIT 1
               )"#,
        )
        .bind(to)
        .bind(dur.map(|d| d as i32))
        .bind(machine.id)
        .execute(&state.pool)
        .await;
        if matches!(res, Ok(r) if r.rows_affected() > 0) {
            logbuf::info(format!(
                "DEEP_SLEEP {} exit from={} to={:?} dur={:?}",
                machine.code, from, to, dur
            ));
            return;
        }
    }
    let dur = msg.duration_sec.or_else(|| to.map(|t| (t - from).num_seconds().max(0)));
    let _ = sqlx::query(
        r#"INSERT INTO device_deep_sleep
           (machine_id, device_uid, sleep_from, sleep_to, duration_sec, reason)
           VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
    .bind(machine.id)
    .bind(&msg.device_uid)
    .bind(from)
    .bind(to)
    .bind(dur.map(|d| d as i32))
    .bind(&msg.state)
    .execute(&state.pool)
    .await;
    logbuf::info(format!(
        "DEEP_SLEEP {} {} from={} to={:?} dur={:?}",
        machine.code, msg.state, from, to, dur
    ));
}

fn parse_status_ts(v: &Option<serde_json::Value>) -> Option<chrono::DateTime<chrono::Utc>> {
    use chrono::{TimeZone, Utc};
    match v {
        Some(serde_json::Value::Number(n)) => {
            let sec = n.as_i64().or_else(|| n.as_f64().map(|f| f as i64))?;
            if sec < 1_000_000 {
                return None; // dummy / belum NTP
            }
            Utc.timestamp_opt(sec, 0).single()
        }
        Some(serde_json::Value::String(s)) => {
            if let Ok(n) = s.parse::<i64>() {
                if n < 1_000_000 {
                    return None;
                }
                return Utc.timestamp_opt(n, 0).single();
            }
            chrono::DateTime::parse_from_rfc3339(s)
                .ok()
                .map(|d| d.with_timezone(&Utc))
        }
        _ => None,
    }
}

#[cfg(test)]
mod parse_status_ts_tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn epoch_and_rfc3339() {
        let v = Some(json!(1_775_000_000i64));
        let t = parse_status_ts(&v).expect("epoch");
        assert_eq!(t.timestamp(), 1_775_000_000);
        let v = Some(json!("2026-08-07T10:00:00+07:00"));
        assert!(parse_status_ts(&v).is_some());
        assert!(parse_status_ts(&Some(json!(1))).is_none());
        assert!(parse_status_ts(&None).is_none());
    }
}

pub async fn ingest_adxl(state: &AppState, msg: AdxlPayload) -> anyhow::Result<()> {
    let mut machine =
        machine_svc::find_or_provision(state, msg.machine_code.as_deref(), &msg.device_uid).await?;

    let prev_xyz = state
        .runtime
        .get(&machine.id)
        .and_then(|r| r.last_adxl_xyz);
    let mag = magnitude_g(msg.ax, msg.ay, msg.az, msg.vibration, prev_xyz);
    let ts = msg.ts.unwrap_or_else(chrono::Utc::now);

    let persist_db = {
        let mut rt = state
            .runtime
            .entry(machine.id)
            .or_insert_with(crate::models::MachineRuntime::new);
        rt.last_adxl_xyz = Some((msg.ax, msg.ay, msg.az));
        let _ = rt.last_adxl_totals.get_or_insert((0, 0, 0));
        let persist = rt
            .last_adxl_db_at
            .map(|t| (ts - t).num_milliseconds() >= 1000)
            .unwrap_or(true);
        if persist {
            rt.last_adxl_db_at = Some(ts);
        }
        persist
    };

    // Bootstrap sekali dari DB setelah restart (bukan setelah reset)
    let boot = state
        .runtime
        .get(&machine.id)
        .map(|r| r.last_adxl_totals == Some((0, 0, 0)) && r.last_adxl_tick_at.is_none())
        .unwrap_or(false);
    if boot {
        if let Ok(t) = detection::adxl_daily_totals(state, machine.id).await {
            if let Some(mut rt) = state.runtime.get_mut(&machine.id) {
                rt.last_adxl_totals = Some(t);
            }
        }
    }

    let sensor_ok = msg.sensor_ok.unwrap_or(true);

    if machine.status_adxl == "offline" {
        detection::mark_sensor_online(state, machine.id, "adxl").await?;
        machine.status_adxl = "idle".into();
        machine_svc::patch_cached_adxl_status(state, machine.id, "idle");
    }

    // Status dari threshold backend; KPI dari counter lokal ESP jika ada
    if sensor_ok {
        detection::evaluate_adxl(state, &machine, mag).await?;
    }
    if let (Some(run), Some(loss)) = (msg.run_sec, msg.loss_sec) {
        let off = msg.off_sec.unwrap_or(0);
        detection::set_adxl_totals_from_esp(
            state,
            machine.id,
            run as i32,
            loss as i32,
            off as i32,
        )
        .await?;
    }

    let (running_sec, idle_sec, off_sec) = detection::adxl_daily_totals_cached(state, machine.id).await?;
    let (running_pct, idle_pct, off_pct) = detection::pzem_pcts(running_sec, idle_sec, off_sec);

    let _ = state.ws_tx.send(WsEvent::TelemetryAdxl {
        machine_id: machine.id,
        magnitude_g: mag,
        ax: msg.ax,
        ay: msg.ay,
        az: msg.az,
        sensor_ok: Some(sensor_ok),
        running_sec,
        idle_sec,
        off_sec,
        running_pct,
        idle_pct,
        off_pct,
        ts,
    });

    if persist_db && sensor_ok {
        let _ = machine_svc::touch_device(state, machine.id, &msg.device_uid).await;
        let _ = sqlx::query(
            r#"INSERT INTO telemetry_adxl (machine_id, device_uid, ts, ax, ay, az, magnitude_g)
               VALUES ($1, $2, $3, $4, $5, $6, $7)"#,
        )
        .bind(machine.id)
        .bind(&msg.device_uid)
        .bind(ts)
        .bind(msg.ax)
        .bind(msg.ay)
        .bind(msg.az)
        .bind(mag)
        .execute(&state.pool)
        .await;
    } else if !sensor_ok {
        let _ = machine_svc::touch_device(state, machine.id, &msg.device_uid).await;
    }

    Ok(())
}

pub async fn ingest_pzem(state: &AppState, msg: PzemPayload) -> anyhow::Result<()> {
    let machine =
        machine_svc::find_or_provision(state, msg.machine_code.as_deref(), &msg.device_uid).await?;

    machine_svc::touch_device(state, machine.id, &msg.device_uid).await?;
    if msg
        .transport
        .as_deref()
        .map(|t| t.eq_ignore_ascii_case("zigbee"))
        .unwrap_or(false)
        && is_zigbee_uid(&msg.device_uid)
    {
        let _ = sqlx::query(
            r#"UPDATE devices SET link_type = 'zigbee' WHERE device_uid = $1 AND link_type IS DISTINCT FROM 'zigbee'"#,
        )
        .bind(&msg.device_uid)
        .execute(&state.pool)
        .await;
    }
    if machine.status_pzem == "offline" {
        detection::mark_sensor_online(state, machine.id, "pzem").await?;
    }
    let machine =
        machine_svc::find_or_provision(state, msg.machine_code.as_deref(), &msg.device_uid).await?;
    let ts = msg.ts.unwrap_or_else(chrono::Utc::now);
    let sensor_ok = msg
        .sensor_ok
        .or(msg.pzem_ok)
        .unwrap_or(true);

    // Pastikan slot runtime ada
    {
        let mut rt = state
            .runtime
            .entry(machine.id)
            .or_insert_with(crate::models::MachineRuntime::new);
        if sensor_ok {
            rt.last_energy_kwh = Some(msg.energy_kwh);
            rt.last_power_w = Some(msg.power_w);
            rt.last_current_a = Some(msg.current_a);
        }
        rt.last_seen = Some(ts);
        rt.pzem.last_seen = Some(ts);
        let _ = rt.last_pzem_totals.get_or_insert((0, 0, 0));
    }

    // Bootstrap sekali dari DB setelah restart (bukan setelah reset — tick_at sudah di-set)
    let boot = state
        .runtime
        .get(&machine.id)
        .map(|r| r.last_pzem_totals == Some((0, 0, 0)) && r.last_pzem_tick_at.is_none())
        .unwrap_or(false);
    if boot {
        if let Ok(t) = detection::pzem_daily_totals_from_db(state, machine.id).await {
            if let Some(mut rt) = state.runtime.get_mut(&machine.id) {
                rt.last_pzem_totals = Some(t);
            }
        }
    }

    if sensor_ok {
        let _ = sqlx::query(
            r#"INSERT INTO telemetry_pzem
               (machine_id, device_uid, ts, voltage_v, current_a, power_w, energy_kwh, frequency_hz, power_factor)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)"#,
        )
        .bind(machine.id)
        .bind(&msg.device_uid)
        .bind(ts)
        .bind(msg.voltage_v)
        .bind(msg.current_a)
        .bind(msg.power_w)
        .bind(msg.energy_kwh)
        .bind(msg.frequency_hz)
        .bind(msg.power_factor)
        .execute(&state.pool)
        .await;

        logbuf::info(format!(
            "PZEM {} V={:.1} A={:.3} W={:.1} status={}",
            machine.code,
            msg.voltage_v,
            msg.current_a,
            msg.power_w,
            machine.status_pzem
        ));

        // Status badge dari threshold backend; KPI dari counter ESP jika kpi_source=esp.
        detection::evaluate_pzem(state, &machine, msg.current_a, msg.power_w).await?;
        if machine.kpi_source == "esp" {
            if let (Some(run), Some(loss)) = (msg.run_sec, msg.loss_sec) {
                let off = msg.off_sec.unwrap_or(0);
                detection::set_pzem_totals_from_esp(
                    state,
                    machine.id,
                    run as i32,
                    loss as i32,
                    off as i32,
                )
                .await?;
            }
        }
    } else {
        logbuf::warn(format!(
            "PZEM {} heartbeat sensor_fail — skip evaluate (ESP online)",
            machine.code
        ));
        // Heartbeat tetap bisa bawa counter lokal (offline-resilient)
        if machine.kpi_source == "esp" {
            if let (Some(run), Some(loss)) = (msg.run_sec, msg.loss_sec) {
                let off = msg.off_sec.unwrap_or(0);
                detection::set_pzem_totals_from_esp(
                    state,
                    machine.id,
                    run as i32,
                    loss as i32,
                    off as i32,
                )
                .await?;
            }
        }
    }

    let (running_sec, idle_sec, off_sec) = detection::pzem_daily_totals(state, machine.id).await?;
    let (running_pct, idle_pct, off_pct) = detection::pzem_pcts(running_sec, idle_sec, off_sec);

    let _ = state.ws_tx.send(WsEvent::TelemetryPzem {
        machine_id: machine.id,
        power_w: msg.power_w,
        voltage_v: msg.voltage_v,
        current_a: msg.current_a,
        energy_kwh: msg.energy_kwh,
        frequency_hz: msg.frequency_hz,
        power_factor: msg.power_factor,
        sensor_ok: Some(sensor_ok),
        running_sec,
        idle_sec,
        off_sec,
        running_pct,
        idle_pct,
        off_pct,
        ts,
    });

    Ok(())
}

pub fn publish_command(state: &AppState, machine_code: &str, body: &str) {
    let topic = format!("{}/{}/cmd", state.cfg.mqtt_topic_prefix, machine_code);
    let _ = state.mqtt_cmd_tx.send(MqttOut {
        topic,
        payload: body.to_string(),
    });
}

/// Channel stabil per device: iot/gistex/dev/{UID}/cmd — tetap diterima meski code berubah.
pub fn publish_device_command(state: &AppState, device_uid: &str, body: &str) {
    if device_uid.is_empty() {
        return;
    }
    let topic = format!("{}/dev/{}/cmd", state.cfg.mqtt_topic_prefix, device_uid);
    let _ = state.mqtt_cmd_tx.send(MqttOut {
        topic,
        payload: body.to_string(),
    });
}
