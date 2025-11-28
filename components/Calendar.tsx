import React, { useState, useMemo, useCallback } from 'react';
import { Icons } from './Icons';
import GlassCard from './GlassCard';
import DayCell from './DayCell';
import EventPanel from './EventPanel';
import TimeGrid from './TimeGrid';
import {
  generateCalendarData,
  formatMonthName,
  formatYear,
  addMonths, subMonths,
  addWeeks, subWeeks,
  addDays, subDays,
  isSameDay,
  isSameMonth,
  formatFullDate,
  formatDateTitle,
  formatDateRange,
  getMinutesFromTime,
  formatTime,
} from '../utils/dateUtils';
import { DayData, ViewMode, CalendarEvent, DragSelection, Tag } from '../types';

interface CalendarProps {
  events: CalendarEvent[];
  tags: Tag[];
  visibleTags: string[];
  onToggleTagVisibility: (tagId: string) => void;
  onAddEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onOpenModal: (startTime?: string, endTime?: string, date?: Date, event?: CalendarEvent) => void;
}

const Calendar: React.FC<CalendarProps> = ({ events, tags, visibleTags, onToggleTagVisibility, onAddEvent, onUpdateEvent, onDeleteEvent, onOpenModal }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  // Generate data based on current view
  const calendarData: DayData[] = useMemo(() => {
    return generateCalendarData(currentDate, selectedDate, viewMode, events);
  }, [currentDate, selectedDate, viewMode, events]);

  const { panelEvents, panelTitle, panelContext } = useMemo(() => {
    const sortEvents = (eventList: CalendarEvent[]) => {
      return eventList.sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      });
    };

    if (viewMode === ViewMode.Month) {
      // Use pre-computed calendarData to avoid re-filtering all events
      const monthEvents = calendarData
        .filter(d => d.isCurrentMonth)
        .flatMap(d => d.events);
      
      return {
        panelEvents: sortEvents(monthEvents),
        panelTitle: formatDateTitle(currentDate),
        panelContext: 'month' as const,
      };
    }

    if (viewMode === ViewMode.Week && calendarData.length > 0) {
      const weekEvents = calendarData.flatMap(day => day.events);
      const startDate = calendarData[0].date;
      const endDate = calendarData[calendarData.length - 1].date;

      return {
        panelEvents: sortEvents(weekEvents),
        panelTitle: formatDateRange(startDate, endDate),
        panelContext: 'week' as const,
      };
    }

    // Default to Day view logic
    // In Day view, calendarData contains exactly the selected day's data
    const dayEvents = calendarData.length > 0 ? calendarData[0].events : [];
    
    return {
      panelEvents: sortEvents(dayEvents),
      panelTitle: formatFullDate(selectedDate),
      panelContext: 'day' as const,
    };
  }, [viewMode, calendarData, currentDate, selectedDate]);


  const handlePrev = useCallback(() => {
    if (viewMode === ViewMode.Month) {
      setCurrentDate(prev => subMonths(prev, 1));
    } else if (viewMode === ViewMode.Week) {
      setCurrentDate(prev => subWeeks(prev, 1));
    } else {
      // Day view: update both currentDate and selectedDate
      setCurrentDate(prev => {
        const newDate = subDays(prev, 1);
        setSelectedDate(newDate);
        return newDate;
      });
    }
  }, [viewMode]);

  const handleNext = useCallback(() => {
    if (viewMode === ViewMode.Month) {
      setCurrentDate(prev => addMonths(prev, 1));
    } else if (viewMode === ViewMode.Week) {
      setCurrentDate(prev => addWeeks(prev, 1));
    } else {
      // Day view: update both currentDate and selectedDate
      setCurrentDate(prev => {
        const newDate = addDays(prev, 1);
        setSelectedDate(newDate);
        return newDate;
      });
    }
  }, [viewMode]);

  const handleDateClick = useCallback((date: Date) => {
    setSelectedDate(date);
    if (viewMode === ViewMode.Month) {
      setCurrentDate(date);
      setViewMode(ViewMode.Day);
    }
  }, [viewMode]);

  const handleDragCreate = useCallback((selection: DragSelection) => {
    setSelectedDate(selection.startDate);
    onOpenModal(selection.startTime, selection.endTime, selection.startDate);
  }, [onOpenModal]);

  const handleEventClick = useCallback((event: CalendarEvent) => {
    onOpenModal(event.startTime, event.endTime, event.date, event);
  }, [onOpenModal]);

  const handleAddEventPanel = useCallback(() => {
    // Filter events for the selected date to determine the default start time
    const daysEvents = events.filter(e => isSameDay(e.date, selectedDate));
    // Sort events by start time
    daysEvents.sort((a, b) => a.startTime.localeCompare(b.startTime));

    let defaultStartTime = '09:00';
    let defaultEndTime = '10:00';

    if (daysEvents.length > 0) {
      const lastEvent = daysEvents[daysEvents.length - 1];
      defaultStartTime = lastEvent.endTime;
    }

    // Determine default end time: use current time if possible
    const now = new Date();
    const currentTimeStr = formatTime(now);
    
    const startMinutes = getMinutesFromTime(defaultStartTime);
    const currentMinutes = getMinutesFromTime(currentTimeStr);

    if (currentMinutes > startMinutes) {
      // If current time is after start time, use current time
      defaultEndTime = currentTimeStr;
    } else {
      // Fallback: start time + 15 minutes
      const endMinutes = startMinutes + 15;
      const hours = Math.floor(endMinutes / 60) % 24;
      const mins = endMinutes % 60;
      defaultEndTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }

    onOpenModal(defaultStartTime, defaultEndTime, selectedDate);
  }, [onOpenModal, selectedDate, events]);

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const isMonthView = viewMode === ViewMode.Month;

  return (
    <div className="w-full h-[85vh] flex flex-col lg:flex-row gap-6 p-0 lg:p-4 z-10">

      <GlassCard
        className="flex-1 p-6 flex flex-col justify-between animate-[fadeIn_0.5s_ease-out] bg-[#FAFAFA] min-w-full" // Added min-w-full for fixed width
        intensity="medium"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 flex-shrink-0">
          <div className="flex flex-col text-center md:text-left absolute top-6 left-1/2 -translate-x-1/2 md:static md:translate-x-0">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-black">
              {formatMonthName(currentDate)}
            </h1>
            <span className="text-xl text-gray-400 font-normal tracking-widest">
              {formatYear(currentDate)}
            </span>
          </div>

          <div className="flex items-center gap-4 ml-auto">
            {/* Segmented Control */}
            <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
              {[
                { id: ViewMode.Day, label: '日' },
                { id: ViewMode.Week, label: '周' },
                { id: ViewMode.Month, label: '月' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === mode.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-all active:scale-95"
              >
                <Icons.ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-all active:scale-95"
              >
                <Icons.ChevronRight size={18} />
              </button>
              <div className="w-px h-5 bg-gray-200 mx-1"></div>
              <button
                onClick={() => setIsPanelVisible(!isPanelVisible)}
                className={`w-8 h-8 flex items-center justify-center rounded-full ${isPanelVisible ? 'bg-gray-200 text-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} transition-colors`}
                title={isPanelVisible ? "隐藏日程" : "显示日程"}
              >
                <Icons.PanelRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative overflow-hidden h-full">
          {isMonthView ? (
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-7 border-b border-gray-200 flex-shrink-0">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-gray-400 text-xs py-2 uppercase tracking-widest font-semibold">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 grid-rows-6 flex-1 border-l border-t border-gray-200">
                {calendarData.map((day, index) => (
                  <div
                    key={day.date.toISOString()}
                    className="border-r border-b border-gray-200 animate-[fadeIn_0.5s_ease-out_forwards]"
                    style={{ animationDelay: `${index * 10}ms`, opacity: 0 }}
                  >
                    <DayCell day={day} onClick={handleDateClick} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <TimeGrid
              days={calendarData}
              tags={tags}
              onDateClick={handleDateClick}
              onAddEvent={handleDragCreate}
              onEventClick={handleEventClick}
              onUpdateEvent={onUpdateEvent}
              onScrollNavigate={viewMode === ViewMode.Week ? (direction) => {
                if (direction === 'next') {
                  handleNext();
                } else {
                  handlePrev();
                }
              } : undefined}
            />
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
            className="flex items-center gap-2 hover:text-black transition-colors"
          >
            <Icons.Calendar size={16} />
            <span>回到今天</span>
          </button>
        </div>
      </GlassCard>

      {/* Right Side: Event Detail Panel - Independent Card Side-by-Side */}
      <div
        className={`flex-shrink-0 h-full transition-all duration-400 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] transform ${isPanelVisible
          ? 'w-80 ml-6 opacity-100 translate-x-0'
          : 'w-0 ml-0 opacity-0 translate-x-8 overflow-hidden'
          }`}
      >
        <div className="w-80 h-full">
          <EventPanel
            panelTitle={panelTitle}
            panelContext={panelContext}
            events={panelEvents}
            tags={tags}
            visibleTags={visibleTags}
            onToggleTagVisibility={onToggleTagVisibility}
            onAddEvent={handleAddEventPanel}
            onEventClick={handleEventClick}
          />
        </div>
      </div>
    </div>
  );
};

export default Calendar;
