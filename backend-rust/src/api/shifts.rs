use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::NaiveDate;
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::models::{AssignShift, Machine, Operator, UpsertOperator};
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
    /// 1/true = merge KPI simulasi (run/idle dari tabel sim; off tetap real)
    pub sim: Option<String>,
}

fn sim_enabled(q: &ShiftQuery) -> bool {
    match q.sim.as_deref().map(|s| s.trim().to_ascii_lowercase()).as_deref() {
        Some("1") | Some("true") | Some("yes") | Some("on") => true,
        _ => false,
    }
}

pub async fn get_shift(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<ShiftQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let work_date = q.date.unwrap_or_else(crate::services::detection::work_date_wib);
    let row = sqlx::query_as::<_, (Uuid, NaiveDate, String, String, Option<String>, chrono::DateTime<chrono::Utc>)>(
        r#"SELECT id, work_date, operator_nik, operator_name, notes, updated_at
           FROM daily_shifts WHERE machine_id = $1 AND work_date = $2"#,
    )
    .bind(id)
    .bind(work_date)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(match row {
        Some((sid, d, nik, name, notes, logged_at)) => json!({
            "id": sid,
            "work_date": d,
            "operator_nik": nik,
            "operator_name": name,
            "notes": notes,
            "logged_at": logged_at.to_rfc3339(),
        }),
        None => json!({
            "work_date": work_date,
            "operator_nik": null,
            "operator_name": null,
            "notes": null,
            "logged_at": null,
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

    let shift_status = match body.shift_status.as_deref().unwrap_or("work").trim().to_ascii_lowercase().as_str() {
        "broken" | "rusak" => "broken",
        "maintenance" | "maint" | "perbaikan" => "maintenance",
        _ => "work",
    };

    let opt = |v: &Option<String>| v.as_ref().map(|s| s.trim().to_string()).filter(|s| !s.is_empty());
    let garment_style = opt(&body.garment_style);
    let wo = opt(&body.wo);
    let size_label = opt(&body.size_label);
    let buyer = opt(&body.buyer);
    let item_name = opt(&body.item_name);
    let color_name = opt(&body.color_name);
    let notes = opt(&body.notes);

    if shift_status == "work" && garment_style.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Style garment wajib diisi saat login kerja (contoh 1101494)".into(),
        ));
    }
    if shift_status != "work" && notes.is_none() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Catatan wajib diisi untuk laporan rusak / maintenance".into(),
        ));
    }

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

    let row = sqlx::query_as::<_, (
        Uuid,
        NaiveDate,
        String,
        String,
        Option<String>,
        String,
        Option<String>,
        Option<String>,
        chrono::DateTime<chrono::Utc>,
    )>(
        r#"INSERT INTO daily_shifts (
             machine_id, work_date, operator_id, operator_nik, operator_name, notes,
             shift_status, garment_style, wo, size_label, buyer, item_name, color_name
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (machine_id, work_date) DO UPDATE SET
             operator_id = EXCLUDED.operator_id,
             operator_nik = EXCLUDED.operator_nik,
             operator_name = EXCLUDED.operator_name,
             notes = EXCLUDED.notes,
             shift_status = EXCLUDED.shift_status,
             garment_style = EXCLUDED.garment_style,
             wo = EXCLUDED.wo,
             size_label = EXCLUDED.size_label,
             buyer = EXCLUDED.buyer,
             item_name = EXCLUDED.item_name,
             color_name = EXCLUDED.color_name,
             updated_at = NOW()
           RETURNING id, work_date, operator_nik, operator_name, notes,
                     shift_status, garment_style, wo, updated_at"#,
    )
    .bind(id)
    .bind(work_date)
    .bind(op.id)
    .bind(nik)
    .bind(name)
    .bind(&notes)
    .bind(shift_status)
    .bind(&garment_style)
    .bind(&wo)
    .bind(&size_label)
    .bind(&buyer)
    .bind(&item_name)
    .bind(&color_name)
    .fetch_one(&state.pool)
    .await
    .map_err(internal)?;

    // Dorong ke LCD ESP
    let machine_meta = sqlx::query_as::<_, (String, Option<String>)>(
        r#"SELECT m.code,
                  (SELECT d.device_uid FROM devices d
                   WHERE d.machine_id = m.id
                   ORDER BY d.last_seen_at DESC NULLS LAST LIMIT 1)
           FROM machines m WHERE m.id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    if let Some((code, uid)) = machine_meta {
        let lcd_msg = match shift_status {
            "broken" => "Mesin Rusak",
            "maintenance" => "Maintenance",
            _ => "Login Sukses",
        };
        let payload = json!({
            "command": "login_success",
            "operator_nik": nik,
            "operator_name": name,
            "lcd_message": lcd_msg,
            "shift_status": shift_status,
            "garment_style": garment_style,
        });
        let body_s = payload.to_string();
        crate::mqtt::publish_command(&state, &code, &body_s);
        if let Some(ref u) = uid {
            crate::mqtt::publish_device_command(&state, u, &body_s);
        }
    }

    if let Ok(Some(m)) = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(id)
        .fetch_optional(&state.pool)
        .await
    {
        crate::mqtt::push_operator_snapshot(&state, &m).await;
    }

    Ok(Json(json!({
        "id": row.0,
        "work_date": row.1,
        "operator_nik": row.2,
        "operator_name": row.3,
        "notes": row.4,
        "shift_status": row.5,
        "garment_style": row.6,
        "wo": row.7,
        "logged_at": row.8.to_rfc3339(),
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

#[derive(sqlx::FromRow)]
struct ResumeDbRow {
    id: Uuid,
    code: String,
    name: String,
    brand: String,
    process_name: String,
    location_note: Option<String>,
    branch: String,
    line_name: String,
    work_date: NaiveDate,
    p_run: i32,
    p_idle: i32,
    p_off: i32,
    a_run: i32,
    a_idle: i32,
    a_off: i32,
    operator_nik: Option<String>,
    operator_name: Option<String>,
    notes: Option<String>,
    shift_status: Option<String>,
    garment_style: Option<String>,
    wo: Option<String>,
    size_label: Option<String>,
    buyer: Option<String>,
    item_name: Option<String>,
    color_name: Option<String>,
    status_pzem: String,
    status_adxl: String,
    default_operator_nik: Option<String>,
    default_operator_name: Option<String>,
    device_uid: Option<String>,
    is_online: bool,
    /// Waktu login terakhir (WIB di UI); null jika belum ada daily_shifts
    logged_at: Option<chrono::DateTime<chrono::Utc>>,
}

fn prod_pct_pzem(pzem: &Value) -> f64 {
    let run = pzem
        .get("running_sec")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    let idle = pzem
        .get("idle_sec")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    let on = run + idle;
    if on == 0 {
        0.0
    } else {
        (run as f64 / on as f64) * 100.0
    }
}

fn prod_cat(pct: f64) -> &'static str {
    if pct > 80.0 {
        "GOOD"
    } else if pct >= 40.0 {
        "NORMAL"
    } else {
        "BAD"
    }
}

fn summary_machine_pick(m: &Value, prod: f64) -> Value {
    json!({
        "id": m.get("id"),
        "code": m.get("code"),
        "display_name": m.get("display_name"),
        "device_uid": m.get("device_uid"),
        "prod_pct": prod,
    })
}

/// Ringkasan resume: AVG & terendah hanya dari mesin dengan produktivitas > 0 (mesin tidak dipakai diabaikan).
fn compute_resume_summary(list: &[Value]) -> Value {
    let mut good = 0i32;
    let mut normal = 0i32;
    let mut bad = 0i32;
    let mut active_sum = 0.0f64;
    let mut active_n = 0usize;
    let mut best: Option<(f64, &Value)> = None;
    let mut worst: Option<(f64, &Value)> = None;

    for m in list {
        let prod = prod_pct_pzem(m.get("pzem").unwrap_or(&Value::Null));
        match prod_cat(prod) {
            "GOOD" => good += 1,
            "NORMAL" => normal += 1,
            _ => bad += 1,
        }
        if best.map_or(true, |(bp, _)| prod > bp) {
            best = Some((prod, m));
        }
        if prod > 0.0 {
            active_sum += prod;
            active_n += 1;
            if worst.map_or(true, |(wp, _)| prod < wp) {
                worst = Some((prod, m));
            }
        }
    }

    let avg = if active_n == 0 {
        0.0
    } else {
        active_sum / active_n as f64
    };

    json!({
        "total": list.len(),
        "good": good,
        "normal": normal,
        "bad": bad,
        "avg_prod_pct": avg,
        "active_count": active_n,
        "best": best.map(|(p, m)| summary_machine_pick(m, p)),
        "worst": worst.map(|(p, m)| summary_machine_pick(m, p)),
    })
}

#[cfg(test)]
mod resume_summary_tests {
    use super::*;

    #[test]
    fn prod_cat_bands() {
        assert_eq!(prod_cat(81.0), "GOOD");
        assert_eq!(prod_cat(80.0), "NORMAL");
        assert_eq!(prod_cat(40.0), "NORMAL");
        assert_eq!(prod_cat(39.9), "BAD");
    }

    #[test]
    fn avg_and_worst_skip_zero_prod() {
        let list = vec![
            json!({"id":"1","display_name":"Off","pzem":{"running_sec":0,"idle_sec":0}}),
            json!({"id":"2","display_name":"Low","pzem":{"running_sec":10,"idle_sec":90}}),
            json!({"id":"3","display_name":"Mid","pzem":{"running_sec":50,"idle_sec":50}}),
        ];
        let s = compute_resume_summary(&list);
        assert_eq!(s["active_count"], 2);
        assert!((s["avg_prod_pct"].as_f64().unwrap() - 30.0).abs() < 0.01);
        assert_eq!(s["worst"]["display_name"], "Low");
        assert_eq!(s["best"]["display_name"], "Mid");
    }
}

pub async fn machines_resume(
    State(state): State<AppState>,
    Query(q): Query<ShiftQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let today = crate::services::detection::work_date_wib();
    let to = q.to.or(q.date).unwrap_or(today);
    let from = q.from.unwrap_or(to);
    let use_sim = sim_enabled(&q);

    if use_sim {
        // ponytail: sim gagal jangan blank-kan seluruh resume
        if let Err(e) = crate::services::sim::ensure_today(&state.pool).await {
            tracing::error!("sim ensure: {e:#}");
        }
        let _ = crate::services::sim::tick_today(&state.pool).await;
    }

    let sim_map = if use_sim {
        crate::services::sim::kpi_map_today(&state.pool)
            .await
            .unwrap_or_else(|e| {
                tracing::error!("sim map: {e:#}");
                std::collections::HashMap::new()
            })
    } else {
        std::collections::HashMap::new()
    };

    let rows = sqlx::query_as::<_, ResumeDbRow>(
        r#"SELECT m.id, m.code, m.name,
                  COALESCE(m.brand, '') AS brand,
                  COALESCE(m.process_name, '') AS process_name,
                  m.location_note,
                  COALESCE(m.branch, '') AS branch,
                  COALESCE(m.line_name, '') AS line_name,
                  d.work_date::date AS work_date,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.pzem_running_sec, 0)
                       ELSE COALESCE((SELECT SUM(running_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'pzem'), 0)
                  END::int AS p_run,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.pzem_idle_sec, 0)
                       ELSE COALESCE((SELECT SUM(idle_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'pzem'), 0)
                  END::int AS p_idle,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.pzem_off_sec, 0)
                       ELSE COALESCE((SELECT SUM(off_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'pzem'), 0)
                  END::int AS p_off,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.adxl_running_sec, 0)
                       ELSE COALESCE((SELECT SUM(running_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'adxl'), 0)
                  END::int AS a_run,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.adxl_idle_sec, 0)
                       ELSE COALESCE((SELECT SUM(idle_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'adxl'), 0)
                  END::int AS a_idle,
                  CASE WHEN c.machine_id IS NOT NULL THEN COALESCE(c.adxl_off_sec, 0)
                       ELSE COALESCE((SELECT SUM(off_sec) FROM operation_periods
                            WHERE machine_id = m.id AND work_date = d.work_date::date AND sensor = 'adxl'), 0)
                  END::int AS a_off,
                  s.operator_nik,
                  s.operator_name,
                  s.notes,
                  s.shift_status,
                  s.updated_at AS logged_at,
                  COALESCE(
                    NULLIF(TRIM(s.garment_style), ''),
                    (
                      SELECT NULLIF(TRIM(s2.garment_style), '')
                      FROM daily_shifts s2
                      WHERE s2.machine_id = m.id
                        AND s2.work_date < d.work_date::date
                        AND s2.garment_style IS NOT NULL
                        AND TRIM(s2.garment_style) <> ''
                      ORDER BY s2.work_date DESC
                      LIMIT 1
                    )
                  ) AS garment_style,
                  s.wo,
                  s.size_label,
                  s.buyer,
                  s.item_name,
                  s.color_name,
                  m.status_pzem,
                  m.status_adxl,
                  m.default_operator_nik,
                  m.default_operator_name,
                  (SELECT dvc.device_uid FROM devices dvc
                   WHERE dvc.machine_id = m.id
                   ORDER BY dvc.last_seen_at DESC NULLS LAST
                   LIMIT 1) AS device_uid,
                  COALESCE((
                    SELECT dvc.is_online FROM devices dvc
                    WHERE dvc.machine_id = m.id
                    ORDER BY dvc.last_seen_at DESC NULLS LAST
                    LIMIT 1
                  ), FALSE) AS is_online
           FROM machines m
           CROSS JOIN generate_series($1::date, $2::date, interval '1 day') AS d(work_date)
           LEFT JOIN detection_compare_daily c
             ON c.machine_id = m.id AND c.work_date = d.work_date::date
           LEFT JOIN daily_shifts s
             ON s.machine_id = m.id AND s.work_date = d.work_date::date
           WHERE EXISTS (SELECT 1 FROM devices dvc WHERE dvc.machine_id = m.id)
             AND m.code NOT IN ('JUKI0001', 'JUKI0002')
             AND NOT EXISTS (
               SELECT 1 FROM devices dx
               WHERE dx.machine_id = m.id AND dx.device_uid IN ('0001', '0002')
             )
             -- UID 001–003 / JUKI001–003: data mulai 2026-08-04 saja
             AND NOT (
               (
                 m.code IN ('JUKI001', 'JUKI002', 'JUKI003')
                 OR EXISTS (
                   SELECT 1 FROM devices dx
                   WHERE dx.machine_id = m.id
                     AND dx.device_uid IN ('001', '002', '003')
                 )
               )
               AND d.work_date::date < DATE '2026-08-04'
             )
           ORDER BY d.work_date DESC, m.code"#,
    )
    .bind(from)
    .bind(to)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let from_tel = crate::services::detection::pzem_band_totals_from_telemetry(&state, from, to)
        .await
        .unwrap_or_default();

    let kpi_rows = sqlx::query_as::<_, (Uuid, String)>(r#"SELECT id, kpi_source FROM machines"#)
        .fetch_all(&state.pool)
        .await
        .map_err(internal)?;
    let kpi_map: std::collections::HashMap<Uuid, String> = kpi_rows.into_iter().collect();

    let pct = |part: i32, total: i32| {
        if total == 0 {
            0.0
        } else {
            (part as f64 / total as f64) * 100.0
        }
    };

    let list: Vec<Value> = rows
        .into_iter()
        .map(|r| {
            let mut p_run = r.p_run;
            let mut p_idle = r.p_idle;
            let mut p_off = r.p_off;
            // ponytail: dashboard = grafik = agregat telemetry; counter ESP hanya fallback jika belum ada sampel
            if let Some((run, idle, off)) = from_tel.get(&(r.id, r.work_date)) {
                if run + idle + off > 0 {
                    p_run = *run;
                    p_idle = *idle;
                    p_off = *off;
                }
            }
            let mut status_pzem = r.status_pzem.clone();
            let mut is_online = r.is_online;
            // Simulasi hanya di SIM_WORK_DATE: run/idle beku 8–9 jam; off = real
            if use_sim && r.work_date == crate::services::sim::sim_work_date() {
                if let Some(sim) = sim_map.get(&r.id) {
                    p_run = sim.run_sec;
                    p_idle = sim.idle_sec;
                    p_off = sim.off_sec;
                    status_pzem = sim.phase.clone();
                    is_online = true;
                }
            }
            let p_tot = p_run + p_idle + p_off;
            let a_tot = r.a_run + r.a_idle + r.a_off;
            let display_name = {
                let b = r.brand.trim();
                let p = r.process_name.trim();
                if !b.is_empty() && !p.is_empty() {
                    format!("{b} {p}")
                } else if !b.is_empty() {
                    b.to_string()
                } else if !p.is_empty() {
                    p.to_string()
                } else {
                    r.name.clone()
                }
            };
            json!({
                "id": r.id,
                "code": r.code,
                "name": r.name,
                "brand": r.brand,
                "process_name": r.process_name,
                "display_name": display_name,
                "device_uid": r.device_uid,
                "location_note": r.location_note,
                "branch": r.branch,
                "line_name": r.line_name,
                "status_pzem": status_pzem,
                "status_adxl": r.status_adxl,
                "is_online": is_online,
                "work_date": r.work_date,
                "kpi_source": kpi_map.get(&r.id).cloned().unwrap_or_else(|| "esp".into()),
                "pzem": {
                    "running_sec": p_run,
                    "idle_sec": p_idle,
                    "off_sec": p_off,
                    "running_pct": pct(p_run, p_tot),
                    "idle_pct": pct(p_idle, p_tot),
                    "off_pct": pct(p_off, p_tot),
                },
                "adxl": {
                    "running_sec": r.a_run,
                    "idle_sec": r.a_idle,
                    "off_sec": r.a_off,
                    "running_pct": pct(r.a_run, a_tot),
                    "idle_pct": pct(r.a_idle, a_tot),
                    "off_pct": pct(r.a_off, a_tot),
                },
                "operator_nik": r
                    .operator_nik
                    .filter(|s| !s.trim().is_empty())
                    .or(r.default_operator_nik),
                "operator_name": r
                    .operator_name
                    .filter(|s| !s.trim().is_empty())
                    .or(r.default_operator_name),
                "operator_note": r.notes,
                "shift_status": r.shift_status.unwrap_or_else(|| "work".into()),
                "logged_at": r.logged_at.map(|t| t.to_rfc3339()),
                "garment_style": r.garment_style,
                "wo": r.wo,
                "size_label": r.size_label,
                "buyer": r.buyer,
                "item_name": r.item_name,
                "color_name": r.color_name,
            })
        })
        .collect();

    let summary = compute_resume_summary(&list);

    Ok(Json(json!({
        "work_date": today,
        "from": from,
        "to": to,
        "sim": use_sim,
        "summary": summary,
        "machines": list
    })))
}

fn internal(e: sqlx::Error) -> (StatusCode, String) {
    tracing::error!("{e:#}");
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}

/// Grafik arus simulasi dari tabel sementara
pub async fn sim_chart(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(q): Query<ShiftQuery>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let work_date = q.date.unwrap_or_else(crate::services::detection::work_date_wib);
    let pts = crate::services::sim::chart_points(&state.pool, id, work_date)
        .await
        .map_err(|e| {
            tracing::error!("sim chart: {e:#}");
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
        })?;
    let list: Vec<Value> = pts
        .into_iter()
        .map(|(ts, phase, current_a, power_w, voltage_v)| {
            json!({
                "ts": ts.to_rfc3339(),
                "phase": phase,
                "current_a": current_a,
                "power_w": power_w,
                "voltage_v": voltage_v,
                "value": current_a,
            })
        })
        .collect();
    Ok(Json(json!({ "machine_id": id, "work_date": work_date, "points": list })))
}
