/**
 * Session auth di frontend saja (tanpa API backend).
 * Session berlaku sampai tengah malam (00:00) - auto logout di frontend.
 */

export const SESSION_VALID_UNTIL_KEY = 'sessionValidUntil';

/** Return ISO string untuk besok jam 00:00 (session berlaku sampai saat itu) */
export function getSessionValidUntil(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
}

/** Cek apakah session masih valid (belum lewat tengah malam) */
export function isSessionValid(): boolean {
    const until = localStorage.getItem(SESSION_VALID_UNTIL_KEY);
    if (!until) return false;
    return Date.now() < new Date(until).getTime();
}

export function clearAuthStorage(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem(SESSION_VALID_UNTIL_KEY);
}
