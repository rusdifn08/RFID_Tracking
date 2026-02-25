import { useState, useEffect } from 'react';
import { X, User, Clock, Save, Loader2, Target } from 'lucide-react';
import { API_BASE_URL, getDefaultHeaders } from '../config/api';

interface EditSupervisorShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    lineId: number;
    lineTitle: string;
    currentSupervisor: string;
    currentShift: 'day' | 'night';
    currentStartTime?: string; // Jam masuk (format: HH:mm)
    currentTarget?: number; // Target (acuan distribusi dashboard line)
    environment: 'CLN' | 'MJL' | 'MJL2';
    onUpdate: () => void; // Callback setelah update berhasil
}

export default function EditSupervisorShiftModal({
    isOpen,
    onClose,
    lineId,
    lineTitle,
    currentSupervisor,
    currentShift,
    currentStartTime = '07:30',
    currentTarget = 0,
    environment,
    onUpdate
}: EditSupervisorShiftModalProps) {
    const [supervisor, setSupervisor] = useState(currentSupervisor);
    const [shift, setShift] = useState<'day' | 'night'>(currentShift);
    const [startTime, setStartTime] = useState(currentStartTime);
    const [target, setTarget] = useState(currentTarget);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Update state saat props berubah
    useEffect(() => {
        if (isOpen) {
            setSupervisor(currentSupervisor);
            setShift(currentShift);
            setStartTime(currentStartTime || '07:30');
            setTarget(typeof currentTarget === 'number' && currentTarget >= 0 ? currentTarget : 0);
            setError(null);
            setSuccess(false);
        }
    }, [isOpen, currentSupervisor, currentShift, currentStartTime, currentTarget]);

    const handleSave = async () => {
        if (!supervisor.trim()) {
            setError('Nama supervisor tidak boleh kosong');
            return;
        }

        // Validasi format startTime (HH:mm)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(startTime)) {
            setError('Format jam masuk tidak valid. Gunakan format HH:mm (contoh: 07:30, 19:30)');
            return;
        }

        setIsSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // Update supervisor, startTime, dan target dalam satu request
            const supervisorResponse = await fetch(`${API_BASE_URL}/api/supervisor-data`, {
                method: 'POST',
                headers: {
                    ...getDefaultHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lineId,
                    supervisor: supervisor.trim(),
                    startTime: startTime.trim(),
                    target: typeof target === 'number' && target >= 0 ? target : 0,
                    environment
                })
            });

            if (!supervisorResponse.ok) {
                throw new Error('Gagal mengupdate supervisor dan jam masuk');
            }

            // Update shift
            const shiftResponse = await fetch(`${API_BASE_URL}/api/shift-data`, {
                method: 'POST',
                headers: {
                    ...getDefaultHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lineId,
                    shift,
                    environment: environment
                })
            });

            if (!shiftResponse.ok) {
                throw new Error('Gagal mengupdate shift');
            }

            setSuccess(true);
            
            // Dispatch custom event untuk real-time update di semua tab/window
            window.dispatchEvent(new CustomEvent('supervisorUpdated'));
            window.dispatchEvent(new CustomEvent('shiftUpdated'));
            
            // Trigger update callback
            onUpdate();

            // Close modal setelah 1 detik
            setTimeout(() => {
                onClose();
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan data');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 xs:p-4 sm:p-4">
            {/* Container: fluid width, max height viewport, scroll dalam modal di device kecil */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md min-w-0 max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header - tetap terlihat, tidak di-scroll */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0">
                    <h2 className="text-base xs:text-lg sm:text-xl font-bold text-white leading-tight truncate pr-2">
                        Edit Data {lineTitle}
                    </h2>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 flex items-center justify-center w-10 h-10 min-w-[44px] min-h-[44px] text-white hover:bg-white/20 rounded-full transition-colors touch-manipulation"
                        disabled={isSaving}
                        aria-label="Tutup"
                    >
                        <X size={22} className="sm:w-5 sm:h-5" />
                    </button>
                </div>

                {/* Content - compact agar responsive tanpa scroll */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-h-0">
                    <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
                        {/* Supervisor Input */}
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                                <User size={14} className="sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                Supervisor
                            </label>
                            <input
                                type="text"
                                value={supervisor}
                                onChange={(e) => setSupervisor(e.target.value)}
                                placeholder="Masukkan nama supervisor"
                                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[44px] sm:min-h-[48px]"
                                disabled={isSaving}
                            />
                        </div>

                        {/* Start Time Input */}
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                                <Clock size={14} className="sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                Jam Masuk (Start Time)
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[44px] sm:min-h-[48px]"
                                disabled={isSaving}
                            />
                            <p className="text-[10px] xs:text-xs text-gray-500 mt-1 leading-tight">Format: HH:mm (24 jam, contoh: 07:30 untuk pagi, 19:30 untuk malam)</p>
                        </div>

                        {/* Target Input */}
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                                <Target size={14} className="sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                Target
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={target}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    setTarget(Number.isNaN(v) || v < 0 ? 0 : v);
                                }}
                                placeholder="0"
                                className="w-full px-3 py-2.5 sm:px-4 sm:py-3 text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all min-h-[44px] sm:min-h-[48px]"
                                disabled={isSaving}
                            />
                            <p className="text-[10px] xs:text-xs text-gray-500 mt-1 leading-tight">Nilai target dipakai sebagai acuan di distribusi data dashboard line (angka bulat, minimal 0)</p>
                        </div>

                        {/* Shift Selection */}
                        <div>
                            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2">
                                <Clock size={14} className="sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                                Shift
                            </label>
                            <div className="grid grid-cols-2 gap-2 sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShift('day')}
                                    disabled={isSaving}
                                    className={`min-h-[44px] sm:min-h-[48px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all touch-manipulation ${
                                        shift === 'day'
                                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-[1.02]'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                    }`}
                                >
                                    ☀️ Shift Siang
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShift('night')}
                                    disabled={isSaving}
                                    className={`min-h-[44px] sm:min-h-[48px] px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-semibold transition-all touch-manipulation ${
                                        shift === 'night'
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg scale-[1.02]'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
                                    }`}
                                >
                                    🌙 Shift Malam
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 sm:p-3">
                                <p className="text-xs sm:text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2.5 sm:p-3">
                                <p className="text-xs sm:text-sm text-green-600">✅ Data berhasil diupdate!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - tetap di bawah, touch-friendly */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-[44px] px-4 sm:px-5 py-2.5 text-sm sm:text-base text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium touch-manipulation"
                        disabled={isSaving}
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving || !supervisor.trim()}
                        className="min-h-[44px] px-5 sm:px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base touch-manipulation"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin flex-shrink-0" />
                                <span>Menyimpan...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} className="flex-shrink-0" />
                                <span>Simpan</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
