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
        include_str!("../../migrations/009_off_current_a.sql"),
        include_str!("../../migrations/010_machine_brand_process.sql"),
        include_str!("../../migrations/011_machine_barcode.sql"),
        include_str!("../../migrations/012_kpi_source_display.sql"),
        include_str!("../../migrations/013_machine_juki002.sql"),
        include_str!("../../migrations/014_seed_juki001_010.sql"),
        include_str!("../../migrations/015_remove_juki_seed_dummy.sql"),
        include_str!("../../migrations/016_shift_garment_style.sql"),
        include_str!("../../migrations/017_machine_branch_line.sql"),
        include_str!("../../migrations/018_machine_login_required.sql"),
        include_str!("../../migrations/019_machine_default_operator.sql"),
        include_str!("../../migrations/021_restore_sew001_name.sql"),
        include_str!("../../migrations/022_restore_juki001_device.sql"),
        include_str!("../../migrations/023_default_operators_002_004.sql"),
        include_str!("../../migrations/024_style_location_001_004.sql"),
        include_str!("../../migrations/025_sim_machine_kpi.sql"),
        include_str!("../../migrations/026_sim_amp_setpoint.sql"),
        include_str!("../../migrations/027_sim_off_freeze.sql"),
        include_str!("../../migrations/028_sim_by_device_uid.sql"),
        include_str!("../../migrations/029_device_link_health.sql"),
        include_str!("../../migrations/030_login_required_default_off.sql"),
        include_str!("../../migrations/031_off_current_001.sql"),
        include_str!("../../migrations/032_restore_uid_005_007_fresh.sql"),
        include_str!("../../migrations/033_device_link_type.sql"),
        include_str!("../../migrations/034_reset_zigbee_link_legacy.sql"),
        include_str!("../../migrations/035_device_deep_sleep.sql"),
        include_str!("../../migrations/036_remove_uid_0001_0002.sql"),
        include_str!("../../migrations/037_operator_process_001_006_008.sql"),
        include_str!("../../migrations/038_device_mac_addr.sql"),
        include_str!("../../migrations/039_device_mqtt_service.sql"),
        include_str!("../../migrations/040_gm3_operators_process.sql"),
        include_str!("../../migrations/041_esp_daily_history.sql"),
        include_str!("../../migrations/042_device_in_deep_sleep.sql"),
        include_str!("../../migrations/043_device_esp_login_required.sql"),
        include_str!("../../migrations/044_seed_juki019_020.sql"),
    ] {
        sqlx::raw_sql(sql).execute(pool).await?;
    }
    tracing::info!("DB migrations applied");
    Ok(())
}
