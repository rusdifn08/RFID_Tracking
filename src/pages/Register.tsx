import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import backgroundImage from '../assets/aksen.svg';
import loginSvg from '../assets/login.svg';
import { Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';
import { useRegister } from '../hooks/useAuth';

// Schema validasi dengan ZOD
const registerSchema = z.object({
    rfid_user: z.string().min(1, 'RFID User harus diisi'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
    nama: z.string().min(1, 'Nama harus diisi'),
    nik: z.string().min(1, 'NIK harus diisi'),
    bagian: z.string().min(1, 'Bagian harus dipilih'),
    line: z.string().min(1, 'Line harus dipilih'),
    telegram: z.string().optional(),
    no_hp: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const registerMutation = useRegister();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            rfid_user: '',
            password: '',
            nama: '',
            nik: '',
            bagian: '',
            line: '',
            telegram: '',
            no_hp: '',
        },
    });

    const onSubmit = async (data: RegisterFormData) => {
        registerMutation.mutate(
            {
                rfid_user: data.rfid_user,
                password: data.password,
                nama: data.nama,
                nik: data.nik,
                bagian: data.bagian,
                line: data.line,
                telegram: data.telegram,
                no_hp: data.no_hp,
            },
            {
                onSuccess: () => {
                    // Reset form setelah 2 detik
                    setTimeout(() => {
                        reset();
                        // Redirect ke login setelah 3 detik
                        setTimeout(() => {
                            navigate('/login');
                        }, 3000);
                    }, 2000);
                },
                onError: (error: Error) => {
                    console.error('❌ [Register] Error:', error);
                },
            }
        );
    };

    const error = registerMutation.error?.message || '';
    const success = registerMutation.isSuccess ? 'Registrasi berhasil! Silakan login dengan NIK dan Password Anda.' : '';
    const isSubmitting = registerMutation.isPending;

    // Options untuk bagian dan line
    const bagianOptions = ['SEWING', 'CUTTING', 'QC', 'ROBOTIC', 'IT', 'HR', 'FINANCE', 'WAREHOUSE'];
    const lineOptions = ['LINE 1', 'LINE 2', 'LINE 3', 'LINE 4', 'LINE 5', 'LINE 6', 'LINE 8', 'LINE 9', 'CUTTING GM1'];

    return (
        <div className="fixed inset-0 w-screen h-screen flex m-0 p-0 overflow-hidden">
            {/* Background SVG */}
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
                {/* Left Side - Aksen SVG & Illustration - Hidden on Mobile */}
                <div className="hidden lg:flex w-full lg:w-1/2 relative h-screen bg-transparent overflow-hidden">
                    <div className="relative z-10 flex flex-col h-full w-full px-6 xl:px-12 py-8 xl:py-12 text-white">
                        <div className="flex-1 flex flex-col justify-center items-center text-center px-4">
                            <h1 className="text-xl xl:text-2xl 2xl:text-3xl font-bold mb-6 xl:mb-8 leading-tight max-w-2xl">
                                Enterprise Resource Monitoring System PT. Gistex Garment Indonesia
                            </h1>
                            <div className="relative w-full max-w-md xl:max-w-lg mt-4 xl:mt-8">
                                <img
                                    src={loginSvg}
                                    alt="Register Illustration"
                                    className="w-full h-auto drop-shadow-2xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Register Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center relative h-screen overflow-y-auto bg-transparent">
                    <div className="w-full max-w-2xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 xl:px-12">
                        {/* Card Container */}
                        <div className="bg-gray-100 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden p-4 sm:p-6 md:p-8">
                            {/* Header */}
                            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                <Link
                                    to="/login"
                                    className="p-1.5 sm:p-2 hover:bg-gray-200 rounded-lg transition-colors"
                                    title="Kembali ke Login"
                                >
                                    <ArrowLeft size={18} className="text-gray-600" />
                                </Link>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <UserPlus size={20} className="text-blue-600" />
                                        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                                            Register New User
                                        </h2>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        Lengkapi form di bawah untuk membuat akun baru
                                    </p>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="w-full p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg text-xs sm:text-sm mb-4 animate-fade-in">
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        <span className="break-words">{error}</span>
                                    </div>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && (
                                <div className="w-full p-3 sm:p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg text-xs sm:text-sm mb-4 animate-fade-in">
                                    <div className="flex items-center">
                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="break-words">{success}</span>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                                {/* Grid 2 Kolom untuk Field Utama */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    {/* RFID User */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="rfid_user" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            RFID User <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="rfid_user"
                                            {...register('rfid_user')}
                                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all placeholder-gray-400 text-gray-900 bg-white ${
                                                errors.rfid_user ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                            placeholder="Masukkan RFID User"
                                        />
                                        {errors.rfid_user && (
                                            <p className="mt-1 text-xs text-red-600">{errors.rfid_user.message}</p>
                                        )}
                                    </div>

                                    {/* Password */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                id="password"
                                                {...register('password')}
                                                className={`w-full px-3 py-2.5 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all placeholder-gray-400 text-gray-900 bg-white ${
                                                    errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                                }`}
                                                placeholder="Masukkan Password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                        {errors.password && (
                                            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                                        )}
                                    </div>

                                    {/* Nama */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="nama" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Nama <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="nama"
                                            {...register('nama')}
                                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all placeholder-gray-400 text-gray-900 bg-white ${
                                                errors.nama ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                            placeholder="Masukkan Nama Lengkap"
                                        />
                                        {errors.nama && (
                                            <p className="mt-1 text-xs text-red-600">{errors.nama.message}</p>
                                        )}
                                    </div>

                                    {/* NIK */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="nik" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            NIK <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="nik"
                                            {...register('nik')}
                                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all placeholder-gray-400 text-gray-900 bg-white ${
                                                errors.nik ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                            placeholder="Masukkan NIK"
                                        />
                                        {errors.nik && (
                                            <p className="mt-1 text-xs text-red-600">{errors.nik.message}</p>
                                        )}
                                    </div>

                                    {/* Bagian */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="bagian" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Bagian <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="bagian"
                                            {...register('bagian')}
                                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all text-gray-900 bg-white cursor-pointer ${
                                                errors.bagian ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                        >
                                            <option value="">Pilih Bagian</option>
                                            {bagianOptions.map(bagian => (
                                                <option key={bagian} value={bagian}>{bagian}</option>
                                            ))}
                                        </select>
                                        {errors.bagian && (
                                            <p className="mt-1 text-xs text-red-600">{errors.bagian.message}</p>
                                        )}
                                    </div>

                                    {/* Line */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="line" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Line <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="line"
                                            {...register('line')}
                                            className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-all text-gray-900 bg-white cursor-pointer ${
                                                errors.line ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                                            }`}
                                        >
                                            <option value="">Pilih Line</option>
                                            {lineOptions.map(line => (
                                                <option key={line} value={line}>{line}</option>
                                            ))}
                                        </select>
                                        {errors.line && (
                                            <p className="mt-1 text-xs text-red-600">{errors.line.message}</p>
                                        )}
                                    </div>

                                    {/* Telegram */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="telegram" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Telegram
                                        </label>
                                        <input
                                            type="text"
                                            id="telegram"
                                            {...register('telegram')}
                                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-900 bg-white"
                                            placeholder="Masukkan Telegram (Opsional)"
                                        />
                                    </div>

                                    {/* No HP */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="no_hp" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            No. HP
                                        </label>
                                        <input
                                            type="text"
                                            id="no_hp"
                                            {...register('no_hp')}
                                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-900 bg-white"
                                            placeholder="Masukkan No. HP (Opsional)"
                                        />
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4 flex flex-col items-center gap-3">
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-1/2 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm sm:text-base focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? 'Mendaftar...' : 'Register'}
                                    </button>
                                    
                                    <Link
                                        to="/login"
                                        className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors"
                                    >
                                        Sudah punya akun? Masuk di sini
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

