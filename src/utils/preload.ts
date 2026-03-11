/**
 * Preload lazy route chunks on hover / before navigation agar saat user klik, chunk sudah di cache.
 * Mengurangi waktu "Memuat halaman..." terutama untuk /line/:id.
 */

let lineDetailPreloaded = false;

/** Preload halaman LineDetail (dipanggil onMouseEnter link ke /line/:id). */
export function preloadLineDetail(): void {
    if (lineDetailPreloaded) return;
    lineDetailPreloaded = true;
    import('../pages/LineDetail.tsx');
}
