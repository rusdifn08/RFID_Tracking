import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HomeContent from '../components/HomeContent';
import backgroundImage from '../assets/background.jpg';

export default function Home() {

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
                className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out relative"
                style={{ marginLeft: 'var(--layout-sidebar-offset)', width: 'var(--layout-sidebar-width)' }}
            >
                {/* Header */}
                <Header />

                {/* Content - dengan margin untuk header fixed (h-16 = 64px) dan padding untuk spacing */}
                <main
                    className="flex-1 w-full overflow-y-auto relative"
                    style={{
                        padding: 'clamp(0.5rem, 2vw, 2rem) clamp(0.5rem, 3vw, 1rem)',
                        paddingTop: 'clamp(4rem, 8vh, 6rem)',
                        paddingBottom: '5rem',
                        overflow: 'hidden',
                    }}
                >
                    <HomeContent />
                </main>

                <Footer />
            </div>
        </div>
    );
}

