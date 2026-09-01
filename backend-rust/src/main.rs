use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod db;
mod logbuf;
mod models;
mod mqtt;
mod services;
mod state;
mod ws;

use config::Config;
use state::AppState;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    // Terminal: hanya ERROR + banner println. Operasional MQTT → /devices.
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "warn,tower_http=off,rumqttc=off,sqlx=off".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let cfg = Config::from_env()?;
    let pool = db::connect(&cfg.database_url).await?;
    db::run_migrations(&pool).await?;

    let state = AppState::new(pool, cfg.clone());
    let state_mqtt = state.clone();
    tokio::spawn(async move {
        if let Err(e) = mqtt::run_mqtt_loop(state_mqtt).await {
            logbuf::error(format!("MQTT loop stopped: {e:#}"));
            tracing::error!("MQTT loop stopped: {e:#}");
        }
    });
    let state_day = state.clone();
    tokio::spawn(async move {
        services::detection::run_day_cut_loop(state_day).await;
    });
    let state_sim = state.clone();
    tokio::spawn(async move {
        services::sim::run_sim_loop(state_sim.pool.clone()).await;
    });

    let app = Router::new()
        .route("/health", get(api::health::health))
        .route("/devices", get(api::devices_dash::devices_dashboard))
        .route("/api/devices/logs", get(api::devices_dash::devices_logs))
        .route(
            "/api/devices/{id}/wifi-scan",
            get(api::devices_dash::get_wifi_scan).post(api::devices_dash::request_wifi_scan),
        )
        .route(
            "/api/devices/{id}/wifi-config",
            post(api::devices_dash::set_wifi_config),
        )
        .route(
            "/api/devices/{id}/history",
            get(api::devices_dash::get_device_history),
        )
        .route(
            "/api/devices/{id}/history/sync",
            post(api::devices_dash::request_history_sync),
        )
        .route(
            "/api/devices/{id}/config",
            post(api::devices_dash::update_device_config),
        )
        .route(
            "/api/devices/{id}/login-system",
            post(api::devices_dash::set_device_login_system),
        )
        .route(
            "/api/devices/login-events",
            get(api::devices_dash::devices_login_events),
        )
        .route("/api/machines", get(api::machines::list_machines).post(api::machines::create_machine))
        .route(
            "/api/machines/by-barcode/{barcode}",
            get(api::machines::get_machine_by_barcode),
        )
        .route(
            "/api/machines/by-gate/{uid}/{slug}",
            get(api::machines::get_machine_by_gate),
        )
        .route(
            "/api/machines/by-gate/{uid}",
            get(api::machines::get_machine_by_uid_gate),
        )
        .route("/api/machines/resume", get(api::shifts::machines_resume))
        .route("/api/machines/chart-kpi", get(api::telemetry::chart_kpi_batch))
        .route("/api/machines/{id}/sim-chart", get(api::shifts::sim_chart))
        .route("/api/machines/control", get(api::machines::list_control_machines))
        .route("/api/zigbee/mesh", get(api::zigbee::mesh_status))
        .route("/api/machines/{id}", get(api::machines::get_machine).patch(api::machines::update_calibration))
        .route("/api/machines/{id}/sync-esp", axum::routing::post(api::machines::sync_esp))
        .route("/api/machines/{id}/adxl-force-off", axum::routing::post(api::machines::set_adxl_force_off))
        .route("/api/machines/{id}/telemetry", get(api::telemetry::recent_telemetry))
        .route("/api/machines/{id}/telemetry-series", get(api::telemetry::telemetry_series))
        .route("/api/machines/{id}/deep-sleep", get(api::telemetry::list_deep_sleep))
        .route("/api/machines/{id}/sessions", get(api::telemetry::work_sessions))
        .route("/api/machines/{id}/productivity", get(api::telemetry::daily_productivity))
        .route("/api/machines/{id}/pzem-stats", get(api::telemetry::pzem_daily_stats).post(api::telemetry::reset_pzem_daily_stats))
        .route("/api/machines/{id}/adxl-stats", get(api::telemetry::adxl_daily_stats).post(api::telemetry::reset_adxl_daily_stats))
        .route("/api/machines/{id}/operation-periods", get(api::telemetry::list_operation_periods))
        .route("/api/machines/{id}/status-transitions", get(api::telemetry::list_status_transitions))
        .route("/api/operators", get(api::shifts::list_operators).post(api::shifts::upsert_operator))
        .route("/api/machines/{id}/shift", get(api::shifts::get_shift).put(api::shifts::assign_shift))
        .route("/api/machines/{id}/daily-usage", get(api::shifts::daily_usage))
        .route("/api/machines/{id}/compare", get(api::compare::compare_stats))
        .route("/api/machines/{id}/disputes", get(api::compare::recent_disputes))
        .route("/api/machines/{id}/command", post(api::machines::send_command))
        .route("/api/machines/{id}/ota", post(api::machines::start_ota))
        .route("/ws", get(ws::ws_handler))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(state);

    let addr = format!("{}:{}", cfg.host, cfg.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    // 0.0.0.0 = bind semua NIC (localhost + LAN). Akses lewat IP mesin, bukan 0.0.0.0 di browser.
    let lan_ip = std::env::var("LAN_IP").unwrap_or_else(|_| "10.5.0.2".into());
    let db_hint = cfg
        .database_url
        .split('@')
        .nth(1)
        .and_then(|s| s.split('/').next())
        .unwrap_or("(set)");
    println!("────────────────────────────────────────────────");
    println!("  Rust Axum — IoT Backend");
    println!("────────────────────────────────────────────────");
    println!("  bind     {addr}  (0.0.0.0 = semua interface)");
    println!("  local    http://127.0.0.1:{}", cfg.port);
    println!("  LAN      http://{lan_ip}:{}", cfg.port);
    println!("  health   http://{lan_ip}:{}/health", cfg.port);
    println!("  devices  http://{lan_ip}:{}/devices", cfg.port);
    println!("  ws       ws://{lan_ip}:{}/ws", cfg.port);
    println!("  MQTT     {:?}  prefix={}  auth={}", cfg.mqtt_brokers(), cfg.mqtt_topic_prefix,
        if cfg.mqtt_user.is_empty() { "anonymous" } else { "user" });
    println!("  DB       {db_hint}");
    println!("  offline  {}s (last_seen)", cfg.offline_timeout_sec);
    println!("  logs     panel bawah di /devices (bukan terminal)");
    println!("────────────────────────────────────────────────");
    axum::serve(listener, app).await?;
    Ok(())
}
