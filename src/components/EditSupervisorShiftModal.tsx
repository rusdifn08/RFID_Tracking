import { useState, useEffect } from 'react';
import { X, User, Clock, Save, Loader2 } from 'lucide-react';
import { API_BASE_URL, getDefaultHeaders } from '../config/api';

interface EditSupervisorShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    lineId: number;
    lineTitle: string;
    currentSupervisor: string;
    currentShift: 'day' | 'night';
    currentStartTime?: string; // Jam masuk (format: HH:mm)
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
    environment,
    onUpdate
}: EditSupervisorShiftModalProps) {
    const [supervisor, setSupervisor] = useState(currentSupervisor);
    const [shift, setShift] = useState<'day' | 'night'>(currentShift);
    const [startTime, setStartTime] = useState(currentStartTime);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Update state saat props berubah
    useEffect(() => {
        if (isOpen) {
            setSupervisor(currentSupervisor);
            setShift(currentShift);
            setStartTime(currentStartTime || '07:30');
            setError(null);
            setSuccess(false);
        }
    }, [isOpen, currentSupervisor, currentShift, currentStartTime]);

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
            // Update supervisor dan startTime dalam satu request
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Edit Supervisor, Jam Masuk & Shift</h2>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                        disabled={isSaving}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Line Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-1">Production Line</p>
                        <p className="text-lg font-semibold text-gray-900">{lineTitle}</p>
                        <p className="text-xs text-gray-500 mt-1">Environment: {environment}</p>
                    </div>

                    {/* Supervisor Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <User size={16} className="text-blue-600" />
                            Supervisor
                        </label>
                        <input
                            type="text"
                            value={supervisor}
                            onChange={(e) => setSupervisor(e.target.value)}
                            placeholder="Masukkan nama supervisor"
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            disabled={isSaving}
                        />
                    </div>

                    {/* Start Time Input */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Clock size={16} className="text-blue-600" />
                            Jam Masuk (Start Time)
                        </label>
                        <input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            disabled={isSaving}
                        />
                        <p className="text-xs text-gray-500 mt-1">Format: HH:mm (24 jam, contoh: 07:30 untuk pagi, 19:30 untuk malam)</p>
                    </div>

                    {/* Shift Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Clock size={16} className="text-blue-600" />
                            Shift
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShift('day')}
                                disabled={isSaving}
                                className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                                    shift === 'day'
                                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                ☀️ Shift Siang
                            </button>
                            <button
                                onClick={() => setShift('night')}
                                disabled={isSaving}
                                className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                                    shift === 'night'
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg scale-105'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                🌙 Shift Malam
                            </button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <p className="text-sm text-green-600">✅ Data berhasil diupdate!</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                        disabled={isSaving}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !supervisor.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                Simpan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
