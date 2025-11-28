import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import RFIDLineContent from '../components/RFIDLineContent';
import { useSidebar } from '../context/SidebarContext';

export default function MonitoringRFID() {
    const { isOpen } = useSidebar();

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out"
                style={{ marginLeft: isOpen ? '15%' : '5rem', width: isOpen ? 'calc(100% - 15%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Content - Full page dengan scrolling */}
                <main
                    className="flex-1 w-full overflow-y-auto bg-gray-50"
                    style={{
                        marginTop: '4rem', // 64px untuk header (h-16 = 4rem)
                        padding: '0.5rem',
                        paddingRight: '0.5rem',
                        height: 'calc(100vh - 4rem)',
                        maxHeight: 'calc(100vh - 4rem)',
                    }}
                >
                    <RFIDLineContent />
                </main>
            </div>
        </div >
    );
}

