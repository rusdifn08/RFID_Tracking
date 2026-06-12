export const PCS_PER_BUNDLE = 15;

export type HourlyOutputRow = {
  hour: string;
  qty: number;
  smv: number;
};

export type ProcessDetailContext = {
  batchNo: number;
  batchType: string;
  /** Index proses di lane (0–4) */
  processIndex: number;
  currentBundle: number;
  activePcs: number;
  pcsPerBundle: number;
};

const statusLabelMap: Record<string, string> = {
  Done: 'Selesai',
  Running: 'Berjalan',
  Waiting: 'Menunggu',
  Hold: 'Hold',
};

export const statusLabel = (status: string) => statusLabelMap[status] ?? status;

export const smvVariance = (target: number, actual: number) =>
  Number((actual - target).toFixed(2));

export const accumulatedPcsLabel = (currentBundle: number, activePcs: number, pcsPerBundle: number) => {
  const fullBundles = Math.floor(activePcs / pcsPerBundle);
  const remainder = activePcs % pcsPerBundle;
  if (remainder === 0 && fullBundles > 0) {
    return `${activePcs} pcs (${fullBundles} bundle penuh)`;
  }
  return `${activePcs} pcs (Bundle ke-${currentBundle}${remainder > 0 ? ` + ${remainder} pcs` : ''})`;
};

/** Demo output per jam — dibagi dari qty proses & SMV actual */
export const buildHourlyOutput = (
  qtyValue: number,
  actualSmv: number,
  processNo: number
): HourlyOutputRow[] => {
  const slots = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'];
  if (qtyValue <= 0) {
    return slots.slice(0, 4).map((hour, i) => ({
      hour,
      qty: 0,
      smv: Number((actualSmv + i * 0.01).toFixed(2)),
    }));
  }

  const activeSlots = Math.min(slots.length, Math.max(3, Math.ceil(qtyValue / 4)));
  const weights = Array.from({ length: activeSlots }, (_, i) => 1 + ((processNo + i) % 3));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let assigned = 0;

  return slots.slice(0, activeSlots).map((hour, i) => {
    const isLast = i === activeSlots - 1;
    const qty = isLast
      ? Math.max(0, qtyValue - assigned)
      : Math.round((qtyValue * weights[i]) / weightSum);
    assigned += qty;
    const smvJitter = ((processNo + i) % 5) * 0.008 - 0.016;
    return {
      hour,
      qty,
      smv: Number(Math.max(0.1, actualSmv + smvJitter).toFixed(2)),
    };
  });
};
