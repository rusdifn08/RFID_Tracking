import type { WOBreakdownData } from '../config/api';

export interface WorkOrderMapEntry {
    workOrder: string;
    styles: string[];
    buyers: string[];
    items: string[];
    colors: string[];
    sizes: string[];
}

/**
 * Agregasi baris WO breakdown menjadi map per nomor WO (sama seperti useDaftarRFID).
 */
export function buildWorkOrderMap(rows: WOBreakdownData[]): Record<string, WorkOrderMapEntry> {
    const processed: Record<string, WorkOrderMapEntry> = {};

    for (const item of rows) {
        const woNo = item.wo_no;
        if (!processed[woNo]) {
            processed[woNo] = {
                workOrder: woNo,
                styles: [],
                buyers: [],
                items: [],
                colors: [],
                sizes: [],
            };
        }
        const p = processed[woNo];
        if (item.style && !p.styles.includes(item.style)) p.styles.push(item.style);
        if (item.buyer && !p.buyers.includes(item.buyer)) p.buyers.push(item.buyer);
        if (item.product_name && !p.items.includes(item.product_name)) p.items.push(item.product_name);
        if (item.color && !p.colors.includes(item.color)) p.colors.push(item.color);
        if (item.size && !p.sizes.includes(item.size)) p.sizes.push(item.size);
    }

    return processed;
}
