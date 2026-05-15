import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';

/** Sama dengan breakpoint `lg` Tailwind — layout sidebar sempit di bawah ini. */
const SIDEBAR_LAYOUT_LG_PX = 1024;

function applySidebarLayoutCss(isOpen: boolean) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const mobile = window.innerWidth < SIDEBAR_LAYOUT_LG_PX;
    if (mobile) {
        if (isOpen) {
            root.style.setProperty('--layout-sidebar-offset', '13rem');
            root.style.setProperty('--layout-sidebar-width', 'calc(100% - 13rem)');
        } else {
            root.style.setProperty('--layout-sidebar-offset', '3.5rem');
            root.style.setProperty('--layout-sidebar-width', 'calc(100% - 3.5rem)');
        }
    } else if (isOpen) {
        root.style.setProperty('--layout-sidebar-offset', '18%');
        root.style.setProperty('--layout-sidebar-width', 'calc(100% - 18%)');
    } else {
        root.style.setProperty('--layout-sidebar-offset', '5rem');
        root.style.setProperty('--layout-sidebar-width', 'calc(100% - 5rem)');
    }
}

interface SidebarContextType {
    isOpen: boolean;
    toggleSidebar: () => void;
    closeSidebar: () => void;
    openSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    // Default: selalu tertutup (tidak auto terbuka)
    const [isOpen, setIsOpen] = useState(false);

    useLayoutEffect(() => {
        applySidebarLayoutCss(isOpen);
    }, [isOpen]);

    useEffect(() => {
        const onResize = () => applySidebarLayoutCss(isOpen);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [isOpen]);

    // Auto-close sidebar setelah beberapa menit tidak ada aktivitas
    useEffect(() => {
        if (!isOpen) return; // Hanya aktif jika sidebar terbuka

        let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
        const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3 menit dalam milliseconds

        const resetTimer = () => {
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }
            inactivityTimer = setTimeout(() => {
                setIsOpen(false);
            }, INACTIVITY_TIMEOUT);
        };

        // Event listeners untuk aktivitas user
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        events.forEach(event => {
            window.addEventListener(event, resetTimer, { passive: true });
        });

        // Start timer saat sidebar terbuka
        resetTimer();

        // Cleanup
        return () => {
            if (inactivityTimer) {
                clearTimeout(inactivityTimer);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [isOpen]);

    const toggleSidebar = () => {
        setIsOpen(prev => !prev);
    };

    const closeSidebar = () => {
        setIsOpen(false);
    };

    const openSidebar = () => {
        setIsOpen(true);
    };

    return (
        <SidebarContext.Provider value={{ isOpen, toggleSidebar, closeSidebar, openSidebar }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

