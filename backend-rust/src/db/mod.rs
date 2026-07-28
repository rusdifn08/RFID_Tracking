use std::str::FromStr;

use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use sqlx::PgPool;

pub async fn connect(database_url: &str) -> anyhow::Result<PgPool> {
    // ponytail: Neon pooler + ALTER TABLE → disable prepared statement cache
    let opts = PgConnectOptions::from_str(database_url)?.statement_cache_capacity(0);
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect_with(opts)
        .await?;
    Ok(pool)
}

pub async fn run_migrations(pool: &PgPool) -> anyhow::Result<()> {
    for sql in [
        include_str!("../../migrations/001_init.sql"),
        include_str!("../../migrations/002_compare.sql"),
        include_str!("../../migrations/003_pzem_idle_sec.sql"),
        include_str!("../../migrations/004_pzem_off_sec.sql"),
        include_str!("../../migrations/005_adxl_off_sec.sql"),
        include_str!("../../migrations/006_operators_shifts.sql"),
        include_str!("../../migrations/007_adxl_force_off.sql"),
        include_str!("../../migrations/008_operation_periods.sql"),
    ] {
        sqlx::raw_sql(sql).execute(pool).await?;
    }
    tracing::info!("DB migrations applied");
    Ok(())
}
