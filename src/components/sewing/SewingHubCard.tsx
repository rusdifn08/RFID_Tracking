import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHIP, cn } from './sewingBatchTw';

export type SewingHubCardData = {
  title: string;
  subtitle: string;
  highlights: string[];
  path: string;
  iconImage?: string;
  icon?: React.ElementType;
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
    icon: Icon,
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
          'group flex min-h-44 cursor-pointer flex-col gap-3 rounded-[1.25rem] border border-slate-200 bg-gradient-to-br p-4 shadow-[0_10px_28px_rgba(16,24,40,0.07)] transition-all duration-200 sm:p-5',
          'from-white to-slate-50 hover:from-blue-600 hover:to-blue-700 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(16,24,40,0.15)]',
          grayed && 'opacity-55 grayscale'
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
          {Icon ? (
            <Icon className="h-10 w-10 text-blue-500 group-hover:text-white transition-colors duration-200 sm:h-12 sm:w-12" aria-hidden />
          ) : iconImage ? (
            <img src={iconImage} alt="" className="h-11 w-11 object-contain sm:h-14 sm:w-14" aria-hidden />
          ) : null}
        </div>
        <div>
          <h3 className="m-0 text-base font-extrabold tracking-tight text-blue-600 group-hover:text-white sm:text-lg">{title}</h3>
          <p className="m-0 mt-0.5 text-[0.78rem] leading-snug text-slate-500 group-hover:text-blue-100">{subtitle}</p>
        </div>
      </article>
    );
  }
);

SewingHubCard.displayName = 'SewingHubCard';

export default SewingHubCard;
