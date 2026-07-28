export type DashboardView =
    | 'hub'
    | 'resume'
    | 'detail'
    | 'detail-pick'
    | 'detail-pzem'
    | 'detail-adxl'
    | 'compare'
    | 'pzem'
    | 'adxl';

export type MachineRow = {
    id: string;
    code: string;
    name: string;
    machine_type: string;
    location_note: string | null;
    status: string;
    status_adxl: string;
    status_pzem: string;
    g_force_threshold: number;
    filter_aktif_ms: number;
    filter_diam_ms: number;
    power_threshold_w: number;
    current_threshold_a: number;
    adxl_force_off?: boolean;
};

export type PzemDailyStats = {
    work_date: string;
    running_sec: number;
    idle_sec: number;
    off_sec: number;
    running_pct: number;
    idle_pct: number;
    off_pct: number;
};

export type PzemLive = {
    voltage_v: number;
    current_a: number;
    power_w: number;
    energy_kwh: number;
    frequency_hz: number;
    power_factor: number;
    /** false = ESP heartbeat tapi modul PZEM gagal baca */
    sensor_ok?: boolean;
    ts?: string;
};

export type AdxlLive = {
    ax: number;
    ay: number;
    az: number;
    magnitude_g: number;
    sensor_ok?: boolean;
    ts?: string;
};

/** Health dari topic MQTT …/status/{pzem|adxl} */
export type DeviceHealth = {
    sensor: string;
    state: string;
    online: boolean;
    wifi_ok: boolean;
    mqtt_ok: boolean;
    sensor_ok: boolean;
    detail: string;
    rssi?: number | null;
    fail_count?: number | null;
    ts?: string;
};

export type MachineLive = {
    pzem?: PzemLive;
    adxl?: AdxlLive;
    pzemHealth?: DeviceHealth;
    adxlHealth?: DeviceHealth;
};

export type CompareStats = {
    work_date: string;
    pzem: PzemDailyStats;
    adxl: PzemDailyStats;
    delta_running_sec: number;
    delta_idle_sec: number;
    delta_off_sec: number;
};

export type DisputeRow = {
    ts: string;
    status_adxl: string;
    status_pzem: string;
    magnitude_g: number | null;
    current_a: number | null;
};

export const DASHBOARD_CARDS: Array<{
    id: 'resume' | 'detail' | 'compare' | 'pzem' | 'adxl';
    title: string;
    subtitle: string;
    path: string;
    accent: string;
    icon: string;
}> = [
    {
        id: 'detail',
        title: 'Detail Data',
        subtitle: 'Per mesin → PZEM/ADXL → rekap periode & log Running/Idle/Mati lengkap',
        path: '/machine-productivity/detail',
        accent: 'from-indigo-500 to-blue-700',
        icon: '▣',
    },
    {
        id: 'resume',
        title: 'Resume Mesin',
        subtitle: 'Tabel Running / Idle / Mati semua mesin — PZEM & ADXL',
        path: '/machine-productivity/resume',
        accent: 'from-sky-500 to-blue-600',
        icon: '▦',
    },
    {
        id: 'compare',
        title: 'Compare Data',
        subtitle: 'Bandingkan waktu Running / Idle / Mati PZEM vs ADXL (mesin sama)',
        path: '/machine-productivity/compare',
        accent: 'from-violet-500 to-indigo-600',
        icon: '⚖',
    },
    {
        id: 'pzem',
        title: 'PZEM-004T Data',
        subtitle: 'Tegangan, arus, daya, energi & waktu operasi listrik',
        path: '/machine-productivity/pzem',
        accent: 'from-amber-500 to-orange-600',
        icon: '⚡',
    },
    {
        id: 'adxl',
        title: 'ADXL345 Data',
        subtitle: 'Getaran, waktu operasi, paksa mati & log status',
        path: '/machine-productivity/adxl',
        accent: 'from-teal-500 to-cyan-600',
        icon: '〰',
    },
];
