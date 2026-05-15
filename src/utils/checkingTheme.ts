export type CheckingTheme = 'default' | 'cutting';

export const CHECKING_THEME: Record<
    CheckingTheme,
    {
        border: string;
        borderHover: string;
        icon: string;
        iconBg: string;
        inputFocus: string;
        inputHover: string;
        button: string;
        buttonHover: string;
        headerIconBorder: string;
        headerIcon: string;
        statTotalBg: string;
        statTotalBorder: string;
        statTotalText: string;
        modalIconBg: string;
        modalIcon: string;
        modalFooterBtn: string;
        modalFooterBtnHover: string;
        cardHover: string;
        filterBorder: string;
        filterIcon: string;
        filterHover: string;
    }
> = {
    default: {
        border: 'border-blue-500',
        borderHover: 'hover:border-blue-600',
        icon: 'text-blue-500',
        iconBg: 'bg-blue-50',
        inputFocus: 'focus:ring-blue-500 focus:border-blue-500',
        inputHover: 'hover:bg-blue-50',
        button: 'bg-blue-500 hover:bg-blue-600',
        buttonHover: '',
        headerIconBorder: 'border-blue-500',
        headerIcon: 'text-blue-500',
        statTotalBg: 'bg-blue-50',
        statTotalBorder: 'border-blue-300',
        statTotalText: 'text-blue-600',
        modalIconBg: 'bg-blue-100',
        modalIcon: 'text-blue-600',
        modalFooterBtn: 'bg-blue-600 hover:bg-blue-700',
        modalFooterBtnHover: '',
        cardHover: 'hover:from-blue-50 hover:to-blue-100',
        filterBorder: 'border-blue-500',
        filterIcon: 'text-blue-500',
        filterHover: 'hover:bg-blue-500',
    },
    cutting: {
        border: 'border-emerald-500',
        borderHover: 'hover:border-emerald-600',
        icon: 'text-emerald-600',
        iconBg: 'bg-emerald-50',
        inputFocus: 'focus:ring-emerald-500 focus:border-emerald-500',
        inputHover: 'hover:bg-emerald-50',
        button: 'bg-emerald-600 hover:bg-emerald-700',
        buttonHover: '',
        headerIconBorder: 'border-emerald-500',
        headerIcon: 'text-emerald-600',
        statTotalBg: 'bg-emerald-50',
        statTotalBorder: 'border-emerald-300',
        statTotalText: 'text-emerald-700',
        modalIconBg: 'bg-emerald-100',
        modalIcon: 'text-emerald-700',
        modalFooterBtn: 'bg-emerald-600 hover:bg-emerald-700',
        modalFooterBtnHover: '',
        cardHover: 'hover:from-emerald-50 hover:to-emerald-100',
        filterBorder: 'border-emerald-500',
        filterIcon: 'text-emerald-600',
        filterHover: 'hover:bg-emerald-600',
    },
};
