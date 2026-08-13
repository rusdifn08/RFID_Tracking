/** Kartu / halaman Machine Productivity: hanya ROBOTIC atau ADMIN. */
export function canAccessMachineProductivity(user?: {
    bagian?: string;
    jabatan?: string;
    role?: string;
} | null): boolean {
    if (!user) return false;
    const bagian = String(user.bagian || user.jabatan || '').trim().toUpperCase();
    const role = String(user.role || '').trim().toUpperCase();
    return bagian === 'ROBOTIC' || bagian === 'ADMIN' || role === 'ADMIN';
}