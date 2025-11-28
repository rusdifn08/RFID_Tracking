import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import HomeContent from '../components/HomeContent';
import { useSidebar } from '../context/SidebarContext';

export default function Home() {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-white">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full min-h-screen"
                style={{ marginLeft: isOpen ? '15%' : '5rem', width: isOpen ? 'calc(100% - 15%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Content - dengan margin untuk header fixed (h-16 = 64px) dan padding untuk spacing */}
                <main
                    className="flex-1 w-full overflow-y-auto bg-gray-50 pt-8 pb-8 px-6 md:px-8 lg:px-10"
                    style={{
                        marginTop: "1rem" // 64px untuk header (h-16 = 4rem)
                    }}
                >
                    <HomeContent />
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center w-full">

                </footer>
            </div>
        </div>
    );
}

