/**
 * Configuration untuk Folding Out Access Control
 * 
 * FOLDING_ACCESS_MODE:
 * - 'user-specific': Hanya user yang login di table tertentu yang bisa akses (default)
 * - 'all-users': Semua user bisa akses table 1-8, dan user yang scan akan tampil di dashboard secara realtime
 */
export type FoldingAccessMode = 'user-specific' | 'all-users';

export const FOLDING_ACCESS_MODE = 'all-users' as FoldingAccessMode;

/**
 * Helper function untuk cek apakah mode all-users aktif
 */
export const isAllUsersMode = (): boolean => {
 return FOLDING_ACCESS_MODE === 'all-users';
};

/**
 * Helper function untuk cek apakah mode user-specific aktif
 */
export const isUserSpecificMode = (): boolean => {
 return FOLDING_ACCESS_MODE === 'user-specific';
};
