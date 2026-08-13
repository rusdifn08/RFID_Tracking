import { memo } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canAccessMachineProductivity } from '../utils/machineProductivityAccess';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import backgroundImage from '../assets/background.jpg';
import MachineProductivityHub from '../components/machine-productivity/MachineProductivityHub';
import MachineResumePage from '../components/machine-productivity/MachineResumePage';
import {
    DetailMachinesPage,
    DetailSensorDataPage,
    DetailSensorPickPage,
} from '../components/machine-productivity/MachineDetailPages';
import MachineListSidebar from '../components/machine-productivity/MachineListSidebar';
import CompareDashboard from '../components/machine-productivity/CompareDashboard';
import PzemDashboard from '../components/machine-productivity/PzemDashboard';
import MachineShiftPanels from '../components/machine-productivity/MachineShiftPanels';
import AdxlDashboard from '../components/machine-productivity/AdxlDashboard';
import AdxlSidebarPanel from '../components/machine-productivity/AdxlSidebarPanel';
import PzemSidebarPanel from '../components/machine-productivity/PzemSidebarPanel';
import MachineLoginPage from '../components/machine-productivity/MachineLoginPage';
import MachineControlPage from '../components/machine-productivity/MachineControlPage';
import ZigbeeMeshPage from '../components/machine-productivity/ZigbeeMeshPage';
import { useMachineIoT } from '../components/machine-productivity/useMachineIoT';
import type { DashboardView } from '../components/machine-productivity/types';

function viewFromPath(pathname: string): DashboardView {
    if (pathname.includes('/detail/') && pathname.endsWith('/pzem')) return 'detail-pzem';
    if (pathname.includes('/detail/') && pathname.endsWith('/adxl')) return 'detail-adxl';
    if (/\/detail\/[^/]+$/.test(pathname)) return 'detail-pick';
    if (pathname.includes('/detail')) return 'detail';
    if (pathname.includes('/resume')) return 'resume';
    if (pathname.includes('/control')) return 'control';
    if (pathname.includes('/login')) return 'login';
    if (pathname.includes('/compare')) return 'compare';
    if (pathname.includes('/zigbee')) return 'zigbee';
    if (pathname.includes('/pzem')) return 'pzem';
    if (pathname.includes('/adxl')) return 'adxl';
    return 'hub';
}

const TITLES: Partial<Record<DashboardView, string>> = {
    compare: 'Compare Data',
    pzem: 'PZEM-004T Data',
    adxl: 'ADXL345 Data',
};

const MachineProductivityPage = memo(() => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const view = viewFromPath(location.pathname);
    const iot = useMachineIoT();

    if (!canAccessMachineProductivity(user)) {
        return <Navigate to="/" replace />;
    }

    const saveCalibration = (patch: {
        g_force_threshold: number;
        filter_aktif_ms: number;
        filter_diam_ms: number;
        power_threshold_w: number;
        current_threshold_a: number;
    }) => {
        if (!iot.selected) return Promise.resolve();
        return iot.saveCalibration(iot.selected.id, patch);
    };

    const isLiveDash = view === 'compare' || view === 'pzem' || view === 'adxl';

    return (
        <div className="flex h-screen w-full font-sans text-slate-800 bg-slate-50 overflow-hidden selection:bg-sky-100 selection:text-sky-900">
            <div
                className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]"
                style={{ backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover' }}
            />

            <div className="fixed left-0 top-0 h-full z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300">
                <Sidebar />
            </div>

            <div
                className="flex flex-col h-full min-h-0 min-w-0 relative z-10 transition-all duration-300 ease-in-out"
                style={{
                    marginLeft: 'var(--layout-sidebar-offset)',
                    width: 'var(--layout-sidebar-width)',
                }}
            >
                <Header />
                <Breadcrumb />

                <main className="flex flex-col flex-1 min-h-0 w-full bg-slate-50/50 px-2 md:px-4 pb-3 pt-2 overflow-y-auto">
                    {view === 'hub' && <MachineProductivityHub />}
                    {view === 'zigbee' && <ZigbeeMeshPage />}
                    {view === 'control' && <MachineControlPage />}
                    {view === 'login' && <MachineLoginPage />}
                    {view === 'resume' && <MachineResumePage enableSim={false} />}
                    {view === 'detail' && <DetailMachinesPage />}
                    {view === 'detail-pick' && <DetailSensorPickPage />}
                    {view === 'detail-pzem' && <DetailSensorDataPage sensor="pzem" />}
                    {view === 'detail-adxl' && <DetailSensorDataPage sensor="adxl" />}

                    {isLiveDash && (
                        <div
                            className={`w-full mx-auto space-y-4 ${view === 'compare' ? 'max-w-[1600px]' : 'max-w-7xl'}`}
                        >
                            {view !== 'compare' && (
                                <div className="flex flex-wrap items-center justify-end gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => void iot.loadMachines()}
                                            className="px-3 py-2 text-sm rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                                        >
                                            Refresh
                                        </button>
                                    </div>
                                </div>
                            )}

                            {iot.error && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm">
                                    {iot.error}. Pastikan backend Rust jalan.
                                </div>
                            )}

                            {view === 'compare' ? (
                                iot.selected ? (
                                    <CompareDashboard
                                        machine={iot.selected}
                                        live={iot.selectedLive}
                                        apiBase={iot.apiBase}
                                        pzemStats={iot.selectedPzemStats}
                                        machines={iot.machines}
                                        selectedId={iot.selectedId}
                                        onSelectId={iot.setSelectedId}
                                        onRefresh={() => void iot.loadMachines()}
                                        onMachineUpdated={(m) => iot.patchMachine(m.id, m)}
                                        onSaveThresholds={(patch) =>
                                            iot.saveCalibration(iot.selected!.id, patch)
                                        }
                                        onResetPzem={async () => {
                                            const pzem = await iot.resetPzemStats(iot.selected!.id);
                                            return {
                                                archived: !!(pzem && 'archived' in pzem && pzem.archived),
                                            };
                                        }}
                                    />
                                ) : (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400 text-sm">
                                        {iot.loading ? 'Memuat mesin…' : 'Belum ada mesin terdaftar.'}
                                    </div>
                                )
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="lg:col-span-1 space-y-3">
                                        <MachineListSidebar
                                            view={view}
                                            machines={iot.machines}
                                            selectedId={iot.selectedId}
                                            loading={iot.loading}
                                            onSelect={iot.setSelectedId}
                                            liveCurrentById={Object.fromEntries(
                                                Object.entries(iot.liveByMachine)
                                                    .filter(([, live]) => live.pzem?.current_a != null)
                                                    .map(([id, live]) => [id, live.pzem!.current_a]),
                                            )}
                                        />
                                        {view === 'pzem' && iot.selected && (
                                            <>
                                                <MachineShiftPanels
                                                    machine={iot.selected}
                                                    apiBase={iot.apiBase}
                                                    onMachineUpdated={(m) => iot.patchMachine(m.id, m)}
                                                />
                                                <PzemSidebarPanel
                                                    machine={iot.selected}
                                                    live={iot.selectedLive}
                                                    onSaveCalibration={saveCalibration}
                                                />
                                            </>
                                        )}
                                        {view === 'adxl' && iot.selected && (
                                            <AdxlSidebarPanel
                                                machine={iot.selected}
                                                live={iot.selectedLive}
                                                onSaveCalibration={saveCalibration}
                                            />
                                        )}
                                    </div>
                                    <div className="lg:col-span-2">
                                        {iot.selected ? (
                                            <>
                                                {view === 'pzem' && (
                                                    <PzemDashboard
                                                        machine={iot.selected}
                                                        live={iot.selectedLive}
                                                        stats={iot.selectedPzemStats}
                                                        apiBase={iot.apiBase}
                                                        onResetStats={() =>
                                                            iot.resetPzemStats(iot.selected!.id)
                                                        }
                                                    />
                                                )}
                                                {view === 'adxl' && (
                                                    <AdxlDashboard
                                                        machine={iot.selected}
                                                        live={iot.selectedLive}
                                                        stats={iot.selectedAdxlStats}
                                                        apiBase={iot.apiBase}
                                                        onResetStats={() =>
                                                            iot.resetAdxlStats(iot.selected!.id)
                                                        }
                                                        onToggleForceOff={(enabled) =>
                                                            iot.setAdxlForceOff(
                                                                iot.selected!.id,
                                                                enabled,
                                                            )
                                                        }
                                                    />
                                                )}
                                            </>
                                        ) : (
                                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400 text-sm">
                                                Pilih mesin di panel kiri.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
});

MachineProductivityPage.displayName = 'MachineProductivityPage';
export default MachineProductivityPage;
