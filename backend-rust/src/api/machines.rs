use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::models::{CreateMachine, DeviceCommandBody, Machine, UpdateMachine};
use crate::mqtt;
use crate::services::machine as machine_svc;
use crate::state::AppState;

#[derive(Deserialize)]
pub struct ForceOffBody {
    pub enabled: bool,
}

pub async fn list_machines(
    State(state): State<AppState>,
) -> Result<Json<Vec<Machine>>, (StatusCode, String)> {
    let rows = sqlx::query_as::<_, Machine>(
        r#"SELECT * FROM machines ORDER BY code"#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;
    Ok(Json(rows))
}

pub async fn get_machine(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Machine>, (StatusCode, String)> {
    let row = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;
    Ok(Json(row))
}

pub async fn create_machine(
    State(state): State<AppState>,
    Json(body): Json<CreateMachine>,
) -> Result<(StatusCode, Json<Machine>), (StatusCode, String)> {
    let row = sqlx::query_as::<_, Machine>(
        r#"INSERT INTO machines (code, name, machine_type, location_note)
           VALUES ($1, $2, $3, $4)
           RETURNING *"#,
    )
    .bind(&body.code)
    .bind(&body.name)
    .bind(&body.machine_type)
    .bind(&body.location_note)
    .fetch_one(&state.pool)
    .await
    .map_err(internal)?;

    if let Some(uid) = body.device_uid.as_deref() {
        sqlx::query(
            r#"INSERT INTO devices (machine_id, device_uid, is_online)
               VALUES ($1, $2, FALSE)
               ON CONFLICT (device_uid) DO UPDATE SET machine_id = EXCLUDED.machine_id"#,
        )
        .bind(row.id)
        .bind(uid)
        .execute(&state.pool)
        .await
        .map_err(internal)?;
    }

    Ok((StatusCode::CREATED, Json(row)))
}

pub async fn update_calibration(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateMachine>,
) -> Result<Json<Machine>, (StatusCode, String)> {
    let row = sqlx::query_as::<_, Machine>(
        r#"UPDATE machines SET
            name = COALESCE($2, name),
            location_note = COALESCE($3, location_note),
            g_force_threshold = COALESCE($4, g_force_threshold),
            filter_aktif_ms = COALESCE($5, filter_aktif_ms),
            filter_diam_ms = COALESCE($6, filter_diam_ms),
            power_threshold_w = COALESCE($7, power_threshold_w),
            current_threshold_a = COALESCE($8, current_threshold_a),
            updated_at = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(body.name.as_deref())
    .bind(body.location_note.as_deref())
    .bind(body.g_force_threshold)
    .bind(body.filter_aktif_ms)
    .bind(body.filter_diam_ms)
    .bind(body.power_threshold_w)
    .bind(body.current_threshold_a)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;

    // push kalibrasi ke ESP via MQTT (hanya jika ada field kalibrasi)
    if body.g_force_threshold.is_some()
        || body.filter_aktif_ms.is_some()
        || body.filter_diam_ms.is_some()
        || body.power_threshold_w.is_some()
        || body.current_threshold_a.is_some()
    {
        let payload = json!({
            "command": "set_calibration",
            "g_force_threshold": row.g_force_threshold,
            "filter_aktif_ms": row.filter_aktif_ms,
            "filter_diam_ms": row.filter_diam_ms,
            "power_threshold_w": row.power_threshold_w,
            "current_threshold_a": row.current_threshold_a,
        });
        mqtt::publish_command(&state, &row.code, &payload.to_string());
    }

    crate::services::machine::cache_machine(&state, &row, "");

    Ok(Json(row))
}

pub async fn set_adxl_force_off(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<ForceOffBody>,
) -> Result<Json<Machine>, (StatusCode, String)> {
    let next_status = if body.enabled { "off" } else { "idle" };
    let row = sqlx::query_as::<_, Machine>(
        r#"UPDATE machines SET
             adxl_force_off = $2,
             status_adxl = $3,
             updated_at = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(body.enabled)
    .bind(next_status)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;

    machine_svc::cache_machine(&state, &row, "");
    machine_svc::patch_cached_adxl_force_off(&state, id, body.enabled);

    Ok(Json(row))
}

pub async fn send_command(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<DeviceCommandBody>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let machine = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;

    let cmd_id = Uuid::new_v4();
    sqlx::query(
        r#"INSERT INTO device_commands (id, machine_id, command, payload, status)
           VALUES ($1, $2, $3, $4, 'sent')"#,
    )
    .bind(cmd_id)
    .bind(id)
    .bind(&body.command)
    .bind(&body.payload)
    .execute(&state.pool)
    .await
    .map_err(internal)?;

    let payload = json!({
        "id": cmd_id,
        "command": body.command,
        "payload": body.payload,
    });
    mqtt::publish_command(&state, &machine.code, &payload.to_string());

    Ok(Json(json!({ "ok": true, "command_id": cmd_id })))
}

fn internal(e: sqlx::Error) -> (StatusCode, String) {
    tracing::error!("{e:#}");
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}
