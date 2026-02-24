import { memo } from 'react';

interface CardProps {
 title: string;
 icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
 children: React.ReactNode;
 className?: string;
 action?: React.ReactNode;
 iconColor?: string;
 compactBody?: boolean; // Untuk mengurangi padding body di Dashboard All Finishing
}

export const Card = memo(({ title, icon: Icon, children, className = '', action, iconColor = 'text-sky-600', compactBody = false }: CardProps) => {
 return (
  <div className={`
    bg-white rounded-xl shadow-[0_2px_10px_-4px_rgba(6,182,212,0.1)] border border-slate-100 
    flex flex-col overflow-hidden h-full min-h-0 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-200
    ${className}
  `}>
   <div className={`${compactBody ? 'px-3 py-2' : 'px-4 py-3'} border-b border-slate-50 flex items-center justify-between shrink-0 bg-white`}>
    <div className="flex items-center gap-2.5 text-slate-700">
     <div className={`p-1.5 bg-slate-50 rounded-lg border border-slate-100 ${iconColor}`}>
      <Icon className="w-4 h-4" />
     </div>
     <h3 className="font-semibold text-xs sm:text-xs md:text-base tracking-tight">{title}</h3>
    </div>
    {action && <div>{action}</div>}
   </div>
   <div className={`${compactBody ? 'px-0 pb-0' : 'px-4 pb-4'} flex-1 min-h-0 relative flex flex-col bg-white overflow-hidden`}>{children}</div>
  </div>
 );
});

Card.displayName = 'Card';
