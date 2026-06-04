
import React from 'react';
import { CalendarEvent, DayData, Tag } from '../types';
import { formatDayNumber, getTagColorHex, getTagColorRgba } from '../utils/dateUtils';

interface DayCellProps {
  day: DayData;
  onClick: (date: Date) => void;
  tags: Tag[];
  onEventClick: (event: CalendarEvent) => void;
}

const DayCell: React.FC<DayCellProps> = React.memo(({ day, onClick, tags, onEventClick }) => {
  const { date, isCurrentMonth, isToday, isSelected, events } = day;
  const visibleEvents = events.slice(0, 2);
  const overflowCount = Math.max(0, events.length - visibleEvents.length);
  const getTag = (categoryId: string) => tags.find(tag => tag.id === categoryId);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(date)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick(date);
        }
      }}
      className={`
        day-cell relative w-full h-full flex flex-col items-center justify-start pt-2 transition-all duration-200 group
        ${isToday ? 'is-today' : ''}
        ${isSelected ? 'is-selected' : ''}
        ${isCurrentMonth ? 'is-current-month' : 'is-outside-month'}
        ${!isCurrentMonth ? 'opacity-30' : 'opacity-100'}
        ${!isSelected && !isToday ? 'hover:bg-gray-50' : ''}
      `}
    >
      {/* Today Indicator (always red) */}
      {isToday && (
        <div className="day-today-indicator absolute top-1 w-8 h-8 rounded-full bg-red-500 -z-10" />
      )}
      
      {/* Selection Indicator (black, only if not today) */}
      {isSelected && !isToday && (
        <div className="day-selection-indicator absolute top-1 w-8 h-8 rounded-full bg-black -z-10" />
      )}

      <span className={`
        day-number text-sm font-medium transition-colors duration-200 z-10 w-8 h-8 flex items-center justify-center
        ${isToday || isSelected ? 'text-white' : 'text-gray-900'}
      `}>
        {formatDayNumber(date)}
      </span>

      <div className="mt-1 flex w-full min-w-0 flex-col gap-1 px-1.5 sm:px-2">
        {visibleEvents.map((event) => {
          const tag = getTag(event.category);
          const color = getTagColorHex(tag?.color);
          return (
            <button
              key={event.id}
              type="button"
              onClick={(clickEvent) => {
                clickEvent.stopPropagation();
                onEventClick(event);
              }}
              className="month-event-summary flex min-w-0 items-center gap-1 rounded-[5px] px-1 py-0.5 text-left text-[10px] leading-none transition hover:brightness-95"
              style={{
                backgroundColor: getTagColorRgba(tag?.color, 0.1),
                color,
                '--event-border': color,
              } as React.CSSProperties}
              title={`${event.startTime} ${event.title}`}
            >
              <span className="h-3 w-[2px] flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />
              {(event.continuesFromPreviousDay || event.continuesToNextDay) && (
                <span className="flex-shrink-0 text-[9px] font-semibold">
                  {event.continuesFromPreviousDay ? '续' : '→'}
                </span>
              )}
              <span className="flex-shrink-0 font-medium">{event.startTime}</span>
              <span className="min-w-0 truncate font-medium">{event.title}</span>
            </button>
          );
        })}
        {overflowCount > 0 && (
          <div className={`rounded-[5px] px-1 py-0.5 text-left text-[10px] font-semibold leading-none ${isSelected || isToday ? 'text-white/80' : 'text-gray-400'}`}>
            +{overflowCount}
          </div>
        )}
        {events.length > 0 && visibleEvents.length === 0 && (
          <div className="flex gap-1">
            {events.slice(0, 4).map((_, idx) => (
              <span key={idx} className={`h-1 w-1 rounded-full ${isSelected || isToday ? 'bg-white/50' : 'bg-gray-400'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
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

  if (prevProps.tags !== nextProps.tags) {
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
