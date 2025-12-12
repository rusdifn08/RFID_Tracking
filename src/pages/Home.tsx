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
                    className="flex-1 w-full overflow-y-auto pt-8 pb-8 px-6 md:px-8 lg:px-10"
                    style={{
                        marginTop: "1rem" // 64px untuk header (h-16 = 4rem)
                    }}
                >
                    <HomeContent />
                </main>

                {/* Footer */}
                <footer className="w-full py-4 border-t border-gray-200 relative" style={{ zIndex: -1 }}>
                    <div className="text-center text-gray-600 text-sm" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 400 }}>
                        Gistex Garmen Indonesia Monitoring System (GMS) © 2025 Served by Supernova
                    </div>
                </footer>
            </div>
        </div>
    );
}

