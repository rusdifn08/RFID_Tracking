import { memo, useCallback } from 'react';
import SewingPageShell from '../../components/sewing/SewingPageShell';
import { CAT_DOT, cn, ID_CHIP, ID_LEGEND, type CategoryKind } from '../../components/sewing/sewingBatchTw';
import identityData from '../../data/sewing/sewing-rfid-identity.json';

type FlowStep = (typeof identityData.flowSteps)[number];
type RfidCard = (typeof identityData.rfidCards)[number];

const dotToCat = (dot: FlowStep['dot']): CategoryKind => {
  if (dot === 'purple') return 'sewing';
  if (dot === 'orange') return 'qc';
  if (dot === 'green') return 'assembly';
  return 'helper';
};

const chipToCat = (tone: RfidCard['chipTone']): CategoryKind => {
  if (tone === 'purple') return 'sewing';
  if (tone === 'orange') return 'qc';
  if (tone === 'green') return 'assembly';
  return 'helper';
};

const categoryLabel: Record<CategoryKind, string> = {
  helper: 'Helper',
  sewing: 'Sewing',
  qc: 'QC',
  assembly: 'Assembly',
};

const flowStepBorder: Record<CategoryKind, string> = {
  helper: 'before:bg-blue-600',
  sewing: 'before:bg-violet-500',
  qc: 'before:bg-amber-500',
  assembly: 'before:bg-green-500',
};

const SewingRfidIdentityPage = memo(() => {
  const { hero, flowSteps, rfidCards, hubCard } = identityData;

  const copyCode = useCallback((text: string) => {
    void navigator.clipboard?.writeText(text);
  }, []);

  return (
    <SewingPageShell fullPage>
      <div className="box-border grid h-full max-w-full grid-rows-[auto_auto_minmax(0,1fr)] gap-[clamp(0.3rem,0.75vh,0.5rem)] overflow-hidden px-[clamp(0.45rem,1.1vw,0.75rem)] py-[clamp(0.35rem,0.9vh,0.65rem)] max-[900px]:h-auto max-[900px]:min-h-full max-[900px]:overflow-visible max-[900px]:grid-rows-[auto_auto_minmax(0,auto)]">
        <header
          className="relative shrink-0 overflow-hidden rounded-xl border border-blue-200 bg-gradient-to-br from-[#1e4d9c] via-blue-600 to-blue-500 px-4 py-3 text-white shadow-[0_6px_22px_rgba(37,99,235,0.2)] sm:px-5 sm:py-4"
          aria-labelledby="sd-id-title"
        >
          <div
            className="pointer-events-none absolute -right-[20%] -top-[40%] h-[140%] w-[55%] animate-[pulse_8s_ease-in-out_infinite_alternate] bg-[radial-gradient(circle,rgba(255,255,255,0.22)_0%,transparent_68%)] motion-reduce:animate-none"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:1.25rem_1.25rem]"
            aria-hidden
          />
          <div className="relative z-[1] max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-white/90">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white animate-pulse motion-reduce:animate-none" aria-hidden />
              {hero.eyebrow}
            </span>
            <h1 id="sd-id-title" className="m-0 mt-2 text-[clamp(1rem,2.2vh,1.35rem)] font-black leading-tight tracking-tight">
              {hero.title}
            </h1>
            <p className="m-0 mt-1.5 text-[clamp(0.68rem,1.2vh,0.82rem)] leading-relaxed text-white/85">{hero.subtitle}</p>
          </div>
        </header>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 max-[900px]:flex-col max-[900px]:items-stretch">
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Ringkasan modul">
            {hubCard.highlights.map((label) => {
              const match = label.match(/^(\d+)\s+(.+)$/);
              return (
                <li
                  key={label}
                  className="min-w-[5.5rem] rounded-lg border border-blue-200 bg-white px-3 py-2 text-center shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <span className="block text-lg font-black text-blue-600">{match ? match[1] : '✓'}</span>
                  <span className="mt-0.5 block text-[0.58rem] font-bold uppercase tracking-wide text-slate-500">
                    {match ? match[2] : label}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3" aria-label="Legenda kategori">
            {(Object.keys(categoryLabel) as CategoryKind[]).map((kind) => (
              <span key={kind} className={cn('inline-flex items-center gap-1 text-sm font-bold', ID_LEGEND[kind])}>
                <span
                  className={cn('h-2 w-2 shrink-0 rounded-full border border-white shadow-sm', CAT_DOT[kind])}
                  aria-hidden
                />
                {categoryLabel[kind]}
              </span>
            ))}
          </div>
        </div>

        <section
          className="min-h-0 flex-1 overflow-auto rounded-xl border border-blue-200 bg-white/90 p-[clamp(0.35rem,0.8vh,0.55rem)] shadow-inner max-[900px]:min-h-[min(70vh,36rem)] max-[900px]:flex-none"
          aria-label="Konten RFID Identity"
        >
          <div className="grid h-full min-h-0 grid-cols-2 gap-3 max-[1100px]:grid-cols-1">
            <section className="flex min-h-0 flex-col rounded-lg border border-blue-200 bg-[#f8fbff] p-3">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="m-0 text-sm font-extrabold text-blue-900">Alur RFID dari Cutting ke Sewing</h2>
                  <p className="m-0 mt-1 text-[0.68rem] leading-relaxed text-slate-500">
                    Konsep utama: RFID per pcs dibuat sejak Cutting, lalu tag mengikuti panel terbesar sampai final sewing.
                  </p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.58rem] font-extrabold', ID_CHIP.helper)}>
                  GCC → RFID → Sewing
                </span>
              </div>
              <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(9rem,1fr))] gap-2 overflow-auto">
                {flowSteps.map((step, idx) => {
                  const cat = dotToCat(step.dot);
                  return (
                    <article
                      key={step.no}
                      className={cn(
                        'relative min-h-[6.5rem] overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 transition hover:border-blue-200 hover:shadow-md',
                        'animate-[fade-in_0.55s_ease_both] motion-reduce:animate-none',
                        'before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:content-[""]',
                        flowStepBorder[cat]
                      )}
                      style={{ animationDelay: `${0.04 + idx * 0.03}s` }}
                    >
                      <span className="absolute right-2 top-1 text-2xl font-black text-slate-900/5">{step.no}</span>
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded bg-blue-600 text-[0.62rem] font-black text-white">
                        {step.no}
                      </span>
                      <span
                        className={cn('ml-1 inline-block h-2 w-2 align-middle rounded-full', CAT_DOT[cat])}
                        title={categoryLabel[cat]}
                        aria-hidden
                      />
                      <h3 className="relative mt-1 text-[0.78rem] font-extrabold leading-snug text-blue-900">{step.title}</h3>
                      <p className="relative m-0 mt-1 text-[0.68rem] leading-snug text-slate-500">{step.desc}</p>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="flex min-h-0 flex-col rounded-lg border border-blue-200 bg-[#f8fbff] p-3">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="m-0 text-sm font-extrabold text-blue-900">RFID Identity Model</h2>
                  <p className="m-0 mt-1 text-[0.68rem] leading-relaxed text-slate-500">
                    Contoh ID untuk traceability bundle reference, route batch, dan RFID per pcs dari Cutting.
                  </p>
                </div>
                <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[0.58rem] font-extrabold', ID_CHIP.assembly)}>
                  Traceable
                </span>
              </div>
              <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-2 overflow-auto">
                {rfidCards.map((card, idx) => {
                  const cat = chipToCat(card.chipTone);
                  return (
                    <article
                      key={card.title}
                      className={cn(
                        'relative overflow-hidden rounded-xl border border-blue-100 bg-white p-3 transition hover:border-blue-300 hover:shadow-md',
                        'animate-[fade-in_0.55s_ease_both] motion-reduce:animate-none',
                        'after:pointer-events-none after:absolute after:inset-0 after:bg-gradient-to-br after:from-blue-500/0 after:to-blue-500/5 after:opacity-0 after:transition hover:after:opacity-100'
                      )}
                      style={{ animationDelay: `${0.08 + idx * 0.05}s` }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className={cn('rounded-full px-2 py-0.5 text-[0.58rem] font-extrabold', ID_CHIP[cat])}>
                          {card.chip}
                        </span>
                        <span className={cn('h-2 w-2 shrink-0 rounded-full', CAT_DOT[cat])} aria-hidden />
                      </div>
                      <h3 className="mt-2 text-[0.85rem] font-extrabold text-blue-900">{card.title}</h3>
                      <p className="m-0 mt-1 text-[0.65rem] text-slate-500">{card.foot}</p>
                      <div className="mt-2 flex flex-wrap items-stretch gap-1">
                        <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-900 px-2 py-1.5 font-mono text-[0.62rem] text-green-200">
                          {card.code}
                        </code>
                        <button
                          type="button"
                          className="shrink-0 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[0.62rem] font-bold text-blue-700 transition hover:bg-blue-100 active:scale-95"
                          onClick={() => copyCode(card.code)}
                          title="Salin kode RFID"
                          aria-label={`Salin ${card.title}`}
                        >
                          Salin
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      </div>
    </SewingPageShell>
  );
});

SewingRfidIdentityPage.displayName = 'SewingRfidIdentityPage';

export default SewingRfidIdentityPage;
