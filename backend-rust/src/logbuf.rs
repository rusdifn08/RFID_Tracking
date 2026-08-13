//! Ring buffer log untuk dashboard /devices (bukan terminal).
use std::collections::VecDeque;
use std::sync::{Mutex, OnceLock};

use serde::Serialize;

const CAP: usize = 400;

#[derive(Clone, Serialize)]
pub struct LogLine {
    pub t: String,
    pub level: String,
    pub msg: String,
}

fn buf() -> &'static Mutex<VecDeque<LogLine>> {
    static B: OnceLock<Mutex<VecDeque<LogLine>>> = OnceLock::new();
    B.get_or_init(|| Mutex::new(VecDeque::with_capacity(CAP)))
}

pub fn push(level: &str, msg: impl Into<String>) {
    let msg = msg.into();
    let line = LogLine {
        t: chrono::Utc::now()
            .format("%Y-%m-%dT%H:%M:%S%.3fZ")
            .to_string(),
        level: level.to_string(),
        msg,
    };
    if let Ok(mut g) = buf().lock() {
        if g.len() >= CAP {
            g.pop_front();
        }
        g.push_back(line);
    }
}

pub fn info(msg: impl Into<String>) {
    push("INFO", msg);
}

pub fn warn(msg: impl Into<String>) {
    push("WARN", msg);
}

pub fn error(msg: impl Into<String>) {
    push("ERROR", msg);
}

pub fn snapshot() -> Vec<LogLine> {
    buf()
        .lock()
        .map(|g| g.iter().cloned().collect())
        .unwrap_or_default()
}
