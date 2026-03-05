/**
 * Tanggal hari ini dalam timezone lokal (YYYY-MM-DD).
 * Pakai ini untuk filter "hari ini" agar tidak salah di timezone UTC (mis. Indonesia pagi = masih kemarin di UTC).
 */
export const getTodayLocalDateString = (): string => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

// Utility functions untuk format tanggal
export const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return '';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        const year = parts[0];
        const month = String(parseInt(parts[1], 10));
        const day = String(parseInt(parts[2], 10));
        return `${year}-${month}-${day}`;
    }
    return dateString;
};

