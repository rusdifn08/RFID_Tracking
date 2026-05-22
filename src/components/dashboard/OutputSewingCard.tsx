import { memo } from 'react';
import outputIcon from '../../../assets/output.png';
import targetIcon from '../../assets/target.webp';
import { CheckCircle2 } from 'lucide-react';

interface OutputSewingCardProps {
  outputLine: number;
  targetOutput?: number;
  onClick?: () => void;
}

/** Ukuran angka output — 20% lebih kecil dari versi sebelumnya */
const COUNT_FONT_SIZE = 'clamp(1.4rem, 3.6vw + 0.4rem, 4rem)';

const OutputSewingCard = memo(({ outputLine, targetOutput, onClick }: OutputSewingCardProps) => {
  const targetMet = targetOutput !== undefined && targetOutput > 0 && (outputLine || 0) >= targetOutput;

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center justify-center h-full w-full min-h-0 bg-white rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl transition-all duration-300 ease-out transform hover:-translate-y-1 shadow-sm border border-blue-500 hover:shadow-md hover:border-blue-600 group cursor-pointer overflow-visible"
      style={{
        padding: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.75rem)',
      }}
    >
      <div
        className="flex flex-col items-center justify-center flex-1 w-full min-h-0"
        style={{ gap: 'clamp(0.12rem, 0.035vw + 0.1rem, 0.5rem)' }}
      >
        <div className="flex items-center justify-center flex-shrink-0">
          <img
            src={outputIcon}
            alt="Output Sewing"
            style={{
              width: 'clamp(20px, 3vw + 10px, 56px)',
              height: 'clamp(20px, 3vw + 10px, 56px)',
            }}
            className="group-hover:scale-110 transition-transform duration-300 object-contain"
          />
        </div>
        <h3
          className="font-semibold tracking-tight transition-colors text-center text-gray-900 flex-shrink-0"
          style={{
            textTransform: 'none',
            fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)',
            fontWeight: 600,
          }}
        >
          Sewing Output
        </h3>
        <span
          className="font-bold leading-none tracking-tighter transition-all duration-500 ease-in-out transform scale-100 hover:scale-105 text-center text-blue-700 flex-shrink-0"
          style={{
            fontSize: COUNT_FONT_SIZE,
            fontWeight: 700,
          }}
        >
          {outputLine || 0}
        </span>
        {targetOutput !== undefined && targetOutput > 0 && (
          <div
            className={`flex items-center justify-center gap-1 rounded-full px-2 py-0.5 border shrink-0 transition-colors flex-shrink-0 ${
              targetMet
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700'
                : 'bg-slate-100/80 border-slate-300/80 text-slate-600'
            }`}
            style={{ fontSize: 'clamp(0.5625rem, 0.75vw + 0.15rem, 0.75rem)' }}
          >
            <img src={targetIcon} alt="" className="w-3 h-3 flex-shrink-0 object-contain" aria-hidden />
            {targetMet && <CheckCircle2 className="flex-shrink-0" size={12} strokeWidth={2.5} aria-hidden />}
            <span className="font-medium text-gray-600 tracking-tight">Target: {targetOutput}</span>
          </div>
        )}
      </div>
    </div>
  );
});

OutputSewingCard.displayName = 'OutputSewingCard';

export default OutputSewingCard;
