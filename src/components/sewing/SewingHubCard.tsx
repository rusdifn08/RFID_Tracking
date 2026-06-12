import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHIP, cn } from './sewingBatchTw';

export type SewingHubCardData = {
  title: string;
  subtitle: string;
  highlights: string[];
  path: string;
  iconImage?: string;
  tone?: 'blue' | 'orange' | 'green' | 'purple';
};

type SewingHubCardProps = SewingHubCardData & {
  isHovered: boolean;
  isOtherHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

const hubTagTone: Record<string, string> = {
  blue: CHIP.blue,
  orange: CHIP.orange,
  green: CHIP.green,
  purple: CHIP.purple,
};

const SewingHubCard = memo(
  ({
    title,
    subtitle,
    highlights,
    path,
    iconImage,
    tone = 'blue',
    isHovered,
    isOtherHovered,
    onMouseEnter,
    onMouseLeave,
  }: SewingHubCardProps) => {
    const navigate = useNavigate();
    const grayed = isOtherHovered && !isHovered;

    return (
      <article
        className={cn(
          'flex min-h-44 cursor-pointer flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-[0_10px_28px_rgba(16,24,40,0.07)] transition-[transform,box-shadow,opacity] duration-200 sm:p-5',
          'hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(16,24,40,0.1)]',
          grayed && 'opacity-55'
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={() => navigate(path)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(path);
          }
        }}
      >
        <div className="flex items-start justify-between gap-2">
          {iconImage ? (
            <img src={iconImage} alt="" className="h-11 w-11 object-contain sm:h-14 sm:w-14" aria-hidden />
          ) : null}
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[0.72rem] font-bold', CHIP.blue)}>
            Buka modul
          </span>
        </div>
        <div>
          <h3 className="m-0 text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">{title}</h3>
          <p className="m-0 mt-0.5 text-[0.78rem] leading-snug text-slate-500">{subtitle}</p>
        </div>
        <div className="mt-auto flex flex-wrap gap-1.5">
          {highlights.map((tag) => (
            <span
              key={tag}
              className={cn('rounded-full px-2 py-0.5 text-[0.68rem] font-bold', hubTagTone[tone] ?? CHIP.blue)}
            >
              {tag}
            </span>
          ))}
        </div>
      </article>
    );
  }
);

SewingHubCard.displayName = 'SewingHubCard';

export default SewingHubCard;
