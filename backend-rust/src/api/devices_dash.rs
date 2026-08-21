//! Dashboard kesehatan alat — dilayani backend Rust di GET /devices.
use axum::extract::{Path, State};
use axum::Json;
use axum::response::Html;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::logbuf;
use crate::mqtt;
use crate::state::AppState;

const PAGE: &str = r#"<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Device Health — IoT Backend</title>
<style>
  :root {
    --bg: #0f1419; --panel: #1a2332; --line: #2a3548;
    --text: #e8eef7; --muted: #8b9bb4;
    --ok: #3dd68c; --warn: #f5a524; --bad: #f76c6c; --unk: #6b7a90;
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    font-family: "Segoe UI", system-ui, sans-serif;
    background: var(--bg); color: var(--text);
    display: flex; flex-direction: column; overflow: hidden;
  }
  header {
    flex: 0 0 auto;
    padding: .75rem 1.25rem; border-bottom: 1px solid var(--line);
    display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; align-items: baseline;
  }
  h1 { margin: 0; font-size: 1.1rem; font-weight: 650; letter-spacing: .02em; }
  .meta { color: var(--muted); font-size: .82rem; }
  .meta strong { color: var(--text); font-weight: 600; }
  #top {
    flex: 1 1 66%; min-height: 0; overflow: auto;
    padding: .75rem 1.25rem;
  }
  table { width: 100%; border-collapse: collapse; font-size: .88rem; }
  th, td { padding: .5rem .6rem; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th { color: var(--muted); font-weight: 600; font-size: .72rem; text-transform: uppercase; letter-spacing: .04em; }
  tr:hover td { background: rgba(255,255,255,.03); }
  .pill {
    display: inline-block; padding: .12rem .45rem; border-radius: 4px;
    font-size: .72rem; font-weight: 650; letter-spacing: .02em;
  }
  .on { background: rgba(61,214,140,.15); color: var(--ok); }
  .off { background: rgba(247,108,108,.15); color: var(--bad); }
  .exc, .good { color: var(--ok); }
  .fair, .weak { color: var(--warn); }
  .poor { color: var(--bad); } .unk { color: var(--unk); }
  .pill.robotic { background: rgba(56,189,248,.18); color: #38bdf8; }
  .pill.local { background: rgba(168,85,247,.18); color: #c084fc; }
  .mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, Consolas, monospace; }
  .empty { color: var(--muted); padding: 1.5rem; text-align: center; }
  .err { color: var(--bad); padding: .5rem 0; }
  .dots { display: inline-flex; gap: .35rem; align-items: center; vertical-align: middle; }
  .dot {
    width: 10px; height: 10px; border-radius: 50%;
    background: #2a3548; opacity: .35;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
  }
  .dot.on-run { background: var(--ok); opacity: 1; box-shadow: 0 0 6px rgba(61,214,140,.55); }
  .dot.on-idle { background: var(--warn); opacity: 1; box-shadow: 0 0 6px rgba(245,165,36,.45); }
  .dot.on-off { background: var(--bad); opacity: 1; box-shadow: 0 0 6px rgba(247,108,108,.45); }
  .legend { display: inline-flex; gap: .85rem; margin-left: .5rem; }
  .legend span { display: inline-flex; align-items: center; gap: .3rem; color: var(--muted); font-size: .72rem; }
  .legend .dot { opacity: 1; }
  tr.pick { cursor: pointer; }
  tr.pick.active td { background: rgba(61,214,140,.08); }
  .btn-hist {
    background: #1e293b; color: #38bdf8; border: 1px solid #334155;
    border-radius: 5px; padding: .25rem .55rem; font-size: .75rem; font-weight: 600; cursor: pointer;
  }
  .btn-hist:hover { background: #0284c7; color: #fff; }
  #wifi-box {
    margin-top: .8rem; border: 1px solid var(--line); border-radius: 8px;
    background: #111a25; padding: .65rem .75rem;
  }
  #wifi-head { display: flex; gap: .65rem; align-items: center; justify-content: space-between; }
  #wifi-list { margin-top: .5rem; display: grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap: .35rem; }
  .ap { border: 1px solid var(--line); border-radius: 6px; padding: .38rem .5rem; cursor: pointer; }
  .ap:hover { border-color: #4b5d78; }
  .ap .ssid { font-weight: 600; }
  .ap .meta2 { color: var(--muted); font-size: .75rem; }
  .wifi-form { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .55rem; }
  .wifi-form input, .wifi-form button {
    background: #0b121b; color: var(--text); border: 1px solid var(--line); border-radius: 6px; padding: .36rem .5rem;
  }
  .wifi-form button { cursor: pointer; background: #17314f; border-color: #245789; }
  .wifi-form button:hover { background: #214066; }
  #wifi-msg { margin-top: .4rem; font-size: .78rem; color: var(--muted); }
  #log-panel {
    flex: 0 0 33vh; max-height: 33vh; min-height: 120px;
    display: flex; flex-direction: column;
    border-top: 1px solid var(--line); background: #0c1016;
  }
  #log-panel .bar {
    flex: 0 0 auto; padding: .35rem .85rem;
    font-size: .72rem; color: var(--muted); text-transform: uppercase;
    letter-spacing: .05em; border-bottom: 1px solid var(--line);
  }
  #logs {
    flex: 1 1 auto; overflow: auto; margin: 0; padding: .4rem .75rem;
    font-family: ui-monospace, Consolas, monospace; font-size: .72rem;
    line-height: 1.45; white-space: pre-wrap; word-break: break-all;
  }
  #logs .L-INFO { color: #9ecbff; }
  #logs .L-WARN { color: var(--warn); }
  #logs .L-ERROR { color: var(--bad); }
  #logs .ts { color: var(--muted); }

  /* Modal Riwayat 7 Hari */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.75); z-index: 999;
    display: flex; align-items: center; justify-content: center; padding: 1rem;
  }
  .modal-card {
    background: #131b26; border: 1px solid var(--line); border-radius: 12px;
    width: 100%; max-width: 900px; max-height: 85vh; display: flex; flex-direction: column;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,.5); overflow: hidden;
  }
  .modal-header {
    padding: .85rem 1.25rem; border-bottom: 1px solid var(--line); display: flex;
    align-items: center; justify-content: space-between; background: #0d131c;
  }
  .modal-header h3 { margin: 0; font-size: 1rem; color: #60a5fa; }
  .modal-close {
    background: transparent; border: none; color: var(--muted); font-size: 1.2rem;
    cursor: pointer; padding: .2rem .5rem; line-height: 1;
  }
  .modal-close:hover { color: #fff; }
  .modal-body { padding: 1rem 1.25rem; overflow: auto; flex: 1 1 auto; }
  .btn-act {
    background: #0284c7; color: #fff; border: none; border-radius: 6px;
    padding: .35rem .75rem; font-size: .8rem; font-weight: 600; cursor: pointer;
  }
  .btn-act:hover { background: #0369a1; }
  .hist-tbl th { background: #1e293b; color: #94a3b8; }
</style>
</head>
<body>
<header>
  <h1>Device Health Monitor</h1>
  <span class="meta">Poll <strong>2s</strong> · <span id="clock">—</span> · online <strong id="n-on">0</strong>/<span id="n-tot">0</span> · Broker: <strong style="color:#c084fc">10.5.0.106</strong> (Lokal) & <strong style="color:#38bdf8">10.5.2.223</strong> (Robotic)
    <span class="legend">
      <span><i class="dot on-run"></i>Running</span>
      <span><i class="dot on-idle"></i>Idle</span>
      <span><i class="dot on-off"></i>Off</span>
    </span>
  </span>
</header>
<div id="top">
  <div id="err" class="err" hidden></div>
  <table>
    <thead>
      <tr>
        <th>Mesin</th><th>UID</th><th>Phase</th><th>Arus</th><th>Link</th><th>IP</th><th>MAC</th><th>SSID</th><th>MQTT Service</th>
        <th>RSSI</th><th>Sinyal</th><th>WiFi</th><th>MQTT</th><th>Last ping</th><th>Memori 7 Hari (ESP)</th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  <div id="empty" class="empty" hidden>Belum ada mesin / perangkat.</div>
  <div id="wifi-box" hidden>
    <div id="wifi-head">
      <strong id="wifi-title">WiFi setup</strong>
      <button id="btn-scan" type="button">Scan WiFi</button>
    </div>
    <div id="wifi-list"></div>
    <div class="wifi-form">
      <input id="wifi-ssid" placeholder="SSID" />
      <input id="wifi-pass" type="text" placeholder="Password WiFi" autocomplete="off" />
      <button id="btn-apply" type="button">Kirim ke ESP</button>
    </div>
    <div id="wifi-msg"></div>
  </div>
</div>

<!-- Modal 7-Day History Popup -->
<div id="hist-modal" class="modal-overlay" style="display:none;">
  <div class="modal-card">
    <div class="modal-header">
      <h3 id="hist-title">Memori 7 Hari ESP (Snapshot 00:00)</h3>
      <button type="button" class="modal-close" onclick="closeHistoryModal()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:.75rem; flex-wrap:wrap; gap:.5rem;">
        <span class="meta">Data real snapshot jam 00:00 WIB yang tersimpan di memori NVS ESP32:</span>
        <button id="btn-sync-hist" type="button" class="btn-act">🔄 Minta Sinkronisasi dari ESP</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="hist-tbl" style="width:100%;">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>RUNNING</th>
              <th>LOSS / IDLE</th>
              <th>OFF</th>
              <th>POWER ON</th>
              <th>Produktivitas</th>
              <th>Waktu Snapshot</th>
              <th>MQTT Service</th>
            </tr>
          </thead>
          <tbody id="hist-rows"></tbody>
        </table>
      </div>
      <div id="hist-msg" class="meta" style="margin-top:.6rem; color:#38bdf8;"></div>
    </div>
  </div>
</div>

<div id="log-panel">
  <div class="bar">Backend log (MQTT / health)</div>
  <pre id="logs"></pre>
</div>
<script>
const SIG = { excellent:'Sangat bagus', good:'Bagus', fair:'Cukup', weak:'Lemah', poor:'Buruk', unknown:'—' };
let devicesCache = [];
let selectedMachineId = '';
let currentHistMachineId = '';
let stickBottom = true;
const logEl = document.getElementById('logs');
logEl.addEventListener('scroll', () => {
  stickBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40;
});
function ageLabel(s) {
  if (s == null || s >= 9999) return '—';
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s/60) + 'm ' + (s%60) + 's';
  return Math.floor(s/3600) + 'h';
}
function fmtSec(sec) {
  if (sec == null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ' (' + sec + 's)';
}
function boolPill(v) {
  if (v === true) return '<span class="pill on">OK</span>';
  if (v === false) return '<span class="pill off">NO</span>';
  return '<span class="pill off">—</span>';
}
function phaseDots(st, online) {
  const s = String(st || '').toLowerCase();
  let run = '', idle = '', off = '';
  if (!online || s === 'offline' || s === 'off' || s === 'sensor_fail') off = ' on-off';
  else if (s === 'running') run = ' on-run';
  else if (s === 'idle') idle = ' on-idle';
  else off = ' on-off';
  return '<span class="dots" title="' + esc(st||'—') + '">' +
    '<i class="dot' + run + '" title="Running"></i>' +
    '<i class="dot' + idle + '" title="Idle"></i>' +
    '<i class="dot' + off + '" title="Off"></i></span>';
}
function render(list) {
  const tb = document.getElementById('rows');
  const empty = document.getElementById('empty');
  const devices = (list || []).filter(r => r.has_device || r.device_uid);
  devicesCache = devices;
  document.getElementById('n-tot').textContent = devices.length;
  document.getElementById('n-on').textContent = devices.filter(r => r.is_online).length;
  if (!devices.length) { tb.innerHTML = ''; empty.hidden = false; return; }
  empty.hidden = true;
  tb.innerHTML = devices.map(r => {
    const q = r.signal_quality || 'unknown';
    const rssi = r.rssi != null ? r.rssi + ' dBm' : '—';
    const mqttBadge = r.mqtt_service
      ? '<span class="pill ' + (r.mqtt_service.includes('10.5.2.223') ? 'robotic' : 'local') + '">' + esc(r.mqtt_service) + '</span>'
      : '—';
    return '<tr class="pick' + (selectedMachineId===r.id?' active':'') + '" data-mid="' + esc(r.id) + '">' +
      '<td><strong>' + esc(r.code) + '</strong><div class="meta">' + esc(r.display_name||r.name||'') + '</div></td>' +
      '<td class="mono">' + esc(r.device_uid||'—') + '</td>' +
      '<td>' + phaseDots(r.status_pzem, r.is_online) + '</td>' +
      '<td class="mono">' + (r.current_a != null ? Number(r.current_a).toFixed(3) + ' A' : '—') + '</td>' +
      '<td><span class="pill ' + (r.is_online?'on':'off') + '">' + (r.is_online?'ONLINE':'OFFLINE') + '</span></td>' +
      '<td class="mono">' + esc(r.ip_addr||'—') + '</td>' +
      '<td class="mono">' + esc(r.mac_addr||'—') + '</td>' +
      '<td>' + esc(r.wifi_ssid||'—') + '</td>' +
      '<td class="mono">' + mqttBadge + '</td>' +
      '<td class="mono">' + rssi + '</td>' +
      '<td class="' + cls(q) + '">' + (SIG[q]||q) + '</td>' +
      '<td>' + boolPill(r.wifi_ok) + '</td>' +
      '<td>' + boolPill(r.mqtt_ok) + '</td>' +
      '<td class="mono">' + ageLabel(r.link_age_sec) + '</td>' +
      '<td><button type="button" class="btn-hist" onclick="event.stopPropagation(); openHistoryModal(\'' + esc(r.id) + '\', \'' + esc(r.code) + '\')">📊 Memori 7 Hari</button></td>' +
      '</tr>';
  }).join('');
  tb.querySelectorAll('tr.pick').forEach(tr => {
    tr.addEventListener('click', () => selectMachine(tr.getAttribute('data-mid') || ''));
  });
}
function renderLogs(lines) {
  logEl.innerHTML = (lines || []).map(l =>
    '<span class="L-' + esc(l.level) + '"><span class="ts">' + esc(l.t) + '</span>  ' +
    esc(l.level) + '  ' + esc(l.msg) + '</span>'
  ).join('\n');
  if (stickBottom) logEl.scrollTop = logEl.scrollHeight;
}
function cls(q) {
  if (q==='excellent'||q==='good') return 'exc';
  if (q==='fair') return 'fair';
  if (q==='weak') return 'weak';
  if (q==='poor') return 'poor';
  return 'unk';
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function wifiBars(rssi) {
  if (rssi >= -55) return '▂▄▆█';
  if (rssi >= -67) return '▂▄▆_';
  if (rssi >= -75) return '▂▄__';
  if (rssi >= -85) return '▂___';
  return '____';
}
function setWifiMsg(msg) { document.getElementById('wifi-msg').textContent = msg || ''; }
function selectMachine(id) {
  selectedMachineId = id || '';
  render(devicesCache);
  const box = document.getElementById('wifi-box');
  if (!selectedMachineId) { box.hidden = true; return; }
  const m = devicesCache.find(x => x.id === selectedMachineId);
  if (!m) { box.hidden = true; return; }
  box.hidden = false;
  document.getElementById('wifi-title').textContent = 'WiFi setup — ' + (m.code || '');
  document.getElementById('wifi-ssid').value = m.wifi_ssid || '';
  setWifiMsg('Klik "Scan WiFi" untuk melihat jaringan tersedia.');
  loadScan();
}
async function requestScan() {
  if (!selectedMachineId) return;
  setWifiMsg('Meminta scan ke ESP...');
  const r = await fetch('/api/devices/' + selectedMachineId + '/wifi-scan', { method: 'POST' });
  if (!r.ok) throw new Error('scan request gagal');
  setTimeout(loadScan, 1400);
}
async function loadScan() {
  if (!selectedMachineId) return;
  const listEl = document.getElementById('wifi-list');
  const r = await fetch('/api/devices/' + selectedMachineId + '/wifi-scan');
  if (!r.ok) return;
  const data = await r.json();
  const arr = Array.isArray(data.list) ? data.list : [];
  if (!arr.length) {
    listEl.innerHTML = '<div class="meta">Belum ada hasil scan.</div>';
    return;
  }
  arr.sort((a,b)=>(b.rssi||-127)-(a.rssi||-127));
  listEl.innerHTML = arr.map(ap =>
    '<div class="ap" data-ssid="' + esc(ap.ssid) + '">' +
      '<div class="ssid">' + esc(ap.ssid) + '</div>' +
      '<div class="meta2 mono">' + wifiBars(ap.rssi||-127) + '  ' + (ap.rssi??-127) + ' dBm · CH ' + (ap.channel??0) + (ap.secure?' · secure':' · open') + '</div>' +
    '</div>'
  ).join('');
  listEl.querySelectorAll('.ap').forEach(el => {
    el.addEventListener('click', () => { document.getElementById('wifi-ssid').value = el.getAttribute('data-ssid') || ''; });
  });
  setWifiMsg('Pilih SSID lalu isi password, kemudian kirim ke ESP.');
}
async function applyWifi() {
  if (!selectedMachineId) return;
  const ssid = String(document.getElementById('wifi-ssid').value || '').trim();
  const pass = String(document.getElementById('wifi-pass').value || '');
  if (!ssid) { setWifiMsg('SSID wajib diisi.'); return; }
  setWifiMsg('Mengirim konfigurasi WiFi ke ESP...');
  const r = await fetch('/api/devices/' + selectedMachineId + '/wifi-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wifi_ssid: ssid, wifi_pass: pass })
  });
  if (!r.ok) throw new Error('gagal kirim set_network');
  setWifiMsg('Terkirim. ESP akan reconnect ke WiFi baru.');
}

async function openHistoryModal(mid, code) {
  currentHistMachineId = mid;
  const m = devicesCache.find(x => x.id === mid) || { id: mid, code: code };
  document.getElementById('hist-title').textContent = 'Memori 7 Hari ESP — ' + (m.code || '') + ' (UID: ' + (m.device_uid || '—') + ')';
  document.getElementById('hist-modal').style.display = 'flex';
  loadHistory(mid);
}

function closeHistoryModal() {
  document.getElementById('hist-modal').style.display = 'none';
}

async function loadHistory(mid) {
  const tbody = document.getElementById('hist-rows');
  const msgEl = document.getElementById('hist-msg');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:1.2rem; color:var(--muted);">Memuat riwayat memori dari database...</td></tr>';
  msgEl.textContent = '';
  try {
    const r = await fetch('/api/devices/' + mid + '/history');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const arr = Array.isArray(d.history) ? d.history : [];
    if (!arr.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:1.5rem; color:var(--muted);">Belum ada snapshot tersimpan. Klik tombol <strong>🔄 Minta Sinkronisasi dari ESP</strong> untuk menarik memori real sekarang.</td></tr>';
      return;
    }
    tbody.innerHTML = arr.map(h => {
      const prod = Number(h.productivity_pct || 0).toFixed(2);
      const prodColor = prod >= 90 ? '#4ade80' : (prod >= 80 ? '#38bdf8' : '#fb7185');
      return '<tr>' +
        '<td class="mono font-bold" style="color:#60a5fa">' + esc(h.work_date) + '</td>' +
        '<td class="mono" style="color:#4ade80">' + fmtSec(h.run_sec) + '</td>' +
        '<td class="mono" style="color:#fbbf24">' + fmtSec(h.loss_sec) + '</td>' +
        '<td class="mono" style="color:#fb7185">' + fmtSec(h.off_sec) + '</td>' +
        '<td class="mono">' + fmtSec(h.power_on_sec) + '</td>' +
        '<td class="mono font-bold" style="color:' + prodColor + '">' + prod + '%</td>' +
        '<td class="mono meta" style="font-size:.72rem;">' + (h.saved_at ? new Date(h.saved_at).toLocaleString('id-ID') : '—') + '</td>' +
        '<td class="mono"><span class="pill ' + ((h.mqtt_service||'').includes('10.5.2.223') ? 'robotic' : 'local') + '">' + esc(h.mqtt_service||'—') + '</span></td>' +
        '</tr>';
    }).join('');
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--bad); padding:1rem;">Gagal memuat: ' + esc(e.message) + '</td></tr>';
  }
}

document.getElementById('btn-sync-hist').addEventListener('click', async () => {
  if (!currentHistMachineId) return;
  const msgEl = document.getElementById('hist-msg');
  msgEl.textContent = 'Mengirim perintah get_history ke ESP32...';
  try {
    const r = await fetch('/api/devices/' + currentHistMachineId + '/history/sync', { method: 'POST' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    msgEl.textContent = 'Perintah terkirim ke ESP. Menunggu balasan memori MQTT...';
    setTimeout(() => loadHistory(currentHistMachineId), 1500);
  } catch (e) {
    msgEl.textContent = 'Gagal: ' + e.message;
  }
});

async function tick() {
  try {
    const [devRes, logRes] = await Promise.all([
      fetch('/api/machines/control', { cache: 'no-store' }),
      fetch('/api/devices/logs', { cache: 'no-store' }),
    ]);
    if (!devRes.ok) throw new Error('HTTP ' + devRes.status);
    document.getElementById('err').hidden = true;
    render(await devRes.json());
    if (logRes.ok) renderLogs(await logRes.json());
  } catch (e) {
    const el = document.getElementById('err');
    el.hidden = false;
    el.textContent = 'Gagal ambil data: ' + e.message;
  }
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('id-ID');
}
document.getElementById('btn-scan').addEventListener('click', () => requestScan().catch(e => setWifiMsg('Error: ' + e.message)));
document.getElementById('btn-apply').addEventListener('click', () => applyWifi().catch(e => setWifiMsg('Error: ' + e.message)));
tick();
setInterval(tick, 2000);
</script>
</body>
</html>"#;

pub async fn devices_dashboard() -> Html<&'static str> {
    Html(PAGE)
}

pub async fn devices_logs() -> Json<Value> {
    Json(json!(logbuf::snapshot()))
}

#[derive(serde::Deserialize)]
pub struct WifiConfigBody {
    pub wifi_ssid: String,
    pub wifi_pass: String,
}

pub async fn request_wifi_scan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (axum::http::StatusCode, String)> {
    #[derive(sqlx::FromRow)]
    struct Row {
        code: String,
        device_uid: Option<String>,
    }
    let row = sqlx::query_as::<_, Row>(
        r#"SELECT m.code,
                  (SELECT d.device_uid FROM devices d
                   WHERE d.machine_id = m.id
                   ORDER BY d.last_seen_at DESC NULLS LAST
                   LIMIT 1) AS device_uid
           FROM machines m WHERE m.id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or((axum::http::StatusCode::NOT_FOUND, "machine not found".into()))?;

    let payload = serde_json::json!({ "command": "wifi_scan" }).to_string();
    mqtt::publish_command(&state, &row.code, &payload);
    if let Some(uid) = row.device_uid.as_deref() {
        if !uid.is_empty() {
            mqtt::publish_device_command(&state, uid, &payload);
        }
    }
    Ok(Json(json!({ "ok": true })))
}

pub async fn get_wifi_scan(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (axum::http::StatusCode, String)> {
    let uid = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT (SELECT d.device_uid FROM devices d
                   WHERE d.machine_id = m.id
                   ORDER BY d.last_seen_at DESC NULLS LAST
                   LIMIT 1) AS device_uid
           FROM machines m WHERE m.id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .flatten()
    .unwrap_or_default();
    if uid.is_empty() {
        return Ok(Json(json!({ "updated_at": null, "list": [] })));
    }
    if let Some(r) = state.wifi_scans.get(&uid) {
        return Ok(Json(json!({
            "updated_at": r.updated_at,
            "list": r.list
        })));
    }
    Ok(Json(json!({ "updated_at": null, "list": [] })))
}

pub async fn set_wifi_config(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<WifiConfigBody>,
) -> Result<Json<Value>, (axum::http::StatusCode, String)> {
    #[derive(sqlx::FromRow)]
    struct Row {
        code: String,
        device_uid: Option<String>,
    }
    let row = sqlx::query_as::<_, Row>(
        r#"SELECT m.code,
                  (SELECT d.device_uid FROM devices d
                   WHERE d.machine_id = m.id
                   ORDER BY d.last_seen_at DESC NULLS LAST
                   LIMIT 1) AS device_uid
           FROM machines m WHERE m.id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or((axum::http::StatusCode::NOT_FOUND, "machine not found".into()))?;

    let ssid = body.wifi_ssid.trim();
    if ssid.is_empty() {
        return Err((axum::http::StatusCode::BAD_REQUEST, "wifi_ssid wajib".into()));
    }
    let payload = serde_json::json!({
        "command": "set_network",
        "wifi_ssid": ssid,
        "wifi_pass": body.wifi_pass,
    })
    .to_string();
    mqtt::publish_command(&state, &row.code, &payload);
    if let Some(uid) = row.device_uid.as_deref() {
        if !uid.is_empty() {
            mqtt::publish_device_command(&state, uid, &payload);
        }
    }
    Ok(Json(json!({ "ok": true })))
}

pub async fn get_device_history(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (axum::http::StatusCode, String)> {
    #[derive(sqlx::FromRow, serde::Serialize)]
    struct HistRow {
        work_date: chrono::NaiveDate,
        ymd: i32,
        run_sec: i32,
        loss_sec: i32,
        off_sec: i32,
        power_on_sec: i32,
        productivity_pct: f64,
        mqtt_service: Option<String>,
        saved_at: chrono::DateTime<chrono::Utc>,
    }

    let list = sqlx::query_as::<_, HistRow>(
        r#"SELECT work_date, ymd, run_sec, loss_sec, off_sec, power_on_sec, productivity_pct, mqtt_service, saved_at
           FROM esp_daily_history
           WHERE machine_id = $1
           ORDER BY work_date DESC
           LIMIT 7"#,
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .map_err(internal)?;

    Ok(Json(json!({ "machine_id": id, "history": list })))
}

pub async fn request_history_sync(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, (axum::http::StatusCode, String)> {
    #[derive(sqlx::FromRow)]
    struct Row {
        code: String,
        device_uid: Option<String>,
    }
    let row = sqlx::query_as::<_, Row>(
        r#"SELECT m.code,
                  (SELECT d.device_uid FROM devices d
                   WHERE d.machine_id = m.id
                   ORDER BY d.last_seen_at DESC NULLS LAST
                   LIMIT 1) AS device_uid
           FROM machines m WHERE m.id = $1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or((axum::http::StatusCode::NOT_FOUND, "machine not found".into()))?;

    let payload = serde_json::json!({ "command": "get_history" }).to_string();
    mqtt::publish_command(&state, &row.code, &payload);
    if let Some(uid) = row.device_uid.as_deref() {
        if !uid.is_empty() {
            mqtt::publish_device_command(&state, uid, &payload);
        }
    }
    Ok(Json(json!({ "ok": true, "message": "History sync requested from ESP" })))
}

fn internal(e: sqlx::Error) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}
