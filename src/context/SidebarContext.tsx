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
    // Default: terbuka di desktop (>= 1024px), tertutup di mobile
    const [isOpen, setIsOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth >= 728;
        }
        return true;
    });

    // Update state saat window resize
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 728) {
                setIsOpen(true);
            } else {
                setIsOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

