import { useState, memo, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import backgroundImage from '../assets/aksen.svg';
import { useRegister } from '../hooks/useAuth';
import RegisterHeader from '../components/register/RegisterHeader';
import RegisterMessage from '../components/register/RegisterMessage';
import RegisterLeftSide from '../components/register/RegisterLeftSide';
import RegisterFormField from '../components/register/RegisterFormField';
import { productionLinesMJL, productionLinesCLN } from '../data/production_line';

// Type untuk form data tanpa validasi Zod
type RegisterFormData = {
    rfid_user: string;
    password: string;
    nama: string;
    nik: string;
    bagian: string;
    line: string;
    telegram?: string;
    no_hp?: string;
};

const Register = memo(() => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const registerMutation = useRegister();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        getValues,
        // Tidak menggunakan formState.errors karena validasi dihilangkan
    } = useForm<RegisterFormData>({
        // Tidak menggunakan resolver untuk menghindari validasi yang bermasalah
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
        mode: 'onSubmit', // Validasi hanya saat submit
        shouldUnregister: false, // Pastikan field tetap ter-register meskipun kosong
    });

    // Watch form values untuk debugging
    const watchedValues = watch();

    const onSubmit = async (data: RegisterFormData) => {
        // Ambil nilai langsung dari form menggunakan getValues() sebagai fallback
        const currentValues = getValues();

        // Fallback: Ambil nilai langsung dari DOM element (untuk select field yang mungkin tidak ter-capture)
        const getDOMValue = (fieldName: string): string => {
            const element = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement | HTMLSelectElement;
            return element ? (element.value || '') : '';
        };

        console.log('🔵 [Register] Form data received:', data);
        console.log('🔵 [Register] Current values (getValues):', currentValues);
        console.log('🔵 [Register] Watched values:', watchedValues);
        console.log('🔵 [Register] DOM values:', {
            rfid_user: getDOMValue('rfid_user'),
            password: getDOMValue('password'),
            nama: getDOMValue('nama'),
            nik: getDOMValue('nik'),
            bagian: getDOMValue('bagian'),
            line: getDOMValue('line'),
        });
        console.log('🔵 [Register] Raw data values:', {
            rfid_user: `"${data.rfid_user}"`, rfid_user_type: typeof data.rfid_user,
            password: `"${data.password}"`, password_type: typeof data.password,
            nama: `"${data.nama}"`, nama_type: typeof data.nama,
            nik: `"${data.nik}"`, nik_type: typeof data.nik,
            bagian: `"${data.bagian}"`, bagian_type: typeof data.bagian,
            line: `"${data.line}"`, line_type: typeof data.line,
        });

        // Gunakan data dari form, jika kosong coba dari getValues(), jika masih kosong coba dari DOM
        const getFieldValue = (fieldName: keyof RegisterFormData): string => {
            const formValue = data[fieldName];
            const currentValue = currentValues[fieldName];
            const domValue = getDOMValue(fieldName);
            const value = formValue !== undefined && formValue !== null && formValue !== ''
                ? formValue
                : (currentValue !== undefined && currentValue !== null && currentValue !== ''
                    ? currentValue
                    : (domValue || ''));
            return String(value || '').trim();
        };

        // Pastikan semua field required adalah string (bukan undefined atau null)
        // Password perlu handling khusus - tidak di-trim dan ambil dari multiple source
        const getPasswordValue = (): string => {
            const formPassword = data.password;
            const currentPassword = currentValues.password;
            const domPassword = getDOMValue('password');
            // Password tidak di-trim, ambil dari source manapun yang ada
            if (formPassword !== undefined && formPassword !== null && formPassword !== '') {
                return String(formPassword);
            }
            if (currentPassword !== undefined && currentPassword !== null && currentPassword !== '') {
                return String(currentPassword);
            }
            if (domPassword && domPassword !== '') {
                return String(domPassword);
            }
            return '';
        };

        const payload = {
            rfid_user: getFieldValue('rfid_user'),
            password: getPasswordValue(), // Password tidak di-trim, ambil dari multiple source
            nama: getFieldValue('nama'),
            nik: getFieldValue('nik'),
            bagian: getFieldValue('bagian'),
            line: getFieldValue('line'),
            telegram: getFieldValue('telegram'), // Opsional, boleh kosong
            no_hp: getFieldValue('no_hp'), // Opsional, boleh kosong
        };

        console.log('🔵 [Register] Payload prepared:', payload);
        console.log('🔵 [Register] Payload validation check:', {
            rfid_user: { value: `"${payload.rfid_user}"`, length: payload.rfid_user.length, isEmpty: !payload.rfid_user || payload.rfid_user.length === 0 },
            password: { value: `"${payload.password}"`, length: payload.password.length, isEmpty: !payload.password || payload.password.length === 0 },
            nama: { value: `"${payload.nama}"`, length: payload.nama.length, isEmpty: !payload.nama || payload.nama.length === 0 },
            nik: { value: `"${payload.nik}"`, length: payload.nik.length, isEmpty: !payload.nik || payload.nik.length === 0 },
            bagian: { value: `"${payload.bagian}"`, length: payload.bagian.length, isEmpty: !payload.bagian || payload.bagian.length === 0 },
            line: { value: `"${payload.line}"`, length: payload.line.length, isEmpty: !payload.line || payload.line.length === 0 },
        });

        // Validasi field required secara manual (telegram dan no_hp opsional, boleh kosong)
        // Cek dengan lebih teliti - termasuk cek untuk string kosong setelah trim
        // Tapi jangan terlalu ketat - cek juga nilai asli sebelum trim
        const missingFields: string[] = [];

        // Cek dengan lebih fleksibel - jika setelah trim kosong, cek nilai asli
        const checkField = (_fieldName: string, value: string, originalValue: any): boolean => {
            if (value && value.length > 0) return true;
            // Jika setelah trim kosong, cek nilai asli
            if (originalValue && String(originalValue).length > 0) return true;
            return false;
        };

        // Cek dengan fallback ke DOM value juga
        const getOriginalValue = (fieldName: keyof RegisterFormData) => {
            return data[fieldName] || currentValues[fieldName] || getDOMValue(fieldName);
        };

        // Password perlu handling khusus - cek dari semua source
        const getOriginalPassword = () => {
            return data.password || currentValues.password || getDOMValue('password');
        };

        if (!checkField('RFID User', payload.rfid_user, getOriginalValue('rfid_user'))) {
            missingFields.push('RFID User');
        }
        // Password: cek dengan lebih teliti karena tidak di-trim
        const originalPassword = getOriginalPassword();
        if (!payload.password || payload.password.length === 0) {
            // Jika payload password kosong, cek original value
            if (!originalPassword || String(originalPassword).length === 0) {
                missingFields.push('Password');
            } else {
                // Jika original ada tapi payload kosong, gunakan original
                payload.password = String(originalPassword);
                console.log('🔵 [Register] Password diambil dari original value:', payload.password);
            }
        }
        if (!checkField('Nama', payload.nama, getOriginalValue('nama'))) {
            missingFields.push('Nama');
        }
        if (!checkField('NIK', payload.nik, getOriginalValue('nik'))) {
            missingFields.push('NIK');
        }
        if (!checkField('Bagian', payload.bagian, getOriginalValue('bagian'))) {
            missingFields.push('Bagian');
        }
        if (!checkField('Line', payload.line, getOriginalValue('line'))) {
            missingFields.push('Line');
        }

        if (missingFields.length > 0) {
            console.error('❌ [Register] Missing required fields:', missingFields);
            console.error('❌ [Register] Full payload:', payload);
            console.error('❌ [Register] Form data:', data);
            console.error('❌ [Register] Current values:', currentValues);
            console.error('❌ [Register] Watched values:', watchedValues);
            console.error('❌ [Register] Field checks:', {
                rfid_user: { payload: payload.rfid_user, data: data.rfid_user, current: currentValues.rfid_user },
                password: { payload: payload.password, data: data.password, current: currentValues.password },
                nama: { payload: payload.nama, data: data.nama, current: currentValues.nama },
                nik: { payload: payload.nik, data: data.nik, current: currentValues.nik },
                bagian: { payload: payload.bagian, data: data.bagian, current: currentValues.bagian },
                line: { payload: payload.line, data: data.line, current: currentValues.line },
            });
            alert(`Mohon lengkapi field yang wajib diisi:\n${missingFields.join('\n')}`);
            return;
        }

        registerMutation.mutate(payload,
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

    // Options untuk bagian dan line - dioptimasi dengan useMemo
    const bagianOptions = useMemo(() => ['SEWING', 'CUTTING', 'QC', 'ROBOTIC', 'IT', 'HR', 'FINANCE', 'WAREHOUSE', "DRYROOM", "FOLDING", "GUDANG", "IE"], []);
    // Ambil line options dari production line data (menggunakan MJL sebagai default, bisa disesuaikan dengan environment)
    const lineOptions = useMemo(() => {
        // Filter production lines (exclude All Production Line) dan ambil line number
        const mjlLines = productionLinesMJL
            .filter(line => line.id !== 111 && line.line) // Filter All Production Line dan pastikan ada line number
            .map(line => line.line!)
            .filter((line, index, self) => self.indexOf(line) === index) // Remove duplicates
            .sort((a, b) => parseInt(a) - parseInt(b)); // Sort by number

        // Jika perlu CLN lines juga, bisa digabungkan
        const clnLines = productionLinesCLN
            .filter(line => line.id !== 0 && line.line)
            .map(line => line.line!)
            .filter((line, index, self) => self.indexOf(line) === index)
            .sort((a, b) => parseInt(a) - parseInt(b));

        // Gabungkan dan remove duplicates, default ke MJL (1-15)
        const allLines = [...new Set([...mjlLines, ...clnLines])].sort((a, b) => parseInt(a) - parseInt(b));
        return allLines;
    }, []);

    // Toggle password - dioptimasi dengan useCallback
    const togglePassword = useCallback(() => {
        setShowPassword(prev => !prev);
    }, []);

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
                <RegisterLeftSide />

                {/* Right Side - Register Form */}
                <div className="w-full lg:w-1/2 flex items-center justify-center relative h-screen overflow-y-auto bg-transparent">
                    <div className="w-full max-w-2xl mx-auto py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8 xl:px-12">
                        {/* Card Container */}
                        <div className="bg-gray-100 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl overflow-hidden p-4 sm:p-6 md:p-8">
                            {/* Header */}
                            <RegisterHeader />

                            {/* Error Message */}
                            <RegisterMessage type="error" message={error} />

                            {/* Success Message */}
                            <RegisterMessage type="success" message={success} />

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
                                {/* Grid 2 Kolom untuk Field Utama */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                    <RegisterFormField
                                        label="RFID User"
                                        name="rfid_user"
                                        type="text"
                                        placeholder="Masukkan RFID User"
                                        required
                                        error={undefined}
                                        register={register('rfid_user')}
                                    />
                                    <RegisterFormField
                                        label="Password"
                                        name="password"
                                        type="password"
                                        placeholder="Masukkan Password"
                                        required
                                        error={undefined}
                                        register={register('password')}
                                        showPassword={showPassword}
                                        onTogglePassword={togglePassword}
                                    />
                                    <RegisterFormField
                                        label="Nama"
                                        name="nama"
                                        type="text"
                                        placeholder="Masukkan Nama Lengkap"
                                        required
                                        error={undefined}
                                        register={register('nama')}
                                    />
                                    <RegisterFormField
                                        label="NIK"
                                        name="nik"
                                        type="text"
                                        placeholder="Masukkan NIK"
                                        required
                                        error={undefined}
                                        register={register('nik')}
                                    />
                                    <RegisterFormField
                                        label="Bagian"
                                        name="bagian"
                                        type="select"
                                        required
                                        error={undefined}
                                        register={register('bagian')}
                                        options={bagianOptions}
                                    />
                                    <RegisterFormField
                                        label="Line"
                                        name="line"
                                        type="select"
                                        required
                                        error={undefined}
                                        register={register('line')}
                                        options={lineOptions}
                                    />
                                    <RegisterFormField
                                        label="Telegram"
                                        name="telegram"
                                        type="text"
                                        placeholder="Masukkan Telegram (Opsional)"
                                        register={register('telegram')}
                                    />
                                    <RegisterFormField
                                        label="No. HP"
                                        name="no_hp"
                                        type="text"
                                        placeholder="Masukkan No. HP (Opsional)"
                                        register={register('no_hp')}
                                    />
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
});

Register.displayName = 'Register';

export default Register;

