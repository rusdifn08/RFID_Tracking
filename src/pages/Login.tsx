import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLogin, useAuth } from '../hooks/useAuth';
// Import background - jika background.png tersedia, ganti import ini
import backgroundImage from '../assets/aksen.svg';
import loginSvg from '../assets/login.svg';

// Catatan: Jika Anda memiliki file background.png di folder assets,
// ganti baris di atas dengan: import backgroundImage from '../assets/background.png';

// Schema validasi dengan ZOD
const loginSchema = z.object({
    nik: z.string().min(1, 'NIK harus diisi'),
    password: z.string().min(1, 'Password harus diisi'),
    rememberMe: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const loginMutation = useLogin();
    const { isAuthenticated } = useAuth();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            nik: '',
            password: '',
            rememberMe: false,
        },
    });

    const rememberMe = watch('rememberMe');

    // Redirect jika sudah login
    useEffect(() => {
        if (isAuthenticated) {
            const from = (location.state as any)?.from?.pathname || '/home';
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, location, navigate]);

    // Handle login success
    useEffect(() => {
        if (loginMutation.isSuccess && loginMutation.data?.success) {
            localStorage.setItem('isLoggedIn', 'true');
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
            }
            // Redirect ke halaman yang diminta sebelumnya atau home
            const from = (location.state as any)?.from?.pathname || '/home';
            navigate(from, { replace: true });
        }
    }, [loginMutation.isSuccess, loginMutation.data, rememberMe, navigate, location]);

    // Handle login error
    useEffect(() => {
        if (loginMutation.isError) {
            let errorMessage = 'NIK atau Password salah!';

            // Cek error dari mutation
            if (loginMutation.error) {
                const err = loginMutation.error as Error;
                // Jika error message adalah "NIK tidak ada", tampilkan pesan tersebut
                if (err.message === 'NIK tidak ada' || err.message.includes('NIK tidak ada')) {
                    errorMessage = 'NIK tidak ada';
                } else if (err.message.includes('Failed to fetch') || err.message.includes('Tidak dapat terhubung')) {
                    errorMessage = `Tidak dapat terhubung ke proxy server. Pastikan server.js berjalan di http://${window.location.hostname}:8000`;
                } else {
                errorMessage = err.message || errorMessage;
                }
            }

            setError(errorMessage);
        } else {
            // Reset error jika tidak ada error
            setError('');
        }
    }, [loginMutation.isError, loginMutation.error]);

    const onSubmit = (data: LoginFormData) => {
        setError('');
        // Panggil API login menggunakan React Query (dengan NIK dan Password)
        loginMutation.mutate({ nik: data.nik, password: data.password });
    };

    return (
        <div className="fixed inset-0 w-screen h-screen flex m-0 p-0 overflow-hidden">
            {/* Background SVG - Di belakang semua konten (left dan right side) */}
            <div
                className="fixed inset-0 z-0"
                style={{
                    backgroundImage: `url(${backgroundImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center top',
                    backgroundRepeat: 'no-repeat',
                    width: '100%',
                    height: '100%',
                }}
            />

            {/* Grid Layout 2 Kolom */}
            <div className="w-full h-screen flex flex-col lg:flex-row relative z-10 overflow-hidden">
                {/* Left Side - Aksen SVG & Login SVG - Hidden on Mobile */}
                <div className="hidden lg:flex w-full lg:w-1/2 relative h-screen bg-transparent overflow-hidden">
                    {/* Content Overlay */}
                    <div className="relative z-10 flex flex-col h-full w-full px-6 xl:px-12 py-8 xl:py-12 text-white">
                        {/* Title - Centered */}
                        <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
                            <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold  leading-tight max-w-2xl">
                                Enterprise Resource Monitoring System 
                            </h1>
                            <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold  leading-tight max-w-2xl">
                                PT. Gistex Garment Indonesia
                            </h1>

                            {/* Illustration - Login SVG */}
                            <div className="relative w-full max-w-md xl:max-w-lg mt-2 xl:mt-4">
                                <img
                                    src={loginSvg}
                                    alt="Login Illustration"
                                    className="w-full h-auto drop-shadow-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form - Transparan agar background terlihat */}
                <div className="w-full lg:w-1/2 flex items-center justify-center relative h-screen overflow-y-auto bg-transparent">
                    <div className="w-full max-w-md lg:max-w-lg xl:max-w-xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 xl:px-12">
                        {/* Cards Container */}
                        <div className="bg-gray-100 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden p-4 sm:p-6 md:p-8"
                        >
                            {/* Title */}
                            <div className="text-center mb-3 sm:mb-4 md:mb-5">
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                                    Sign In as Employee
                                </h2>
                            </div>

                            {/* Sub-title */}
                            <div className="text-center mb-3 sm:mb-4 md:mb-5">
                                <p className="text-xs sm:text-sm md:text-base text-gray-600 px-2">
                                    Hey, Enter the NIK & Password registered with GCC or HRIS to enter your account.
                                </p>
                            </div>

                            {/* Hidden Input for dev_id */}
                            <input type="hidden" className="form-control borderInput" name="dev_id" id="dev_id" />

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                                {/* Error Message dari API */}
                                {error && (
                                    <div className="w-full p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-xs sm:text-sm md:text-base animate-fade-in">
                                        <div className="flex items-center">
                                            <svg
                                                className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span className="break-words">{error}</span>
                                        </div>
                                    </div>
                                )}

                                {/* NIK Block */}
                                <div className="w-full">
                                    <label htmlFor="nik" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                        NIK
                                    </label>
                                    <input
                                        type="text"
                                        {...register('nik')}
                                        className={`form-control borderInput w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all placeholder-gray-400 text-gray-900 bg-white ${
                                            errors.nik ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                        id="nik"
                                        placeholder="Enter Your NIK"
                                    />
                                    {errors.nik && (
                                        <p className="mt-1 text-xs text-red-600">{errors.nik.message}</p>
                                    )}
                                </div>

                                {/* Password Block */}
                                <div className="w-full">
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            {...register('password')}
                                            className={`form-control borderInput w-full px-3 py-2.5 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all placeholder-gray-400 text-gray-900 bg-white ${
                                                errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                            id="password"
                                            placeholder="Password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                                    )}
                                </div>

                                {/* Remember Me Checkbox */}
                                <div className="flex items-center justify-center sm:justify-start mb-2">
                                    <input
                                        type="checkbox"
                                        {...register('rememberMe')}
                                        id="checkAll2"
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="checkAll2" className="ml-2 text-xs sm:text-sm text-gray-700 cursor-pointer">
                                        Remember Me
                                    </label>
                                </div>

                                {/* Sign In & Register Buttons Block */}
                                <div className="w-full pt-2 flex flex-col items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={loginMutation.isPending || isSubmitting}
                                        className="w-1/2 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loginMutation.isPending || isSubmitting ? 'Loading...' : 'Sign In'}
                                    </button>
                                    
                                    <button
                                        type="button"
                                        onClick={() => navigate('/register')}
                                        className="w-1/2 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-semibold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md"
                                    >
                                        Register
                                    </button>
                                </div>

                                {/* Forgot Password Block - Centered */}
                                <div className="w-full text-center pt-2">
                                    <a
                                        href="https://gcc.gistexgarmenindonesia.com:7186/forget-password"
                                        className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                                    >
                                        Forgot Password..?
                                    </a>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
