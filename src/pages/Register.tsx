import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import backgroundImage from '../assets/aksen.svg';
import loginSvg from '../assets/login.svg';
import { API_BASE_URL } from '../config/api';
import { Eye, EyeOff, UserPlus, ArrowLeft } from 'lucide-react';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        rfid_user: '',
        password: '',
        nama: '',
        nik: '',
        bagian: '',
        line: '',
        telegram: '',
        no_hp: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error saat user mulai mengetik
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validasi required fields
        if (!formData.rfid_user || !formData.password || !formData.nama || !formData.nik || !formData.bagian || !formData.line) {
            setError('Mohon lengkapi semua field yang wajib diisi (RFID User, Password, Nama, NIK, Bagian, Line)');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_BASE_URL}/inputUser`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    rfid_user: formData.rfid_user.trim(),
                    password: formData.password,
                    nama: formData.nama.trim(),
                    nik: formData.nik.trim(),
                    bagian: formData.bagian.trim(),
                    line: formData.line.trim(),
                    telegram: formData.telegram.trim() || '',
                    no_hp: formData.no_hp.trim() || ''
                })
            });

            const responseData = await response.json();

            if (response.ok && responseData.success) {
                setSuccess('Registrasi berhasil! Silakan login dengan NIK dan Password Anda.');
                // Reset form setelah 2 detik
                setTimeout(() => {
                    setFormData({
                        rfid_user: '',
                        password: '',
                        nama: '',
                        nik: '',
                        bagian: '',
                        line: '',
                        telegram: '',
                        no_hp: ''
                    });
                    // Redirect ke login setelah 3 detik
                    setTimeout(() => {
                        navigate('/login');
                    }, 3000);
                }, 2000);
            } else {
                setError(responseData.message || responseData.error || 'Registrasi gagal. Silakan coba lagi.');
            }
        } catch (error) {
            console.error('❌ [Register] Error:', error);
            let errorMessage = 'Gagal melakukan registrasi';
            if (error instanceof Error) {
                if (error.message.includes('Failed to fetch')) {
                    errorMessage = `Tidak dapat terhubung ke proxy server. Pastikan server.js berjalan di http://${window.location.hostname}:8000`;
                } else {
                    errorMessage = error.message;
                }
            }
            setError(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

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

                            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
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
                                            name="rfid_user"
                                            value={formData.rfid_user}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-900 bg-white"
                                            placeholder="Masukkan RFID User"
                                            required
                                        />
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
                                                name="password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                className="w-full px-3 py-2.5 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-900 bg-white"
                                                placeholder="Masukkan Password"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Nama */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="nama" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Nama <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="nama"
                                            name="nama"
                                            value={formData.nama}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-900 bg-white"
                                            placeholder="Masukkan Nama Lengkap"
                                            required
                                        />
                                    </div>

                                    {/* NIK */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="nik" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            NIK <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="nik"
                                            name="nik"
                                            value={formData.nik}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-400 text-gray-900 bg-white"
                                            placeholder="Masukkan NIK"
                                            required
                                        />
                                    </div>

                                    {/* Bagian */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="bagian" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Bagian <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="bagian"
                                            name="bagian"
                                            value={formData.bagian}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 bg-white cursor-pointer"
                                            required
                                        >
                                            <option value="">Pilih Bagian</option>
                                            {bagianOptions.map(bagian => (
                                                <option key={bagian} value={bagian}>{bagian}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Line */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="line" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Line <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="line"
                                            name="line"
                                            value={formData.line}
                                            onChange={handleInputChange}
                                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-900 bg-white cursor-pointer"
                                            required
                                        >
                                            <option value="">Pilih Line</option>
                                            {lineOptions.map(line => (
                                                <option key={line} value={line}>{line}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Telegram */}
                                    <div className="md:col-span-1">
                                        <label htmlFor="telegram" className="block text-sm font-semibold text-gray-900 mb-1.5">
                                            Telegram
                                        </label>
                                        <input
                                            type="text"
                                            id="telegram"
                                            name="telegram"
                                            value={formData.telegram}
                                            onChange={handleInputChange}
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
                                            name="no_hp"
                                            value={formData.no_hp}
                                            onChange={handleInputChange}
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

