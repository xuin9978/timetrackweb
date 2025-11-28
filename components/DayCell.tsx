
import React from 'react';
import { DayData } from '../types';
import { formatDayNumber } from '../utils/dateUtils';

interface DayCellProps {
  day: DayData;
  onClick: (date: Date) => void;
}

const DayCell: React.FC<DayCellProps> = React.memo(({ day, onClick }) => {
  const { date, isCurrentMonth, isToday, isSelected, events } = day;

  return (
    <button
      onClick={() => onClick(date)}
      className={`
        relative w-full h-full flex flex-col items-center justify-start pt-2 transition-all duration-200 group
        ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
        ${!isSelected && !isToday ? 'hover:bg-gray-50' : ''}
      `}
    >
      {/* Today Indicator (always red) */}
      {isToday && (
        <div className="absolute top-1 w-8 h-8 rounded-full bg-red-500 -z-10" />
      )}
      
      {/* Selection Indicator (black, only if not today) */}
      {isSelected && !isToday && (
        <div className="absolute top-1 w-8 h-8 rounded-full bg-black -z-10" />
      )}

      <span className={`
        text-sm font-medium transition-colors duration-200 z-10 w-8 h-8 flex items-center justify-center
        ${isToday || isSelected ? 'text-white' : 'text-gray-900'}
      `}>
        {formatDayNumber(date)}
      </span>

      {/* Event Indicators (Dots) */}
      <div className="flex gap-1 mt-1 sm:mt-2">
        {events.slice(0, 4).map((_, idx) => (
          <div 
            key={idx} 
            className={`
              w-1 h-1 rounded-full 
              ${isSelected || isToday ? 'bg-white/50' : 'bg-gray-400'}
            `} 
          />
        ))}
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  const prevDay = prevProps.day;
  const nextDay = nextProps.day;

  // Compare simple properties
  if (
    prevDay.date.getTime() !== nextDay.date.getTime() ||
    prevDay.isCurrentMonth !== nextDay.isCurrentMonth ||
    prevDay.isToday !== nextDay.isToday ||
    prevDay.isSelected !== nextDay.isSelected
  ) {
    return false;
  }

  // Compare events array
  if (prevDay.events.length !== nextDay.events.length) {
    return false;
  }

  // Compare event items (assuming event objects are stable if not changed)
  for (let i = 0; i < prevDay.events.length; i++) {
    if (prevDay.events[i] !== nextDay.events[i]) {
      return false;
    }
  }

  // We intentionally ignore onClick changes if the day data is the same.
  // This assumes that the onClick handler's closure relevance is tied to the day data
  // or that the parent will trigger a re-render if something significant changes (like viewMode)
  // which would regenerate calendarData and thus change the day prop.
  return true;
});

export default DayCell;
