import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, LogIn, ScanLine } from 'lucide-react';
import BarcodeCameraScanner from '../cutting/BarcodeCameraScanner';
import {
    buildMachineGateUrl,
    machineLoginPublicOrigin,
    parseMachineLoginTarget,
} from './machineLoginUrl';

export default function MachineLoginPage() {
    const navigate = useNavigate();
    const [manualCode, setManualCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [cameraOn, setCameraOn] = useState(false);

    const goToMachineLink = useCallback(
        (raw: string) => {
            setError(null);
            const target = parseMachineLoginTarget(raw);
            if (!target) {
                setError(
                    'Tidak dikenali. Scan link /ops/ml/{UID} atau legacy /m/MESIN001.',
                );
                return;
            }
            if (target.kind === 'gate') {
                navigate(`/ops/ml/${encodeURIComponent(target.uid)}`);
                return;
            }
            navigate(`/m/${target.barcode}`);
        },
        [navigate],
    );

    const onDetected = useCallback(
        (raw: string) => {
            goToMachineLink(raw);
        },
        [goToMachineLink],
    );

    const exampleUrl = buildMachineGateUrl('001');
    const origin = machineLoginPublicOrigin();

    return (
        <div className="w-full max-w-3xl mx-auto space-y-5 pb-6">
            <div className="text-center pt-2">
                <h1
                    className="text-2xl font-bold text-slate-800 flex items-center justify-center gap-2"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                    <LogIn className="w-7 h-7 text-emerald-600" />
                    Login Mesin
                </h1>
                <p className="text-sm text-slate-500 mt-2 max-w-xl mx-auto">
                    QR di mesin berisi <strong>link UID tetap</strong> — scan kamera HP buka login;
                    machine code (JUKI00x) bisa diubah di Control tanpa ganti sticker. Setelah sukses
                    LCD tampil <strong>Login Sukses</strong> 5 detik.
                </p>
            </div>

            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 text-sm text-slate-700 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sky-800">
                    <Link2 className="w-4 h-4" />
                    Format QR untuk cetak sticker
                </div>
                <p className="font-mono text-xs break-all bg-white border border-sky-100 rounded-lg px-3 py-2">
                    {exampleUrl}
                </p>
                <p className="text-xs text-slate-500">
                    Pola: <code>/ops/ml/&#123;UID&#125;</code> contoh <code>/ops/ml/001</code>. Origin:{' '}
                    <code>{origin}</code> — set <code>VITE_APP_PUBLIC_ORIGIN</code> jika host beda.
                    Link lama <code>/ops/ml/001/juki-001</code> masih jalan.
                </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 text-slate-700 font-semibold">
                        <ScanLine className="w-5 h-5 text-violet-600" />
                        Scan di dalam browser (opsional)
                    </div>
                    <button
                        type="button"
                        onClick={() => setCameraOn((v) => !v)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                        {cameraOn ? 'Matikan kamera' : 'Buka kamera'}
                    </button>
                </div>

                <BarcodeCameraScanner
                    onDetected={onDetected}
                    cameraActive={cameraOn}
                    compact
                    className="rounded-xl overflow-hidden border border-slate-100"
                />

                <form
                    className="flex flex-col sm:flex-row gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        goToMachineLink(manualCode);
                    }}
                >
                    <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Paste link QR /ops/ml/... atau MESIN001"
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                    <button
                        type="submit"
                        disabled={!manualCode.trim()}
                        className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                    >
                        Buka link mesin
                    </button>
                </form>

                {error && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
}

// Re-export untuk kompatibilitas
export { normalizeMachineBarcode } from './machineLoginUrl';
