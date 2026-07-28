use chrono::Utc;
use uuid::Uuid;

use crate::models::Machine;
use crate::state::AppState;

pub async fn find_by_id(state: &AppState, id: Uuid) -> anyhow::Result<Option<Machine>> {
    let m = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(id)
        .fetch_optional(&state.pool)
        .await?;
    if let Some(ref machine) = m {
        cache_machine(state, machine, "");
    }
    Ok(m)
}

pub async fn find_by_code_or_device(
    state: &AppState,
    machine_code: Option<&str>,
    device_uid: &str,
) -> anyhow::Result<Option<Machine>> {
    if let Some(code) = machine_code {
        if let Some(m) = state.machine_cache.get(code) {
            return Ok(Some(m.clone()));
        }
    }
    if let Some(m) = state.machine_cache.get(device_uid) {
        return Ok(Some(m.clone()));
    }

    let found = if let Some(code) = machine_code {
        sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE code = $1"#)
            .bind(code)
            .fetch_optional(&state.pool)
            .await?
    } else {
        None
    };

    let m = match found {
        Some(m) => Some(m),
        None => {
            sqlx::query_as::<_, Machine>(
                r#"SELECT m.* FROM machines m
                   JOIN devices d ON d.machine_id = m.id
                   WHERE d.device_uid = $1"#,
            )
            .bind(device_uid)
            .fetch_optional(&state.pool)
            .await?
        }
    };

    if let Some(ref machine) = m {
        cache_machine(state, machine, device_uid);
    }
    Ok(m)
}

pub fn cache_machine(state: &AppState, machine: &Machine, device_uid: &str) {
    state
        .machine_cache
        .insert(machine.code.clone(), machine.clone());
    if !device_uid.is_empty() {
        state
            .machine_cache
            .insert(device_uid.to_string(), machine.clone());
    }
}

pub fn patch_cached_adxl_status(state: &AppState, machine_id: Uuid, status_adxl: &str) {
    for mut entry in state.machine_cache.iter_mut() {
        if entry.id == machine_id {
            entry.status_adxl = status_adxl.to_string();
        }
    }
}

pub fn patch_cached_pzem_status(state: &AppState, machine_id: Uuid, status_pzem: &str) {
    for mut entry in state.machine_cache.iter_mut() {
        if entry.id == machine_id {
            entry.status_pzem = status_pzem.to_string();
        }
    }
}

pub fn patch_cached_adxl_force_off(state: &AppState, machine_id: Uuid, force_off: bool) {
    for mut entry in state.machine_cache.iter_mut() {
        if entry.id == machine_id {
            entry.adxl_force_off = force_off;
            if force_off {
                entry.status_adxl = "off".into();
            }
        }
    }
}

pub async fn touch_device(state: &AppState, machine_id: Uuid, device_uid: &str) -> anyhow::Result<()> {
    sqlx::query(
        r#"INSERT INTO devices (machine_id, device_uid, last_seen_at, is_online)
           VALUES ($1, $2, NOW(), TRUE)
           ON CONFLICT (device_uid) DO UPDATE
           SET last_seen_at = NOW(), is_online = TRUE, machine_id = EXCLUDED.machine_id"#,
    )
    .bind(machine_id)
    .bind(device_uid)
    .execute(&state.pool)
    .await?;
    Ok(())
}

pub async fn open_session(state: &AppState, machine_id: Uuid, energy: Option<f64>) -> anyhow::Result<()> {
    let id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO work_sessions (id, machine_id, started_at, energy_start_kwh)
           VALUES ($1, $2, NOW(), $3)"#,
    )
    .bind(id)
    .bind(machine_id)
    .bind(energy)
    .execute(&state.pool)
    .await?;

    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        rt.open_session_id = Some(id);
    }
    Ok(())
}

pub async fn close_session(state: &AppState, machine_id: Uuid, energy: Option<f64>) -> anyhow::Result<()> {
    let session_id = state
        .runtime
        .get(&machine_id)
        .and_then(|r| r.open_session_id);

    let Some(sid) = session_id else {
        sqlx::query(
            r#"UPDATE work_sessions SET
                ended_at = NOW(),
                energy_end_kwh = $2,
                energy_kwh = CASE WHEN energy_start_kwh IS NOT NULL AND $2 IS NOT NULL
                    THEN GREATEST($2 - energy_start_kwh, 0) ELSE energy_kwh END,
                duration_sec = EXTRACT(EPOCH FROM (NOW() - started_at))::INT
               WHERE machine_id = $1 AND ended_at IS NULL"#,
        )
        .bind(machine_id)
        .bind(energy)
        .execute(&state.pool)
        .await?;
        return Ok(());
    };

    sqlx::query(
        r#"UPDATE work_sessions SET
            ended_at = NOW(),
            energy_end_kwh = $2,
            energy_kwh = CASE WHEN energy_start_kwh IS NOT NULL AND $2 IS NOT NULL
                THEN GREATEST($2 - energy_start_kwh, 0) ELSE NULL END,
            duration_sec = EXTRACT(EPOCH FROM (NOW() - started_at))::INT
           WHERE id = $1"#,
    )
    .bind(sid)
    .bind(energy)
    .execute(&state.pool)
    .await?;

    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        rt.open_session_id = None;
    }

    let today = crate::services::detection::work_date_wib();
    sqlx::query(
        r#"INSERT INTO daily_productivity (machine_id, work_date, running_sec, energy_kwh)
           SELECT machine_id, $2::date,
                  COALESCE(duration_sec, 0),
                  COALESCE(energy_kwh, 0)
           FROM work_sessions WHERE id = $1
           ON CONFLICT (machine_id, work_date) DO UPDATE SET
             running_sec = daily_productivity.running_sec + EXCLUDED.running_sec,
             energy_kwh = daily_productivity.energy_kwh + EXCLUDED.energy_kwh,
             utilization_pct = LEAST(100.0,
               ((daily_productivity.running_sec + EXCLUDED.running_sec)::FLOAT / 86400.0) * 100.0)"#,
    )
    .bind(sid)
    .bind(today)
    .execute(&state.pool)
    .await?;

    Ok(())
}

pub async fn mark_offline_stale(state: &AppState) -> anyhow::Result<()> {
    let timeout = state.cfg.offline_timeout_sec;
    let rows = sqlx::query_as::<_, Machine>(
        r#"SELECT * FROM machines WHERE status <> 'offline' OR status_adxl <> 'offline' OR status_pzem <> 'offline'"#,
    )
    .fetch_all(&state.pool)
    .await?;

    let now = Utc::now();
    for m in rows {
        let (pzem_seen, adxl_seen) = match state.runtime.get(&m.id) {
            Some(r) => (r.pzem.last_seen.or(r.last_seen), r.adxl.last_seen.or(r.last_seen)),
            // ponytail: cold start runtime kosong — jangan mass-offline; tunggu telemetry dulu
            None => (None, None),
        };
        let pzem_stale = pzem_seen
            .map(|seen| (now - seen).num_seconds() >= timeout)
            .unwrap_or(false);
        let adxl_stale = adxl_seen
            .map(|seen| (now - seen).num_seconds() >= timeout)
            .unwrap_or(false);

        if !pzem_stale && !adxl_stale {
            continue;
        }

        let next_pzem = if pzem_stale { "offline" } else { m.status_pzem.as_str() };
        let next_adxl = if adxl_stale { "offline" } else { m.status_adxl.as_str() };
        let next = combined_offline_status(next_adxl, next_pzem);

        if next_pzem == m.status_pzem && next_adxl == m.status_adxl && next == m.status {
            continue;
        }

        if m.status == "running" && next != "running" {
            close_session(state, m.id, None).await?;
        }

        sqlx::query(
            r#"UPDATE machines SET status = $1, status_adxl = $2, status_pzem = $3, updated_at = NOW()
               WHERE id = $4"#,
        )
        .bind(&next)
        .bind(next_adxl)
        .bind(next_pzem)
        .bind(m.id)
        .execute(&state.pool)
        .await?;

        if pzem_stale || adxl_stale {
            sqlx::query(
                r#"INSERT INTO machine_status_log (machine_id, from_status, to_status, reason)
                   VALUES ($1, $2, $3, 'timeout')"#,
            )
            .bind(m.id)
            .bind(&m.status)
            .bind(&next)
            .execute(&state.pool)
            .await?;
        }

        if let Some(mut rt) = state.runtime.get_mut(&m.id) {
            if pzem_stale {
                rt.pzem = crate::models::SensorRuntime::new_offline();
            }
            if adxl_stale {
                rt.adxl = crate::models::SensorRuntime::new_offline();
            }
        }

        let _ = state.ws_tx.send(crate::models::WsEvent::MachineStatus {
            machine_id: m.id,
            code: m.code.clone(),
            status: next.clone(),
            status_adxl: next_adxl.into(),
            status_pzem: next_pzem.into(),
            magnitude_g: None,
            current_a: None,
            power_w: None,
            ts: now,
        });
    }
    Ok(())
}

fn combined_offline_status(adxl: &str, pzem: &str) -> String {
    if adxl == "offline" && pzem == "offline" {
        return "offline".into();
    }
    if adxl == "running" || pzem == "running" {
        return "running".into();
    }
    if adxl == "idle" || pzem == "idle" || adxl == "off" {
        return "idle".into();
    }
    "offline".into()
}
