import { memo } from 'react';

interface FilterButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  variant?: 'wo' | 'date';
  className?: string;
}

export const FilterButton = memo(({ icon: Icon, label, onClick, variant = 'wo', className = '' }: FilterButtonProps) => {
  const baseStyles = `
    flex items-center justify-center
    w-9 h-8 rounded-md
    transition-all duration-200 ease-out
    shadow-sm hover:shadow
    active:scale-95
    ${variant === 'wo'
      ? 'bg-blue-500 hover:bg-blue-600 text-white'
      : 'bg-purple-500 hover:bg-purple-600 text-white'
    }
    ${className}
  `;

  return (
    <button
      onClick={onClick}
      className={baseStyles}
      title={label}
      aria-label={label}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
});

FilterButton.displayName = 'FilterButton';
