use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::state::AppState;

#[derive(Deserialize)]
pub struct DisputeQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    30
}

pub async fn compare_stats(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let today = crate::services::detection::work_date_wib();
    let daily = sqlx::query_as::<_, (i32, i32, i32, i32, i32, i32)>(
        r#"SELECT
             COALESCE(pzem_running_sec, 0),
             COALESCE(pzem_idle_sec, 0),
             COALESCE(pzem_off_sec, 0),
             COALESCE(adxl_running_sec, 0),
             COALESCE(adxl_idle_sec, 0),
             COALESCE(adxl_off_sec, 0)
           FROM detection_compare_daily
           WHERE machine_id = $1 AND work_date = $2"#,
    )
    .bind(id)
    .bind(today)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?;

    let (p_run, p_idle, p_off, a_run, a_idle, a_off) = daily.unwrap_or((0, 0, 0, 0, 0, 0));
    let pct = |part: i32, total: i32| {
        if total == 0 {
            0.0
        } else {
            (part as f64 / total as f64) * 100.0
        }
    };
    let p_tot = p_run + p_idle + p_off;
    let a_tot = a_run + a_idle + a_off;

    Ok(Json(json!({
        "work_date": today,
        "pzem": {
            "running_sec": p_run,
            "idle_sec": p_idle,
            "off_sec": p_off,
            "running_pct": pct(p_run, p_tot),
            "idle_pct": pct(p_idle, p_tot),
            "off_pct": pct(p_off, p_tot),
        },
        "adxl": {
            "running_sec": a_run,
            "idle_sec": a_idle,
            "off_sec": a_off,
            "running_pct": pct(a_run, a_tot),
            "idle_pct": pct(a_idle, a_tot),
            "off_pct": pct(a_off, a_tot),
        },
        "delta_running_sec": a_run - p_run,
        "delta_idle_sec": a_idle - p_idle,
        "delta_off_sec": a_off - p_off,
    })))
}

pub async fn recent_disputes(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<DisputeQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let limit = q.limit.clamp(1, 100);
    let rows = sqlx::query_as::<_, (chrono::DateTime<chrono::Utc>, String, String, Option<f64>, Option<f64>)>(
        r#"SELECT ts, status_adxl, status_pzem, magnitude_g, current_a
           FROM detection_disputes WHERE machine_id = $1
           ORDER BY ts DESC LIMIT $2"#,
    )
    .bind(id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(json!(rows
        .into_iter()
        .map(|(ts, adxl, pzem, mag, cur)| {
            json!({
                "ts": ts,
                "status_adxl": adxl,
                "status_pzem": pzem,
                "magnitude_g": mag,
                "current_a": cur,
            })
        })
        .collect::<Vec<_>>())))
}

fn internal(e: sqlx::Error) -> (StatusCode, String) {
    tracing::error!("{e:#}");
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}
