import { memo } from 'react';
import outputIcon from '../../../assets/output.png';

interface OutputSewingCardProps {
 outputLine: number;
 onClick?: () => void;
}

const OutputSewingCard = memo(({ outputLine, onClick }: OutputSewingCardProps) => {
 return (
  <div
   className="bg-white rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl flex flex-col shadow-sm relative overflow-hidden transition-all duration-300 hover:shadow-lg group border border-blue-500 h-full"
   style={{
    padding: 'clamp(0.25rem, 0.6vw + 0.15rem, 0.75rem)'
   }}
  >
  <div
   className="relative flex flex-col items-center justify-center h-full w-full bg-transparent rounded-lg xs:rounded-xl sm:rounded-xl md:rounded-2xl transition-all duration-300 ease-out transform hover:-translate-y-1 cursor-pointer"
   onClick={onClick}
  >
    {/* Satu blok: icon + teks + nilai di-center bersamaan; jarak antar elemen konstan */}
    <div
     className="flex flex-col items-center justify-center"
     style={{ gap: 'clamp(0.375rem, 0.6vw + 0.2rem, 0.75rem)' }}
    >
     <div className="flex items-center justify-center flex-shrink-0">
      <img
       src={outputIcon}
       alt="Output Sewing"
       style={{
        width: 'clamp(28px, 3.5vw + 12px, 80px)',
        height: 'clamp(28px, 3.5vw + 12px, 80px)'
       }}
       className="group-hover:scale-110 transition-transform duration-300 object-contain"
      />
     </div>
     <h3
      className="font-extrabold tracking-widest transition-colors text-center"
      style={{
       color: '#2979ff',
       textTransform: 'uppercase',
       fontSize: 'clamp(0.5rem, 0.9vw + 0.25rem, 1.25rem)'
      }}
     >
      Sewing Output
     </h3>
     <span
      className="font-bold leading-none tracking-tighter transition-all duration-500 ease-in-out transform scale-100 hover:scale-105 text-center"
      style={{
       color: '#2563eb',
       fontSize: 'clamp(1.75rem, 4.5vw + 0.5rem, 5rem)'
      }}
     >
      {outputLine || 0}
     </span>
    </div>
   </div>
  </div>
 );
});

OutputSewingCard.displayName = 'OutputSewingCard';

export default OutputSewingCard;
