import { memo, type ReactNode } from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import Footer from '../Footer';
import backgroundImage from '../../assets/background.jpg';

type SewingPageShellProps = {
  children: ReactNode;
  /** Satu layar penuh tanpa scroll vertikal (dashboard lama) */
  fullPage?: boolean;
  /** Konten scrollable dengan layout modern (dashboard revamp) */
  scrollable?: boolean;
};

const SewingPageShell = memo(({ children, fullPage = false, scrollable = false }: SewingPageShellProps) => (
  <div
    className="fixed inset-0 m-0 flex h-screen w-full p-0"
    style={
      scrollable
        ? undefined
        : {
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed',
          }
    }
  >
    <div className="fixed left-0 top-0 z-50 h-full shadow-xl">
      <Sidebar />
    </div>
    <div
      className="flex h-screen min-h-0 w-full flex-col overflow-hidden"
      style={{ marginLeft: 'var(--layout-sidebar-offset)', width: 'var(--layout-sidebar-width)' }}
    >
      <Header />
      <main
        className={`flex min-h-0 flex-1 flex-col pt-12 xs:pt-14 sm:pt-16 ${
          fullPage
            ? 'overflow-hidden'
            : scrollable
              ? 'overflow-x-hidden overflow-y-auto overscroll-y-contain'
              : 'overflow-x-hidden overflow-y-auto overscroll-y-contain'
        }`}
      >
        <div
          className={`flex min-h-0 flex-1 flex-col font-sans text-slate-900 ${
            scrollable
              ? 'min-h-full bg-slate-50'
              : fullPage
                ? 'h-full overflow-hidden bg-slate-50'
                : 'min-h-full bg-gradient-to-b from-[#f8fbff] to-[#eef4fc]'
          }`}
        >
          {children}
        </div>
      </main>
      {!fullPage && !scrollable ? <Footer /> : null}
    </div>
  </div>
));

SewingPageShell.displayName = 'SewingPageShell';

export default SewingPageShell;
