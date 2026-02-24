import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import RFIDLineContent from '../components/RFIDLineContent';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';

export default function MonitoringRFID() {
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
                className="flex flex-col w-full min-h-screen relative"
                style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
            >
                {/* Header */}
                <Header />

                {/* Breadcrumb */}
                <Breadcrumb />

                {/* Content - Full page dengan scrolling */}
                <main
                    className="flex-1 w-full overflow-y-auto relative"
                    style={{
                        padding: '1rem',
                        paddingRight: '1rem',
                        paddingLeft: '1rem',
                        paddingTop: '0.5rem',
                        paddingBottom: '5rem', // Tambah padding bottom untuk footer
                        marginTop: '0',
                    }}
                >
                    <RFIDLineContent />
                </main>

                <Footer />
            </div>
        </div >
    );
}

