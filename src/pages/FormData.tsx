import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';

export default function FormData() {
  const { isOpen } = useSidebar();

  return (
    <div
      className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0 font-poppins selection:bg-indigo-100 selection:text-indigo-900"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <Sidebar />
      <div
        className="flex flex-col w-full min-h-screen transition-all duration-300 ease-in-out relative"
        style={{ marginLeft: isOpen ? '18%' : '5rem', width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)' }}
      >
        <Header />
        <main
          className="flex-1 w-full overflow-y-auto relative flex items-center justify-center"
          style={{
            padding: 'clamp(0.5rem, 2vw, 2rem) clamp(0.5rem, 3vw, 1rem)',
            paddingTop: 'clamp(4rem, 8vh, 6rem)',
            paddingBottom: '5rem',
          }}
        >
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-800">
            BELOM ADA FORMAT DATA YANG DIKIRIM
          </h1>
        </main>
        <Footer />
      </div>
    </div>
  );
}
