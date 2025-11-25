/**
 * React Query Hooks untuk Authentication
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login } from '../config/api';
import type { LoginRequest } from '../config/api';

/**
 * Hook untuk login dengan NIK dan Password (GET request dengan query parameters)
 * @returns Mutation object untuk handle login
 */
export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (credentials: LoginRequest) => {
            const response = await login(credentials.nik, credentials.password);
            if (!response.success || !response.data) {
                throw new Error(response.error || response.data?.error || 'Login gagal');
            }
            return response;
        },
        onSuccess: (data) => {
            if (data.success && data.data) {
                // Format response dari GET /user?nik=...
                if (data.data.user) {
                    const userData = {
                        nik: data.data.user.nik,
                        name: data.data.user.nama,
                        bagian: data.data.user.bagian || data.data.user.jabatan || '',
                        jabatan: data.data.user.bagian || data.data.user.jabatan || '', // Untuk backward compatibility
                        role: data.data.user.role || 'user',
                        rfid_user: data.data.user.rfid_user || '',
                        line: data.data.user.line || ''
                    };
                    localStorage.setItem('user', JSON.stringify(userData));
                    localStorage.setItem('isLoggedIn', 'true');
                }

                // Invalidate queries jika diperlukan
                queryClient.invalidateQueries({ queryKey: ['user'] });
            }
        },
        onError: (error: Error) => {
            console.error('Login error:', error);
        },
    });
};

/**
 * Hook untuk logout
 */
export const useLogout = () => {
    const queryClient = useQueryClient();

    return () => {
        // Clear semua data login
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('rememberMe');
        queryClient.clear();
    };
};

/**
 * Hook untuk mendapatkan user dari localStorage
 */
export const useAuth = () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    return {
        isAuthenticated: !!isLoggedIn && !!user,
        user,
    };
};

