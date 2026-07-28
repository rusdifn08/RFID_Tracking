use std::time::Duration;

use rumqttc::{AsyncClient, Event, Incoming, MqttOptions, QoS};
use tokio::sync::broadcast;

use crate::models::{AdxlPayload, DeviceStatusPayload, PzemPayload, WsEvent};
use crate::services::{detection, machine as machine_svc, magnitude_g};
use crate::state::{AppState, MqttOut};

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
    tracing::info!("MQTT subscribed {prefix}/+/telemetry/+ and …/status/+");
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
                tracing::warn!("offline check: {e:#}");
            }
        }
    });

    loop {
        let (client, mut eventloop) = new_client(&state, reconnect);
        reconnect += 1;

        if let Err(e) = subscribe_all(&client, &prefix).await {
            tracing::error!("MQTT subscribe failed: {e:#}");
            tokio::time::sleep(Duration::from_secs(3)).await;
            continue;
        }

        tracing::info!(
            "MQTT broker {}:{} prefix={}",
            state.cfg.mqtt_host,
            state.cfg.mqtt_port,
            prefix
        );

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
                            tracing::warn!("MQTT publish failed: {e}");
                        }
                    }
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(broadcast::error::RecvError::Closed) => break,
                }
            }
        });

        let mut needs_reconnect = false;
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
                        tracing::warn!(
                            "MQTT handle {topic}: {e:#} | payload={}",
                            if payload.len() > 120 {
                                format!("{}...", &payload[..120])
                            } else {
                                payload.clone()
                            }
                        );
                    }
                }
                Ok(_) => {}
                Err(e) => {
                    tracing::error!("MQTT disconnected: {e}; reconnecting...");
                    needs_reconnect = true;
                    break;
                }
            }
        }

        pub_task.abort();
        if needs_reconnect {
            tokio::time::sleep(Duration::from_secs(2)).await;
        }
    }
}

async fn handle_message(state: &AppState, topic: &str, payload: &str) -> anyhow::Result<()> {
    let parts: Vec<&str> = topic.split('/').collect();
    if parts.len() < 3 {
        return Ok(());
    }

    if parts.last() == Some(&"ack") {
        tracing::info!("device ack: {payload}");
        // topic: {prefix}/{CODE}/ack — setelah boot, dorong kalibrasi DB ke ESP
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(payload) {
            let cmd = v.get("command").and_then(|c| c.as_str()).unwrap_or("");
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
                    });
                    publish_command(state, &m.code, &push.to_string());
                    tracing::info!(
                        "re-push calibration {} thrA={} thrW={}",
                        m.code,
                        m.current_threshold_a,
                        m.power_threshold_w
                    );
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
    let Some(machine) =
        machine_svc::find_by_code_or_device(state, msg.machine_code.as_deref(), &msg.device_uid)
            .await?
    else {
        anyhow::bail!("unknown machine for status {}", msg.device_uid);
    };

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

    tracing::info!(
        "HEALTH {}/{} state={} sensor_ok={} — {}",
        machine.code,
        sensor,
        msg.state,
        sensor_ok,
        detail
    );

    let _ = state.ws_tx.send(WsEvent::DeviceHealth {
        machine_id: machine.id,
        code: machine.code,
        sensor,
        state: msg.state,
        online,
        wifi_ok,
        mqtt_ok,
        sensor_ok,
        detail,
        rssi: msg.rssi,
        fail_count: msg.fail_count,
        ts,
    });
    Ok(())
}

pub async fn ingest_adxl(state: &AppState, msg: AdxlPayload) -> anyhow::Result<()> {
    let Some(mut machine) =
        machine_svc::find_by_code_or_device(state, msg.machine_code.as_deref(), &msg.device_uid)
            .await?
    else {
        anyhow::bail!("unknown machine for device {}", msg.device_uid);
    };

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
    let Some(machine) =
        machine_svc::find_by_code_or_device(state, msg.machine_code.as_deref(), &msg.device_uid)
            .await?
    else {
        anyhow::bail!("unknown machine for device {}", msg.device_uid);
    };

    machine_svc::touch_device(state, machine.id, &msg.device_uid).await?;
    if machine.status_pzem == "offline" {
        detection::mark_sensor_online(state, machine.id, "pzem").await?;
    }
    let machine = machine_svc::find_by_code_or_device(
        state,
        msg.machine_code.as_deref(),
        &msg.device_uid,
    )
    .await?
    .unwrap();
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

        tracing::info!(
            "PZEM {} V={:.1} A={:.3} W={:.1} status={}",
            machine.code,
            msg.voltage_v,
            msg.current_a,
            msg.power_w,
            machine.status_pzem
        );

        // Status badge dari threshold backend; KPI dari counter lokal ESP (selaras LCD).
        detection::evaluate_pzem(state, &machine, msg.current_a, msg.power_w).await?;
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
    } else {
        tracing::warn!(
            "PZEM {} heartbeat sensor_fail — skip evaluate (ESP online)",
            machine.code
        );
        // Heartbeat tetap bisa bawa counter lokal (offline-resilient)
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
