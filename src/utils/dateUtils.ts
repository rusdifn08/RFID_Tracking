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

