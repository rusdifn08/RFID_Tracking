import { memo } from 'react';
import excelIcon from '../../../assets/excel.png';

interface ExportButtonProps {
  onClick: () => void;
  className?: string;
}

export const ExportButton = memo(({ onClick, className = '' }: ExportButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center justify-center
        w-9 h-8 rounded-md
        bg-green-500 hover:bg-green-600
        text-white
        transition-all duration-200 ease-out
        shadow-sm hover:shadow
        active:scale-95
        ${className}
      `}
      title="Export"
      aria-label="Export"
    >
      <img 
        src={excelIcon} 
        alt="Export Excel" 
        className="w-5 h-5 object-contain"
      />
    </button>
  );
});

ExportButton.displayName = 'ExportButton';
