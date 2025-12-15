import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import HomeContent from '../components/HomeContent';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';

export default function Home() {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundAttachment: 'fixed',
            }}
        >
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full min-h-screen"
                style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Content - dengan margin untuk header fixed (h-16 = 64px) dan padding untuk spacing */}
                <main
                    className="flex-1 w-full overflow-y-auto pt-4 xs:pt-6 sm:pt-8 pb-4 xs:pb-6 sm:pb-8 px-2 xs:px-3 sm:px-4 md:px-6 lg:px-8 xl:px-10"
                    style={{
                        marginTop: "clamp(0.5rem, 2vh, 1rem)"
                    }}
                >
                    <HomeContent />
                </main>

                {/* Footer */}
                <footer className="w-full py-2 xs:py-3 sm:py-4 border-t border-gray-200 relative" style={{ zIndex: -1 }}>
                    <div className="text-center text-gray-600 text-[10px] xs:text-xs sm:text-sm px-2" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        Gistex Garmen Indonesia Monitoring System (GMS) © 2025 Served by Supernova
                    </div>
                </footer>
            </div>
        </div>
    );
}

