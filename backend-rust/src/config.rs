use anyhow::Context;

#[derive(Clone, Debug)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub database_url: String,
    pub mqtt_host: String,
    pub mqtt_port: u16,
    pub mqtt_host_robotic: String,
    pub mqtt_port_robotic: u16,
    pub mqtt_client_id: String,
    pub mqtt_topic_prefix: String,
    pub mqtt_user: String,
    pub mqtt_password: String,
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
            mqtt_host_robotic: std::env::var("MQTT_HOST_ROBOTIC")
                .unwrap_or_else(|_| "10.5.2.223".into()),
            mqtt_port_robotic: std::env::var("MQTT_PORT_ROBOTIC")
                .unwrap_or_else(|_| "1883".into())
                .parse()
                .unwrap_or(1883),
            mqtt_client_id: std::env::var("MQTT_CLIENT_ID")
                .unwrap_or_else(|_| "rfid-iot-backend".into()),
            mqtt_topic_prefix: std::env::var("MQTT_TOPIC_PREFIX")
                .unwrap_or_else(|_| "iot/gistex".into()),
            mqtt_user: std::env::var("MQTT_USER").unwrap_or_default(),
            mqtt_password: std::env::var("MQTT_PASSWORD").unwrap_or_default(),
            offline_timeout_sec: std::env::var("OFFLINE_TIMEOUT_SEC")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(30),
        })
    }

    /// Daftar seluruh broker MQTT yang akan disubscribe secara simultan
    pub fn mqtt_brokers(&self) -> Vec<(String, u16)> {
        let mut list = Vec::new();
        if !self.mqtt_host.trim().is_empty() {
            list.push((self.mqtt_host.trim().to_string(), self.mqtt_port));
        }
        if !self.mqtt_host_robotic.trim().is_empty() {
            let item = (self.mqtt_host_robotic.trim().to_string(), self.mqtt_port_robotic);
            if !list.contains(&item) {
                list.push(item);
            }
        }
        if list.is_empty() {
            list.push(("10.5.0.106".into(), 1883));
        }
        list
    }
}
