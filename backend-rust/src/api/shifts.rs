use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::NaiveDate;
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::models::{AssignShift, Operator, UpsertOperator};
use crate::state::AppState;

pub async fn list_operators(
    State(state): State<AppState>,
) -> Result<Json<Vec<Operator>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, Operator>(
        r#"SELECT * FROM operators WHERE is_active = TRUE ORDER BY name"#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;
    Ok(Json(rows))
}

pub async fn upsert_operator(
    State(state): State<AppState>,
    Json(body): Json<UpsertOperator>,
) -> Result<Json<Operator>, (StatusCode, String)> {
    let nik = body.nik.trim();
    let name = body.name.trim();
    if nik.is_empty() || name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "nik dan name wajib diisi".into()));
    }
    let row = sqlx::query_as::<_, Operator>(
        r#"INSERT INTO operators (nik, name)
           VALUES ($1, $2)
           ON CONFLICT (nik) DO UPDATE SET
             name = EXCLUDED.name,
             is_active = TRUE,
             updated_at = NOW()
           RETURNING *"#,
    )
    .bind(nik)
    .bind(name)
    .fetch_one(&state.pool)
    .await
    .map_err(internal)?;
    Ok(Json(row))
}

#[derive(Deserialize)]
pub struct ShiftQuery {
    pub date: Option<NaiveDate>,
    pub from: Option<NaiveDate>,
    pub to: Option<NaiveDate>,
}

pub async fn get_shift(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<ShiftQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let work_date = q.date.unwrap_or_else(crate::services::detection::work_date_wib);
    let row = sqlx::query_as::<_, (Uuid, NaiveDate, String, String, Option<String>)>(
        r#"SELECT id, work_date, operator_nik, operator_name, notes
           FROM daily_shifts WHERE machine_id = $1 AND work_date = $2"#,
    )
    .bind(id)
    .bind(work_date)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(match row {
        Some((sid, d, nik, name, notes)) => json!({
            "id": sid,
            "work_date": d,
            "operator_nik": nik,
            "operator_name": name,
            "notes": notes,
        }),
        None => json!({
            "work_date": work_date,
            "operator_nik": null,
            "operator_name": null,
            "notes": null,
        }),
    }))
}

pub async fn assign_shift(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<AssignShift>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let nik = body.nik.trim();
    let name = body.name.trim();
    if nik.is_empty() || name.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "nik dan name wajib diisi".into()));
    }
    let work_date = body.work_date.unwrap_or_else(crate::services::detection::work_date_wib);

    let op = sqlx::query_as::<_, Operator>(
        r#"INSERT INTO operators (nik, name)
           VALUES ($1, $2)
           ON CONFLICT (nik) DO UPDATE SET
             name = EXCLUDED.name,
             is_active = TRUE,
             updated_at = NOW()
           RETURNING *"#,
    )
    .bind(nik)
    .bind(name)
    .fetch_one(&state.pool)
    .await
    .map_err(internal)?;

    let row = sqlx::query_as::<_, (Uuid, NaiveDate, String, String, Option<String>)>(
        r#"INSERT INTO daily_shifts (machine_id, work_date, operator_id, operator_nik, operator_name, notes)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (machine_id, work_date) DO UPDATE SET
             operator_id = EXCLUDED.operator_id,
             operator_nik = EXCLUDED.operator_nik,
             operator_name = EXCLUDED.operator_name,
             notes = EXCLUDED.notes,
             updated_at = NOW()
           RETURNING id, work_date, operator_nik, operator_name, notes"#,
    )
    .bind(id)
    .bind(work_date)
    .bind(op.id)
    .bind(nik)
    .bind(name)
    .bind(&body.notes)
    .fetch_one(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(json!({
        "id": row.0,
        "work_date": row.1,
        "operator_nik": row.2,
        "operator_name": row.3,
        "notes": row.4,
        "operator_id": op.id,
    })))
}

#[derive(Deserialize)]
pub struct UsageQuery {
    pub from: Option<NaiveDate>,
    pub to: Option<NaiveDate>,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    30
}

/// Rekap shift harian PZEM: Running / Idle / Mati + operator + energi.
pub async fn daily_usage(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<UsageQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let today = crate::services::detection::work_date_wib();
    let to = q.to.unwrap_or(today);
    let from = q.from.unwrap_or_else(|| to - chrono::Duration::days(14));
    let limit = q.limit.clamp(1, 90);

    let rows = sqlx::query_as::<_, (
        NaiveDate,
        i32,
        i32,
        i32,
        Option<String>,
        Option<String>,
        Option<String>,
        Option<f64>,
    )>(
        r#"SELECT dates.work_date,
                  COALESCE(c.pzem_running_sec, 0),
                  COALESCE(c.pzem_idle_sec, 0),
                  COALESCE(c.pzem_off_sec, 0),
                  s.operator_nik,
                  s.operator_name,
                  s.notes,
                  p.energy_kwh
           FROM (
             SELECT work_date FROM detection_compare_daily
             WHERE machine_id = $1 AND work_date BETWEEN $2 AND $3
             UNION
             SELECT work_date FROM daily_shifts
             WHERE machine_id = $1 AND work_date BETWEEN $2 AND $3
           ) dates
           LEFT JOIN detection_compare_daily c
             ON c.machine_id = $1 AND c.work_date = dates.work_date
           LEFT JOIN daily_shifts s
             ON s.machine_id = $1 AND s.work_date = dates.work_date
           LEFT JOIN daily_productivity p
             ON p.machine_id = $1 AND p.work_date = dates.work_date
           ORDER BY dates.work_date DESC
           LIMIT $4"#,
    )
    .bind(id)
    .bind(from)
    .bind(to)
    .bind(limit)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let list: Vec<Value> = rows
        .into_iter()
        .map(|(date, run, idle, off, nik, oname, notes, energy)| {
            let total = run + idle + off;
            let pct = |s: i32| {
                if total == 0 {
                    0.0
                } else {
                    (s as f64 / total as f64) * 100.0
                }
            };
            json!({
                "work_date": date,
                "running_sec": run,
                "idle_sec": idle,
                "off_sec": off,
                "running_pct": pct(run),
                "idle_pct": pct(idle),
                "off_pct": pct(off),
                "operator_nik": nik,
                "operator_name": oname,
                "notes": notes,
                "energy_kwh": energy.unwrap_or(0.0),
            })
        })
        .collect();

    Ok(Json(json!({ "from": from, "to": to, "days": list })))
}

pub async fn machines_resume(
    State(state): State<AppState>,
    Query(q): Query<ShiftQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let today = crate::services::detection::work_date_wib();
    let to = q.to.or(q.date).unwrap_or(today);
    let from = q.from.unwrap_or(to);

    // ponytail: sqlx tuple max 16 field — pecah jadi query ringkas
    let rows = sqlx::query_as::<_, (
        Uuid,
        String,
        String,
        Option<String>,
        NaiveDate,
        i32,
        i32,
        i32,
        i32,
        i32,
        i32,
        Option<String>,
        Option<String>,
        Option<String>,
        String,
        String,
    )>(
        r#"SELECT m.id, m.code, m.name, m.location_note,
                  d.work_date::date,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.pzem_running_sec, 0)
                       ELSE COALESCE((SELECT SUM(running_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'pzem'), 0)
                  END::int,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.pzem_idle_sec, 0)
                       ELSE COALESCE((SELECT SUM(idle_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'pzem'), 0)
                  END::int,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.pzem_off_sec, 0)
                       ELSE COALESCE((SELECT SUM(off_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'pzem'), 0)
                  END::int,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.adxl_running_sec, 0)
                       ELSE COALESCE((SELECT SUM(running_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'adxl'), 0)
                  END::int,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.adxl_idle_sec, 0)
                       ELSE COALESCE((SELECT SUM(idle_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'adxl'), 0)
                  END::int,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.adxl_off_sec, 0)
                       ELSE COALESCE((SELECT SUM(off_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'adxl'), 0)
                  END::int,
                  s.operator_nik,
                  s.operator_name,
                  s.notes,
                  m.status_pzem,
                  m.status_adxl
           FROM machines m
           CROSS JOIN generate_series($1::date, $2::date, interval '1 day') AS d(work_date)
           LEFT JOIN detection_compare_daily c
             ON c.machine_id = m.id AND c.work_date = d.work_date::date
           LEFT JOIN daily_shifts s
             ON s.machine_id = m.id AND s.work_date = d.work_date::date
           WHERE c.machine_id IS NOT NULL
              OR EXISTS (
                   SELECT 1 FROM operation_periods op
                   WHERE op.machine_id = m.id AND op.work_date = d.work_date::date
                 )
              OR d.work_date::date = $3
           ORDER BY d.work_date DESC, m.code"#,
    )
    .bind(from)
    .bind(to)
    .bind(today)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let pct = |part: i32, total: i32| {
        if total == 0 {
            0.0
        } else {
            (part as f64 / total as f64) * 100.0
        }
    };

    let list: Vec<Value> = rows
        .into_iter()
        .map(
            |(
                id,
                code,
                name,
                loc,
                work_date,
                p_run,
                p_idle,
                p_off,
                a_run,
                a_idle,
                a_off,
                nik,
                oname,
                notes,
                st_pzem,
                st_adxl,
            )| {
                let p_tot = p_run + p_idle + p_off;
                let a_tot = a_run + a_idle + a_off;
                json!({
                    "id": id,
                    "code": code,
                    "name": name,
                    "location_note": loc,
                    "status_pzem": st_pzem,
                    "status_adxl": st_adxl,
                    "work_date": work_date,
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
                    "operator_nik": nik,
                    "operator_name": oname,
                    "operator_note": notes,
                })
            },
        )
        .collect();

    Ok(Json(json!({
        "work_date": today,
        "from": from,
        "to": to,
        "machines": list
    })))
}

fn internal(e: sqlx::Error) -> (StatusCode, String) {
    tracing::error!("{e:#}");
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}
