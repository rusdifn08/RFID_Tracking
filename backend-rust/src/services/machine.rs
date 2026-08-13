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

/// Normalisasi & validasi kode mesin (contoh: JUKI001, SEW-001).
pub fn normalize_machine_code(raw: &str) -> anyhow::Result<String> {
    let u = raw.trim().to_uppercase();
    if u.len() < 3 || u.len() > 32 {
        anyhow::bail!("machine_code panjang tidak valid (3–32): {raw}");
    }
    if !u
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        anyhow::bail!("machine_code karakter tidak valid: {raw}");
    }
    if !u.chars().any(|c| c.is_ascii_alphabetic()) || !u.chars().any(|c| c.is_ascii_digit()) {
        anyhow::bail!("machine_code harus ada huruf dan angka: {raw}");
    }
    Ok(u)
}

fn normalize_device_uid(raw: &str) -> anyhow::Result<String> {
    let u = raw.trim().to_string();
    if u.is_empty() || u.len() > 64 {
        anyhow::bail!("device_uid tidak valid");
    }
    if !u
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
    {
        anyhow::bail!("device_uid karakter tidak valid: {raw}");
    }
    // Alias UID firmware lama → 004 (sticker/QR tetap /ops/ml/004)
    Ok(match u.as_str() {
        "esp-c6-pzem-001" => "004".into(),
        _ => u,
    })
}

/// Parse JUKI002 → brand=JUKI, name, barcode MESIN002
fn identity_from_code(code: &str) -> (String, String, String, Option<String>) {
    let bytes = code.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() && bytes[i].is_ascii_alphabetic() {
        i += 1;
    }
    let brand = if i > 0 {
        code[..i].to_string()
    } else {
        "MESIN".into()
    };
    let mut j = i;
    while j < bytes.len() && (bytes[j] == b'-' || bytes[j] == b'_') {
        j += 1;
    }
    let digits: String = code[j..].chars().filter(|c| c.is_ascii_digit()).collect();
    let num: u32 = digits.parse().unwrap_or(0);
    let process_name = if brand == "JUKI" {
        "Zigzag Plaket".into()
    } else {
        String::new()
    };
    let name = if process_name.is_empty() {
        format!("{brand} {digits}")
    } else {
        format!("{brand} {process_name}")
    };
    let barcode = if (1..=100).contains(&num) {
        Some(format!("MESIN{num:03}"))
    } else {
        None
    };
    (name, brand, process_name, barcode)
}

pub async fn find_by_code_or_device(
    state: &AppState,
    machine_code: Option<&str>,
    device_uid: &str,
) -> anyhow::Result<Option<Machine>> {
    if let Some(code) = machine_code {
        let code = code.trim().to_uppercase();
        if let Some(m) = state.machine_cache.get(&code) {
            return Ok(Some(m.clone()));
        }
    }
    if !device_uid.is_empty() {
        if let Some(m) = state.machine_cache.get(device_uid) {
            return Ok(Some(m.clone()));
        }
    }

    // Kode mesin = identitas utama (jangan fallback device jika code ada tapi belum terdaftar)
    if let Some(code) = machine_code {
        let code = code.trim().to_uppercase();
        if !code.is_empty() {
            let found = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE code = $1"#)
                .bind(&code)
                .fetch_optional(&state.pool)
                .await?;
            if let Some(ref machine) = found {
                cache_machine(state, machine, device_uid);
                return Ok(found);
            }
            return Ok(None);
        }
    }

    if device_uid.is_empty() {
        return Ok(None);
    }

    let found = sqlx::query_as::<_, Machine>(
        r#"SELECT m.* FROM machines m
           JOIN devices d ON d.machine_id = m.id
           WHERE d.device_uid = $1"#,
    )
    .bind(device_uid)
    .fetch_optional(&state.pool)
    .await?;

    if let Some(ref machine) = found {
        cache_machine(state, machine, device_uid);
    }
    Ok(found)
}

/// UID yang sengaja tidak dipakai — jangan auto-daftar dari MQTT.
fn is_blocked_device_uid(uid: &str) -> bool {
    matches!(uid.trim(), "0001" | "0002")
}

fn is_blocked_machine_code(code: &str) -> bool {
    matches!(code.trim(), "JUKI0001" | "JUKI0002")
}

/// Cari mesin; jika belum ada dan `machine_code` valid → buat otomatis + tautkan device.
pub async fn find_or_provision(
    state: &AppState,
    machine_code: Option<&str>,
    device_uid: &str,
) -> anyhow::Result<Machine> {
    let uid = if device_uid.trim().is_empty() {
        String::new()
    } else {
        normalize_device_uid(device_uid)?
    };

    if !uid.is_empty() && is_blocked_device_uid(&uid) {
        anyhow::bail!("device_uid {uid} dinonaktifkan (tidak dipakai)");
    }

    // Binding device_uid sudah ada → jangan ikut machine_code MQTT (sering salah di ESP)
    if !uid.is_empty() {
        if let Some(m) = find_by_code_or_device(state, None, &uid).await? {
            touch_device(state, m.id, &uid).await?;
            cache_machine(state, &m, &uid);
            return Ok(m);
        }
    }

    if let Some(m) = find_by_code_or_device(state, machine_code, &uid).await? {
        if !uid.is_empty() {
            touch_device(state, m.id, &uid).await?;
            cache_machine(state, &m, &uid);
        }
        return Ok(m);
    }

    let raw_code = machine_code.unwrap_or("").trim();
    if raw_code.is_empty() {
        anyhow::bail!("machine_code wajib untuk auto-daftar device {device_uid}");
    }
    let code = normalize_machine_code(raw_code)?;
    if is_blocked_machine_code(&code) {
        anyhow::bail!("machine_code {code} dinonaktifkan (tidak dipakai)");
    }
    let (name, brand, process_name, barcode) = identity_from_code(&code);

    let row = sqlx::query_as::<_, Machine>(
        r#"INSERT INTO machines (code, name, brand, process_name, machine_type, kpi_source)
           VALUES ($1, $2, $3, $4, 'sewing', 'esp')
           ON CONFLICT (code) DO UPDATE SET
             updated_at = NOW()
           RETURNING *"#,
    )
    .bind(&code)
    .bind(&name)
    .bind(&brand)
    .bind(&process_name)
    .fetch_one(&state.pool)
    .await?;

    // Barcode MESIN00N hanya jika belum dipakai mesin lain
    if let Some(bc) = barcode.as_deref() {
        let _ = sqlx::query(
            r#"UPDATE machines SET barcode = $2, updated_at = NOW()
               WHERE id = $1
                 AND barcode IS NULL
                 AND NOT EXISTS (SELECT 1 FROM machines WHERE barcode = $2)"#,
        )
        .bind(row.id)
        .bind(bc)
        .execute(&state.pool)
        .await;
    }

    // reload setelah barcode opsional
    let row = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(row.id)
        .fetch_one(&state.pool)
        .await?;

    if !uid.is_empty() {
        touch_device(state, row.id, &uid).await?;
    }
    cache_machine(state, &row, &uid);
    tracing::info!(
        "auto-provision machine {} device={} name={}",
        row.code,
        uid,
        row.name
    );
    Ok(row)
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

pub fn invalidate_code_cache(state: &AppState, old_code: &str) {
    state.machine_cache.remove(old_code);
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
    let uid = normalize_device_uid(device_uid)?;
    // ponytail: jangan pindah machine_id saat UPSERT — binding UID sekali set, ubah lewat Control
    sqlx::query(
        r#"INSERT INTO devices (machine_id, device_uid, last_seen_at, is_online)
           VALUES ($1, $2, NOW(), TRUE)
           ON CONFLICT (device_uid) DO UPDATE
           SET last_seen_at = NOW(), is_online = TRUE"#,
    )
    .bind(machine_id)
    .bind(&uid)
    .execute(&state.pool)
    .await?;
    // Bersihkan UID lama jika masih tersisa di DB
    if device_uid.trim() != uid {
        let _ = sqlx::query(r#"DELETE FROM devices WHERE device_uid = $1"#)
            .bind(device_uid.trim())
            .execute(&state.pool)
            .await;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{identity_from_code, is_blocked_device_uid, is_blocked_machine_code, normalize_machine_code};

    #[test]
    fn block_zigbee_dummy_0001_0002() {
        assert!(is_blocked_device_uid("0001"));
        assert!(is_blocked_device_uid("0002"));
        assert!(!is_blocked_device_uid("004"));
        assert!(is_blocked_machine_code("JUKI0001"));
        assert!(!is_blocked_machine_code("SEW-001"));
    }

    #[test]
    fn code_normalize_ok() {
        assert_eq!(normalize_machine_code(" juki002 ").unwrap(), "JUKI002");
        assert_eq!(normalize_machine_code("SEW-001").unwrap(), "SEW-001");
    }

    #[test]
    fn code_normalize_bad() {
        assert!(normalize_machine_code("!!").is_err());
        assert!(normalize_machine_code("ONLYLETTER").is_err());
        assert!(normalize_machine_code("123").is_err());
    }

    #[test]
    fn identity_juki() {
        let (name, brand, proc, barcode) = identity_from_code("JUKI002");
        assert_eq!(brand, "JUKI");
        assert_eq!(proc, "Zigzag Plaket");
        assert!(name.contains("JUKI"));
        assert_eq!(barcode.as_deref(), Some("MESIN002"));
    }
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

        if pzem_stale {
            let _ = sqlx::query(
                r#"UPDATE devices SET is_online = FALSE, wifi_ok = FALSE, mqtt_ok = FALSE
                   WHERE machine_id = $1"#,
            )
            .bind(m.id)
            .execute(&state.pool)
            .await;
        }

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
