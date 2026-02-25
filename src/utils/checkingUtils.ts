// Helper functions untuk Checking RFID

/**
 * Format timestamp ISO (2026-02-25T15:23:02) menjadi 2026-02-25 15:23:02 (tanpa T, pakai spasi)
 */
export const formatTimestampSpace = (timestamp: string | undefined): string => {
    if (!timestamp) return '-';
    return timestamp.replace('T', ' ');
};

/**
 * Parse timestamp dari format API ke format yang konsisten
 * Format input: "2026-01-14T10:47:25" (ISO 8601 tanpa timezone)
 * Format output: "14 Jan 2026, 10.47.25"
 * 
 * Jika timestamp tidak memiliki timezone indicator, diinterpretasikan sebagai waktu lokal
 * untuk menghindari konversi timezone yang tidak diinginkan
 */
export const parseTimestamp = (timestamp: string): string => {
    if (!timestamp) return '-';
    try {
        let date: Date;
        
        // Cek apakah timestamp memiliki timezone indicator
        const hasTimezone = timestamp.includes('Z') || timestamp.match(/[+-]\d{2}:\d{2}$/);
        
        if (!hasTimezone) {
            // Timestamp tanpa timezone, parse manual untuk menghindari konversi timezone
            // Format: "2026-01-14T10:47:25" atau "2026-01-14T10:47:25.123"
            const parts = timestamp.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?/);
            if (parts) {
                const [, year, month, day, hour, minute, second] = parts;
                // Buat Date object dengan waktu lokal (tidak ada konversi timezone)
                date = new Date(
                    parseInt(year),
                    parseInt(month) - 1, // Month is 0-indexed
                    parseInt(day),
                    parseInt(hour),
                    parseInt(minute),
                    parseInt(second)
                );
            } else {
                // Fallback ke parsing normal
                date = new Date(timestamp);
            }
        } else {
            // Timestamp dengan timezone, parse normal
            date = new Date(timestamp);
        }
        
        if (isNaN(date.getTime())) return '-';
        
        // Format: DD MMM YYYY, HH.MM.SS (menggunakan waktu lokal)
        // Sama seperti di DashboardRFID.tsx yang sudah benar
        const day = String(date.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}.${minutes}.${seconds}`;
    } catch (e) {
        return '-';
    }
};

export const getStatusColor = (status: string): string => {
    const upperStatus = (status || '').toUpperCase().trim();
    if (upperStatus === 'GOOD' || upperStatus === 'OUTPUT' || upperStatus.includes('OUTPUT')) {
        return 'bg-green-100 text-green-700 border-green-300';
    } else if (upperStatus === 'REWORK') {
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    } else if (upperStatus === 'REJECT') {
        return 'bg-red-100 text-red-700 border-red-300';
    }
    return 'bg-gray-100 text-gray-700 border-gray-300';
};

export const formatLokasi = (bagian: string): string => {
    if (!bagian) return '-';
    const bagianUpper = bagian.trim().toUpperCase();
    if (bagianUpper === 'IRON' || bagianUpper === 'OPERATOR') {
        return 'SEWING';
    }
    return bagian.trim();
};

