import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface DashboardData {
    good: number;
    rework: number;
    reject: number;
    wiraQc: number;
    pqcGood: number;
    pqcRework: number;
    pqcReject: number;
    wiraPqc: number;
    outputLine: number;
    woData: any | null;
}

interface DashboardState extends DashboardData {
    // Actions untuk update data
    updateDashboardData: (data: Partial<DashboardData>) => void;
    resetDashboardData: () => void;
    
    // Modal states
    showExportModal: boolean;
    setShowExportModal: (show: boolean) => void;
    showDateFilterModal: boolean;
    setShowDateFilterModal: (show: boolean) => void;
    
    // Filter states
    filterDateFrom: string;
    setFilterDateFrom: (date: string) => void;
    filterDateTo: string;
    setFilterDateTo: (date: string) => void;
    filterWo: string;
    setFilterWo: (wo: string) => void;
}

const initialState: DashboardData = {
    good: 0,
    rework: 0,
    reject: 0,
    wiraQc: 0,
    pqcGood: 0,
    pqcRework: 0,
    pqcReject: 0,
    wiraPqc: 0,
    outputLine: 0,
    woData: null,
};

export const useDashboardStore = create<DashboardState>()(
    subscribeWithSelector((set) => ({
        ...initialState,
        
        // Actions
        updateDashboardData: (data) => set((state) => ({
            ...state,
            ...data,
        })),
        
        resetDashboardData: () => set({
            ...initialState,
        }),
        
        // Modal states
        showExportModal: false,
        setShowExportModal: (show) => set({ showExportModal: show }),
        
        showDateFilterModal: false,
        setShowDateFilterModal: (show) => set({ showDateFilterModal: show }),
        
        // Filter states
        filterDateFrom: '',
        setFilterDateFrom: (date) => set({ filterDateFrom: date }),
        
        filterDateTo: '',
        setFilterDateTo: (date) => set({ filterDateTo: date }),
        
        filterWo: '',
        setFilterWo: (wo) => set({ filterWo: wo }),
    }))
);

// Selector untuk mencegah re-render yang tidak perlu
export const selectDashboardData = (state: DashboardState) => ({
    good: state.good,
    rework: state.rework,
    reject: state.reject,
    wiraQc: state.wiraQc,
    pqcGood: state.pqcGood,
    pqcRework: state.pqcRework,
    pqcReject: state.pqcReject,
    wiraPqc: state.wiraPqc,
    outputLine: state.outputLine,
    woData: state.woData,
});

export const selectModalStates = (state: DashboardState) => ({
    showExportModal: state.showExportModal,
    showDateFilterModal: state.showDateFilterModal,
});

export const selectFilterStates = (state: DashboardState) => ({
    filterDateFrom: state.filterDateFrom,
    filterDateTo: state.filterDateTo,
    filterWo: state.filterWo,
});

