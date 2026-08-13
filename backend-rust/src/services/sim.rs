//! Simulasi KPI mesin — hanya tanggal SIM_WORK_DATE (bekukan Power On 8–9 jam).
//! Machine Off = snapshot data real. Arus chart opsional untuk hari sim.

use chrono::{DateTime, NaiveDate, Utc};
use sqlx::PgPool;
use std::collections::HashMap;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use uuid::Uuid;

/// Tanggal yang memakai data simulasi di monitoring-machine/juki.
pub fn sim_work_date() -> NaiveDate {
    // ponytail: satu hari demo tetap; ganti konstanta jika butuh hari lain
    NaiveDate::from_ymd_opt(2026, 8, 4).expect("valid date")
}

const POWER_ON_LO_SEC: i32 = 8 * 3600;
const POWER_ON_HI_SEC: i32 = 9 * 3600;

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct SimKpiRow {
    pub machine_id: Uuid,
    pub work_date: NaiveDate,
    pub run_sec: i32,
    pub idle_sec: i32,
    pub off_sec: i32,
    pub off_frozen: bool,
    pub phase: String,
    pub phase_left_sec: i32,
    pub target_prod: f32,
    pub amp_a: f32,
}

/// Threshold running (A) — selaras kalibrasi mesin
pub const RUN_THRESHOLD_A: f32 = 0.6;
const IDLE_AMP_LO: f32 = 0.50;
const IDLE_AMP_HI: f32 = 0.55;
const RUN_AMP_LO: f32 = 0.70;
const RUN_AMP_HI: f32 = 1.10;
const RUN_AMP_MAX: f32 = 1.50;

/// Segment pendek agar run↔idle berganti dalam hitungan menit (bukan 10 menit stuck)
const RUN_SEG_LO: i32 = 40;
const RUN_SEG_HI: i32 = 120;
const IDLE_SEG_LO: i32 = 35;
const IDLE_SEG_HI: i32 = 100;

/// PRNG mini tanpa crate ekstra
struct Rng(u64);
impl Rng {
    fn from_seed(seed: u64) -> Self {
        Self(seed | 1)
    }
    fn next_u64(&mut self) -> u64 {
        let mut x = self.0;
        x ^= x >> 12;
        x ^= x << 25;
        x ^= x >> 27;
        self.0 = x;
        x.wrapping_mul(0x2545F4914F6CDD1D)
    }
    fn f32(&mut self) -> f32 {
        (self.next_u64() >> 40) as f32 / (1u64 << 24) as f32
    }
    fn range_i32(&mut self, lo: i32, hi: i32) -> i32 {
        if hi <= lo {
            return lo;
        }
        lo + (self.next_u64() % (hi - lo + 1) as u64) as i32
    }
    fn range_f32(&mut self, lo: f32, hi: f32) -> f32 {
        lo + (hi - lo) * self.f32()
    }
}

fn seed_stable(machine: Uuid, salt: u64) -> u64 {
    let mut h = DefaultHasher::new();
    machine.hash(&mut h);
    salt.hash(&mut h);
    h.finish()
}

fn current_prod(run: i32, idle: i32, fallback: f32) -> f32 {
    let on = run + idle;
    if on <= 0 {
        fallback
    } else {
        run as f32 / on as f32
    }
}

/// Durasi segment + bias kuat ke target 40–80% (cepat ganti fase)
fn next_segment_sec(phase: &str, prod: f32, target: f32, rng: &mut Rng) -> i32 {
    let under = prod < target - 0.05;
    let over = prod > target + 0.05;
    if phase == "running" {
        if over {
            // Sudah terlalu produktif → running singkat lalu idle
            rng.range_i32(RUN_SEG_LO, RUN_SEG_LO + 25)
        } else if under {
            rng.range_i32(90, RUN_SEG_HI)
        } else {
            rng.range_i32(RUN_SEG_LO, RUN_SEG_HI)
        }
    } else if under {
        // Perlu lebih banyak running → idle singkat
        rng.range_i32(IDLE_SEG_LO, IDLE_SEG_LO + 20)
    } else if over {
        rng.range_i32(70, IDLE_SEG_HI)
    } else {
        rng.range_i32(IDLE_SEG_LO, IDLE_SEG_HI)
    }
}

fn amp_setpoint_for_phase(phase: &str, rng: &mut Rng) -> f32 {
    if phase == "running" {
        rng.range_f32(RUN_AMP_LO, RUN_AMP_HI).min(RUN_AMP_MAX)
    } else {
        rng.range_f32(IDLE_AMP_LO, IDLE_AMP_HI)
    }
}

fn amp_ok_for_phase(phase: &str, amp: f32) -> bool {
    if phase == "running" {
        amp >= RUN_THRESHOLD_A + 0.05 && amp <= RUN_AMP_MAX
    } else {
        amp >= 0.45 && amp < RUN_THRESHOLD_A
    }
}

async fn real_off_sec(pool: &PgPool, machine_id: Uuid, work_date: NaiveDate) -> i32 {
    sqlx::query_scalar::<_, i32>(
        r#"SELECT COALESCE(pzem_off_sec, 0)::int
           FROM detection_compare_daily
           WHERE machine_id = $1 AND work_date = $2"#,
    )
    .bind(machine_id)
    .bind(work_date)
    .fetch_optional(pool)
    .await
    .ok()
    .flatten()
    .unwrap_or(0)
}

/// Bekukan off_sec sekali dari data real — tidak di-update lagi selama sim hari ini.
async fn freeze_off_if_needed(pool: &PgPool, machine_id: Uuid, work_date: NaiveDate) -> anyhow::Result<()> {
    let frozen: bool = sqlx::query_scalar(
        r#"SELECT off_frozen FROM sim_machine_kpi WHERE machine_id = $1 AND work_date = $2"#,
    )
    .bind(machine_id)
    .bind(work_date)
    .fetch_optional(pool)
    .await?
    .unwrap_or(true);
    if frozen {
        return Ok(());
    }
    let off = real_off_sec(pool, machine_id, work_date).await;
    sqlx::query(
        r#"UPDATE sim_machine_kpi
           SET off_sec = $3, off_frozen = TRUE, updated_at = NOW()
           WHERE machine_id = $1 AND work_date = $2 AND off_frozen = FALSE"#,
    )
    .bind(machine_id)
    .bind(work_date)
    .bind(off)
    .execute(pool)
    .await?;
    Ok(())
}

/// Bersihkan chart liar lama + rapikan amp/segment baris hari ini.
async fn sanitize_today(pool: &PgPool, today: NaiveDate) -> anyhow::Result<()> {
    // Hapus titik chart di luar band realistis (sisa simulasi lama 0.75↔1.35 liar)
    sqlx::query(
        r#"DELETE FROM sim_machine_chart
           WHERE work_date = $1
             AND (current_a < 0.40 OR current_a > 1.25
                  OR (phase = 'idle' AND current_a >= $2)
                  OR (phase = 'running' AND current_a < $2))"#,
    )
    .bind(today)
    .bind(RUN_THRESHOLD_A)
    .execute(pool)
    .await?;

    let rows = sqlx::query_as::<_, SimKpiRow>(
        r#"SELECT machine_id, work_date, run_sec, idle_sec, off_sec, off_frozen,
                  phase, phase_left_sec, target_prod, amp_a
           FROM sim_machine_kpi WHERE work_date = $1"#,
    )
    .bind(today)
    .fetch_all(pool)
    .await?;

    for (i, mut row) in rows.into_iter().enumerate() {
        let mut rng = Rng::from_seed(seed_stable(row.machine_id, 42 + i as u64));
        let mut dirty = false;

        if !row.off_frozen {
            let off = real_off_sec(pool, row.machine_id, today).await;
            row.off_sec = off;
            row.off_frozen = true;
            dirty = true;
        }

        // Cap sisa segment yang terlalu panjang (stuck running 10 menit)
        if row.phase_left_sec > RUN_SEG_HI {
            row.phase_left_sec = rng.range_i32(RUN_SEG_LO, RUN_SEG_HI);
            dirty = true;
        }

        if !amp_ok_for_phase(&row.phase, row.amp_a) {
            row.amp_a = amp_setpoint_for_phase(&row.phase, &mut rng);
            dirty = true;
        }

        // Jika sudah 100% running lama → paksa segera idle
        let prod = current_prod(row.run_sec, row.idle_sec, row.target_prod);
        if row.phase == "running" && prod > 0.90 && row.run_sec >= 30 {
            row.phase = "idle".into();
            row.phase_left_sec = rng.range_i32(50, 90);
            row.amp_a = amp_setpoint_for_phase("idle", &mut rng);
            dirty = true;
        }
        if row.phase == "idle" && prod < 0.20 && row.idle_sec >= 30 {
            row.phase = "running".into();
            row.phase_left_sec = rng.range_i32(50, 90);
            row.amp_a = amp_setpoint_for_phase("running", &mut rng);
            dirty = true;
        }

        if dirty {
            sqlx::query(
                r#"UPDATE sim_machine_kpi SET
                     phase = $3, phase_left_sec = $4, amp_a = $5,
                     off_sec = $6, off_frozen = $7, updated_at = NOW()
                   WHERE machine_id = $1 AND work_date = $2"#,
            )
            .bind(row.machine_id)
            .bind(row.work_date)
            .bind(&row.phase)
            .bind(row.phase_left_sec)
            .bind(row.amp_a)
            .bind(row.off_sec)
            .bind(row.off_frozen)
            .execute(pool)
            .await?;
        }
    }
    Ok(())
}

/// Pastikan baris sim untuk SIM_WORK_DATE ada, lalu bekukan Power On 8–9 jam.
pub async fn ensure_today(pool: &PgPool) -> anyhow::Result<()> {
    let day = sim_work_date();
    let pairs: Vec<(Uuid, String)> = sqlx::query_as(
        r#"SELECT DISTINCT ON (m.id) m.id, d.device_uid
           FROM machines m
           JOIN devices d ON d.machine_id = m.id
           WHERE d.device_uid IS NOT NULL AND TRIM(d.device_uid) <> ''
           ORDER BY m.id,
             CASE WHEN d.device_uid ~ '^[0-9]+$' THEN 0 ELSE 1 END,
             d.last_seen_at DESC NULLS LAST"#,
    )
    .fetch_all(pool)
    .await?;

    for (i, (machine_id, device_uid)) in pairs.into_iter().enumerate() {
        let by_machine: Option<Uuid> = sqlx::query_scalar(
            r#"SELECT machine_id FROM sim_machine_kpi
               WHERE machine_id = $1 AND work_date = $2"#,
        )
        .bind(machine_id)
        .bind(day)
        .fetch_optional(pool)
        .await?;
        if by_machine.is_some() {
            let _ = sqlx::query(
                r#"UPDATE sim_machine_kpi SET device_uid = $3
                   WHERE machine_id = $1 AND work_date = $2
                     AND (device_uid IS NULL OR device_uid = '')"#,
            )
            .bind(machine_id)
            .bind(day)
            .bind(&device_uid)
            .execute(pool)
            .await;
            continue;
        }

        let by_uid: Option<(i32, i32)> = sqlx::query_as(
            r#"SELECT run_sec, idle_sec FROM sim_machine_kpi
               WHERE device_uid = $1 AND work_date = $2
               LIMIT 1"#,
        )
        .bind(&device_uid)
        .bind(day)
        .fetch_optional(pool)
        .await?;
        if by_uid.is_some() {
            sqlx::query(
                r#"UPDATE sim_machine_kpi
                   SET machine_id = $1, updated_at = NOW()
                   WHERE device_uid = $2 AND work_date = $3"#,
            )
            .bind(machine_id)
            .bind(&device_uid)
            .bind(day)
            .execute(pool)
            .await?;
            continue;
        }

        let mut rng = Rng::from_seed(seed_stable(machine_id, 7));
        let targets = [0.72f32, 0.55, 0.43, 0.68];
        let target = (targets[i % targets.len()] + rng.range_f32(-0.02, 0.02)).clamp(0.40, 0.80);
        let phase = if i % 2 == 0 { "running" } else { "idle" };
        let left = next_segment_sec(phase, target, target, &mut rng);
        let amp = amp_setpoint_for_phase(phase, &mut rng);
        let off = real_off_sec(pool, machine_id, day).await;
        // ponytail: index unik parsial — ON CONFLICT (machine_id, work_date) gagal tanpa WHERE;
        // insert sudah di-skip jika baris ada (cek by_machine / by_uid di atas)
        sqlx::query(
            r#"INSERT INTO sim_machine_kpi
               (machine_id, device_uid, work_date, run_sec, idle_sec, off_sec, off_frozen,
                phase, phase_left_sec, target_prod, amp_a, last_tick_at, updated_at)
               VALUES ($1, $2, $3, 0, 0, $4, TRUE, $5, $6, $7, $8, NOW(), NOW())"#,
        )
        .bind(machine_id)
        .bind(&device_uid)
        .bind(day)
        .bind(off)
        .bind(phase)
        .bind(left)
        .bind(target)
        .bind(amp)
        .execute(pool)
        .await?;
    }

    for id in sqlx::query_scalar::<_, Uuid>(
        r#"SELECT machine_id FROM sim_machine_kpi
           WHERE work_date = $1 AND off_frozen = FALSE AND machine_id IS NOT NULL"#,
    )
    .bind(day)
    .fetch_all(pool)
    .await?
    {
        freeze_off_if_needed(pool, id, day).await?;
    }

    sanitize_today(pool, day).await?;
    finalize_power_on_8_9h(pool, day).await?;
    Ok(())
}

/// Bekukan run+idle ke rentang 8–9 jam (deterministik per mesin). Off = real.
async fn finalize_power_on_8_9h(pool: &PgPool, day: NaiveDate) -> anyhow::Result<()> {
    let rows = sqlx::query_as::<_, SimKpiRow>(
        r#"SELECT machine_id, work_date, run_sec, idle_sec, off_sec, off_frozen,
                  phase, phase_left_sec, target_prod, amp_a
           FROM sim_machine_kpi WHERE work_date = $1 AND machine_id IS NOT NULL"#,
    )
    .bind(day)
    .fetch_all(pool)
    .await?;

    for row in rows {
        let on = row.run_sec + row.idle_sec;
        if (POWER_ON_LO_SEC..=POWER_ON_HI_SEC).contains(&on) {
            // Sudah di rentang — hanya pastikan off tetap real
            let off = real_off_sec(pool, row.machine_id, day).await;
            if off != row.off_sec || !row.off_frozen {
                sqlx::query(
                    r#"UPDATE sim_machine_kpi
                       SET off_sec = $3, off_frozen = TRUE, updated_at = NOW()
                       WHERE machine_id = $1 AND work_date = $2"#,
                )
                .bind(row.machine_id)
                .bind(day)
                .bind(off)
                .execute(pool)
                .await?;
            }
            continue;
        }

        let mut rng = Rng::from_seed(seed_stable(row.machine_id, 2026_08_04));
        let on_sec = rng.range_i32(POWER_ON_LO_SEC, POWER_ON_HI_SEC);
        let run = ((on_sec as f32) * row.target_prod.clamp(0.40, 0.80)).round() as i32;
        let run = run.clamp(1, on_sec - 1);
        let idle = on_sec - run;
        let off = real_off_sec(pool, row.machine_id, day).await;
        let phase = if run >= idle { "running" } else { "idle" };
        let amp = amp_setpoint_for_phase(phase, &mut rng);

        sqlx::query(
            r#"UPDATE sim_machine_kpi SET
                 run_sec = $3, idle_sec = $4, off_sec = $5, off_frozen = TRUE,
                 phase = $6, phase_left_sec = 0, amp_a = $7,
                 last_tick_at = NOW(), updated_at = NOW()
               WHERE machine_id = $1 AND work_date = $2"#,
        )
        .bind(row.machine_id)
        .bind(day)
        .bind(run)
        .bind(idle)
        .bind(off)
        .bind(phase)
        .bind(amp)
        .execute(pool)
        .await?;
    }
    Ok(())
}

/// Tidak lagi maju live — Power On sudah beku 8–9 jam di finalize.
pub async fn tick_today(_pool: &PgPool) -> anyhow::Result<()> {
    Ok(())
}

pub async fn kpi_map_today(pool: &PgPool) -> anyhow::Result<HashMap<Uuid, SimKpiRow>> {
    let day = sim_work_date();
    let rows = sqlx::query_as::<_, SimKpiRow>(
        r#"SELECT machine_id, work_date, run_sec, idle_sec, off_sec, off_frozen,
                  phase, phase_left_sec, target_prod, amp_a
           FROM sim_machine_kpi WHERE work_date = $1"#,
    )
    .bind(day)
    .fetch_all(pool)
    .await?;
    Ok(rows.into_iter().map(|r| (r.machine_id, r)).collect())
}

pub async fn chart_points(
    pool: &PgPool,
    machine_id: Uuid,
    work_date: NaiveDate,
) -> anyhow::Result<Vec<(DateTime<Utc>, String, f32, f32, f32)>> {
    let rows = sqlx::query_as::<_, (DateTime<Utc>, String, f32, f32, f32)>(
        r#"SELECT ts, phase, current_a, power_w, voltage_v
           FROM sim_machine_chart
           WHERE machine_id = $1 AND work_date = $2
           ORDER BY ts ASC
           LIMIT 400"#,
    )
    .bind(machine_id)
    .bind(work_date)
    .fetch_all(pool)
    .await?;
    Ok(rows)
}

/// Loop 1 detik — no-op setelah Power On beku (tetap ada agar main tidak berubah).
pub async fn run_sim_loop(pool: PgPool) {
    loop {
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        if let Err(e) = tick_today(&pool).await {
            tracing::warn!("sim tick: {e:#}");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn power_on_range_8_to_9_hours() {
        for salt in 0..32u64 {
            let mut rng = Rng::from_seed(salt | 1);
            let on = rng.range_i32(POWER_ON_LO_SEC, POWER_ON_HI_SEC);
            assert!(
                (POWER_ON_LO_SEC..=POWER_ON_HI_SEC).contains(&on),
                "on={on} di luar 8–9 jam"
            );
        }
    }
}
