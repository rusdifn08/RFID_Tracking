import { create } from 'zustand';

export type MqttInfoRole = 'qc' | 'pqc';

export type MqttInfoPayload =
    | 'BEFORE_OUTPUT'
    | 'BEFORE_PQC'
    | 'BEFORE_QC'
    | 'AFTER_QC'
    | 'AFTER_PQC';

export interface MqttInfoEvent {
    line: string;
    role: MqttInfoRole;
    payload: MqttInfoPayload;
    at: number;
}

interface MqttInfoState {
    event: MqttInfoEvent | null;
    setEvent: (event: MqttInfoEvent | null) => void;
    clearEvent: () => void;
}

export const useMqttInfoStore = create<MqttInfoState>((set) => ({
    event: null,
    setEvent: (event) => set({ event }),
    clearEvent: () => set({ event: null }),
}));

/** Teks tampilan untuk animasi info berdasarkan payload */
export function getMqttInfoMessage(payload: MqttInfoPayload): string {
    switch (payload) {
        case 'BEFORE_OUTPUT':
            return 'Garment Masih Berada di Output';
        case 'BEFORE_PQC':
            return 'Garment Masih Berada di PQC';
        case 'BEFORE_QC':
            return 'Garment Masih Berada di QC';
        case 'AFTER_QC':
            return 'Garment Sudah Berada di QC Good';
        case 'AFTER_PQC':
            return 'Garment Sudah Berada di PQC Good';
        default:
            return payload;
    }
}
