import { memo, useEffect, type ReactNode } from 'react';

import { createPortal } from 'react-dom';

import { cn } from './sewingBatchTw';



type SewingDetailModalShellProps = {

  open: boolean;

  onClose: () => void;

  labelledBy: string;

  panelClassName?: string;

  heroClassName?: string;

  hero: ReactNode;

  children: ReactNode;

  footerLabel?: string;

};



export const useSewingModalLock = (open: boolean, onClose: () => void) => {

  useEffect(() => {

    if (!open) return;

    const onKey = (e: KeyboardEvent) => {

      if (e.key === 'Escape') onClose();

    };

    document.addEventListener('keydown', onKey);

    const prev = document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    return () => {

      document.removeEventListener('keydown', onKey);

      document.body.style.overflow = prev;

    };

  }, [open, onClose]);

};



export const SewingDetailModalShell = memo(

  ({

    open,

    onClose,

    labelledBy,

    panelClassName = '',

    heroClassName = '',

    hero,

    children,

    footerLabel = 'Detail',

  }: SewingDetailModalShellProps) => {

    useSewingModalLock(open, onClose);

    if (!open) return null;



    return createPortal(

      <div

        className="fixed inset-0 z-[200] flex animate-[fade-in_0.22s_ease] items-center justify-center bg-slate-900/50 p-[clamp(0.65rem,2vh,1.35rem)] backdrop-blur-md motion-reduce:animate-none"

        role="presentation"

        onClick={onClose}

      >

        <div

          className={cn(

            'relative flex max-h-[min(92vh,44rem)] w-full min-w-0 max-w-[34rem] flex-col overflow-hidden rounded-2xl border border-blue-200/95 bg-[#f8fbff]',

            'shadow-[0_24px_60px_rgba(15,23,42,0.22),inset_0_0_0_1px_rgba(255,255,255,0.65)]',

            'animate-[fade-in_0.28s_cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none',

            panelClassName

          )}

          role="dialog"

          aria-modal="true"

          aria-labelledby={labelledBy}

          onClick={(e) => e.stopPropagation()}

        >

          <header className={cn('relative overflow-hidden px-4 pb-3.5 pr-12 pt-4 text-white', heroClassName)}>

            {hero}

          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-3">{children}</div>

          <footer className="flex items-center justify-between gap-2.5 border-t border-blue-100 bg-gradient-to-b from-white to-[#f8fbff] px-3 py-2 max-sm:flex-col max-sm:items-stretch">

            <span className="text-[0.58rem] font-semibold text-slate-400">

              Tekan Esc atau klik di luar untuk menutup

            </span>

            <button

              type="button"

              className="shrink-0 rounded-md border-0 bg-gradient-to-br from-blue-600 to-blue-700 px-3.5 py-1.5 text-[0.68rem] font-extrabold text-white shadow-[0_4px_12px_rgba(37,99,235,0.28)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(37,99,235,0.34)] max-sm:w-full"

              onClick={onClose}

            >

              Tutup {footerLabel}

            </button>

          </footer>

          <button

            type="button"

            className="absolute right-3 top-3 z-[2] flex h-8 w-8 items-center justify-center rounded-md border border-white/35 bg-white/15 text-lg font-bold leading-none text-white transition hover:scale-[1.04] hover:bg-white hover:text-blue-700"

            onClick={onClose}

            aria-label="Tutup"

          >

            ×

          </button>

        </div>

      </div>,

      document.body

    );

  }

);



SewingDetailModalShell.displayName = 'SewingDetailModalShell';



export const operatorInitials = (name: string) =>

  name

    .trim()

    .split(/\s+/)

    .slice(0, 2)

    .map((p) => p[0]?.toUpperCase() ?? '')

    .join('');



export const ModalHeroGlow = () => (

  <div

    className="pointer-events-none absolute -right-[10%] -top-[30%] h-[130%] w-[55%] bg-[radial-gradient(circle,rgba(255,255,255,0.22)_0%,transparent_68%)]"

    aria-hidden

  />

);



export const ModalHeroGrid = () => (

  <div

    className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:1.1rem_1.1rem]"

    aria-hidden

  />

);

