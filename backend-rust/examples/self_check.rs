//! Self-check: delta vibration + sticky → running (legacy HTML @ 1Hz MQTT)
fn magnitude_g(vibration: Option<f64>, delta: f64) -> f64 {
    vibration.unwrap_or(delta)
}

fn want_active_sticky(magnitude: f64, thr: f64, last_peak_age_ms: Option<i64>, filter_diam_ms: i64) -> bool {
    if magnitude >= thr {
        return true;
    }
    last_peak_age_ms
        .map(|age| age < filter_diam_ms)
        .unwrap_or(false)
}

fn adxl_next_status(current: &str, want_active: bool) -> String {
    let effective = if current == "offline" { "idle" } else { current };
    if want_active {
        "running".into()
    } else if effective == "running" {
        "idle".into()
    } else {
        effective.to_string()
    }
}

fn main() {
    // ESP peak dipakai, bukan |Z/g-1|
    assert!((magnitude_g(Some(1.059), 0.16) - 1.059).abs() < 1e-9);
    let z = 12.631_f64;
    let old_wrong = (z - 9.81).abs() / 9.81;
    assert!(old_wrong < 0.5);

    // Satu peak ≥ thr → running langsung; 1s kemudian sample kecil masih sticky
    assert!(want_active_sticky(1.059, 0.5, None, 3000));
    assert_eq!(adxl_next_status("idle", true), "running");
    assert!(want_active_sticky(0.235, 0.5, Some(1000), 3000));
    assert_eq!(adxl_next_status("running", true), "running");
    assert!(!want_active_sticky(0.235, 0.5, Some(3500), 3000));
    assert_eq!(adxl_next_status("running", false), "idle");

    println!("ok: ADXL sticky → running self-check");
}
