import { useParams, useLocation } from 'react-router-dom';
import { memo, useMemo, useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import backgroundImage from '../assets/background.jpg';
import LineDetailHeader from '../components/line/LineDetailHeader';
import LineDetailCardsGrid from '../components/line/LineDetailCardsGrid';
import { getInitialEnvironment, getEnvironmentFromAPI, getSupervisorDataFromAPI, type BackendEnvironment } from '../config/api';
import { productionLinesCLN, productionLinesMJL, productionLinesMJL2, productionLinesGCC } from '../data/production_line';
import daftarRfidIcon from '../assets/daftarrfid.webp';
import dashboardRfidIcon from '../assets/dashboardrfid.webp';
import listRfidIcon from '../assets/listrfid.webp';

function getSupervisorByLine(
    supervisors: Record<string, string> | undefined,
    lineNumberRaw: string,
    fallback: string | null
): string | null {
    if (!supervisors) return fallback ?? null;
    const lineNumber = String(lineNumberRaw || '').trim();
    const lineAsNumber = String(parseInt(lineNumber, 10));
    const normalized = lineNumber.toUpperCase().replace(/^LINE\s*/i, '');
    return (
        supervisors[lineNumber] ??
        supervisors[lineAsNumber] ??
        supervisors[`LINE ${lineNumber}`] ??
        supervisors[`LINE ${lineAsNumber}`] ??
        supervisors[normalized] ??
        fallback ??
        null
    );
}

const LineDetail = memo(() => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const [environment, setEnvironment] = useState<BackendEnvironment>(getInitialEnvironment);
    const [supervisorFromAPI, setSupervisorFromAPI] = useState<string | null>(null);

    // Fetch environment (1x shared request via getEnvironmentFromAPI)
    useEffect(() => {
        getEnvironmentFromAPI().then(env => setEnvironment(env));
    }, []);

    // Fetch supervisor dari API (1x shared request via getSupervisorDataFromAPI)
    useEffect(() => {
        if (!environment || !id) return;
        const applySupervisor = async () => {
            const data = await getSupervisorDataFromAPI(environment);
            if (data?.supervisors) {
                const lineKey = id.trim();
                const name = getSupervisorByLine(data.supervisors, lineKey, null);
                setSupervisorFromAPI(name ?? null);
            } else {
                setSupervisorFromAPI(null);
            }
        };
        applySupervisor();
        const onSupervisorUpdated = () => applySupervisor();
        window.addEventListener('supervisorUpdated', onSupervisorUpdated);
        return () => window.removeEventListener('supervisorUpdated', onSupervisorUpdated);
    }, [environment, id]);

    // Data Production Lines diambil dari constant file
    // Filter untuk menghilangkan "All Production Line" (id 0, 111, atau 112)
    const filteredProductionLinesCLN = useMemo(() =>
        productionLinesCLN.filter(line => line.id !== 0),
        []
    );

    const filteredProductionLinesMJL = useMemo(() =>
        productionLinesMJL.filter(line => line.id !== 111),
        []
    );

    const filteredProductionLinesMJL2 = useMemo(() =>
        productionLinesMJL2.filter(line => line.id !== 112),
        []
    );

    const filteredProductionLinesGCC = useMemo(() =>
        productionLinesGCC.filter(line => line.id !== 113),
        []
    );

    // Pilih data berdasarkan environment
    const productionLines = useMemo(() => {
        if (environment === 'MJL2') {
            return filteredProductionLinesMJL2;
        } else if (environment === 'MJL') {
            return filteredProductionLinesMJL;
        } else if (environment === 'GCC') {
            return filteredProductionLinesGCC;
        } else {
            return filteredProductionLinesCLN;
        }
    }, [environment, filteredProductionLinesCLN, filteredProductionLinesMJL, filteredProductionLinesMJL2, filteredProductionLinesGCC]);

    // Cari currentLine berdasarkan line.line atau line.id yang sesuai dengan parameter URL
    const currentLine = useMemo(() => {
        if (!id) {
            return {
                title: 'Line Production',
                supervisor: '-'
            };
        }

        // Normalisasi id dari URL (bisa "12" atau "LINE 12")
        const normalizedId = id.trim();
        const lineNumber = parseInt(normalizedId, 10);

        // Cari berdasarkan line.line (prioritas) atau line.id
        const found = productionLines.find(line => {
            // Cek apakah line.line cocok dengan id dari URL
            if (line.line && line.line === normalizedId) {
                return true;
            }
            // Cek apakah line.line cocok dengan number dari URL
            if (line.line && parseInt(line.line, 10) === lineNumber) {
                return true;
            }
            // Fallback: cek line.id
            if (line.id === lineNumber) {
                return true;
            }
            return false;
        });

        return found || {
            title: `Production Line ${normalizedId}`,
            supervisor: '-'
        };
    }, [productionLines, id]);

    const cards = useMemo(() => {
        const isSewingLineDetail = location.pathname.startsWith('/sewing/line/');

        return [
            {
                id: 1,
                title: 'Daftar RFID',
                subtitle: 'Registrasi Tag Baru',
                icon: null,
                iconImage: daftarRfidIcon,
                path: '/daftar-rfid',
            },
            {
                id: 2,
                title: isSewingLineDetail ? 'Dashboard Sewing' : 'Dashboard RFID',
                subtitle: isSewingLineDetail ? 'Monitoring Sewing Line' : 'Monitoring Real-Time',
                icon: null,
                iconImage: dashboardRfidIcon,
                path: isSewingLineDetail ? '/dashboard-sewing-line' : `/dashboard-rfid/${id}`,
            },
            {
                id: 3,
                title: 'List RFID',
                subtitle: 'Database & Log',
                icon: null,
                iconImage: listRfidIcon,
                path: `/list-rfid/${id}`,
            },
        ];
    }, [id, location.pathname]);

    return (
        <div className="flex min-h-screen w-full h-screen font-sans text-slate-800 overflow-hidden fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Sidebar */}
            <div className="fixed left-0 top-0 h-full z-50 shadow-xl">
                <Sidebar />
            </div>

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full h-screen relative"
                style={{
                    marginLeft: 'var(--layout-sidebar-offset)',
                    width: 'var(--layout-sidebar-width)',
                }}
            >
                {/* Header */}
                <div className="sticky top-0 z-40 shadow-md">
                    <Header />
                </div>

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Main Content */}
                <main
                    className="flex-1 w-full overflow-y-auto px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10 relative"
                    style={{
                        paddingTop: 'clamp(0.5rem, 1vh, 1rem)',
                        paddingBottom: 'clamp(4rem, 8vh, 5rem)',
                        minHeight: 0,
                    }}
                >


                    {/* Content Container - relative untuk z-index */}
                    <div className="relative z-10">
                        {/* --- TITLE SECTION --- */}
                        <LineDetailHeader
                            supervisor={supervisorFromAPI ?? currentLine.supervisor}
                        />

                        {/* --- CARDS GRID --- */}
                        <LineDetailCardsGrid cards={cards} />
                    </div>

                </main>
                <Footer />
            </div>
        </div>
    );
});

LineDetail.displayName = 'LineDetail';

export default LineDetail;