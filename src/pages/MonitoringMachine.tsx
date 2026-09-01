import { memo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import backgroundImage from '../assets/background.jpg';
import DynamicEmbed from '../components/DynamicEmbed';
import MachineResumePage from '../components/machine-productivity/MachineResumePage';
import { SIMULASI_MACHINE, JUKI_MONITOR_UID_SLOTS } from '../config/hide';
import { Cpu, Scissors, ArrowRight, ArrowLeft, RotateCw, ExternalLink, Monitor, Server } from 'lucide-react';

type MachineKind = 'template' | 'bullmer' | 'juki';

const MonitoringMachine = memo(() => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [refreshKey, setRefreshKey] = useState(0);

    const typeParam = searchParams.get('type');
    let selectedMachine: MachineKind | null = null;

    if (location.pathname.includes('/template') || typeParam === 'template') {
        selectedMachine = 'template';
    } else if (location.pathname.includes('/bullmer') || typeParam === 'bullmer') {
        selectedMachine = 'bullmer';
    } else if (location.pathname.includes('/juki') || typeParam === 'juki') {
        selectedMachine = 'juki';
    }

    const getMachineConfig = (type: 'template' | 'bullmer') => {
        if (type === 'template') {
            return {
                title: 'Machine Template',
                baseUrl: 'http://10.5.0.107:5175',
                prefix: '/monitoring-machine/template',
                ip: '10.5.0.107:5175',
            };
        }
        return {
            title: 'Machine AutoCutter',
            baseUrl: 'http://10.5.0.8:5177/',
            prefix: '/monitoring-machine/bullmer',
            ip: '10.5.0.8:5177',
        };
    };

    const currentConfig =
        selectedMachine === 'template' || selectedMachine === 'bullmer'
            ? getMachineConfig(selectedMachine)
            : null;

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

                <main className="flex flex-col flex-1 min-h-0 w-full bg-slate-50/50 px-2 md:px-3 pb-2 md:pb-3 pt-10 xs:pt-12 sm:pt-14 md:pt-[3.5rem] lg:pt-[4.5rem] overflow-hidden">
                    {!selectedMachine ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
                            <div className="max-w-5xl w-full mx-auto space-y-8">
                                <div className="text-center space-y-3">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-100/80 text-sky-800 text-xs font-semibold tracking-wide border border-sky-200 shadow-sm">
                                        <Monitor className="w-4 h-4 text-sky-600" />
                                        <span>SYSTEM MONITORING MESIN</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                                        Pilih Machine Monitoring
                                    </h1>
                                    <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto">
                                        Silakan pilih unit mesin di bawah ini untuk mengakses sistem monitoring secara real-time.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                                    {/* Machine Template */}
                                    <div
                                        onClick={() => navigate('/monitoring-machine/template')}
                                        className="group relative bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1 hover:border-sky-400"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-400/10 to-indigo-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />

                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform duration-300">
                                                    <Cpu className="w-7 h-7 text-white" />
                                                </div>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    10.5.0.107:5175
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-bold text-slate-800 group-hover:text-sky-600 transition-colors duration-200">
                                                Machine Template
                                            </h3>
                                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                                Sistem monitoring real-time untuk pengoperasian dan status performa Machine Template.
                                            </p>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sky-600 font-semibold text-sm group-hover:text-sky-700">
                                            <span>Buka Monitoring</span>
                                            <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all duration-300">
                                                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Machine AutoCutter */}
                                    <div
                                        onClick={() => navigate('/monitoring-machine/bullmer')}
                                        className="group relative bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1 hover:border-cyan-400"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />

                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 group-hover:scale-105 transition-transform duration-300">
                                                    <Scissors className="w-7 h-7 text-white" />
                                                </div>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    10.5.0.8:5177
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-bold text-slate-800 group-hover:text-cyan-600 transition-colors duration-200">
                                                Machine AutoCutter
                                            </h3>
                                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                                Sistem monitoring real-time untuk pengoperasian dan status pemotongan Machine AutoCutter.
                                            </p>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-cyan-600 font-semibold text-sm group-hover:text-cyan-700">
                                            <span>Buka Monitoring</span>
                                            <div className="w-8 h-8 rounded-full bg-cyan-50 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
                                                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Machine Template JUKI — Resume */}
                                    <div
                                        onClick={() => navigate('/monitoring-machine/juki')}
                                        className="group relative bg-white rounded-2xl p-6 border border-slate-200/80 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden hover:-translate-y-1 hover:border-indigo-400"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/10 to-violet-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-500" />

                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform duration-300">
                                                    <Server className="w-7 h-7 text-white" />
                                                </div>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                                    Resume JUKI
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors duration-200">
                                                Machine Template JUKI
                                            </h3>
                                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                                Resume produktivitas mesin JUKI (Power On / Running / Loss) — sama seperti halaman Resume Mesin.
                                            </p>
                                        </div>

                                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-indigo-600 font-semibold text-sm group-hover:text-indigo-700">
                                            <span>Buka Resume</span>
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 min-h-0 w-full overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        onClick={() => navigate('/monitoring-machine')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-all shadow-sm cursor-pointer"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        <span>Pilihan Mesin</span>
                                    </button>

                                    <div className="h-4 w-px bg-slate-300 hidden sm:block" />

                                    <div className="flex items-center bg-slate-200/70 p-1 rounded-xl gap-1 flex-wrap">
                                        <button
                                            onClick={() => navigate('/monitoring-machine/template')}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                selectedMachine === 'template'
                                                    ? 'bg-white text-sky-700 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                            }`}
                                        >
                                            <Cpu className="w-3.5 h-3.5" />
                                            <span>Machine Template</span>
                                        </button>

                                        <button
                                            onClick={() => navigate('/monitoring-machine/bullmer')}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                selectedMachine === 'bullmer'
                                                    ? 'bg-white text-cyan-700 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                            }`}
                                        >
                                            <Scissors className="w-3.5 h-3.5" />
                                            <span>Machine AutoCutter</span>
                                        </button>

                                        <button
                                            onClick={() => navigate('/monitoring-machine/juki')}
                                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                                selectedMachine === 'juki'
                                                    ? 'bg-white text-indigo-700 shadow-sm'
                                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                            }`}
                                        >
                                            <Server className="w-3.5 h-3.5" />
                                            <span>Machine Template JUKI</span>
                                        </button>
                                    </div>
                                </div>

                                {selectedMachine !== 'juki' && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setRefreshKey((prev) => prev + 1)}
                                            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
                                            title="Reload Frame"
                                        >
                                            <RotateCw className="w-3.5 h-3.5" />
                                            <span className="hidden md:inline">Refresh</span>
                                        </button>

                                        {currentConfig && (
                                            <a
                                                href={currentConfig.baseUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-all shadow-sm"
                                                title="Buka di Tab Baru"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                <span className="hidden md:inline">Tab Baru</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedMachine === 'juki' ? (
                                <div className="flex-1 min-h-0 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 md:p-4">
                                    <MachineResumePage
                                        key={refreshKey}
                                        enableSim={SIMULASI_MACHINE}
                                        uidSlots={JUKI_MONITOR_UID_SLOTS}
                                    />
                                </div>
                            ) : (
                                currentConfig && (
                                    <div className="flex-1 min-h-0 w-full overflow-hidden">
                                        <DynamicEmbed
                                            key={`${selectedMachine}-${refreshKey}`}
                                            baseUrl={currentConfig.baseUrl}
                                            prefix={currentConfig.prefix}
                                        />
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
});

MonitoringMachine.displayName = 'MonitoringMachine';

export default MonitoringMachine;
