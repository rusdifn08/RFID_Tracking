use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::state::AppState;

#[derive(Deserialize)]
pub struct LimitQuery {
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    120
}

pub async fn recent_telemetry(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<LimitQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let limit = q.limit.clamp(1, 1000);

    let adxl = sqlx::query_as::<_, (DateTime<Utc>, f64, f64, f64, f64)>(
        r#"SELECT ts, ax, ay, az, magnitude_g FROM telemetry_adxl
           WHERE machine_id = $1 ORDER BY ts DESC LIMIT $2"#,
    )
    .bind(id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let pzem = sqlx::query_as::<_, (DateTime<Utc>, f64, f64, f64, f64, Option<f64>, Option<f64>)>(
        r#"SELECT ts, voltage_v, current_a, power_w, energy_kwh, frequency_hz, power_factor
           FROM telemetry_pzem WHERE machine_id = $1 ORDER BY ts DESC LIMIT $2"#,
    )
    .bind(id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(json!({
        "adxl": adxl.into_iter().map(|(ts, ax, ay, az, mag)| json!({
            "ts": ts, "ax": ax, "ay": ay, "az": az, "magnitude_g": mag
        })).collect::<Vec<_>>(),
        "pzem": pzem.into_iter().map(|(ts, v, a, w, e, f, pf)| json!({
            "ts": ts, "voltage_v": v, "current_a": a, "power_w": w, "energy_kwh": e,
            "frequency_hz": f, "power_factor": pf
        })).collect::<Vec<_>>(),
    })))
}

pub async fn work_sessions(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<LimitQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let limit = q.limit.clamp(1, 200);
    let rows = sqlx::query_as::<_, (Uuid, DateTime<Utc>, Option<DateTime<Utc>>, Option<i32>, Option<f64>)>(
        r#"SELECT id, started_at, ended_at, duration_sec, energy_kwh
           FROM work_sessions WHERE machine_id = $1
           ORDER BY started_at DESC LIMIT $2"#,
    )
    .bind(id)
    .bind(limit)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(json!(rows
        .into_iter()
        .map(|(id, started_at, ended_at, duration_sec, energy_kwh)| {
            json!({
                "id": id,
                "started_at": started_at,
                "ended_at": ended_at,
                "duration_sec": duration_sec,
                "energy_kwh": energy_kwh,
            })
        })
        .collect::<Vec<_>>())))
}

pub async fn daily_productivity(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, (NaiveDate, i32, i32, i32, f64, f64)>(
        r#"SELECT work_date, running_sec, idle_sec, offline_sec, energy_kwh, utilization_pct
           FROM daily_productivity WHERE machine_id = $1
           ORDER BY work_date DESC LIMIT 30"#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(json!(rows
        .into_iter()
        .map(|(d, run, idle, off, energy, util)| {
            json!({
                "work_date": d,
                "running_sec": run,
                "idle_sec": idle,
                "offline_sec": off,
                "energy_kwh": energy,
                "utilization_pct": util,
            })
        })
        .collect::<Vec<_>>())))
}

pub async fn pzem_daily_stats(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let today = crate::services::detection::work_date_wib();
    let machine = sqlx::query_as::<_, crate::models::Machine>(
        r#"SELECT * FROM machines WHERE id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;

    let (running_sec, idle_sec, off_sec) = if machine.kpi_source == "esp" {
        crate::services::detection::pzem_daily_totals(&state, id)
            .await
            .map_err(|e| {
                tracing::error!("{e:#}");
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?
    } else {
        let map = crate::services::detection::pzem_band_totals_from_telemetry(&state, today, today)
            .await
            .map_err(|e| {
                tracing::error!("{e:#}");
                (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
            })?;
        map.get(&(id, today)).copied().unwrap_or((0, 0, 0))
    };
    let (running_pct, idle_pct, off_pct) =
        crate::services::detection::pzem_pcts(running_sec, idle_sec, off_sec);

    Ok(Json(json!({
        "work_date": today,
        "running_sec": running_sec,
        "idle_sec": idle_sec,
        "off_sec": off_sec,
        "running_pct": running_pct,
        "idle_pct": idle_pct,
        "off_pct": off_pct,
        "kpi_source": machine.kpi_source,
    })))
}

pub async fn reset_pzem_daily_stats(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let archived_id = crate::services::detection::reset_pzem_daily(&state, id)
        .await
        .map_err(|e| {
            tracing::error!("{e:#}");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;
    let today = crate::services::detection::work_date_wib();
    Ok(Json(json!({
        "work_date": today,
        "running_sec": 0,
        "idle_sec": 0,
        "off_sec": 0,
        "running_pct": 0.0,
        "idle_pct": 0.0,
        "off_pct": 0.0,
        "archived": archived_id.is_some(),
        "period_id": archived_id,
    })))
}

pub async fn adxl_daily_stats(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let today = crate::services::detection::work_date_wib();
    let row = sqlx::query_as::<_, (i32, i32, i32)>(
        r#"SELECT COALESCE(adxl_running_sec, 0), COALESCE(adxl_idle_sec, 0), COALESCE(adxl_off_sec, 0)
           FROM detection_compare_daily
           WHERE machine_id = $1 AND work_date = $2"#,
    )
    .bind(id)
    .bind(today)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?;

    let (running_sec, idle_sec, off_sec) = row.unwrap_or((0, 0, 0));
    let (running_pct, idle_pct, off_pct) =
        crate::services::detection::pzem_pcts(running_sec, idle_sec, off_sec);

    Ok(Json(json!({
        "work_date": today,
        "running_sec": running_sec,
        "idle_sec": idle_sec,
        "off_sec": off_sec,
        "running_pct": running_pct,
        "idle_pct": idle_pct,
        "off_pct": off_pct,
    })))
}

pub async fn reset_adxl_daily_stats(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let archived_id = crate::services::detection::reset_adxl_daily(&state, id)
        .await
        .map_err(|e| {
            tracing::error!("{e:#}");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;
    let today = crate::services::detection::work_date_wib();
    Ok(Json(json!({
        "work_date": today,
        "running_sec": 0,
        "idle_sec": 0,
        "off_sec": 0,
        "running_pct": 0.0,
        "idle_pct": 0.0,
        "off_pct": 0.0,
        "archived": archived_id.is_some(),
        "period_id": archived_id,
    })))
}

pub async fn list_operation_periods(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<PeriodsQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let limit = q.limit.unwrap_or(50).clamp(1, 200);
    let rows = sqlx::query_as::<_, (
        Uuid,
        String,
        chrono::NaiveDate,
        chrono::DateTime<chrono::Utc>,
        chrono::DateTime<chrono::Utc>,
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        i32,
        i32,
        i32,
    )>(
        r#"SELECT id, sensor, work_date, period_start, period_end,
                  machine_code, machine_name, location_note,
                  operator_nik, operator_name,
                  running_sec, idle_sec, off_sec
           FROM operation_periods
           WHERE machine_id = $1
             AND ($2::text IS NULL OR sensor = $2)
             AND ($3::date IS NULL OR work_date >= $3)
             AND ($4::date IS NULL OR work_date <= $4)
           ORDER BY period_end DESC
           LIMIT $5"#,
    )
    .bind(id)
    .bind(q.sensor.as_deref())
    .bind(q.from)
    .bind(q.to)
    .bind(limit)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let list: Vec<Value> = rows
        .into_iter()
        .map(
            |(
                pid,
                sensor,
                work_date,
                start,
                end,
                code,
                name,
                loc,
                nik,
                oname,
                run,
                idle,
                off,
            )| {
                let total = run + idle + off;
                let pct = |s: i32| {
                    if total == 0 {
                        0.0
                    } else {
                        (s as f64 / total as f64) * 100.0
                    }
                };
                json!({
                    "id": pid,
                    "sensor": sensor,
                    "work_date": work_date,
                    "period_start": start,
                    "period_end": end,
                    "machine_code": code,
                    "machine_name": name,
                    "location_note": loc,
                    "operator_nik": nik,
                    "operator_name": oname,
                    "running_sec": run,
                    "idle_sec": idle,
                    "off_sec": off,
                    "running_pct": pct(run),
                    "idle_pct": pct(idle),
                    "off_pct": pct(off),
                })
            },
        )
        .collect();

    Ok(Json(json!({ "periods": list })))
}

/// Log perpindahan status + durasi fase sebelumnya (running/idle/off).
pub async fn list_status_transitions(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<TransitionsQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let limit = q.limit.unwrap_or(100).clamp(1, 500);
    let sensor = q.sensor.as_deref().unwrap_or("adxl");

    let rows = sqlx::query_as::<_, (
        i64,
        Option<String>,
        String,
        Option<f64>,
        Option<f64>,
        Option<f64>,
        chrono::DateTime<chrono::Utc>,
    )>(
        r#"SELECT id, from_status, to_status, magnitude_g, current_a, power_w, ts
           FROM sensor_status_log
           WHERE machine_id = $1
             AND sensor = $2
             AND ($3::timestamptz IS NULL OR ts >= $3)
             AND ($4::timestamptz IS NULL OR ts <= $4)
           ORDER BY ts ASC
           LIMIT $5"#,
    )
    .bind(id)
    .bind(sensor)
    .bind(q.from_ts)
    .bind(q.to_ts)
    .bind(limit)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let mut events = Vec::new();
    let mut prev_ts: Option<chrono::DateTime<chrono::Utc>> = None;
    for (lid, from_st, to_st, mag, cur, pwr, ts) in rows {
        let phase_status = from_st.clone().unwrap_or_else(|| "unknown".into());
        let (phase_start, duration_sec) = match prev_ts {
            Some(start) => {
                let dur = (ts - start).num_seconds().max(0) as i32;
                (Some(start), dur)
            }
            None => (None, 0),
        };
        events.push(json!({
            "id": lid,
            "from_status": from_st,
            "to_status": to_st,
            "ts": ts,
            "phase_status": phase_status,
            "phase_start": phase_start,
            "phase_end": ts,
            "duration_sec": duration_sec,
            "magnitude_g": mag,
            "current_a": cur,
            "power_w": pwr,
        }));
        prev_ts = Some(ts);
    }
    events.reverse(); // terbaru di atas

    Ok(Json(json!({ "sensor": sensor, "events": events })))
}

/// Rangkaian waktu untuk grafik fluktuasi (downsample per menit).
/// `hours` = 1|3|6, atau pakai `from_ts`/`to_ts` untuk custom.
#[derive(Deserialize)]
pub struct SeriesQuery {
    pub sensor: String,
    pub hours: Option<i64>,
    pub from_ts: Option<DateTime<Utc>>,
    pub to_ts: Option<DateTime<Utc>>,
}

pub async fn telemetry_series(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<SeriesQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let sensor = q.sensor.to_lowercase();
    if sensor != "pzem" && sensor != "adxl" {
        return Err((StatusCode::BAD_REQUEST, "sensor must be pzem or adxl".into()));
    }

    let now = Utc::now();
    let (from, to) = match (q.from_ts, q.to_ts, q.hours) {
        (Some(f), Some(t), _) => (f, t),
        (Some(f), None, _) => (f, now),
        (None, Some(t), Some(h)) => (t - chrono::Duration::hours(h.clamp(1, 168)), t),
        (None, Some(t), None) => (t - chrono::Duration::hours(1), t),
        (None, None, Some(h)) => (now - chrono::Duration::hours(h.clamp(1, 168)), now),
        (None, None, None) => (now - chrono::Duration::hours(1), now),
    };
    if to <= from {
        return Err((StatusCode::BAD_REQUEST, "to_ts must be after from_ts".into()));
    }
    // Cap 7 hari supaya query tetap ringan
    let max_span = chrono::Duration::days(7);
    let from = if to - from > max_span { to - max_span } else { from };

    let span_hours = (to - from).num_hours().max(1);
    // >12 jam: bucket 5 menit; selain itu per menit
    let bucket_expr = if span_hours > 12 {
        "to_timestamp(floor(extract(epoch from ts) / 300) * 300)"
    } else {
        "date_trunc('minute', ts)"
    };

    if sensor == "pzem" {
        let sql = format!(
            r#"SELECT {bucket_expr} AS bucket,
                      AVG(current_a)::float8 AS current_a,
                      AVG(power_w)::float8 AS power_w,
                      AVG(voltage_v)::float8 AS voltage_v
               FROM telemetry_pzem
               WHERE machine_id = $1 AND ts >= $2 AND ts <= $3
               GROUP BY 1 ORDER BY 1"#
        );
        let rows = sqlx::query_as::<_, (DateTime<Utc>, f64, f64, f64)>(&sql)
            .bind(id)
            .bind(from)
            .bind(to)
            .fetch_all(&state.pool)
            .await
            .map_err(internal)?;
        return Ok(Json(json!({
            "sensor": "pzem",
            "from_ts": from,
            "to_ts": to,
            "points": rows.into_iter().map(|(ts, a, w, v)| json!({
                "ts": ts,
                "current_a": a,
                "power_w": w,
                "voltage_v": v,
                "value": a,
            })).collect::<Vec<_>>(),
        })));
    }

    let sql = format!(
        r#"SELECT {bucket_expr} AS bucket,
                  AVG(magnitude_g)::float8 AS magnitude_g,
                  AVG(ax)::float8 AS ax,
                  AVG(ay)::float8 AS ay,
                  AVG(az)::float8 AS az
           FROM telemetry_adxl
           WHERE machine_id = $1 AND ts >= $2 AND ts <= $3
           GROUP BY 1 ORDER BY 1"#
    );
    let rows = sqlx::query_as::<_, (DateTime<Utc>, f64, f64, f64, f64)>(&sql)
        .bind(id)
        .bind(from)
        .bind(to)
        .fetch_all(&state.pool)
        .await
        .map_err(internal)?;
    Ok(Json(json!({
        "sensor": "adxl",
        "from_ts": from,
        "to_ts": to,
        "points": rows.into_iter().map(|(ts, mag, ax, ay, az)| json!({
            "ts": ts,
            "magnitude_g": mag,
            "ax": ax,
            "ay": ay,
            "az": az,
            "value": mag,
        })).collect::<Vec<_>>(),
    })))
}

#[derive(Deserialize)]
pub struct PeriodsQuery {
    pub sensor: Option<String>,
    pub limit: Option<i64>,
    pub from: Option<chrono::NaiveDate>,
    pub to: Option<chrono::NaiveDate>,
}

#[derive(Deserialize)]
pub struct TransitionsQuery {
    pub sensor: Option<String>,
    pub limit: Option<i64>,
    pub from_ts: Option<chrono::DateTime<chrono::Utc>>,
    pub to_ts: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Deserialize)]
pub struct DeepSleepQuery {
    pub date: Option<NaiveDate>,
}

/// Periode deep sleep hari itu (OFF dari jam X sampai Y).
pub async fn list_deep_sleep(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<DeepSleepQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let day = q.date.unwrap_or_else(crate::services::detection::work_date_wib);
    let rows = sqlx::query_as::<_, (DateTime<Utc>, Option<DateTime<Utc>>, Option<i32>, Option<String>)>(
        r#"SELECT sleep_from, sleep_to, duration_sec, reason
           FROM device_deep_sleep
           WHERE machine_id = $1
             AND sleep_from >= ($2::date)::timestamptz
             AND sleep_from < (($2::date) + 1)::timestamptz
           ORDER BY sleep_from"#,
    )
    .bind(id)
    .bind(day)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;
    Ok(Json(json!({
        "work_date": day,
        "periods": rows.into_iter().map(|(from, to, dur, reason)| json!({
            "sleep_from": from,
            "sleep_to": to,
            "duration_sec": dur,
            "reason": reason,
        })).collect::<Vec<_>>(),
    })))
}

fn internal(e: sqlx::Error) -> (StatusCode, String) {
    tracing::error!("{e:#}");
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}
