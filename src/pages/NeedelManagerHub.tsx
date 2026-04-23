import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Breadcrumb from '../components/Breadcrumb';
import Footer from '../components/Footer';
import { useSidebar } from '../context/SidebarContext';
import backgroundImage from '../assets/background.jpg';
import cardNeedel from '../assets/card_needel.webp';
import cardKolam from '../assets/card_kolam.webp';
import { LayoutGrid } from 'lucide-react';

type HubCard = {
  id: number;
  title: string;
  subtitle: string;
  to: string;
  artSrc: string;
  artAlt: string;
  gradient: string;
  bar: string;
};

const cards: HubCard[] = [
  {
    id: 1,
    title: 'Needel Manager',
    subtitle: 'Monitoring picking and putting needle',
    to: '/needel-manager/monitoring',
    artSrc: cardNeedel,
    artAlt: 'Needle Manager',
    gradient: 'from-violet-400 to-purple-700',
    bar: 'from-violet-400 to-purple-700',
  },
  {
    id: 2,
    title: 'Dashboard Mesin Kolam',
    subtitle: 'Cek stok mesin & quantity (stock needle)',
    to: '/needel-manager/mesin-kolam',
    artSrc: cardKolam,
    artAlt: 'Dashboard Kolam',
    gradient: 'from-sky-400 to-indigo-700',
    bar: 'from-sky-400 to-indigo-600',
  },
];

export default function NeedelManagerHub() {
  const { isOpen } = useSidebar();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div
      className="flex min-h-screen w-full h-screen fixed inset-0 m-0 p-0"
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
        style={{
          marginLeft: isOpen ? '18%' : '5rem',
          width: isOpen ? 'calc(100% - 18%)' : 'calc(100% - 5rem)',
        }}
      >
        <Header />
        <Breadcrumb />
        <main
          className="flex-1 w-full overflow-y-auto relative"
          style={{
            padding: 'clamp(0.5rem, 2vw, 2rem) clamp(0.5rem, 3vw, 1rem)',
            paddingTop: '0.75rem',
            paddingBottom: '4rem',
          }}
        >
          <div className="w-full max-w-5xl mx-auto pt-2">
            <p className="text-center text-[clamp(0.65rem,0.8vw,0.75rem)] font-semibold uppercase tracking-widest text-violet-600 mb-1">
              Needle Module
            </p>
            <h1 className="text-center text-[clamp(1.1rem,2.2vw,1.6rem)] font-extrabold text-slate-900 mb-8">
              Pilih modul Needle
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {cards.map((c, index) => {
                const isCardHover = hovered === c.id;
                return (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(c.to)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' ? navigate(c.to) : null)}
                    onMouseEnter={() => setHovered(c.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`
                      group relative bg-white rounded-2xl md:rounded-3xl border border-slate-100
                      shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)]
                      cursor-pointer flex flex-col transition-all duration-500
                      hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]
                      overflow-hidden
                    `}
                    style={{
                      animationDelay: `${index * 100}ms`,
                      aspectRatio: '5/3',
                      minHeight: 'clamp(120px, 24vh, 240px)',
                      padding: 'clamp(0.75rem, 2vw, 1.25rem)',
                    }}
                  >
                    <div
                      className={`absolute top-0 left-0 w-full h-1.5 sm:h-2 bg-gradient-to-r ${c.bar} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
                    />
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 pointer-events-none rounded-2xl md:rounded-3xl`}
                    />
                    <div className="flex flex-col items-center justify-center w-full flex-1 gap-2 sm:gap-3">
                      <div
                        className="relative flex w-full max-w-[min(100%,9.5rem)] items-center justify-center transition-transform duration-500 group-hover:scale-[1.03]"
                        style={{
                          width: 'clamp(4.25rem, 15vw, 7rem)',
                          aspectRatio: '1 / 1',
                        }}
                      >
                        <img
                          src={c.artSrc}
                          alt={c.artAlt}
                          className="h-full w-full max-h-[7rem] object-contain object-center drop-shadow-md"
                          draggable={false}
                        />
                      </div>
                      <h2
                        className="font-bold text-center text-slate-900 w-full"
                        style={{
                          fontSize: 'clamp(0.95rem, 1.8vw, 1.5rem)',
                          lineHeight: 1.3,
                          color: isCardHover ? '#1e293b' : '#0f172a',
                        }}
                      >
                        {c.title}
                      </h2>
                      <p
                        className="text-slate-500 text-center w-full"
                        style={{ fontSize: 'clamp(0.65rem, 1.1vw, 0.8rem)', lineHeight: 1.45 }}
                      >
                        {c.subtitle}
                      </p>
                      <span
                        className="inline-flex items-center gap-1.5 text-[clamp(0.6rem,0.95vw,0.7rem)] font-semibold text-violet-600 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-8 transition-all duration-300"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Buka
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
