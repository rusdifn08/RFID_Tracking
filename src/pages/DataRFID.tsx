import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useSidebar } from '../context/SidebarContext';

export default function DataRFID() {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-white">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex-1 flex flex-col min-h-screen overflow-x-hidden transition-all duration-300 ease-in-out"
                style={{ marginLeft: isOpen ? '16rem' : '0' }}
            >
                {/* Header */}
                <Header />

                {/* Content */}
                <main className="mt-16 flex-1 w-full overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto">
                        <h1 className="text-3xl font-bold text-gray-800 mb-6">Data RFID</h1>
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <p className="text-gray-600">Data RFID content will be here...</p>
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center w-full">
                    <p className="text-sm text-black">
                        Gistex Garmen Indonesia Command Center (GCC) © 2021 Served by Sirius
                    </p>
                </footer>
            </div>
        </div>
    );
}

