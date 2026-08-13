import type { MachineRow } from './types';
import { iotApiBase } from './iotApi';

function apiBase(): string {
    return iotApiBase();
}

/** Origin untuk cetak QR (override di .env jika frontend beda host). */
export function machineLoginPublicOrigin(): string {
    const fromEnv = (import.meta.env.VITE_APP_PUBLIC_ORIGIN as string | undefined)?.trim();
    if (fromEnv) return fromEnv.replace(/\/$/, '');
    if (typeof window !== 'undefined') return window.location.origin;
    return 'http://127.0.0.1:5173';
}

/** "JUKI 002" → "juki-002" — selaras backend machine_name_slug */
export function machineNameSlug(raw: string): string {
    const s = raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    return s || 'machine';
}

/** JUKI002 → juki-002 (slug stabil untuk QR, bukan dari nama panjang) */
export function machineCodeSlug(code: string): string {
    const c = code.trim();
    const m = c.match(/^([A-Za-z]+)[-_]?(\d+)$/);
    if (m) return `${m[1].toLowerCase()}-${m[2]}`;
    return machineNameSlug(c);
}

/** Tampil JUKI-002 dari code JUKI002 */
export function formatMachineCodeLabel(code: string): string {
    const c = code.trim();
    const m = c.match(/^([A-Za-z]+)[-_]?(\d+)$/);
    if (m) return `${m[1].toUpperCase()}-${m[2]}`;
    return c;
}

/** ponytail: validasi format selaras backend MESIN001–MESIN100 */
export function normalizeMachineBarcode(raw: string): string | null {
    const u = raw.trim().toUpperCase();
    if (u.length !== 8 || !u.startsWith('MESIN')) return null;
    const num = u.slice(5);
    if (!/^\d{3}$/.test(num)) return null;
    const n = Number(num);
    if (n < 1 || n > 100) return null;
    return u;
}

export type MachineGateRef = { uid: string; slug?: string };

/** Link QR utama: /ops/ml/{UID} — code mesin fleksibel, UID tetap. */
export function buildMachineGateUrl(uid: string, _code?: string): string {
    const u = uid.trim();
    if (!u) return machineLoginPublicOrigin();
    return `${machineLoginPublicOrigin()}/ops/ml/${encodeURIComponent(u)}`;
}

/** Dari MachineRow (butuh device_uid). Fallback legacy barcode jika UID belum ada. */
export function buildMachineLoginUrlFromMachine(m: Pick<MachineRow, 'name' | 'code' | 'barcode' | 'device_uid'>): string {
    const uid = (m.device_uid ?? '').trim();
    if (uid) return buildMachineGateUrl(uid);
    if (m.barcode) return buildMachineLoginUrlLegacy(m.barcode);
    return machineLoginPublicOrigin();
}

/** Legacy: /m/MESIN001 — tetap didukung untuk sticker lama. */
export function buildMachineLoginUrlLegacy(barcode: string): string {
    const label = normalizeMachineBarcode(barcode);
    if (!label) return machineLoginPublicOrigin();
    return `${machineLoginPublicOrigin()}/m/${label}`;
}

/** @deprecated pakai buildMachineGateUrl / buildMachineLoginUrlFromMachine */
export function buildMachineLoginUrl(barcode: string): string {
    return buildMachineLoginUrlLegacy(barcode);
}

/** Parse scan: gate baru (UID saja / UID+slug lama) atau barcode legacy. */
export function parseMachineLoginTarget(
    raw: string,
): { kind: 'gate'; uid: string; slug?: string } | { kind: 'barcode'; barcode: string } | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const gateWithSlug = trimmed.match(/\/ops\/ml\/([^/?#]+)\/([^/?#]+)/i);
    if (gateWithSlug) {
        try {
            return {
                kind: 'gate',
                uid: decodeURIComponent(gateWithSlug[1]),
                slug: decodeURIComponent(gateWithSlug[2]).toLowerCase(),
            };
        } catch {
            return { kind: 'gate', uid: gateWithSlug[1], slug: gateWithSlug[2].toLowerCase() };
        }
    }

    const gateUidOnly = trimmed.match(/\/ops\/ml\/([^/?#]+)\/?/i);
    if (gateUidOnly) {
        try {
            return { kind: 'gate', uid: decodeURIComponent(gateUidOnly[1]) };
        } catch {
            return { kind: 'gate', uid: gateUidOnly[1] };
        }
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        try {
            const url = new URL(trimmed);
            const gm2 = url.pathname.match(/\/ops\/ml\/([^/]+)\/([^/]+)/i);
            if (gm2) {
                return {
                    kind: 'gate',
                    uid: decodeURIComponent(gm2[1]),
                    slug: decodeURIComponent(gm2[2]).toLowerCase(),
                };
            }
            const gm1 = url.pathname.match(/\/ops\/ml\/([^/]+)\/?/i);
            if (gm1) {
                return { kind: 'gate', uid: decodeURIComponent(gm1[1]) };
            }
            const bm = url.pathname.match(/\/(?:m|login-mesin)\/(MESIN\d{3})\b/i);
            if (bm) {
                const barcode = normalizeMachineBarcode(bm[1]);
                if (barcode) return { kind: 'barcode', barcode };
            }
        } catch {
            /* ignore */
        }
    }

    const legacyPath = trimmed.match(/\/(?:m|login-mesin)\/(MESIN\d{3})\b/i);
    if (legacyPath) {
        const barcode = normalizeMachineBarcode(legacyPath[1]);
        if (barcode) return { kind: 'barcode', barcode };
    }

    const barcode = normalizeMachineBarcode(trimmed);
    if (barcode) return { kind: 'barcode', barcode };
    return null;
}

/** Dari teks scan: URL gate / barcode / teks MESIN001. */
export function parseMachineBarcodeFromScan(raw: string): string | null {
    const t = parseMachineLoginTarget(raw);
    if (!t) return null;
    if (t.kind === 'barcode') return t.barcode;
    return null;
}

export async function fetchMachineByBarcode(barcode: string): Promise<MachineRow> {
    const label = normalizeMachineBarcode(barcode);
    if (!label) throw new Error('Barcode tidak valid (MESIN001–MESIN100).');
    const res = await fetch(
        `${apiBase()}/api/machines/by-barcode/${encodeURIComponent(label)}`,
    );
    if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Mesin tidak ditemukan (${res.status})`);
    }
    return res.json();
}

/** Resolve mesin dari UID QR. Slug opsional (sticker lama). */
export async function fetchMachineByGate(uid: string, slug?: string): Promise<MachineRow> {
    const u = uid.trim();
    if (!u) throw new Error('Link gate tidak lengkap (uid).');
    const s = (slug ?? '').trim().toLowerCase();
    const path = s
        ? `${apiBase()}/api/machines/by-gate/${encodeURIComponent(u)}/${encodeURIComponent(s)}`
        : `${apiBase()}/api/machines/by-gate/${encodeURIComponent(u)}`;
    const res = await fetch(path);
    if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Mesin tidak ditemukan (${res.status})`);
    }
    return res.json();
}

export type AssignShiftPayload = {
    nik: string;
    name: string;
    notes?: string;
    shift_status?: 'work' | 'broken' | 'maintenance';
    garment_style?: string;
    wo?: string;
    size_label?: string;
    buyer?: string;
    item_name?: string;
    color_name?: string;
};

export async function assignMachineShift(
    machineId: string,
    payload: AssignShiftPayload,
): Promise<void> {
    const res = await fetch(`${apiBase()}/api/machines/${machineId}/shift`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            nik: payload.nik.trim(),
            name: payload.name.trim(),
            notes: payload.notes?.trim() || null,
            shift_status: payload.shift_status ?? 'work',
            garment_style: payload.garment_style?.trim() || null,
            wo: payload.wo?.trim() || null,
            size_label: payload.size_label?.trim() || null,
            buyer: payload.buyer?.trim() || null,
            item_name: payload.item_name?.trim() || null,
            color_name: payload.color_name?.trim() || null,
        }),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Gagal simpan login mesin (${res.status})`);
    }
}
