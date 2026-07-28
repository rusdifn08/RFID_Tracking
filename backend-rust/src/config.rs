use anyhow::Context;

#[derive(Clone, Debug)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub mqtt_host: String,
    pub mqtt_port: u16,
    pub mqtt_client_id: String,
    pub mqtt_topic_prefix: String,
    pub offline_timeout_sec: i64,
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        Ok(Self {
            host: std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "8088".into())
                .parse()
                .context("PORT invalid")?,
            database_url: std::env::var("DATABASE_URL").context("DATABASE_URL required")?,
            mqtt_host: std::env::var("MQTT_HOST").unwrap_or_else(|_| "10.5.0.106".into()),
            mqtt_port: std::env::var("MQTT_PORT")
                .unwrap_or_else(|_| "1883".into())
                .parse()
                .unwrap_or(1883),
            mqtt_client_id: std::env::var("MQTT_CLIENT_ID")
                .unwrap_or_else(|_| "rfid-iot-backend".into()),
            mqtt_topic_prefix: std::env::var("MQTT_TOPIC_PREFIX")
                .unwrap_or_else(|_| "iot/gistex".into()),
            offline_timeout_sec: std::env::var("OFFLINE_TIMEOUT_SEC")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),
        })
    }
}
