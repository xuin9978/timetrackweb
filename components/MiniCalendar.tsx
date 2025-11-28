import React, { useState, useMemo } from 'react';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Icons } from './Icons';

interface MiniCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = React.memo(({ selectedDate, onDateSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate);
  const today = new Date();

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  const weekHeaders = ['一', '二', '三', '四', '五', '六', '日'];

  return (
    <div className="w-64 bg-[#FAFAFA] p-3 rounded-2xl border border-gray-100 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
        >
          <Icons.ChevronLeft size={16} />
        </button>
        <div className="text-center font-semibold text-sm text-black">
          {format(currentMonth, 'yyyy年 MMMM', { locale: zhCN })}
        </div>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 rounded-md hover:bg-gray-100 text-gray-500"
        >
          <Icons.ChevronRight size={16} />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {/* Week Headers */}
        {weekHeaders.map(day => (
          <div key={day} className="text-center text-[11px] font-medium text-gray-400 h-8 flex items-center justify-center">
            {day}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map(day => {
          const isSelected = isSameDay(day, selectedDate);
          const isCurrent = isSameDay(day, today);
          const isThisMonth = isSameMonth(day, currentMonth);

          return (
            <button
              key={day.toString()}
              onClick={() => onDateSelect(day)}
              className={`
                w-8 h-8 mx-auto flex items-center justify-center rounded-full text-[13px] transition-colors duration-200 relative leading-none
                ${!isThisMonth ? 'text-gray-300' : 'text-gray-800'}
                ${isSelected ? 'bg-red-500 text-white font-bold shadow-sm' : ''}
                ${!isSelected && 'hover:bg-gray-100'}
              `}
            >
              {isCurrent && !isSelected && (
                <div className="absolute inset-0 border-2 border-red-500 rounded-full"></div>
              )}
              <span className={isSelected ? 'pt-[3px]' : ''}>{format(day, 'd')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default MiniCalendar;