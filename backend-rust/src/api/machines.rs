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

/// Daftar mesin untuk Control dashboard (semua mesin + device MQTT jika ada).
pub async fn list_control_machines(
    State(state): State<AppState>,
) -> Result<Json<Vec<Value>>, (StatusCode, String)> {
    #[derive(sqlx::FromRow)]
    struct Row {
        id: Uuid,
        code: String,
        name: String,
        brand: String,
        process_name: String,
        display_name: String,
        barcode: Option<String>,
        location_note: Option<String>,
        branch: String,
        line_name: String,
        login_required: bool,
        default_operator_nik: Option<String>,
        default_operator_name: Option<String>,
        status_pzem: String,
        status_adxl: String,
        status: String,
        current_threshold_a: f64,
        off_current_a: f64,
        power_threshold_w: f64,
        kpi_source: String,
        lcd_auto_ms: i32,
        device_uid: Option<String>,
        last_seen_at: Option<chrono::DateTime<chrono::Utc>>,
        is_online: bool,
        has_device: bool,
        rssi: Option<i32>,
        wifi_ok: Option<bool>,
        mqtt_ok: Option<bool>,
        ip_addr: Option<String>,
        wifi_ssid: Option<String>,
        mac_addr: Option<String>,
        last_health_at: Option<chrono::DateTime<chrono::Utc>>,
        mqtt_service: Option<String>,
        in_deep_sleep: bool,
        esp_login_required: Option<bool>,
    }

    let rows = sqlx::query_as::<_, Row>(
        r#"SELECT
              m.id, m.code, m.name, m.brand, m.process_name,
              CASE
                WHEN COALESCE(m.brand,'') <> '' AND COALESCE(m.process_name,'') <> '' THEN m.brand || ' ' || m.process_name
                WHEN COALESCE(m.process_name,'') <> '' THEN m.process_name
                WHEN COALESCE(m.brand,'') <> '' THEN m.brand
                ELSE m.name
              END AS display_name,
              m.barcode, m.location_note,
              COALESCE(m.branch, '') AS branch, COALESCE(m.line_name, '') AS line_name,
              COALESCE(m.login_required, TRUE) AS login_required,
              m.default_operator_nik, m.default_operator_name,
              m.status_pzem, m.status_adxl, m.status,
              m.current_threshold_a, m.off_current_a, m.power_threshold_w,
              m.kpi_source, m.lcd_auto_ms,
              d.device_uid, d.last_seen_at,
              COALESCE(d.is_online, FALSE) AS is_online,
              (d.device_uid IS NOT NULL) AS has_device,
              d.rssi, d.wifi_ok, d.mqtt_ok, d.ip_addr, d.wifi_ssid, d.mac_addr, d.last_health_at,
              d.mqtt_service,
              COALESCE(d.in_deep_sleep, FALSE) AS in_deep_sleep,
              d.esp_login_required
           FROM machines m
           LEFT JOIN LATERAL (
             SELECT device_uid, last_seen_at, is_online,
                    rssi, wifi_ok, mqtt_ok, ip_addr, wifi_ssid, mac_addr, last_health_at, mqtt_service,
                    in_deep_sleep, esp_login_required
             FROM devices
             WHERE machine_id = m.id
             ORDER BY last_seen_at DESC NULLS LAST
             LIMIT 1
           ) d ON TRUE
           ORDER BY (d.device_uid IS NOT NULL) DESC, m.code"#,
    )
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    let prefix = state.cfg.mqtt_topic_prefix.clone();
    let list = rows
        .into_iter()
        .map(|r| {
            // Live hint dari runtime cache (MQTT baru saja)
            let live_online = state
                .runtime
                .get(&r.id)
                .and_then(|rt| rt.last_seen.or(rt.pzem.last_seen))
                .map(|t| (chrono::Utc::now() - t).num_seconds() < 30)
                .unwrap_or(false);
            let current_a = state
                .runtime
                .get(&r.id)
                .and_then(|rt| rt.last_current_a);
            let age_sec = r
                .last_seen_at
                .or(r.last_health_at)
                .map(|t| (chrono::Utc::now() - t).num_seconds().max(0))
                .unwrap_or(9999);
            // Stale last-seen = tidak di WiFi/MQTT — jangan tampilkan flag/rssi lama
            let online = link_live(r.is_online, live_online, age_sec, state.cfg.offline_timeout_sec);
            let esp_status = if r.in_deep_sleep {
                "deepsleep"
            } else if online {
                "online"
            } else {
                "offline"
            };
            let rssi = if online { r.rssi } else { None };
            let signal = signal_quality(rssi);
            json!({
                "id": r.id,
                "code": r.code,
                "name": r.name,
                "brand": r.brand,
                "process_name": r.process_name,
                "display_name": r.display_name,
                "barcode": r.barcode,
                "location_note": r.location_note,
                "branch": r.branch,
                "line_name": r.line_name,
                "login_required": r.login_required,
                "esp_login_required": r.esp_login_required,
                "default_operator_nik": r.default_operator_nik,
                "default_operator_name": r.default_operator_name,
                "status_pzem": r.status_pzem,
                "status_adxl": r.status_adxl,
                "status": r.status,
                "current_a": current_a,
                "current_threshold_a": r.current_threshold_a,
                "off_current_a": r.off_current_a,
                "power_threshold_w": r.power_threshold_w,
                "kpi_source": r.kpi_source,
                "lcd_auto_ms": r.lcd_auto_ms,
                "device_uid": r.device_uid.clone().unwrap_or_default(),
                "last_seen_at": r.last_seen_at,
                "is_online": online,
                "in_deep_sleep": r.in_deep_sleep,
                "esp_status": esp_status,
                "has_device": r.has_device,
                "rssi": rssi,
                "wifi_ok": online && r.wifi_ok.unwrap_or(false),
                "mqtt_ok": online && r.mqtt_ok.unwrap_or(false),
                "ip_addr": r.ip_addr,
                "wifi_ssid": r.wifi_ssid,
                "mac_addr": r.mac_addr,
                "mqtt_service": r.mqtt_service,
                "last_health_at": r.last_health_at,
                "link_age_sec": age_sec,
                "signal_quality": signal,
                "mqtt_topic": format!("{}/{}/telemetry/pzem", prefix, r.code),
                "mqtt_cmd_topic": format!("{}/{}/cmd", prefix, r.code),
            })
        })
        .collect();
    Ok(Json(list))
}

/// Normalisasi scan QR: trim + uppercase, hanya MESIN001–MESIN100.
pub fn normalize_machine_barcode(raw: &str) -> Option<String> {
    let u = raw.trim().to_uppercase();
    if u.len() != 8 || !u.starts_with("MESIN") {
        return None;
    }
    let num = &u[5..];
    if num.len() != 3 || !num.chars().all(|c| c.is_ascii_digit()) {
        return None;
    }
    let n: u32 = num.parse().unwrap_or(0);
    if n == 0 || n > 100 {
        return None;
    }
    Some(u)
}

/// "JUKI 002" / "JUKI Zigzag" → slug hyphen
#[allow(dead_code)] // dipakai tes + legacy QR slug
pub fn machine_name_slug(raw: &str) -> String {
    let mut out = String::new();
    let mut prev_dash = false;
    for c in raw.trim().chars() {
        let lower = c.to_ascii_lowercase();
        if lower.is_ascii_alphanumeric() {
            out.push(lower);
            prev_dash = false;
        } else if !prev_dash && !out.is_empty() {
            out.push('-');
            prev_dash = true;
        }
    }
    while out.ends_with('-') {
        out.pop();
    }
    if out.is_empty() {
        "machine".into()
    } else {
        out.truncate(48);
        out
    }
}

/// Machine code → slug stabil untuk QR: JUKI002 → juki-002
#[allow(dead_code)] // dipakai tes + legacy QR slug
pub fn machine_code_slug(code: &str) -> String {
    let code = code.trim();
    let bytes = code.as_bytes();
    let mut i = 0usize;
    while i < bytes.len() && bytes[i].is_ascii_alphabetic() {
        i += 1;
    }
    let mut j = i;
    while j < bytes.len() && (bytes[j] == b'-' || bytes[j] == b'_') {
        j += 1;
    }
    let digits: String = code[j..].chars().filter(|c| c.is_ascii_digit()).collect();
    if i > 0 && !digits.is_empty() {
        format!("{}-{}", code[..i].to_ascii_lowercase(), digits)
    } else {
        machine_name_slug(code)
    }
}

/// Parse slug juki-002 / juki002 → Some("JUKI002")
pub fn code_from_gate_slug(slug: &str) -> Option<String> {
    let s = slug.trim().to_ascii_lowercase();
    if s.is_empty() {
        return None;
    }
    if let Some((brand, num)) = s.rsplit_once('-') {
        if !brand.is_empty()
            && !num.is_empty()
            && brand.chars().all(|c| c.is_ascii_alphabetic())
            && num.chars().all(|c| c.is_ascii_digit())
        {
            return Some(format!("{}{}", brand.to_ascii_uppercase(), num));
        }
    }
    // juki002 tanpa hyphen
    let mut i = 0usize;
    let b = s.as_bytes();
    while i < b.len() && b[i].is_ascii_alphabetic() {
        i += 1;
    }
    if i > 0 && i < b.len() && s[i..].chars().all(|c| c.is_ascii_digit()) {
        return Some(format!("{}{}", s[..i].to_ascii_uppercase(), &s[i..]));
    }
    None
}

fn machine_json_with_uid(m: &Machine, device_uid: Option<&str>) -> Value {
    json!({
        "id": m.id,
        "code": m.code,
        "name": m.name,
        "brand": m.brand,
        "process_name": m.process_name,
        "barcode": m.barcode,
        "machine_type": m.machine_type,
        "location_note": m.location_note,
        "branch": m.branch,
        "line_name": m.line_name,
        "login_required": m.login_required,
        "default_operator_nik": m.default_operator_nik,
        "default_operator_name": m.default_operator_name,
        "status": m.status,
        "status_adxl": m.status_adxl,
        "status_pzem": m.status_pzem,
        "g_force_threshold": m.g_force_threshold,
        "filter_aktif_ms": m.filter_aktif_ms,
        "filter_diam_ms": m.filter_diam_ms,
        "power_threshold_w": m.power_threshold_w,
        "current_threshold_a": m.current_threshold_a,
        "off_current_a": m.off_current_a,
        "kpi_source": m.kpi_source,
        "lcd_auto_ms": m.lcd_auto_ms,
        "adxl_force_off": m.adxl_force_off,
        "device_uid": device_uid,
        "created_at": m.created_at,
        "updated_at": m.updated_at,
    })
}

async fn device_uid_for_machine(state: &AppState, machine_id: Uuid) -> Option<String> {
    sqlx::query_scalar::<_, String>(
        r#"SELECT device_uid FROM devices
           WHERE machine_id = $1
           ORDER BY last_seen_at DESC NULLS LAST
           LIMIT 1"#,
    )
    .bind(machine_id)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten()
}

pub async fn get_machine_by_barcode(
    State(state): State<AppState>,
    Path(barcode): Path<String>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let label = normalize_machine_barcode(&barcode)
        .ok_or((StatusCode::BAD_REQUEST, "Barcode harus MESIN001 sampai MESIN100".into()))?;
    let row = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE barcode = $1"#)
        .bind(&label)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, format!("Mesin {} tidak terdaftar", label)))?;
    let uid = device_uid_for_machine(&state, row.id).await;
    Ok(Json(machine_json_with_uid(&row, uid.as_deref())))
}

/// Resolve QR gate: /ops/ml/{uid} — hanya UID (code mesin boleh berubah).
pub async fn get_machine_by_uid_gate(
    State(state): State<AppState>,
    Path(uid): Path<String>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let uid = uid.trim();
    if uid.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "uid wajib".into()));
    }

    let row = sqlx::query_as::<_, Machine>(
        r#"SELECT m.* FROM machines m
           INNER JOIN devices d ON d.machine_id = m.id
           WHERE d.device_uid = $1
           LIMIT 1"#,
    )
    .bind(uid)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or((
        StatusCode::NOT_FOUND,
        format!("Mesin tidak ditemukan untuk UID {uid}. Set Device UID di Control Machine dulu."),
    ))?;

    Ok(Json(machine_json_with_uid(&row, Some(uid))))
}

/// Resolve QR gate lama: /ops/ml/{uid}/{slug} — tetap didukung; resolve utama lewat UID.
pub async fn get_machine_by_gate(
    State(state): State<AppState>,
    Path((uid, slug)): Path<(String, String)>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let uid = uid.trim();
    let slug = slug.trim().to_ascii_lowercase();
    if uid.is_empty() {
        return Err((StatusCode::BAD_REQUEST, "uid wajib".into()));
    }

    // 1) Cari via device_uid (utama — slug diabaikan jika UID ketemu)
    let mut row = sqlx::query_as::<_, Machine>(
        r#"SELECT m.* FROM machines m
           INNER JOIN devices d ON d.machine_id = m.id
           WHERE d.device_uid = $1
           LIMIT 1"#,
    )
    .bind(uid)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?;

    // 2) Fallback sticker lama: slug → code jika device belum terdaftar
    if row.is_none() && !slug.is_empty() {
        if let Some(code) = code_from_gate_slug(&slug) {
            row = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE UPPER(code) = $1"#)
                .bind(&code)
                .fetch_optional(&state.pool)
                .await
                .map_err(internal)?;
            if let Some(ref m) = row {
                let _ = machine_svc::touch_device(&state, m.id, uid).await;
            }
        }
    }

    let row = row.ok_or((
        StatusCode::NOT_FOUND,
        format!("Mesin tidak ditemukan (UID {uid})"),
    ))?;

    Ok(Json(machine_json_with_uid(&row, Some(uid))))
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
    let old = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;

    let old_device_uid: Option<String> = sqlx::query_scalar(
        r#"SELECT device_uid FROM devices WHERE machine_id = $1
           ORDER BY last_seen_at DESC NULLS LAST LIMIT 1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?;

    let new_code = if let Some(ref c) = body.code {
        Some(
            machine_svc::normalize_machine_code(c)
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?,
        )
    } else {
        None
    };

    // Nama tampilan = Brand + Proses (jika dikirim)
    let composed_name = match (&body.brand, &body.process_name) {
        (Some(b), Some(p)) => {
            let n = format!("{} {}", b.trim(), p.trim()).trim().to_string();
            if n.is_empty() { None } else { Some(n) }
        }
        _ => body.name.clone(),
    };

    let barcode = body.barcode.as_ref().map(|b| {
        let t = b.trim().to_uppercase();
        if t.is_empty() { None } else { Some(t) }
    });

    let branch = body.branch.as_ref().map(|s| s.trim().to_string());
    let line_name = body.line_name.as_ref().map(|s| s.trim().to_string());
    // location_note = ringkas Branch · Line (kompatibilitas tampilan lama)
    let location_from_bl = match (&branch, &line_name) {
        (Some(b), Some(l)) if !b.is_empty() || !l.is_empty() => {
            let s = [b.as_str(), l.as_str()]
                .into_iter()
                .filter(|x| !x.is_empty())
                .collect::<Vec<_>>()
                .join(" · ");
            if s.is_empty() { None } else { Some(s) }
        }
        _ => body.location_note.clone(),
    };

    let row = sqlx::query_as::<_, Machine>(
        r#"UPDATE machines SET
            code = COALESCE($2, code),
            name = COALESCE($3, name),
            brand = COALESCE($4, brand),
            process_name = COALESCE($5, process_name),
            location_note = COALESCE($6, location_note),
            barcode = CASE WHEN $7::bool THEN $8 ELSE barcode END,
            g_force_threshold = COALESCE($9, g_force_threshold),
            filter_aktif_ms = COALESCE($10, filter_aktif_ms),
            filter_diam_ms = COALESCE($11, filter_diam_ms),
            power_threshold_w = COALESCE($12, power_threshold_w),
            current_threshold_a = COALESCE($13, current_threshold_a),
            off_current_a = COALESCE($14, off_current_a),
            kpi_source = COALESCE($15, kpi_source),
            lcd_auto_ms = COALESCE($16, lcd_auto_ms),
            branch = COALESCE($17, branch),
            line_name = COALESCE($18, line_name),
            login_required = COALESCE($19, login_required),
            default_operator_nik = CASE WHEN $20::bool THEN $21 ELSE default_operator_nik END,
            default_operator_name = CASE WHEN $22::bool THEN $23 ELSE default_operator_name END,
            updated_at = NOW()
           WHERE id = $1
           RETURNING *"#,
    )
    .bind(id)
    .bind(new_code.as_deref())
    .bind(composed_name.as_deref())
    .bind(body.brand.as_deref())
    .bind(body.process_name.as_deref())
    .bind(location_from_bl.as_deref())
    .bind(barcode.is_some())
    .bind(barcode.clone().flatten())
    .bind(body.g_force_threshold)
    .bind(body.filter_aktif_ms)
    .bind(body.filter_diam_ms)
    .bind(body.power_threshold_w)
    .bind(body.current_threshold_a)
    .bind(body.off_current_a)
    .bind(
        body.kpi_source
            .as_deref()
            .map(|s| if s == "telemetry" { "telemetry" } else { "esp" }),
    )
    .bind(body.lcd_auto_ms)
    .bind(branch.as_deref())
    .bind(line_name.as_deref())
    .bind(body.login_required)
    .bind(body.default_operator_nik.is_some())
    .bind(
        body.default_operator_nik
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty()),
    )
    .bind(body.default_operator_name.is_some())
    .bind(
        body.default_operator_name
            .as_deref()
            .map(str::trim)
            .filter(|s| !s.is_empty()),
    )
    .fetch_optional(&state.pool)
    .await
    .map_err(|e| {
        let msg = e.to_string();
        if msg.contains("unique") || msg.contains("duplicate") {
            (StatusCode::CONFLICT, "Code atau barcode sudah dipakai mesin lain".into())
        } else {
            internal(e)
        }
    })?
    .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;

    if let Some(ref uid) = body.device_uid {
        let uid = uid.trim();
        if !uid.is_empty() {
            machine_svc::touch_device(&state, id, uid)
                .await
                .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;
        }
    }

    let effective_uid = body
        .device_uid
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .or(old_device_uid.clone())
        .unwrap_or_default();

    if new_code.is_some() && new_code.as_deref() != Some(old.code.as_str()) {
        machine_svc::invalidate_code_cache(&state, &old.code);
    }

    // Dorong identitas ke topic LAMA dulu (ESP masih subscribe di sana), lalu topic baru + channel device.
    let identity = json!({
        "command": "set_identity",
        "machine_code": row.code,
        "device_uid": effective_uid,
        "machine_name": lcd_display_name(&row),
        "process_name": row.process_name,
        "current_threshold_a": row.current_threshold_a,
        "off_current_a": row.off_current_a,
        "power_threshold_w": row.power_threshold_w,
        "filter_aktif_ms": row.filter_aktif_ms,
        "filter_diam_ms": row.filter_diam_ms,
        "lcd_auto_ms": row.lcd_auto_ms,
        "kpi_source": row.kpi_source,
    });
    let identity_s = identity.to_string();
    mqtt::publish_command(&state, &old.code, &identity_s);
    if old.code != row.code {
        mqtt::publish_command(&state, &row.code, &identity_s);
    }
    if let Some(ref uid) = old_device_uid {
        mqtt::publish_device_command(&state, uid, &identity_s);
    }
    if !effective_uid.is_empty() && old_device_uid.as_deref() != Some(effective_uid.as_str()) {
        mqtt::publish_device_command(&state, &effective_uid, &identity_s);
    }

    // push kalibrasi ke ESP via MQTT (hanya jika ada field kalibrasi)
    if body.g_force_threshold.is_some()
        || body.filter_aktif_ms.is_some()
        || body.filter_diam_ms.is_some()
        || body.power_threshold_w.is_some()
        || body.current_threshold_a.is_some()
        || body.off_current_a.is_some()
    {
        push_calibration(&state, &row);
    }

    // nama / display / sumber KPI / identitas → ESP (topic = code baru)
    if body.brand.is_some()
        || body.process_name.is_some()
        || body.name.is_some()
        || body.lcd_auto_ms.is_some()
        || body.kpi_source.is_some()
        || body.code.is_some()
        || body.barcode.is_some()
        || body.device_uid.is_some()
        || body.branch.is_some()
        || body.line_name.is_some()
        || body.location_note.is_some()
    {
        push_display(&state, &row);
        let _ = push_sync_kpi(&state, &row).await;
        let _ = push_login_status(&state, &row, effective_uid.as_str()).await;
    }

    // System Login: selalu dorong ke ESP saat field dikirim (bukan hanya saat berubah)
    let mut login_system_pushed = false;
    if body.login_required.is_some() {
        login_system_pushed = true;
        push_login_system(&state, &row, effective_uid.as_str(), old_device_uid.as_deref());
        let _ = push_login_status(&state, &row, effective_uid.as_str()).await;
    }
    if !login_system_pushed {
        push_data_saved(&state, &row, effective_uid.as_str(), old_device_uid.as_deref());
    }

    let device_uid = effective_uid.as_str();
    crate::services::machine::cache_machine(&state, &row, device_uid);
    mqtt::push_operator_snapshot(&state, &row).await;

    Ok(Json(row))
}

pub fn push_login_system(state: &AppState, row: &Machine, uid: &str, old_uid: Option<&str>) {
    // login_required=true → System Login ON (wajib); false → OFF (tanpa login)
    let payload = json!({
        "command": "set_login_system",
        "login_required": row.login_required,
        "enabled": row.login_required,
        "message": if row.login_required {
            "System Login Di Aktifkan"
        } else {
            "System Login Non-Aktifkan"
        },
        "machine_code": row.code,
    });
    let s = payload.to_string();
    mqtt::publish_command(state, &row.code, &s);
    if !uid.is_empty() {
        mqtt::publish_device_command(state, uid, &s);
    }
    if let Some(ou) = old_uid {
        if ou != uid {
            mqtt::publish_device_command(state, ou, &s);
        }
    }
}

fn push_data_saved(state: &AppState, row: &Machine, uid: &str, old_uid: Option<&str>) {
    let payload = json!({
        "command": "data_saved",
        "message": "Data Tersimpan",
        "machine_code": row.code,
        "branch": row.branch,
        "line_name": row.line_name,
    });
    let s = payload.to_string();
    mqtt::publish_command(state, &row.code, &s);
    if !uid.is_empty() {
        mqtt::publish_device_command(state, uid, &s);
    }
    if let Some(ou) = old_uid {
        if ou != uid {
            mqtt::publish_device_command(state, ou, &s);
        }
    }
}

fn push_calibration(state: &AppState, row: &Machine) {
    let payload = json!({
        "command": "set_calibration",
        "g_force_threshold": row.g_force_threshold,
        "filter_aktif_ms": row.filter_aktif_ms,
        "filter_diam_ms": row.filter_diam_ms,
        "power_threshold_w": row.power_threshold_w,
        "current_threshold_a": row.current_threshold_a,
        "off_current_a": row.off_current_a,
    });
    mqtt::publish_command(state, &row.code, &payload.to_string());
}

fn lcd_display_name(row: &Machine) -> String {
    // Samakan Resume: Brand + Process (bukan machines.name yang sering generic)
    let b = row.brand.trim();
    let p = row.process_name.trim();
    if !b.is_empty() && !p.is_empty() {
        format!("{b} {p}")
    } else if !p.is_empty() {
        p.to_string()
    } else if !b.is_empty() {
        b.to_string()
    } else {
        row.name.clone()
    }
}

fn push_display(state: &AppState, row: &Machine) {
    let payload = json!({
        "command": "set_display",
        "machine_name": lcd_display_name(row),
        "process_name": row.process_name,
        "operator_name": row.default_operator_name,
        "machine_code": row.code,
        "lcd_auto_ms": row.lcd_auto_ms,
    });
    mqtt::publish_command(state, &row.code, &payload.to_string());
}

async fn push_login_status(state: &AppState, row: &Machine, _uid: &str) -> anyhow::Result<()> {
    mqtt::push_operator_snapshot(state, row).await;
    Ok(())
}

async fn push_sync_kpi(state: &AppState, row: &Machine) -> anyhow::Result<()> {
    let source = row.kpi_source.as_str();
    if source == "telemetry" {
        let today = crate::services::detection::work_date_wib();
        let map =
            crate::services::detection::pzem_band_totals_from_telemetry(state, today, today).await?;
        let (run, loss, off) = map.get(&(row.id, today)).copied().unwrap_or((0, 0, 0));
        let payload = json!({
            "command": "sync_kpi",
            "source": "backend",
            "run_sec": run,
            "loss_sec": loss,
            "off_sec": off,
        });
        mqtt::publish_command(state, &row.code, &payload.to_string());
    } else {
        let payload = json!({
            "command": "sync_kpi",
            "source": "esp",
        });
        mqtt::publish_command(state, &row.code, &payload.to_string());
    }
    Ok(())
}

/// Dorong ulang kalibrasi + display + KPI ke ESP (tombol Sync di dashboard).
pub async fn sync_esp(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let row = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;

    push_calibration(&state, &row);
    push_display(&state, &row);
    push_sync_kpi(&state, &row)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let uid = device_uid_for_machine(&state, row.id).await.unwrap_or_default();
    push_login_status(&state, &row, uid.as_str())
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    push_login_system(&state, &row, uid.as_str(), None);
    if row.login_required {
        push_data_saved(&state, &row, uid.as_str(), None);
    }

    Ok(Json(json!({
        "ok": true,
        "kpi_source": row.kpi_source,
        "machine_code": row.code,
        "login_required": row.login_required,
    })))
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

#[derive(Deserialize)]
pub struct OtaBody {
    pub url: String,
    pub sha256: String,
    pub version: Option<String>,
    pub size: Option<u64>,
}

fn valid_sha256_hex(s: &str) -> bool {
    s.len() == 64 && s.bytes().all(|b| b.is_ascii_hexdigit())
}

/// OTA HTTPS: backend hanya meneruskan URL+SHA-256 ke ESP. Binary tidak disimpan di repo.
pub async fn start_ota(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<OtaBody>,
) -> Result<Json<Value>, (StatusCode, String)> {
    let url = body.url.trim();
    if !url.starts_with("https://") {
        return Err((StatusCode::BAD_REQUEST, "url harus HTTPS".into()));
    }
    let sha = body.sha256.trim();
    if !valid_sha256_hex(sha) {
        return Err((StatusCode::BAD_REQUEST, "sha256 harus 64 hex".into()));
    }
    let machine = sqlx::query_as::<_, Machine>(r#"SELECT * FROM machines WHERE id = $1"#)
        .bind(id)
        .fetch_optional(&state.pool)
        .await
        .map_err(internal)?
        .ok_or((StatusCode::NOT_FOUND, "machine not found".into()))?;
    let uid = device_uid_for_machine(&state, machine.id)
        .await
        .unwrap_or_default();
    let cmd_id = Uuid::new_v4();
    let payload = json!({
        "command": "ota_update",
        "confirm": true,
        "command_id": cmd_id,
        "url": url,
        "sha256": sha.to_ascii_lowercase(),
        "version": body.version,
        "size": body.size,
        "target_uid": uid,
    });
    let s = payload.to_string();
    mqtt::publish_command(&state, &machine.code, &s);
    if !uid.is_empty() {
        mqtt::publish_device_command(&state, &uid, &s);
    }
    Ok(Json(json!({
        "ok": true,
        "command_id": cmd_id,
        "machine_code": machine.code,
    })))
}

fn internal(e: sqlx::Error) -> (StatusCode, String) {
    tracing::error!("{e:#}");
    (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}

fn link_live(db_online: bool, live_online: bool, age_sec: i64, timeout_sec: i64) -> bool {
    live_online || (db_online && age_sec < timeout_sec)
}

fn signal_quality(rssi: Option<i32>) -> &'static str {
    match rssi {
        Some(v) if v >= -55 => "excellent",
        Some(v) if v >= -67 => "good",
        Some(v) if v >= -75 => "fair",
        Some(v) if v >= -85 => "weak",
        Some(_) => "poor",
        None => "unknown",
    }
}

#[cfg(test)]
mod tests {
    use super::{
        code_from_gate_slug, link_live, machine_code_slug, machine_name_slug, normalize_machine_barcode,
        signal_quality, valid_sha256_hex,
    };

    #[test]
    fn stale_last_seen_is_offline() {
        assert!(!link_live(true, false, 2400, 30));
        assert!(link_live(false, true, 2400, 30));
        assert!(link_live(true, false, 10, 30));
        assert_eq!(signal_quality(None), "unknown");
    }

    #[test]
    fn barcode_normalize_valid() {
        assert_eq!(normalize_machine_barcode("MESIN001"), Some("MESIN001".into()));
        assert_eq!(normalize_machine_barcode(" mesin100 "), Some("MESIN100".into()));
    }

    #[test]
    fn barcode_normalize_invalid() {
        assert_eq!(normalize_machine_barcode("MESIN000"), None);
        assert_eq!(normalize_machine_barcode("MESIN101"), None);
        assert_eq!(normalize_machine_barcode("SEW-001"), None);
    }

    #[test]
    fn slug_from_name() {
        assert_eq!(machine_name_slug("JUKI 002"), "juki-002");
        assert_eq!(machine_name_slug("  Sewing-A  "), "sewing-a");
        assert_eq!(machine_name_slug("!!!"), "machine");
    }

    #[test]
    fn code_slug_and_parse() {
        assert_eq!(machine_code_slug("JUKI002"), "juki-002");
        assert_eq!(machine_code_slug("JUKI-002"), "juki-002");
        assert_eq!(code_from_gate_slug("juki-002").as_deref(), Some("JUKI002"));
        assert_eq!(code_from_gate_slug("juki002").as_deref(), Some("JUKI002"));
    }

    #[test]
    fn ota_sha256_hex() {
        assert!(valid_sha256_hex(
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        ));
        assert!(!valid_sha256_hex("abc"));
        assert!(!valid_sha256_hex(
            "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"
        ));
    }
}
