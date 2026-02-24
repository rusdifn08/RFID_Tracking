import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

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

