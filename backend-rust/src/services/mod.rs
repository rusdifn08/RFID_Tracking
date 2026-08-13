pub mod compare;
pub mod detection;
pub mod machine;
pub mod sim;

/// Getaran delta antar sampel (sama firmware HTML lama): |dx|+|dy|+|dz| dalam m/s².
pub fn vibration_delta(ax: f64, ay: f64, az: f64, prev: Option<(f64, f64, f64)>) -> f64 {
    match prev {
        Some((lx, ly, lz)) => (ax - lx).abs() + (ay - ly).abs() + (az - lz).abs(),
        None => 0.0,
    }
}

/// Prefer field `vibration` dari ESP (peak 1s); fallback delta backend.
pub fn magnitude_g(
    ax: f64,
    ay: f64,
    az: f64,
    vibration: Option<f64>,
    prev: Option<(f64, f64, f64)>,
) -> f64 {
    vibration.unwrap_or_else(|| vibration_delta(ax, ay, az, prev))
}
