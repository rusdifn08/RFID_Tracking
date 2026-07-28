use chrono::Utc;
use uuid::Uuid;

use crate::models::{Machine, WsEvent};
use crate::state::AppState;

/// Catat sampel perbandingan max 1 Hz saat kedua sensor online.
pub async fn maybe_record(state: &AppState, machine_id: Uuid) -> anyhow::Result<()> {
    let machine = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(machine_id)
        .fetch_one(&state.pool)
        .await?;

    let rt = match state.runtime.get(&machine_id) {
        Some(r) => r.clone(),
        None => return Ok(()),
    };

    let now = Utc::now();
    if let Some(last) = rt.last_compare_at {
        if (now - last).num_milliseconds() < 900 {
            return Ok(());
        }
    }

    let adxl = machine.status_adxl.as_str();
    let pzem = machine.status_pzem.as_str();
    if adxl == "offline" || pzem == "offline" {
        return Ok(());
    }

    let adxl_active = adxl == "running";
    let pzem_active = pzem == "running";
    let agree = adxl_active == pzem_active;

    let today = crate::services::detection::work_date_wib();
    sqlx::query(
        r#"INSERT INTO detection_compare_daily
           (machine_id, work_date, total_samples, agree_samples, pzem_only_active, adxl_only_active,
            both_running, both_idle)
           VALUES ($1, $2, 1,
             CASE WHEN $3 THEN 1 ELSE 0 END,
             CASE WHEN $4 AND NOT $5 THEN 1 ELSE 0 END,
             CASE WHEN $5 AND NOT $4 THEN 1 ELSE 0 END,
             CASE WHEN $4 AND $5 THEN 1 ELSE 0 END,
             CASE WHEN NOT $4 AND NOT $5 THEN 1 ELSE 0 END)
           ON CONFLICT (machine_id, work_date) DO UPDATE SET
             total_samples = detection_compare_daily.total_samples + 1,
             agree_samples = detection_compare_daily.agree_samples + EXCLUDED.agree_samples,
             pzem_only_active = detection_compare_daily.pzem_only_active + EXCLUDED.pzem_only_active,
             adxl_only_active = detection_compare_daily.adxl_only_active + EXCLUDED.adxl_only_active,
             both_running = detection_compare_daily.both_running + EXCLUDED.both_running,
             both_idle = detection_compare_daily.both_idle + EXCLUDED.both_idle"#,
    )
    .bind(machine_id)
    .bind(today)
    .bind(agree)
    .bind(pzem_active)
    .bind(adxl_active)
    .execute(&state.pool)
    .await?;

    if !agree {
        sqlx::query(
            r#"INSERT INTO detection_disputes (machine_id, status_adxl, status_pzem, magnitude_g, current_a)
               VALUES ($1, $2, $3, $4, $5)"#,
        )
        .bind(machine_id)
        .bind(adxl)
        .bind(pzem)
        .bind(rt.last_magnitude_g)
        .bind(rt.last_current_a)
        .execute(&state.pool)
        .await?;
    }

    if let Some(mut rt_mut) = state.runtime.get_mut(&machine_id) {
        rt_mut.last_compare_at = Some(now);
    }

    let _ = state.ws_tx.send(WsEvent::DetectionCompare {
        machine_id,
        status_adxl: adxl.into(),
        status_pzem: pzem.into(),
        agree,
        magnitude_g: rt.last_magnitude_g,
        current_a: rt.last_current_a,
        ts: now,
    });

    Ok(())
}
