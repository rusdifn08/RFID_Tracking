/** Tentukan kolom/baris grid batch card agar slot kosong minimal & proporsional */
export const getBatchGridConfig = (count: number): { cols: number; rows: number; slots: number } => {
  if (count <= 0) return { cols: 1, rows: 1, slots: 1 };
  if (count <= 4) return { cols: count, rows: 1, slots: count };
  if (count <= 6) return { cols: 3, rows: 2, slots: 6 };
  if (count <= 8) return { cols: 4, rows: 2, slots: 8 };
  return { cols: 5, rows: 2, slots: 10 };
};
