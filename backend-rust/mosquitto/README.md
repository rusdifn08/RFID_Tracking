# Mosquitto — autentikasi MQTT

Password **tidak** masuk Git. Buat file `mosquitto.passwd` di folder ini:

```
mosquitto_passwd -c mosquitto.passwd gistex
```

User yang sama diisi ke backend (`MQTT_USER` / `MQTT_PASSWORD`) dan ke ESP lewat Setup AP.

Lalu restart Mosquitto dengan `mosquitto.conf` ini. ESP lama tanpa user/password akan ditolak sampai di-provision ulang.
