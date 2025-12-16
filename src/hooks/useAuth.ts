/**
 * React Query Hooks untuk Authentication
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { login, API_BASE_URL } from '../config/api';
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
 * Hook untuk registrasi user baru
 */
export const useRegister = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userData: {
            rfid_user: string;
            password: string;
            nama: string;
            nik: string;
            bagian: string;
            line: string;
            telegram?: string;
            no_hp?: string;
        }) => {
            const response = await fetch(`${API_BASE_URL}/inputUser`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    rfid_user: userData.rfid_user.trim(),
                    password: userData.password,
                    nama: userData.nama.trim(),
                    nik: userData.nik.trim(),
                    bagian: userData.bagian.trim(),
                    line: userData.line.trim(),
                    telegram: userData.telegram?.trim() || '',
                    no_hp: userData.no_hp?.trim() || ''
                })
            });

            const responseData = await response.json();

            if (!response.ok || !responseData.success) {
                throw new Error(responseData.message || responseData.error || 'Registrasi gagal. Silakan coba lagi.');
            }

            return responseData;
        },
        onSuccess: () => {
            // Invalidate queries jika diperlukan
            queryClient.invalidateQueries({ queryKey: ['user'] });
        },
        onError: (error: Error) => {
            console.error('Register error:', error);
        },
    });
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

