/**
 * Shared Date Helper Functions
 * Mengurangi duplikasi helper functions di berbagai pages
 */

/**
 * Cek apakah sudah melewati jam 8 pagi hari ini
 */
export const isAfter8AM = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 8;
};

/**
 * Mendapatkan tanggal yang valid (hari ini jika sudah jam 8, kemarin jika belum)
 * Data reset setiap hari mulai jam 8 pagi, jadi sebelum jam 8 masih menggunakan data kemarin
 */
export const getValidDate = (): string => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  // Jika belum jam 8, gunakan tanggal kemarin (karena data reset mulai jam 8)
  if (!isAfter8AM()) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  }
  return today;
};

/**
 * Format date untuk display
 */
export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Format date untuk API (YYYY-MM-DD)
 */
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
