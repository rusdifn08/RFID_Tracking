import { useParams } from 'react-router-dom';
import { memo, useMemo, useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import LineDetailHeader from '../components/line/LineDetailHeader';
import LineDetailCardsGrid from '../components/line/LineDetailCardsGrid';
import { API_BASE_URL, getDefaultHeaders, setBackendEnvironment } from '../config/api';
import { productionLinesCLN, productionLinesMJL, productionLinesMJL2 } from '../data/production_line';
import daftarRfidIcon from '../assets/daftarrfid.webp';
import dashboardRfidIcon from '../assets/dashboardrfid.webp';
import listRfidIcon from '../assets/listrfid.webp';

// Fungsi untuk mendapatkan environment dari API atau berdasarkan port
const getEnvironment = async (): Promise<'CLN' | 'MJL' | 'MJL2'> => {
    // Deteksi environment berdasarkan port sebagai fallback
    const currentPort = window.location.port;
    let fallbackEnv: 'CLN' | 'MJL' | 'MJL2' = 'CLN';
    
    if (currentPort === '5174') {
        fallbackEnv = 'MJL2';
    } else if (currentPort === '5173') {
        fallbackEnv = 'MJL';
    } else {
        fallbackEnv = 'CLN';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/config/environment`, {
            headers: getDefaultHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            const env = data.environment === 'MJL2' ? 'MJL2' : data.environment === 'MJL' ? 'MJL' : 'CLN';
            setBackendEnvironment(env);
            return env;
        }
    } catch (error) {
        console.error('Error fetching environment config:', error);
        // Jika error, gunakan fallback berdasarkan port
        console.log(`⚠️ [ENV] Using fallback environment based on port ${currentPort}: ${fallbackEnv}`);
        setBackendEnvironment(fallbackEnv);
        return fallbackEnv;
    }
    // Default berdasarkan port jika tidak ada response
    console.log(`⚠️ [ENV] No response from API, using fallback environment based on port ${currentPort}: ${fallbackEnv}`);
    setBackendEnvironment(fallbackEnv);
    return fallbackEnv;
};

const LineDetail = memo(() => {
    const { id } = useParams<{ id: string }>();
    const { isOpen } = useSidebar();
    const [environment, setEnvironment] = useState<'CLN' | 'MJL' | 'MJL2'>('CLN');

    // Fetch environment saat component mount
    useEffect(() => {
        getEnvironment().then(env => {
            setEnvironment(env);
        });
    }, []);

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

    // Pilih data berdasarkan environment
    const productionLines = useMemo(() => {
        if (environment === 'MJL2') {
            return filteredProductionLinesMJL2;
        } else if (environment === 'MJL') {
            return filteredProductionLinesMJL;
        } else {
            return filteredProductionLinesCLN;
        }
    }, [environment, filteredProductionLinesCLN, filteredProductionLinesMJL, filteredProductionLinesMJL2]);

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

    const cards = useMemo(() => [
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
            title: 'Dashboard RFID',
            subtitle: 'Monitoring Real-Time',
            icon: null,
            iconImage: dashboardRfidIcon,
            path: `/dashboard-rfid/${id}`,
        },
        {
            id: 3,
            title: 'List RFID',
            subtitle: 'Database & Log',
            icon: null,
            iconImage: listRfidIcon,
            path: `/list-rfid/${id}`,
        },
    ], [id]);

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
                    marginLeft: isOpen ? '18%' : '5rem',
                    width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)'
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
                            supervisor={currentLine.supervisor}
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