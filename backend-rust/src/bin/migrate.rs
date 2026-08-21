// One-time / on-demand migration runner
use std::str::FromStr;
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://admin:admin@10.5.0.107:5432/juki_mesin?sslmode=disable".into());

    println!("Connecting to DB: {db_url} ...");
    let opts = PgConnectOptions::from_str(&db_url)?.statement_cache_capacity(0);
    let pool = PgPoolOptions::new()
        .max_connections(2)
        .connect_with(opts)
        .await?;

    println!("Applying migration 040_gm3_operators_process.sql ...");
    let sql = include_str!("../../migrations/040_gm3_operators_process.sql");
    sqlx::raw_sql(sql).execute(&pool).await?;

    println!("✅ Migration 040_gm3_operators_process applied successfully!");
    Ok(())
}
