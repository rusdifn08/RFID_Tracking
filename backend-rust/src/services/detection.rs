use chrono::{Duration as ChronoDuration, FixedOffset, TimeZone, Utc};
use uuid::Uuid;

use crate::models::{Machine, MachineRuntime, SensorRuntime, WsEvent};
use crate::services::{compare, machine as machine_svc};
use crate::state::AppState;

/// Arus di bawah ini = mesin mati (OFF). Idle / MSN ON mulai >= 0.01 A.
pub const PZEM_OFF_CURRENT_A: f64 = 0.01;

/// Setelah reset_day: tolak counter ESP non-zero sebentar (tunggu ESP konfirmasi 0).
/// Grace habis → selalu ikut ESP (angka LCD). Jangan pakai tahun — reset MQTT gagal
/// membuat dashboard under-count seharian.
const ESP_RESET_GRACE: ChronoDuration = ChronoDuration::seconds(90);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum EspKpiAction {
    /// Tulis run/loss/off dari ESP ke cache+DB.
    Apply,
    /// Abaikan paket ini.
    Skip,
}

/// Keputusan terima counter ESP agar dashboard = LCD.
/// `ignore_until`: deadline grace setelah reset_day (None = tidak dalam grace).
fn esp_kpi_accept(
    ignore_until: Option<chrono::DateTime<Utc>>,
    incoming: i32,
    db_total: i32,
    now: chrono::DateTime<Utc>,
) -> (EspKpiAction, bool) {
    // return (action, clear_ignore)
    match ignore_until {
        Some(_) if incoming == 0 => (EspKpiAction::Apply, true),
        Some(until) if now < until => (EspKpiAction::Skip, false),
        // ponytail: grace habis / ignore basi → percaya ESP; upgrade: work_date di payload
        Some(_) => (EspKpiAction::Apply, true),
        None if incoming == 0 && db_total > 0 => (EspKpiAction::Skip, false),
        None => (EspKpiAction::Apply, false),
    }
}

/// Tanggal kerja pabrik = kalender WIB (UTC+7), cut 00:00 WIB.
pub fn work_date_wib() -> chrono::NaiveDate {
    let wib = FixedOffset::east_opt(7 * 3600).expect("UTC+7");
    wib.from_utc_datetime(&Utc::now().naive_utc()).date_naive()
}

/// Setiap ganti hari WIB: nolkan cache KPI + MQTT reset_day ke ESP.
/// Baris kemarin di `detection_compare_daily` tetap (history Resume).
pub async fn run_day_cut_loop(state: AppState) {
    let mut last = work_date_wib();
    tracing::info!("day-cut loop start, work_date WIB={}", last);
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(15)).await;
        let today = work_date_wib();
        if today == last {
            continue;
        }
        tracing::info!("WIB day cut {} → {} — reset ESP + cache KPI", last, today);
        last = today;
        if let Err(e) = cut_all_machines_for_new_day(&state).await {
            tracing::error!("day cut failed: {e:#}");
        }
    }
}

async fn cut_all_machines_for_new_day(state: &AppState) -> anyhow::Result<()> {
    let machines = sqlx::query_as::<_, (Uuid, String)>(r#"SELECT id, code FROM machines ORDER BY code"#)
        .fetch_all(&state.pool)
        .await?;
    let now = Utc::now();
    for (id, code) in machines {
        if let Some(mut rt) = state.runtime.get_mut(&id) {
            rt.last_pzem_totals = Some((0, 0, 0));
            rt.last_adxl_totals = Some((0, 0, 0));
            rt.last_pzem_tick_at = Some(now);
            rt.last_adxl_tick_at = Some(now);
            // Grace singkat: kalau ESP belum 0, setelah 90s tetap ikut angka LCD.
            rt.pzem_ignore_esp_until = Some(now + ESP_RESET_GRACE);
            rt.adxl_ignore_esp_until = Some(now + ESP_RESET_GRACE);
        }
        let pzem = serde_json::json!({ "command": "reset_day", "sensor": "pzem" }).to_string();
        let adxl = serde_json::json!({ "command": "reset_day", "sensor": "adxl" }).to_string();
        crate::mqtt::publish_command(state, &code, &pzem);
        crate::mqtt::publish_command(state, &code, &adxl);
        tracing::info!("day cut reset_day → {}", code);
    }
    Ok(())
}

pub async fn evaluate_adxl(
    state: &AppState,
    machine: &Machine,
    magnitude: f64,
) -> anyhow::Result<()> {
    let now = Utc::now();
    let mut rt = state
        .runtime
        .entry(machine.id)
        .or_insert_with(MachineRuntime::new);

    rt.last_magnitude_g = Some(magnitude);
    rt.last_seen = Some(now);
    rt.adxl.last_seen = Some(now);

    // Sticky peak = lastVibrationTime (filter_diam); status ikut sticky langsung.
    // Paksa mati dari dashboard → abaikan getaran.
    if machine.adxl_force_off {
        let next = "off".to_string();
        rt.adxl = apply_debounce(&rt.adxl, false, now);
        let elapsed_sec = match rt.last_adxl_tick_at {
            Some(t) => {
                let secs = (now - t).num_seconds();
                if secs >= 1 {
                    rt.last_adxl_tick_at = Some(now);
                    secs.min(2) as i32
                } else {
                    0
                }
            }
            None => {
                rt.last_adxl_tick_at = Some(now);
                0
            }
        };
        if next == machine.status_adxl {
            drop(rt);
            if elapsed_sec > 0 {
                record_adxl_sample(state, machine.id, &next, magnitude, elapsed_sec).await?;
            }
            return Ok(());
        }
        let from = machine.status_adxl.clone();
        drop(rt);
        sqlx::query(
            r#"UPDATE machines SET status_adxl = $1, updated_at = NOW() WHERE id = $2"#,
        )
        .bind(&next)
        .bind(machine.id)
        .execute(&state.pool)
        .await?;
        sqlx::query(
            r#"INSERT INTO sensor_status_log (machine_id, sensor, from_status, to_status, magnitude_g)
               VALUES ($1, 'adxl', $2, $3, $4)"#,
        )
        .bind(machine.id)
        .bind(&from)
        .bind(&next)
        .bind(magnitude)
        .execute(&state.pool)
        .await?;
        if let Some(mut rt) = state.runtime.get_mut(&machine.id) {
            rt.adxl.status = next.clone();
        }
        machine_svc::patch_cached_adxl_status(state, machine.id, &next);
        sync_combined(state, machine.id).await?;
        if elapsed_sec > 0 {
            record_adxl_sample(state, machine.id, &next, magnitude, elapsed_sec).await?;
        }
        return Ok(());
    }

    if magnitude >= machine.g_force_threshold {
        rt.last_adxl_peak_above_at = Some(now);
    }
    let want_active = rt
        .last_adxl_peak_above_at
        .map(|t| (now - t).num_milliseconds() < machine.filter_diam_ms as i64)
        .unwrap_or(false);
    let next = adxl_next_status(machine.status_adxl.as_str(), want_active, magnitude);
    rt.adxl = apply_debounce(&rt.adxl, want_active, now);

    // Akumulasi waktu max ~1x/detik meski MQTT 5 Hz
    let elapsed_sec = match rt.last_adxl_tick_at {
        Some(t) => {
            let secs = (now - t).num_seconds();
            if secs >= 1 {
                rt.last_adxl_tick_at = Some(now);
                secs.min(2) as i32
            } else {
                0
            }
        }
        None => {
            rt.last_adxl_tick_at = Some(now);
            0
        }
    };

    if next == machine.status_adxl {
        drop(rt);
        if elapsed_sec > 0 {
            record_adxl_sample(state, machine.id, &next, magnitude, elapsed_sec).await?;
        }
        return Ok(());
    }

    let from = machine.status_adxl.clone();
    drop(rt);

    sqlx::query(
        r#"UPDATE machines SET status_adxl = $1, updated_at = NOW() WHERE id = $2"#,
    )
    .bind(&next)
    .bind(machine.id)
    .execute(&state.pool)
    .await?;

    sqlx::query(
        r#"INSERT INTO sensor_status_log (machine_id, sensor, from_status, to_status, magnitude_g)
           VALUES ($1, 'adxl', $2, $3, $4)"#,
    )
    .bind(machine.id)
    .bind(&from)
    .bind(&next)
    .bind(magnitude)
    .execute(&state.pool)
    .await?;

    if let Some(mut rt) = state.runtime.get_mut(&machine.id) {
        rt.adxl.status = next.clone();
    }
    machine_svc::patch_cached_adxl_status(state, machine.id, &next);

    sync_combined(state, machine.id).await?;
    if elapsed_sec > 0 {
        record_adxl_sample(state, machine.id, &next, magnitude, elapsed_sec).await?;
    }
    compare::maybe_record(state, machine.id).await?;
    Ok(())
}

pub async fn evaluate_pzem(
    state: &AppState,
    machine: &Machine,
    current_a: f64,
    power_w: f64,
) -> anyhow::Result<()> {
    let now = Utc::now();
    let mut rt = state
        .runtime
        .entry(machine.id)
        .or_insert_with(MachineRuntime::new);

    rt.last_current_a = Some(current_a);
    rt.last_power_w = Some(power_w);
    rt.last_seen = Some(now);
    rt.pzem.last_seen = Some(now);

    // ponytail: status PZEM murni pakai arus (A) saja.
    // Off < off_current_a, idle = off_current_a <= A < current_threshold_a, running >= current_threshold_a.
    let want_running = current_a >= machine.current_threshold_a;
    let next = pzem_next_status(
        &rt.pzem,
        machine.status_pzem.as_str(),
        current_a,
        want_running,
        machine.off_current_a,
        machine.filter_aktif_ms,
        machine.filter_diam_ms,
    );
    rt.pzem = apply_debounce(&rt.pzem, want_running, now);

    // Akumulasi max ~1x/detik (sama ADXL) — jangan +1 per paket MQTT
    let elapsed_sec = match rt.last_pzem_tick_at {
        Some(t) => {
            let secs = (now - t).num_seconds();
            if secs >= 1 {
                rt.last_pzem_tick_at = Some(now);
                secs.min(2) as i32
            } else {
                0
            }
        }
        None => {
            rt.last_pzem_tick_at = Some(now);
            0
        }
    };

    if next == machine.status_pzem {
        drop(rt);
        if elapsed_sec > 0 {
            record_pzem_sample(state, machine.id, &next, current_a, elapsed_sec).await?;
        }
        compare::maybe_record(state, machine.id).await?;
        return Ok(());
    }

    let from = machine.status_pzem.clone();
    drop(rt);

    sqlx::query(
        r#"UPDATE machines SET status_pzem = $1, updated_at = NOW() WHERE id = $2"#,
    )
    .bind(&next)
    .bind(machine.id)
    .execute(&state.pool)
    .await?;

    sqlx::query(
        r#"INSERT INTO sensor_status_log (machine_id, sensor, from_status, to_status, current_a, power_w)
           VALUES ($1, 'pzem', $2, $3, $4, $5)"#,
    )
    .bind(machine.id)
    .bind(&from)
    .bind(&next)
    .bind(current_a)
    .bind(power_w)
    .execute(&state.pool)
    .await?;

    if let Some(mut rt) = state.runtime.get_mut(&machine.id) {
        rt.pzem.status = next.clone();
    }
    machine_svc::patch_cached_pzem_status(state, machine.id, &next);

    sync_combined(state, machine.id).await?;
    if elapsed_sec > 0 {
        record_pzem_sample(state, machine.id, &next, current_a, elapsed_sec).await?;
    }
    compare::maybe_record(state, machine.id).await?;
    Ok(())
}

/// Arus < off_thr → mati; di bawah run_thr → idle; ≥ run_thr → running (dengan filter aktif/diam).
fn pzem_next_status(
    rt: &SensorRuntime,
    current: &str,
    current_a: f64,
    want_running: bool,
    off_current_a: f64,
    filter_aktif_ms: i32,
    filter_diam_ms: i32,
) -> String {
    let off_a = if off_current_a > 0.0 {
        off_current_a
    } else {
        PZEM_OFF_CURRENT_A
    };
    let now = Utc::now();
    let effective = if current == "offline" { "off" } else { current };
    let want_off = current_a < off_a;

    if want_running {
        match rt.active_since {
            None => effective.to_string(),
            Some(since) => {
                let ms = (now - since).num_milliseconds();
                if ms >= filter_aktif_ms as i64 && effective != "running" {
                    "running".into()
                } else {
                    effective.to_string()
                }
            }
        }
    } else if want_off {
        // Keluar Running butuh filter diam; selain itu langsung mati jika A≈0
        if effective == "running" {
            match rt.idle_since {
                None => effective.to_string(),
                Some(since) => {
                    let ms = (now - since).num_milliseconds();
                    if ms >= filter_diam_ms as i64 {
                        "off".into()
                    } else {
                        effective.to_string()
                    }
                }
            }
        } else {
            "off".into()
        }
    } else {
        // 0 < A < threshold → idle
        if effective == "running" {
            match rt.idle_since {
                None => effective.to_string(),
                Some(since) => {
                    let ms = (now - since).num_milliseconds();
                    if ms >= filter_diam_ms as i64 {
                        "idle".into()
                    } else {
                        effective.to_string()
                    }
                }
            }
        } else {
            "idle".into()
        }
    }
}

#[allow(dead_code)]
fn debounce_status(
    rt: &SensorRuntime,
    current: &str,
    want_active: bool,
    filter_aktif_ms: i32,
    filter_diam_ms: i32,
) -> String {
    // Dipakai ADXL path lama / legacy — PZEM pakai pzem_next_status
    let now = Utc::now();
    let effective = if current == "offline" { "idle" } else { current };
    if want_active {
        match rt.active_since {
            None => effective.to_string(),
            Some(since) => {
                let ms = (now - since).num_milliseconds();
                if ms >= filter_aktif_ms as i64 && effective != "running" {
                    "running".into()
                } else {
                    effective.to_string()
                }
            }
        }
    } else {
        match rt.idle_since {
            None => effective.to_string(),
            Some(since) => {
                let ms = (now - since).num_milliseconds();
                if ms >= filter_diam_ms as i64 && effective == "running" {
                    "idle".into()
                } else {
                    effective.to_string()
                }
            }
        }
    }
}

/// ADXL: running jika sticky peak; idle jika ada getaran kecil; off jika ≈ diam.
fn adxl_next_status(current: &str, want_active: bool, magnitude: f64) -> String {
    const OFF_G: f64 = 0.02;
    let effective = if current == "offline" { "off" } else { current };
    if want_active {
        "running".into()
    } else if magnitude < OFF_G {
        "off".into()
    } else if effective == "running" {
        "idle".into()
    } else {
        "idle".into()
    }
}

fn apply_debounce(rt: &SensorRuntime, want_active: bool, now: chrono::DateTime<Utc>) -> SensorRuntime {
    let mut out = rt.clone();
    if want_active {
        out.idle_since = None;
        if out.active_since.is_none() {
            out.active_since = Some(now);
        }
    } else {
        out.active_since = None;
        if out.idle_since.is_none() {
            out.idle_since = Some(now);
        }
    }
    out
}

async fn sync_combined(state: &AppState, machine_id: Uuid) -> anyhow::Result<()> {
    let machine = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(machine_id)
        .fetch_one(&state.pool)
        .await?;

    let adxl = machine.status_adxl.as_str();
    let pzem = machine.status_pzem.as_str();
    let combined = combined_status(adxl, pzem);
    if combined == machine.status {
        broadcast_status(state, &machine).await?;
        return Ok(());
    }

    let from = machine.status.clone();
    sqlx::query(r#"UPDATE machines SET status = $1, updated_at = NOW() WHERE id = $2"#)
        .bind(&combined)
        .bind(machine_id)
        .execute(&state.pool)
        .await?;

    sqlx::query(
        r#"INSERT INTO machine_status_log (machine_id, from_status, to_status, reason, magnitude_g, power_w)
           VALUES ($1, $2, $3, 'combined_or', $4, $5)"#,
    )
    .bind(machine_id)
    .bind(&from)
    .bind(&combined)
    .bind(
        state
            .runtime
            .get(&machine_id)
            .and_then(|r| r.last_magnitude_g),
    )
    .bind(
        state
            .runtime
            .get(&machine_id)
            .and_then(|r| r.last_power_w),
    )
    .execute(&state.pool)
    .await?;

    let energy = state
        .runtime
        .get(&machine_id)
        .and_then(|r| r.last_energy_kwh);

    if combined == "running" && from != "running" {
        machine_svc::open_session(state, machine_id, energy).await?;
    } else if from == "running" && combined != "running" {
        machine_svc::close_session(state, machine_id, energy).await?;
    }

    let updated = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(machine_id)
        .fetch_one(&state.pool)
        .await?;
    broadcast_status(state, &updated).await?;
    Ok(())
}

fn combined_status(adxl: &str, pzem: &str) -> String {
    if adxl == "offline" && pzem == "offline" {
        return "offline".into();
    }
    if adxl == "running" || pzem == "running" {
        return "running".into();
    }
    if adxl == "idle" || pzem == "idle" {
        return "idle".into();
    }
    if adxl == "off" || pzem == "off" {
        return "off".into();
    }
    "offline".into()
}

async fn broadcast_status(state: &AppState, machine: &Machine) -> anyhow::Result<()> {
    let rt = state.runtime.get(&machine.id);
    let mag = rt.as_ref().and_then(|r| r.last_magnitude_g);
    let cur = rt.as_ref().and_then(|r| r.last_current_a);
    let pwr = rt.as_ref().and_then(|r| r.last_power_w);
    let now = Utc::now();

    let _ = state.ws_tx.send(WsEvent::MachineStatus {
        machine_id: machine.id,
        code: machine.code.clone(),
        status: machine.status.clone(),
        status_adxl: machine.status_adxl.clone(),
        status_pzem: machine.status_pzem.clone(),
        magnitude_g: mag,
        current_a: cur,
        power_w: pwr,
        ts: now,
    });
    Ok(())
}

/// Catat waktu running/idle/mati PZEM; `elapsed_sec` agar aman di MQTT >1 Hz.
pub async fn record_pzem_sample(
    state: &AppState,
    machine_id: Uuid,
    status_pzem: &str,
    current_a: f64,
    elapsed_sec: i32,
) -> anyhow::Result<()> {
    if status_pzem == "offline" || elapsed_sec <= 0 {
        return Ok(());
    }
    // Percaya status hasil evaluate (bukan re-klasifikasi dari arus).
    let _ = current_a;
    let (run_add, idle_add, off_add) = match status_pzem {
        "running" => (elapsed_sec, 0, 0),
        "idle" => (0, elapsed_sec, 0),
        _ => (0, 0, elapsed_sec), // off / error
    };

    // Update cache dulu supaya WS langsung naik setelah reset (tanpa tunggu Neon)
    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        let (r, i, o) = rt.last_pzem_totals.unwrap_or((0, 0, 0));
        rt.last_pzem_totals = Some((r + run_add, i + idle_add, o + off_add));
    }

    let today = work_date_wib();
    let _ = sqlx::query(
        r#"INSERT INTO detection_compare_daily
           (machine_id, work_date, pzem_running_sec, pzem_idle_sec, pzem_off_sec)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (machine_id, work_date) DO UPDATE SET
             pzem_running_sec = detection_compare_daily.pzem_running_sec + EXCLUDED.pzem_running_sec,
             pzem_idle_sec = detection_compare_daily.pzem_idle_sec + EXCLUDED.pzem_idle_sec,
             pzem_off_sec = detection_compare_daily.pzem_off_sec + EXCLUDED.pzem_off_sec"#,
    )
    .bind(machine_id)
    .bind(today)
    .bind(run_add)
    .bind(idle_add)
    .bind(off_add)
    .execute(&state.pool)
    .await;
    Ok(())
}

pub async fn pzem_daily_totals(state: &AppState, machine_id: Uuid) -> anyhow::Result<(i32, i32, i32)> {
    if let Some(rt) = state.runtime.get(&machine_id) {
        if let Some(t) = rt.last_pzem_totals {
            return Ok(t);
        }
    }
    pzem_daily_totals_from_db(state, machine_id).await
}

/// Timpa counter harian dari ESP — dipakai saat kpi_source = "esp" (selaras LCD).
pub async fn set_pzem_totals_from_esp(
    state: &AppState,
    machine_id: Uuid,
    run_sec: i32,
    loss_sec: i32,
    off_sec: i32,
) -> anyhow::Result<()> {
    let now = Utc::now();
    let incoming = run_sec.saturating_add(loss_sec).saturating_add(off_sec);
    let (er, ei, eo) = pzem_daily_totals_from_db(state, machine_id).await?;
    let db_total = er.saturating_add(ei).saturating_add(eo);
    let ignore = state
        .runtime
        .get(&machine_id)
        .and_then(|rt| rt.pzem_ignore_esp_until);
    let (action, clear_ignore) = esp_kpi_accept(ignore, incoming, db_total, now);
    if action == EspKpiAction::Skip {
        if incoming == 0 && db_total > 0 && ignore.is_none() {
            tracing::warn!(
                "skip ESP zero totals for {} (DB already has R={} I={} O={})",
                machine_id,
                er,
                ei,
                eo
            );
        }
        return Ok(());
    }

    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        if clear_ignore {
            rt.pzem_ignore_esp_until = None;
        }
        rt.last_pzem_totals = Some((run_sec, loss_sec, off_sec));
        rt.last_pzem_tick_at = Some(now);
    }
    let today = work_date_wib();
    let _ = sqlx::query(
        r#"INSERT INTO detection_compare_daily
           (machine_id, work_date, pzem_running_sec, pzem_idle_sec, pzem_off_sec)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (machine_id, work_date) DO UPDATE SET
             pzem_running_sec = EXCLUDED.pzem_running_sec,
             pzem_idle_sec = EXCLUDED.pzem_idle_sec,
             pzem_off_sec = EXCLUDED.pzem_off_sec"#,
    )
    .bind(machine_id)
    .bind(today)
    .bind(run_sec)
    .bind(loss_sec)
    .bind(off_sec)
    .execute(&state.pool)
    .await?;
    Ok(())
}

/// Timpa counter harian ADXL dari ESP (selaras dashboard ↔ ESP).
pub async fn set_adxl_totals_from_esp(
    state: &AppState,
    machine_id: Uuid,
    run_sec: i32,
    loss_sec: i32,
    off_sec: i32,
) -> anyhow::Result<()> {
    let now = Utc::now();
    let incoming = run_sec.saturating_add(loss_sec).saturating_add(off_sec);
    let (er, ei, eo) = adxl_daily_totals(state, machine_id).await?;
    let db_total = er.saturating_add(ei).saturating_add(eo);
    let ignore = state
        .runtime
        .get(&machine_id)
        .and_then(|rt| rt.adxl_ignore_esp_until);
    let (action, clear_ignore) = esp_kpi_accept(ignore, incoming, db_total, now);
    if action == EspKpiAction::Skip {
        return Ok(());
    }
    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        if clear_ignore {
            rt.adxl_ignore_esp_until = None;
        }
        rt.last_adxl_totals = Some((run_sec, loss_sec, off_sec));
        rt.last_adxl_tick_at = Some(now);
    }
    let today = work_date_wib();
    let _ = sqlx::query(
        r#"INSERT INTO detection_compare_daily
           (machine_id, work_date, adxl_running_sec, adxl_idle_sec, adxl_off_sec)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (machine_id, work_date) DO UPDATE SET
             adxl_running_sec = EXCLUDED.adxl_running_sec,
             adxl_idle_sec = EXCLUDED.adxl_idle_sec,
             adxl_off_sec = EXCLUDED.adxl_off_sec"#,
    )
    .bind(machine_id)
    .bind(today)
    .bind(run_sec)
    .bind(loss_sec)
    .bind(off_sec)
    .execute(&state.pool)
    .await;
    Ok(())
}

pub async fn pzem_daily_totals_from_db(
    state: &AppState,
    machine_id: Uuid,
) -> anyhow::Result<(i32, i32, i32)> {
    let today = work_date_wib();
    let row = sqlx::query_as::<_, (i32, i32, i32)>(
        r#"SELECT COALESCE(pzem_running_sec, 0), COALESCE(pzem_idle_sec, 0), COALESCE(pzem_off_sec, 0)
           FROM detection_compare_daily
           WHERE machine_id = $1 AND work_date = $2"#,
    )
    .bind(machine_id)
    .bind(today)
    .fetch_optional(&state.pool)
    .await?;
    Ok(row.unwrap_or((0, 0, 0)))
}

/// Hitung ulang running/idle/off dari telemetry — bucket per menit (sama grafik Compare).
pub async fn pzem_band_totals_from_telemetry(
    state: &AppState,
    from: chrono::NaiveDate,
    to: chrono::NaiveDate,
) -> anyhow::Result<std::collections::HashMap<(Uuid, chrono::NaiveDate), (i32, i32, i32)>> {
    let rows = sqlx::query_as::<_, (Uuid, chrono::NaiveDate, i32, i32, i32)>(
        r#"
        WITH day_bounds AS (
          SELECT m.id AS machine_id,
                 gs::date AS work_date,
                 COALESCE(NULLIF(m.off_current_a, 0), 0.01) AS off_a,
                 CASE
                   WHEN m.current_threshold_a > COALESCE(NULLIF(m.off_current_a, 0), 0.01)
                     THEN m.current_threshold_a
                   ELSE COALESCE(NULLIF(m.off_current_a, 0), 0.01) + 0.001
                 END AS run_a,
                 COALESCE(m.power_threshold_w, 0) AS power_thr,
                 ((gs::timestamp) AT TIME ZONE 'Asia/Jakarta') AS t0,
                 (((gs::timestamp) + interval '1 day') AT TIME ZONE 'Asia/Jakarta') AS t1
          FROM machines m
          CROSS JOIN generate_series($1::date, $2::date, interval '1 day') AS gs
        ),
        mins AS (
          SELECT d.machine_id, d.work_date, d.off_a, d.run_a, d.power_thr,
                 date_trunc('minute', t.ts) AS minute_ts,
                 AVG(t.current_a)::float8 AS current_a,
                 AVG(t.power_w)::float8 AS power_w
          FROM day_bounds d
          INNER JOIN telemetry_pzem t
            ON t.machine_id = d.machine_id AND t.ts >= d.t0 AND t.ts < d.t1
          GROUP BY d.machine_id, d.work_date, d.off_a, d.run_a, d.power_thr, date_trunc('minute', t.ts)
        ),
        ordered AS (
          SELECT machine_id, work_date, off_a, run_a, power_thr, minute_ts, current_a, power_w,
                 LAG(minute_ts) OVER (PARTITION BY machine_id, work_date ORDER BY minute_ts) AS prev_ts
          FROM mins
        ),
        segs AS (
          SELECT machine_id, work_date, off_a, run_a, power_thr, current_a, power_w,
                 LEAST(300, GREATEST(0, EXTRACT(EPOCH FROM (minute_ts - prev_ts))::int)) AS dt
          FROM ordered
          WHERE prev_ts IS NOT NULL
        )
        SELECT machine_id, work_date,
          COALESCE(SUM(dt) FILTER (
            WHERE current_a >= off_a
              AND (current_a >= run_a OR (power_thr > 0 AND power_w >= power_thr))
          ), 0)::int AS run_sec,
          COALESCE(SUM(dt) FILTER (
            WHERE current_a >= off_a
              AND NOT (current_a >= run_a OR (power_thr > 0 AND power_w >= power_thr))
          ), 0)::int AS idle_sec,
          COALESCE(SUM(dt) FILTER (WHERE current_a < off_a), 0)::int AS off_sec
        FROM segs
        GROUP BY machine_id, work_date
        "#,
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.pool)
    .await?;

    let mut map = std::collections::HashMap::with_capacity(rows.len());
    let today = work_date_wib();

    // kpi_source=esp → counter resmi dari ESP; jangan ditimpa hitungan telemetry
    let esp_ids: std::collections::HashSet<Uuid> = sqlx::query_as::<_, (Uuid,)>(
        r#"SELECT id FROM machines WHERE kpi_source = 'esp'"#,
    )
    .fetch_all(&state.pool)
    .await?
    .into_iter()
    .map(|(id,)| id)
    .collect();

    for (mid, wd, run, idle, off) in rows {
        map.insert((mid, wd), (run, idle, off));
        if esp_ids.contains(&mid) {
            continue;
        }
        // Simpan hasil hitungan telemetry agar Resume = Compare (mode telemetry saja)
        let _ = sqlx::query(
            r#"INSERT INTO detection_compare_daily
               (machine_id, work_date, pzem_running_sec, pzem_idle_sec, pzem_off_sec)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (machine_id, work_date) DO UPDATE SET
                 pzem_running_sec = EXCLUDED.pzem_running_sec,
                 pzem_idle_sec = EXCLUDED.pzem_idle_sec,
                 pzem_off_sec = EXCLUDED.pzem_off_sec"#,
        )
        .bind(mid)
        .bind(wd)
        .bind(run)
        .bind(idle)
        .bind(off)
        .execute(&state.pool)
        .await;
        if wd == today {
            if let Some(mut rt) = state.runtime.get_mut(&mid) {
                rt.last_pzem_totals = Some((run, idle, off));
            }
        }
    }
    Ok(map)
}

pub fn pzem_pcts(running_sec: i32, idle_sec: i32, off_sec: i32) -> (f64, f64, f64) {
    let total = running_sec + idle_sec + off_sec;
    if total == 0 {
        return (0.0, 0.0, 0.0);
    }
    let t = total as f64;
    (
        (running_sec as f64 / t) * 100.0,
        (idle_sec as f64 / t) * 100.0,
        (off_sec as f64 / t) * 100.0,
    )
}

pub async fn reset_pzem_daily(state: &AppState, machine_id: Uuid) -> anyhow::Result<Option<Uuid>> {
    let id = archive_and_reset(state, machine_id, "pzem").await?;
    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        rt.last_pzem_totals = Some((0, 0, 0));
        // cegah bootstrap DB / ESP lama menimpa nol setelah reset
        rt.last_pzem_tick_at = Some(Utc::now());
        rt.pzem_ignore_esp_until = Some(Utc::now() + ESP_RESET_GRACE);
    }

    // Perintah ESP nolkan Run/Loss (jika firmware dukung); KPI backend tetap jalan tanpa flash
    if let Ok(Some(m)) = crate::services::machine::find_by_id(state, machine_id).await {
        let body = serde_json::json!({ "command": "reset_day", "sensor": "pzem" }).to_string();
        crate::mqtt::publish_command(state, &m.code, &body);
        tracing::info!("reset_day → ESP {}", m.code);
    }

    Ok(id)
}

pub async fn reset_adxl_daily(state: &AppState, machine_id: Uuid) -> anyhow::Result<Option<Uuid>> {
    let id = archive_and_reset(state, machine_id, "adxl").await?;
    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        rt.last_adxl_totals = Some((0, 0, 0));
        rt.last_adxl_tick_at = Some(Utc::now());
        rt.adxl_ignore_esp_until = Some(Utc::now() + ESP_RESET_GRACE);
    }

    if let Ok(Some(m)) = crate::services::machine::find_by_id(state, machine_id).await {
        let body = serde_json::json!({ "command": "reset_day", "sensor": "adxl" }).to_string();
        crate::mqtt::publish_command(state, &m.code, &body);
        tracing::info!("reset_day adxl → ESP {}", m.code);
    }

    Ok(id)
}

/// Simpan rekap periode ke DB lalu nolkan counter sensor.
/// Return Some(period_id) jika ada data tersimpan; None jika counter sudah 0.
async fn archive_and_reset(
    state: &AppState,
    machine_id: Uuid,
    sensor: &str,
) -> anyhow::Result<Option<Uuid>> {
    let today = work_date_wib();
    let now = Utc::now();

    let (run_col, idle_col, off_col) = match sensor {
        "pzem" => ("pzem_running_sec", "pzem_idle_sec", "pzem_off_sec"),
        "adxl" => ("adxl_running_sec", "adxl_idle_sec", "adxl_off_sec"),
        _ => anyhow::bail!("sensor tidak dikenal: {sensor}"),
    };

    // Ambil totals hari ini
    let totals = sqlx::query_as::<_, (i32, i32, i32)>(&format!(
        r#"SELECT COALESCE({run_col}, 0), COALESCE({idle_col}, 0), COALESCE({off_col}, 0)
           FROM detection_compare_daily
           WHERE machine_id = $1 AND work_date = $2"#
    ))
    .bind(machine_id)
    .bind(today)
    .fetch_optional(&state.pool)
    .await?
    .unwrap_or((0, 0, 0));

    let (running_sec, idle_sec, off_sec) = totals;
    let mut archived_id: Option<Uuid> = None;

    if running_sec + idle_sec + off_sec > 0 {
        let machine = sqlx::query_as::<_, (String, String, Option<String>)>(
            r#"SELECT code, name, location_note FROM machines WHERE id = $1"#,
        )
        .bind(machine_id)
        .fetch_one(&state.pool)
        .await?;

        let shift = sqlx::query_as::<_, (String, String)>(
            r#"SELECT operator_nik, operator_name FROM daily_shifts
               WHERE machine_id = $1 AND work_date = $2"#,
        )
        .bind(machine_id)
        .bind(today)
        .fetch_optional(&state.pool)
        .await?;

        // period_start = akhir rekap sebelumnya hari ini, atau awal hari (00:00 UTC work_date)
        let prev_end = sqlx::query_scalar::<_, chrono::DateTime<Utc>>(
            r#"SELECT period_end FROM operation_periods
               WHERE machine_id = $1 AND sensor = $2 AND work_date = $3
               ORDER BY period_end DESC LIMIT 1"#,
        )
        .bind(machine_id)
        .bind(sensor)
        .bind(today)
        .fetch_optional(&state.pool)
        .await?;

        let day_start = today
            .and_hms_opt(0, 0, 0)
            .map(|ndt| chrono::DateTime::<Utc>::from_naive_utc_and_offset(ndt, Utc))
            .unwrap_or(now);
        let period_start = prev_end.unwrap_or(day_start);

        let id = Uuid::new_v4();
        sqlx::query(
            r#"INSERT INTO operation_periods
               (id, machine_id, sensor, work_date, period_start, period_end,
                machine_code, machine_name, location_note,
                operator_nik, operator_name,
                running_sec, idle_sec, off_sec)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)"#,
        )
        .bind(id)
        .bind(machine_id)
        .bind(sensor)
        .bind(today)
        .bind(period_start)
        .bind(now)
        .bind(&machine.0)
        .bind(&machine.1)
        .bind(&machine.2)
        .bind(shift.as_ref().map(|s| s.0.as_str()))
        .bind(shift.as_ref().map(|s| s.1.as_str()))
        .bind(running_sec)
        .bind(idle_sec)
        .bind(off_sec)
        .execute(&state.pool)
        .await?;

        archived_id = Some(id);
        tracing::info!(
            "archive {sensor} machine={} run={} idle={} off={} period={}→{}",
            machine.0,
            running_sec,
            idle_sec,
            off_sec,
            period_start,
            now
        );
    }

    sqlx::query(&format!(
        r#"UPDATE detection_compare_daily
           SET {run_col} = 0, {idle_col} = 0, {off_col} = 0
           WHERE machine_id = $1 AND work_date = $2"#
    ))
    .bind(machine_id)
    .bind(today)
    .execute(&state.pool)
    .await?;

    Ok(archived_id)
}

/// Catat waktu running/idle/mati ADXL; `elapsed_sec` agar aman di MQTT >1 Hz.
pub async fn record_adxl_sample(
    state: &AppState,
    machine_id: Uuid,
    status_adxl: &str,
    vibration_g: f64,
    elapsed_sec: i32,
) -> anyhow::Result<()> {
    if status_adxl == "offline" || elapsed_sec <= 0 {
        return Ok(());
    }
    // Percaya status hasil evaluate (sama PZEM)
    let _ = vibration_g;
    let (run_add, idle_add, off_add) = match status_adxl {
        "running" => (elapsed_sec, 0, 0),
        "idle" => (0, elapsed_sec, 0),
        _ => (0, 0, elapsed_sec),
    };
    let today = work_date_wib();
    sqlx::query(
        r#"INSERT INTO detection_compare_daily
           (machine_id, work_date, adxl_running_sec, adxl_idle_sec, adxl_off_sec)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (machine_id, work_date) DO UPDATE SET
             adxl_running_sec = detection_compare_daily.adxl_running_sec + EXCLUDED.adxl_running_sec,
             adxl_idle_sec = detection_compare_daily.adxl_idle_sec + EXCLUDED.adxl_idle_sec,
             adxl_off_sec = detection_compare_daily.adxl_off_sec + EXCLUDED.adxl_off_sec"#,
    )
    .bind(machine_id)
    .bind(today)
    .bind(run_add)
    .bind(idle_add)
    .bind(off_add)
    .execute(&state.pool)
    .await?;

    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        let (r, i, o) = rt.last_adxl_totals.unwrap_or((0, 0, 0));
        rt.last_adxl_totals = Some((r + run_add, i + idle_add, o + off_add));
    }
    Ok(())
}

pub async fn adxl_daily_totals(state: &AppState, machine_id: Uuid) -> anyhow::Result<(i32, i32, i32)> {
    let today = work_date_wib();
    let row = sqlx::query_as::<_, (i32, i32, i32)>(
        r#"SELECT COALESCE(adxl_running_sec, 0), COALESCE(adxl_idle_sec, 0), COALESCE(adxl_off_sec, 0)
           FROM detection_compare_daily
           WHERE machine_id = $1 AND work_date = $2"#,
    )
    .bind(machine_id)
    .bind(today)
    .fetch_optional(&state.pool)
    .await?;
    Ok(row.unwrap_or((0, 0, 0)))
}

/// Cache dulu (setelah sync ESP / evaluate), baru DB.
pub async fn adxl_daily_totals_cached(
    state: &AppState,
    machine_id: Uuid,
) -> anyhow::Result<(i32, i32, i32)> {
    if let Some(rt) = state.runtime.get(&machine_id) {
        if let Some(t) = rt.last_adxl_totals {
            return Ok(t);
        }
    }
    adxl_daily_totals(state, machine_id).await
}

pub async fn mark_sensor_online(state: &AppState, machine_id: Uuid, sensor: &str) -> anyhow::Result<()> {
    if let Some(mut rt) = state.runtime.get_mut(&machine_id) {
        let sr = if sensor == "adxl" { &mut rt.adxl } else { &mut rt.pzem };
        if sr.status == "offline" {
            sr.status = "idle".into();
        }
    }
    let col = if sensor == "adxl" {
        "status_adxl"
    } else {
        "status_pzem"
    };
    let q = format!(
        "UPDATE machines SET {col} = CASE WHEN {col} = 'offline' THEN 'idle' ELSE {col} END, updated_at = NOW() WHERE id = $1"
    );
    sqlx::query(&q).bind(machine_id).execute(&state.pool).await?;
    sync_combined(state, machine_id).await?;
    Ok(())
}

#[cfg(test)]
mod esp_kpi_accept_tests {
    use super::*;
    use chrono::TimeZone;

    fn t(sec: i64) -> chrono::DateTime<Utc> {
        Utc.timestamp_opt(sec, 0).unwrap()
    }

    #[test]
    fn grace_blocks_nonzero_then_trusts_esp() {
        let start = t(1_000);
        let until = start + ESP_RESET_GRACE;
        // dalam grace + non-zero → skip
        assert_eq!(
            esp_kpi_accept(Some(until), 500, 0, start + ChronoDuration::seconds(10)),
            (EspKpiAction::Skip, false)
        );
        // grace habis + non-zero → apply (selaras LCD)
        assert_eq!(
            esp_kpi_accept(Some(until), 500, 100, until + ChronoDuration::seconds(1)),
            (EspKpiAction::Apply, true)
        );
        // ESP konfirmasi 0 → apply meski DB sudah terisi evaluate
        assert_eq!(
            esp_kpi_accept(Some(until), 0, 40, start + ChronoDuration::seconds(5)),
            (EspKpiAction::Apply, true)
        );
    }

    #[test]
    fn mid_day_flash_zero_skipped() {
        assert_eq!(
            esp_kpi_accept(None, 0, 9000, t(2_000)),
            (EspKpiAction::Skip, false)
        );
        assert_eq!(
            esp_kpi_accept(None, 100, 9000, t(2_000)),
            (EspKpiAction::Apply, false)
        );
    }
}
