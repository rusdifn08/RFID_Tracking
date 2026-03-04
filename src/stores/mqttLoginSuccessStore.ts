import { create } from 'zustand';

export type LoginSuccessRole = 'qc' | 'pqc';

export interface LoginSuccessEvent {
    line: string;
    role: LoginSuccessRole;
    at: number;
}

/** success = login berhasil, unsuccess = gagal, login = alat baru menyala (indikator lampu mati) */
export type LoginLedStatus = 'success' | 'unsuccess' | 'login';

export interface LedStatusEntry {
    status: LoginLedStatus;
    at: number;
}

export interface LedStatusByRole {
    qc: LedStatusEntry | null;
    pqc: LedStatusEntry | null;
}

interface MqttLoginSuccessState {
    /** Event login success untuk animasi (null = tidak tampil). */
    event: LoginSuccessEvent | null;
    setEvent: (event: LoginSuccessEvent | null) => void;
    clearEvent: () => void;
    /** Event login gagal (unsuccess) untuk animasi. */
    eventFail: LoginSuccessEvent | null;
    setEventFail: (event: LoginSuccessEvent | null) => void;
    clearEventFail: () => void;
    /** Status login per role untuk LED Good QC / Good PQC (untuk line yang sedang dipolling). */
    ledStatus: LedStatusByRole;
    setLedStatus: (ledStatus: LedStatusByRole) => void;
}

export const useMqttLoginSuccessStore = create<MqttLoginSuccessState>((set) => ({
    event: null,
    setEvent: (event) => set({ event }),
    clearEvent: () => set({ event: null }),
    eventFail: null,
    setEventFail: (eventFail) => set({ eventFail }),
    clearEventFail: () => set({ eventFail: null }),
    ledStatus: { qc: null, pqc: null },
    setLedStatus: (ledStatus) => set({ ledStatus }),
}));
