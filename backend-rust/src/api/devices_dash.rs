//! Dashboard kesehatan alat — dilayani backend Rust di GET /devices.
use axum::extract::{Path, Query, State};
use axum::Json;
use axum::response::Html;
use serde_json::{json, Value};
use uuid::Uuid;

use crate::logbuf;
use crate::models::{Machine, UpdateMachine};
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
    --bg: #070b12; --bg2: #0d1420; --panel: #111b2a; --panel2: #162033;
    --line: #243044; --line2: #2f3f58;
    --text: #eef4ff; --muted: #8fa3bf;
    --ok: #34d399; --warn: #fbbf24; --bad: #f87171; --unk: #64748b;
    --accent: #38bdf8; --accent2: #818cf8;
    --shadow: 0 24px 48px rgba(0,0,0,.45);
  }
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body {
    font-family: "Inter", "Segoe UI", system-ui, sans-serif;
    background: radial-gradient(1200px 600px at 10% -10%, rgba(56,189,248,.08), transparent),
                radial-gradient(900px 500px at 90% 0%, rgba(129,140,248,.07), transparent),
                var(--bg);
    color: var(--text);
    display: flex; flex-direction: column; overflow: hidden;
  }
  header {
    flex: 0 0 auto;
    padding: 1rem 1.5rem 1.1rem;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, rgba(17,27,42,.95), rgba(13,20,32,.88));
    backdrop-filter: blur(8px);
  }
  .header-top { display: flex; flex-wrap: wrap; gap: 1rem 2rem; align-items: center; justify-content: space-between; }
  h1 {
    margin: 0; font-size: 1.35rem; font-weight: 700; letter-spacing: -.02em;
    background: linear-gradient(90deg, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .header-sub { color: var(--muted); font-size: .8rem; margin-top: .2rem; }
  .stat-row { display: flex; gap: .65rem; flex-wrap: wrap; }
  .stat-card {
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    padding: .45rem .85rem; min-width: 88px;
  }
  .stat-card .lbl { font-size: .65rem; color: var(--muted); text-transform: uppercase; letter-spacing: .06em; }
  .stat-card .val { font-size: 1.05rem; font-weight: 700; margin-top: .1rem; }
  .meta { color: var(--muted); font-size: .82rem; }
  .meta strong { color: var(--text); font-weight: 600; }
  #top {
    flex: 1 1 66%; min-height: 0; overflow: auto;
    padding: 1rem 1.5rem 1.25rem;
  }
  .table-wrap {
    border: 1px solid var(--line); border-radius: 14px; overflow: hidden;
    background: rgba(17,27,42,.65); box-shadow: var(--shadow);
  }
  table { width: 100%; border-collapse: collapse; font-size: .84rem; }
  th, td { padding: .58rem .7rem; text-align: left; vertical-align: middle; border-bottom: 1px solid var(--line); white-space: nowrap; }
  th {
    color: var(--muted); font-weight: 600; font-size: .68rem; text-transform: uppercase; letter-spacing: .05em;
    background: #0f1728; position: sticky; top: 0; z-index: 2;
  }
  tbody tr:nth-child(even) td { background: rgba(255,255,255,.015); }
  tr.pick { cursor: pointer; transition: background .15s; }
  tr.pick:hover td { background: rgba(56,189,248,.06) !important; }
  tr.pick.active td { background: rgba(56,189,248,.1) !important; box-shadow: inset 3px 0 0 var(--accent); }
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
  .pill.sleep { background: rgba(96,165,250,.18); color: #60a5fa; }
  .filters {
    display: flex; flex-wrap: wrap; gap: .45rem .75rem; align-items: center;
    padding: .55rem 1.25rem; border-bottom: 1px solid var(--line); background: #121a24;
  }
  .filters label { color: var(--muted); font-size: .75rem; font-weight: 600; }
  .filters select, .filters button {
    background: #0b121b; color: var(--text); border: 1px solid var(--line);
    border-radius: 6px; padding: .28rem .5rem; font-size: .8rem;
  }
  .filters button { cursor: pointer; background: #17314f; border-color: #245789; }
  .filters button:hover { background: #214066; }
  .filters .hint { color: var(--muted); font-size: .72rem; }
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
  .legend { display: inline-flex; gap: .85rem; flex-wrap: wrap; }
  .legend span { display: inline-flex; align-items: center; gap: .3rem; color: var(--muted); font-size: .72rem; }
  .legend .dot { opacity: 1; }
  .btn-hist {
    background: #1e293b; color: #38bdf8; border: 1px solid #334155;
    border-radius: 5px; padding: .25rem .55rem; font-size: .75rem; font-weight: 600; cursor: pointer;
  }
  .btn-hist:hover { background: #0284c7; color: #fff; }
  .btn-dl {
    background: #1e293b; color: #a3e635; border: 1px solid #334155;
    border-radius: 5px; padding: .25rem .55rem; font-size: .75rem; font-weight: 600; cursor: pointer;
  }
  .btn-dl:hover { background: #65a30d; color: #fff; }
  .btn-pair { display: inline-flex; gap: .35rem; align-items: center; }
  .tog { position: relative; display: inline-block; width: 38px; height: 20px; vertical-align: middle; }
  .tog input { opacity: 0; width: 0; height: 0; position: absolute; }
  .tog span {
    position: absolute; cursor: pointer; inset: 0; background: #334155; border-radius: 20px; transition: .2s;
  }
  .tog input:checked + span { background: #3dd68c; }
  .tog span:before {
    content: ""; position: absolute; height: 14px; width: 14px; left: 3px; bottom: 3px;
    background: #fff; border-radius: 50%; transition: .2s;
  }
  .tog input:checked + span:before { transform: translateX(18px); }
  .login-col { display: flex; flex-direction: column; gap: .2rem; align-items: flex-start; }
  .login-col .row2 { display: flex; gap: .35rem; align-items: center; flex-wrap: wrap; }
  .login-col .lbl { font-size: .65rem; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .pill.sync-warn { background: rgba(245,165,36,.15); color: var(--warn); }
  #toast-box {
    position: fixed; top: .85rem; right: .85rem; z-index: 2000;
    display: flex; flex-direction: column; gap: .45rem; max-width: min(360px, 92vw);
  }
  .toast {
    padding: .65rem .85rem; border-radius: 8px; font-size: .82rem; font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,.45); animation: toast-in .25s ease;
  }
  .toast-on { background: #14532d; color: #86efac; border: 1px solid #22c55e; }
  .toast-off { background: #450a0a; color: #fca5a5; border: 1px solid #ef4444; }
  @keyframes toast-in { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }

  /* Device control modal */
  .dev-modal-card {
    background: linear-gradient(180deg, #121c2c, #0f1724);
    border: 1px solid var(--line2); border-radius: 16px;
    width: 100%; max-width: 960px; max-height: 92vh;
    display: flex; flex-direction: column; box-shadow: var(--shadow); overflow: hidden;
  }
  .dev-modal-hero {
    padding: 1.1rem 1.35rem; border-bottom: 1px solid var(--line);
    display: flex; gap: 1rem; align-items: flex-start; justify-content: space-between;
    background: linear-gradient(135deg, rgba(56,189,248,.12), rgba(129,140,248,.08));
  }
  .dev-modal-hero h3 { margin: 0; font-size: 1.15rem; font-weight: 700; }
  .dev-modal-hero .sub { color: var(--muted); font-size: .8rem; margin-top: .25rem; }
  .dev-badges { display: flex; gap: .4rem; flex-wrap: wrap; margin-top: .5rem; }
  .dev-body { padding: 1.1rem 1.35rem; overflow: auto; flex: 1 1 auto; }
  .dev-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 1.25rem; }
  @media (max-width: 768px) { .dev-grid { grid-template-columns: 1fr; } }
  .dev-section {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: .9rem 1rem;
  }
  .dev-section h4 {
    margin: 0 0 .75rem; font-size: .72rem; text-transform: uppercase; letter-spacing: .08em;
    color: var(--accent); font-weight: 700;
  }
  .fld { margin-bottom: .7rem; }
  .fld label { display: block; font-size: .72rem; color: var(--muted); margin-bottom: .28rem; font-weight: 600; }
  .fld input, .fld select {
    width: 100%; background: #0a1019; color: var(--text); border: 1px solid var(--line);
    border-radius: 8px; padding: .5rem .65rem; font-size: .86rem;
  }
  .fld input:focus, .fld select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(56,189,248,.15); }
  .fld input[readonly] { opacity: .65; cursor: not-allowed; background: #0d131c; }
  .dev-wifi-list { display: grid; grid-template-columns: repeat(auto-fill,minmax(200px,1fr)); gap: .4rem; max-height: 140px; overflow: auto; margin: .5rem 0; }
  .dev-footer {
    padding: .85rem 1.35rem; border-top: 1px solid var(--line);
    display: flex; gap: .6rem; justify-content: flex-end; flex-wrap: wrap; background: #0c121c;
  }
  .btn-primary {
    background: linear-gradient(135deg, #0284c7, #2563eb); color: #fff; border: none;
    border-radius: 8px; padding: .55rem 1.1rem; font-weight: 700; font-size: .84rem; cursor: pointer;
  }
  .btn-primary:hover { filter: brightness(1.08); }
  .btn-ghost {
    background: transparent; color: var(--muted); border: 1px solid var(--line);
    border-radius: 8px; padding: .55rem 1rem; font-size: .84rem; cursor: pointer;
  }
  .btn-ghost:hover { color: var(--text); border-color: var(--line2); }
  .btn-sm {
    background: #17314f; color: #bae6fd; border: 1px solid #245789; border-radius: 6px;
    padding: .35rem .7rem; font-size: .76rem; font-weight: 600; cursor: pointer;
  }
  .btn-sm:hover { background: #214066; }
  #dev-msg { font-size: .78rem; color: var(--accent); margin-top: .5rem; min-height: 1.2em; }
  #wifi-box { display: none !important; }
  .ap { border: 1px solid var(--line); border-radius: 6px; padding: .38rem .5rem; cursor: pointer; }
  .ap:hover { border-color: #4b5d78; }
  .ap .ssid { font-weight: 600; }
  .ap .meta2 { color: var(--muted); font-size: .75rem; }
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
  <div class="header-top">
    <div>
      <h1>Device Health Monitor</h1>
      <div class="header-sub">IoT ESP32 · PZEM · Sinkronisasi backend dinamis · <span id="clock">—</span></div>
    </div>
    <div class="stat-row">
      <div class="stat-card"><div class="lbl">Online</div><div class="val" id="n-on">0</div></div>
      <div class="stat-card"><div class="lbl">Total</div><div class="val" id="n-tot">0</div></div>
      <div class="stat-card"><div class="lbl">Poll</div><div class="val">2s</div></div>
    </div>
  </div>
  <div class="meta" style="margin-top:.65rem;">
    Broker: <strong style="color:#c084fc">10.5.0.106</strong> (Lokal) · <strong style="color:#38bdf8">10.5.2.222</strong> (Robotic)
    <span class="legend">
      <span><i class="dot on-run"></i>Running</span>
      <span><i class="dot on-idle"></i>Idle</span>
      <span><i class="dot on-off"></i>Off</span>
    </span>
  </div>
</header>
<div class="filters">
  <label>STATUS ESP</label>
  <select id="f-status">
    <option value="all">Semua</option>
    <option value="online">Online saja</option>
    <option value="offline">Offline saja</option>
    <option value="deepsleep">Deep sleep saja</option>
  </select>
  <label>MQTT</label>
  <select id="f-mqtt">
    <option value="all">Semua broker</option>
    <option value="222">10.5.2.222 (Robotic)</option>
    <option value="106">10.5.0.106 (Lokal)</option>
  </select>
  <label>Urutkan</label>
  <select id="f-sort">
    <option value="code">Kode mesin</option>
    <option value="rssi_best">Sinyal terbaik</option>
    <option value="rssi_worst">Sinyal terlemah</option>
    <option value="uid">UID</option>
  </select>
  <button type="button" id="btn-filter-reset">Reset</button>
  <span class="hint" id="f-count">—</span>
</div>
<div id="top">
  <div id="err" class="err" hidden></div>
  <div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th>Mesin</th><th>UID</th><th>Phase</th><th>Arus</th><th>STATUS ESP</th><th>IP</th><th>MAC</th><th>SSID</th><th>MQTT Service</th>
        <th>RSSI</th><th>Sinyal</th><th>WiFi</th><th>MQTT</th><th>System Login</th><th>Last ping</th><th>Memori 7 Hari (ESP)</th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  </div>
  <div id="empty" class="empty" hidden>Belum ada mesin / perangkat.</div>
  <div id="wifi-box" hidden></div>
</div>

<!-- Modal Kontrol Device -->
<div id="device-modal" class="modal-overlay" style="display:none;">
  <div class="dev-modal-card" onclick="event.stopPropagation()">
    <div class="dev-modal-hero">
      <div>
        <h3 id="dev-title">Kontrol Device</h3>
        <div class="sub" id="dev-subtitle">—</div>
        <div class="dev-badges" id="dev-badges"></div>
      </div>
      <button type="button" class="modal-close" onclick="closeDeviceModal()">✕</button>
    </div>
    <div class="dev-body">
      <div class="dev-grid">
        <div class="dev-section">
          <h4>Identitas Mesin</h4>
          <div class="fld"><label>Machine Code</label><input id="dev-code" type="text" placeholder="JUKI005"/></div>
          <div class="fld"><label>Nama Proses</label><input id="dev-process" type="text" placeholder="Zigzag Plaket"/></div>
          <div class="fld"><label>Nama Operator</label><input id="dev-operator" type="text" placeholder="Nama operator"/></div>
          <div class="fld"><label>Device UID (read-only)</label><input id="dev-uid" type="text" readonly/></div>
        </div>
        <div class="dev-section">
          <h4>Lokasi Produksi</h4>
          <div class="fld"><label>Location (Branch)</label>
            <select id="dev-branch">
              <option value="GM1">GM1</option>
              <option value="GM2">GM2</option>
              <option value="GM3">GM3</option>
            </select>
          </div>
          <div class="fld"><label>Line</label>
            <select id="dev-line"></select>
          </div>
          <div class="fld"><label>System Login</label>
            <label class="tog" style="margin-top:.2rem;">
              <input type="checkbox" id="dev-login"/>
              <span></span>
            </label>
            <span class="meta" id="dev-login-hint" style="margin-left:.5rem;">OFF = tanpa login wajib</span>
          </div>
        </div>
        <div class="dev-section" style="grid-column:1/-1;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:.5rem; flex-wrap:wrap;">
            <h4 style="margin:0;">WiFi &amp; Koneksi</h4>
            <button type="button" class="btn-sm" id="btn-dev-scan">Scan WiFi</button>
          </div>
          <div class="dev-wifi-list" id="dev-wifi-list"><div class="meta">Klik Scan WiFi untuk melihat jaringan di sekitar ESP.</div></div>
          <div class="dev-grid" style="margin-top:.5rem;">
            <div class="fld"><label>SSID</label><input id="dev-wifi-ssid" type="text" placeholder="Tracked (9)"/></div>
            <div class="fld"><label>Password WiFi</label><input id="dev-wifi-pass" type="text" autocomplete="off" placeholder="Password"/></div>
          </div>
          <div id="dev-msg"></div>
        </div>
      </div>
    </div>
    <div class="dev-footer">
      <button type="button" class="btn-ghost" onclick="closeDeviceModal()">Batal</button>
      <button type="button" class="btn-primary" id="btn-dev-save">Simpan &amp; Kirim ke ESP</button>
    </div>
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

<div id="toast-box"></div>

<div id="log-panel">
  <div class="bar">Backend log (MQTT / health)</div>
  <pre id="logs"></pre>
</div>
<script>
const SIG = { excellent:'Sangat bagus', good:'Bagus', fair:'Cukup', weak:'Lemah', poor:'Buruk', unknown:'—' };
let devicesCache = [];
let selectedMachineId = '';
let currentHistMachineId = '';
let lastLoginEventId = 0;
let stickBottom = true;
const logEl = document.getElementById('logs');
logEl.addEventListener('scroll', () => {
  stickBottom = logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 40;
});
function espStatusOf(r) {
  return String(r.esp_status || (r.in_deep_sleep ? 'deepsleep' : (r.is_online ? 'online' : 'offline'))).toLowerCase();
}
function applyDeviceFilters(list) {
  const st = document.getElementById('f-status').value;
  const mq = document.getElementById('f-mqtt').value;
  const sort = document.getElementById('f-sort').value;
  let out = (list || []).slice();
  if (st !== 'all') out = out.filter(r => espStatusOf(r) === st);
  if (mq === '222') out = out.filter(r => String(r.mqtt_service || '').includes('10.5.2.222'));
  if (mq === '106') out = out.filter(r => String(r.mqtt_service || '').includes('10.5.0.106'));
  out.sort((a, b) => {
    if (sort === 'rssi_best' || sort === 'rssi_worst') {
      const ra = (a.rssi == null ? -999 : a.rssi);
      const rb = (b.rssi == null ? -999 : b.rssi);
      return sort === 'rssi_best' ? (rb - ra) : (ra - rb);
    }
    if (sort === 'uid') return String(a.device_uid || '').localeCompare(String(b.device_uid || ''));
    return String(a.code || '').localeCompare(String(b.code || ''));
  });
  return out;
}
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
function espStatusPill(r) {
  const st = espStatusOf(r);
  if (st === 'deepsleep') return '<span class="pill sleep">DEEPSLEEP</span>';
  if (st === 'online') return '<span class="pill on">ONLINE</span>';
  return '<span class="pill off">OFFLINE</span>';
}
function espLoginPill(v) {
  if (v === true) return '<span class="pill on">ON</span>';
  if (v === false) return '<span class="pill off">OFF</span>';
  return '<span class="pill off">—</span>';
}
function loginSystemCol(r) {
  const esp = r.esp_login_required;
  const mismatch = esp !== null && esp !== undefined && esp !== r.login_required;
  const syncHint = mismatch
    ? '<span class="pill sync-warn" title="Backend dan ESP belum sama">Sync</span>'
    : '';
  return '<td class="login-col" onclick="event.stopPropagation()">' +
    '<div class="row2"><span class="lbl">Set</span>' +
    '<label class="tog" title="System Login backend (retained saat ESP offline)">' +
    '<input type="checkbox" ' + (r.login_required ? 'checked' : '') +
    ' onchange="setLoginSystem(\'' + esc(r.id) + '\', this.checked, \'' + esc(r.code) + '\')"/>' +
    '<span></span></label></div>' +
    '<div class="row2"><span class="lbl">ESP</span>' + espLoginPill(esp) + syncHint + '</div></td>';
}
function memoriBtns(r) {
  return '<td onclick="event.stopPropagation()"><span class="btn-pair">' +
    '<button type="button" class="btn-hist" title="Lihat memori 7 hari" onclick="openHistoryModal(\'' + esc(r.id) + '\', \'' + esc(r.code) + '\')">📊</button>' +
    '<button type="button" class="btn-dl" title="Unduh CSV memori 7 hari" onclick="downloadHistory(\'' + esc(r.id) + '\', \'' + esc(r.code) + '\')">⬇</button>' +
    '</span></td>';
}
function showLoginToast(ev) {
  const box = document.getElementById('toast-box');
  if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast ' + (ev.login_required ? 'toast-on' : 'toast-off');
  el.textContent = ev.message || ('System Login UID ' + (ev.device_uid || '?') + ' ' + (ev.status || ''));
  box.appendChild(el);
  setTimeout(() => el.remove(), 7000);
}
async function pollLoginEvents() {
  try {
    const r = await fetch('/api/devices/login-events?since=' + lastLoginEventId, { cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    (d.events || []).forEach(ev => {
      if (ev.id > lastLoginEventId) lastLoginEventId = ev.id;
      showLoginToast(ev);
    });
  } catch (_) {}
}
async function setLoginSystem(mid, on, code) {
  try {
    const r = await fetch('/api/devices/' + mid + '/login-system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login_required: on })
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    showLoginToast({
      login_required: on,
      message: 'System Login ' + (code || '') + ' → ' + (on ? 'ON' : 'OFF') + ' (menunggu konfirmasi ESP…)'
    });
    tick();
  } catch (e) {
    alert('Gagal ubah System Login: ' + e.message);
    tick();
  }
}
async function downloadHistory(mid, code) {
  try {
    const r = await fetch('/api/devices/' + mid + '/history');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const arr = Array.isArray(d.history) ? d.history : [];
    const head = ['work_date','run_sec','loss_sec','off_sec','power_on_sec','productivity_pct','saved_at','mqtt_service'];
    const lines = [head.join(',')];
    arr.forEach(h => {
      lines.push(head.map(k => {
        const v = h[k];
        if (v == null) return '';
        const s = String(v);
        return s.includes(',') ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'memori_7hari_' + (code || mid) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    alert('Gagal unduh: ' + e.message);
  }
}
function render(list) {
  const tb = document.getElementById('rows');
  const empty = document.getElementById('empty');
  const all = (list || []).filter(r => r.has_device || r.device_uid);
  devicesCache = all;
  const devices = applyDeviceFilters(all);
  document.getElementById('n-tot').textContent = all.length;
  document.getElementById('n-on').textContent = all.filter(r => r.is_online && !r.in_deep_sleep).length;
  const fc = document.getElementById('f-count');
  if (fc) fc.textContent = 'Tampil ' + devices.length + ' / ' + all.length;
  if (!devices.length) { tb.innerHTML = ''; empty.hidden = false; empty.textContent = all.length ? 'Tidak ada device sesuai filter.' : 'Belum ada mesin / perangkat.'; return; }
  empty.hidden = true;
  empty.textContent = 'Belum ada mesin / perangkat.';
  tb.innerHTML = devices.map(r => {
    const q = r.signal_quality || 'unknown';
    const rssi = r.rssi != null ? r.rssi + ' dBm' : '—';
    const mqttBadge = r.mqtt_service
      ? '<span class="pill ' + (r.mqtt_service.includes('10.5.2.222') ? 'robotic' : 'local') + '">' + esc(r.mqtt_service) + '</span>'
      : '—';
    return '<tr class="pick' + (selectedMachineId===r.id?' active':'') + '" data-mid="' + esc(r.id) + '">' +
      '<td><strong>' + esc(r.code) + '</strong><div class="meta">' + esc(r.display_name||r.name||'') + '</div></td>' +
      '<td class="mono">' + esc(r.device_uid||'—') + '</td>' +
      '<td>' + phaseDots(r.status_pzem, r.is_online && !r.in_deep_sleep) + '</td>' +
      '<td class="mono">' + (r.current_a != null ? Number(r.current_a).toFixed(3) + ' A' : '—') + '</td>' +
      '<td>' + espStatusPill(r) + '</td>' +
      '<td class="mono">' + esc(r.ip_addr||'—') + '</td>' +
      '<td class="mono">' + esc(r.mac_addr||'—') + '</td>' +
      '<td>' + esc(r.wifi_ssid||'—') + '</td>' +
      '<td class="mono">' + mqttBadge + '</td>' +
      '<td class="mono">' + rssi + '</td>' +
      '<td class="' + cls(q) + '">' + (SIG[q]||q) + '</td>' +
      '<td>' + boolPill(r.wifi_ok) + '</td>' +
      '<td>' + boolPill(r.mqtt_ok) + '</td>' +
      loginSystemCol(r) +
      '<td class="mono">' + ageLabel(r.link_age_sec) + '</td>' +
      memoriBtns(r) +
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
function setDevMsg(msg) { const el = document.getElementById('dev-msg'); if (el) el.textContent = msg || ''; }
function parseLineNum(lineName) {
  const m = String(lineName || '').match(/(\d+)/);
  const n = m ? parseInt(m[1], 10) : 1;
  return (n >= 1 && n <= 15) ? n : 1;
}
function initLineSelect() {
  const sel = document.getElementById('dev-line');
  if (!sel || sel.options.length) return;
  for (let i = 1; i <= 15; i++) {
    const o = document.createElement('option');
    o.value = String(i);
    o.textContent = 'Line ' + i;
    sel.appendChild(o);
  }
}
function closeDeviceModal() {
  document.getElementById('device-modal').style.display = 'none';
  selectedMachineId = '';
  render(devicesCache);
}
function openDeviceModal(mid) {
  selectedMachineId = mid || '';
  const m = devicesCache.find(x => x.id === selectedMachineId);
  if (!m) return;
  initLineSelect();
  document.getElementById('dev-title').textContent = 'Kontrol Device — ' + (m.code || '');
  document.getElementById('dev-subtitle').textContent = (m.display_name || m.name || '') + ' · UID ' + (m.device_uid || '—');
  document.getElementById('dev-badges').innerHTML =
    espStatusPill(m) + ' ' + boolPill(m.wifi_ok) + ' ' + boolPill(m.mqtt_ok) +
    (m.mqtt_service ? '<span class="pill robotic">' + esc(m.mqtt_service) + '</span>' : '');
  document.getElementById('dev-code').value = m.code || '';
  document.getElementById('dev-process').value = m.process_name || '';
  document.getElementById('dev-operator').value = m.default_operator_name || '';
  document.getElementById('dev-uid').value = m.device_uid || '';
  const br = ['GM1','GM2','GM3'].includes(String(m.branch || '').toUpperCase()) ? String(m.branch).toUpperCase() : 'GM1';
  document.getElementById('dev-branch').value = br;
  document.getElementById('dev-line').value = String(parseLineNum(m.line_name));
  document.getElementById('dev-login').checked = !!m.login_required;
  document.getElementById('dev-wifi-ssid').value = m.wifi_ssid || '';
  document.getElementById('dev-wifi-pass').value = '';
  document.getElementById('dev-wifi-list').innerHTML = '<div class="meta">Klik Scan WiFi untuk melihat jaringan di sekitar ESP.</div>';
  setDevMsg('');
  document.getElementById('device-modal').style.display = 'flex';
  render(devicesCache);
  loadModalScan();
}
async function requestModalScan() {
  if (!selectedMachineId) return;
  setDevMsg('Meminta scan ke ESP…');
  const r = await fetch('/api/devices/' + selectedMachineId + '/wifi-scan', { method: 'POST' });
  if (!r.ok) throw new Error('scan request gagal');
  setTimeout(loadModalScan, 1400);
}
async function loadModalScan() {
  if (!selectedMachineId) return;
  const listEl = document.getElementById('dev-wifi-list');
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
      '<div class="meta2 mono">' + wifiBars(ap.rssi||-127) + '  ' + (ap.rssi??-127) + ' dBm · CH ' + (ap.channel??0) + '</div>' +
    '</div>'
  ).join('');
  listEl.querySelectorAll('.ap').forEach(el => {
    el.addEventListener('click', () => { document.getElementById('dev-wifi-ssid').value = el.getAttribute('data-ssid') || ''; });
  });
  setDevMsg('Pilih SSID dari daftar atau ketik manual.');
}
async function saveDeviceConfig() {
  if (!selectedMachineId) return;
  const code = String(document.getElementById('dev-code').value || '').trim().toUpperCase();
  const process_name = String(document.getElementById('dev-process').value || '').trim();
  const default_operator_name = String(document.getElementById('dev-operator').value || '').trim();
  const branch = document.getElementById('dev-branch').value;
  const line = parseInt(document.getElementById('dev-line').value, 10);
  const login_required = document.getElementById('dev-login').checked;
  const wifi_ssid = String(document.getElementById('dev-wifi-ssid').value || '').trim();
  const wifi_pass = String(document.getElementById('dev-wifi-pass').value || '');
  if (!code) { setDevMsg('Machine Code wajib diisi.'); return; }
  if (!process_name) { setDevMsg('Nama Proses wajib diisi.'); return; }
  setDevMsg('Menyimpan ke backend & mengirim ke ESP…');
  const btn = document.getElementById('btn-dev-save');
  btn.disabled = true;
  try {
    const r = await fetch('/api/devices/' + selectedMachineId + '/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code, process_name, default_operator_name, branch, line, login_required,
        wifi_ssid: wifi_ssid || null,
        wifi_pass: wifi_pass || null
      })
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || ('HTTP ' + r.status));
    }
    setDevMsg('Berhasil disimpan. ESP akan sinkron (online langsung, offline via retained).');
    showLoginToast({ login_required, message: 'Konfigurasi ' + code + ' tersimpan & dikirim ke ESP.' });
    await tick();
  } catch (e) {
    setDevMsg('Gagal: ' + e.message);
  } finally {
    btn.disabled = false;
  }
}
function selectMachine(id) {
  openDeviceModal(id);
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
        '<td class="mono"><span class="pill ' + ((h.mqtt_service||'').includes('10.5.2.222') ? 'robotic' : 'local') + '">' + esc(h.mqtt_service||'—') + '</span></td>' +
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
    await pollLoginEvents();
  } catch (e) {
    const el = document.getElementById('err');
    el.hidden = false;
    el.textContent = 'Gagal ambil data: ' + e.message;
  }
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('id-ID');
}
document.getElementById('btn-dev-scan').addEventListener('click', () => requestModalScan().catch(e => setDevMsg('Error: ' + e.message)));
document.getElementById('btn-dev-save').addEventListener('click', () => saveDeviceConfig());
document.getElementById('device-modal').addEventListener('click', (e) => { if (e.target.id === 'device-modal') closeDeviceModal(); });
['f-status', 'f-mqtt', 'f-sort'].forEach(id => {
  document.getElementById(id).addEventListener('change', () => render(devicesCache));
});
document.getElementById('btn-filter-reset').addEventListener('click', () => {
  document.getElementById('f-status').value = 'all';
  document.getElementById('f-mqtt').value = 'all';
  document.getElementById('f-sort').value = 'code';
  render(devicesCache);
});
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

#[derive(serde::Deserialize)]
pub struct DeviceFullConfigBody {
    pub code: String,
    pub process_name: String,
    pub default_operator_name: Option<String>,
    pub branch: String,
    pub line: u8,
    pub login_required: bool,
    pub wifi_ssid: Option<String>,
    pub wifi_pass: Option<String>,
}

/// Simpan konfigurasi lengkap device dari modal /devices (mesin + MQTT ke ESP + WiFi opsional).
pub async fn update_device_config(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<DeviceFullConfigBody>,
) -> Result<Json<Value>, (axum::http::StatusCode, String)> {
    let branch = body.branch.trim().to_uppercase();
    if !matches!(branch.as_str(), "GM1" | "GM2" | "GM3") {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            json!({ "error": "branch harus GM1, GM2, atau GM3" }).to_string(),
        ));
    }
    if !(1..=15).contains(&body.line) {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            json!({ "error": "line harus 1-15" }).to_string(),
        ));
    }
    let code = body.code.trim();
    if code.is_empty() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            json!({ "error": "machine code wajib" }).to_string(),
        ));
    }
    let process_name = body.process_name.trim();
    if process_name.is_empty() {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            json!({ "error": "nama proses wajib" }).to_string(),
        ));
    }
    let op = body
        .default_operator_name
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    let line_name = format!("Line {}", body.line);

    let update = UpdateMachine {
        name: None,
        brand: None,
        process_name: Some(process_name.to_string()),
        location_note: None,
        branch: Some(branch),
        line_name: Some(line_name),
        login_required: Some(body.login_required),
        default_operator_nik: None,
        default_operator_name: if op.is_empty() { None } else { Some(op) },
        code: Some(code.to_string()),
        barcode: None,
        device_uid: None,
        g_force_threshold: None,
        filter_aktif_ms: None,
        filter_diam_ms: None,
        power_threshold_w: None,
        current_threshold_a: None,
        off_current_a: None,
        kpi_source: None,
        lcd_auto_ms: None,
    };

    let machine = crate::api::machines::update_calibration(
        State(state.clone()),
        Path(id),
        Json(update),
    )
    .await?
    .0;

    let mut wifi_sent = false;
    if let Some(ssid) = body.wifi_ssid.as_deref() {
        let ssid = ssid.trim();
        if !ssid.is_empty() {
            let _ = set_wifi_config(
                State(state),
                Path(id),
                Json(WifiConfigBody {
                    wifi_ssid: ssid.to_string(),
                    wifi_pass: body.wifi_pass.unwrap_or_default(),
                }),
            )
            .await?;
            wifi_sent = true;
        }
    }

    Ok(Json(json!({
        "ok": true,
        "machine_code": machine.code,
        "login_required": machine.login_required,
        "wifi_sent": wifi_sent,
    })))
}

#[derive(serde::Deserialize)]
pub struct LoginSystemBody {
    pub login_required: bool,
}

#[derive(serde::Deserialize)]
pub struct LoginEventsQuery {
    pub since: Option<u64>,
}

pub async fn devices_login_events(
    State(state): State<AppState>,
    Query(q): Query<LoginEventsQuery>,
) -> Json<Value> {
    let since = q.since.unwrap_or(0);
    let events: Vec<_> = state
        .login_events
        .read()
        .await
        .iter()
        .filter(|e| e.id > since)
        .cloned()
        .collect();
    Json(json!({ "events": events }))
}

/// Toggle System Login dari dashboard /devices (retained desired + cmd MQTT).
pub async fn set_device_login_system(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(body): Json<LoginSystemBody>,
) -> Result<Json<Value>, (axum::http::StatusCode, String)> {
    let row = sqlx::query_as::<_, Machine>(
        r#"UPDATE machines SET login_required = $2, updated_at = NOW() WHERE id = $1 RETURNING *"#,
    )
    .bind(id)
    .bind(body.login_required)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .ok_or((axum::http::StatusCode::NOT_FOUND, "machine not found".into()))?;

    let uid = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT device_uid FROM devices WHERE machine_id = $1
           ORDER BY last_seen_at DESC NULLS LAST LIMIT 1"#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    .map_err(internal)?
    .flatten()
    .unwrap_or_default();

    crate::api::machines::push_login_system(&state, &row, uid.as_str(), None);
    mqtt::push_operator_snapshot(&state, &row).await;

    Ok(Json(json!({
        "ok": true,
        "login_required": row.login_required,
        "device_uid": uid,
        "machine_code": row.code,
    })))
}

fn internal(e: sqlx::Error) -> (axum::http::StatusCode, String) {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
}
