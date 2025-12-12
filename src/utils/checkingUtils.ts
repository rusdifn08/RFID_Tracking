// Helper functions untuk Checking RFID

export const parseTimestamp = (timestamp: string): string => {
    if (!timestamp) return '-';
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'UTC'
        });
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

