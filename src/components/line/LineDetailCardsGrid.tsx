import { memo, useState, useCallback } from 'react';
import LineDetailCard from './LineDetailCard';
import type { SvgIconComponent } from '@mui/icons-material';

interface Card {
 id: number;
 title: string;
 subtitle: string;
 icon: SvgIconComponent | null;
 iconImage?: string;
 path: string;
}

interface LineDetailCardsGridProps {
 cards: Card[];
}

const LineDetailCardsGrid = memo(({ cards }: LineDetailCardsGridProps) => {
 const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

 const handleMouseEnter = useCallback((id: number) => {
  setHoveredCardId(id);
 }, []);

 const handleMouseLeave = useCallback(() => {
  setHoveredCardId(null);
 }, []);

 return (
  <div className="max-w-6xl mx-auto">
   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
    {cards.map((card) => (
     <LineDetailCard
      key={card.id}
      id={card.id}
      title={card.title}
      subtitle={card.subtitle}
      icon={card.icon}
      iconImage={card.iconImage}
      path={card.path}
      isHovered={hoveredCardId === card.id}
      isOtherHovered={hoveredCardId !== null}
      onMouseEnter={() => handleMouseEnter(card.id)}
      onMouseLeave={handleMouseLeave}
     />
    ))}
   </div>
  </div>
 );
});

LineDetailCardsGrid.displayName = 'LineDetailCardsGrid';

export default LineDetailCardsGrid;

