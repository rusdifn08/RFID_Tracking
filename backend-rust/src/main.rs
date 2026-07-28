use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod config;
mod db;
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
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            "backend_rust=info,tower_http=info".into()
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
            tracing::error!("MQTT loop stopped: {e:#}");
        }
    });
    let state_day = state.clone();
    tokio::spawn(async move {
        services::detection::run_day_cut_loop(state_day).await;
    });

    let app = Router::new()
        .route("/health", get(api::health::health))
        .route("/api/machines", get(api::machines::list_machines).post(api::machines::create_machine))
        .route("/api/machines/resume", get(api::shifts::machines_resume))
        .route("/api/machines/{id}", get(api::machines::get_machine).patch(api::machines::update_calibration))
        .route("/api/machines/{id}/adxl-force-off", axum::routing::post(api::machines::set_adxl_force_off))
        .route("/api/machines/{id}/telemetry", get(api::telemetry::recent_telemetry))
        .route("/api/machines/{id}/telemetry-series", get(api::telemetry::telemetry_series))
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
        .route("/ws", get(ws::ws_handler))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = format!("{}:{}", cfg.host, cfg.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("IoT backend listening on http://{addr}");
    axum::serve(listener, app).await?;
    Ok(())
}
