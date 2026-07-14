import { memo } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import backgroundImage from '../assets/background.jpg';
import DynamicEmbed from '../components/DynamicEmbed';

const MonitoringMachine = memo(() => {
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
                     <DynamicEmbed 
                         baseUrl="http://10.5.0.8:5173" 
                         prefix="/monitoring-machine" 
                     />
                </main>
            </div>
        </div>
    );
});

MonitoringMachine.displayName = 'MonitoringMachine';

export default MonitoringMachine;
