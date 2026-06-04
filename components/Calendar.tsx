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
  formatFullDate,
  formatDateTitle,
  formatDateRange,
} from '../utils/dateUtils';
import { DayData, ViewMode, CalendarEvent, DragSelection, Tag } from '../types';

interface CalendarProps {
  events: CalendarEvent[];
  tags: Tag[];
  visibleTags: string[];
  onToggleTagVisibility: (tagId: string) => void;
  onSmartAddEvent: () => void;
  onUpdateEvent: (event: CalendarEvent) => void;
  onOpenModal: (startTime?: string, endTime?: string, date?: Date, event?: CalendarEvent) => void;
  currentDate?: Date;
  setCurrentDate?: (d: Date) => void;
  selectedDate?: Date;
  setSelectedDate?: (d: Date) => void;
  viewMode?: ViewMode;
  setViewMode?: (v: ViewMode) => void;
  hasHiddenAllTags?: boolean;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapsed?: () => void;
}

const Calendar: React.FC<CalendarProps> = ({ events, tags, visibleTags, onToggleTagVisibility, onSmartAddEvent, onUpdateEvent, onOpenModal, currentDate: cdProp, setCurrentDate: setCdProp, selectedDate: sdProp, setSelectedDate: setSdProp, viewMode: vmProp, setViewMode: setVmProp, hasHiddenAllTags = false, isSidebarCollapsed = false, onToggleSidebarCollapsed }) => {
  const [currentDateState, setCurrentDateState] = useState(new Date());
  const [selectedDateState, setSelectedDateState] = useState(new Date());
  const [viewModeState, setViewModeState] = useState<ViewMode>(ViewMode.Day);
  const currentDate = cdProp ?? currentDateState;
  const setCurrentDate = setCdProp ?? setCurrentDateState;
  const selectedDate = sdProp ?? selectedDateState;
  const setSelectedDate = setSdProp ?? setSelectedDateState;
  const viewMode = vmProp ?? viewModeState;
  const setViewMode = setVmProp ?? setViewModeState;
  const [isPanelVisible, setIsPanelVisible] = useState(true);

  // Generate data based on current view
  const calendarData: DayData[] = useMemo(() => {
    const data = generateCalendarData(currentDate, selectedDate, viewMode, events);

    return data;
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

  const handleScrollNavigate = useCallback((direction: 'prev' | 'next') => {
    if (viewMode !== ViewMode.Week) return;

    if (direction === 'next') {
      handleNext();
    } else {
      handlePrev();
    }
  }, [viewMode, handleNext, handlePrev]);

  const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

  const isMonthView = viewMode === ViewMode.Month;
  const isWeekView = viewMode === ViewMode.Week;

  return (
    <div className={`calendar-workspace w-full h-[85vh] flex flex-col lg:flex-row p-0 lg:p-4 z-10 transition-[gap] duration-300 ${isSidebarCollapsed ? 'gap-6 lg:gap-3' : 'gap-6 lg:gap-6'}`}>

      <GlassCard
        className={`apple-calendar-card flex-1 p-6 flex flex-col justify-between animate-[fadeIn_0.5s_ease-out] bg-[#FAFAFA] min-w-0 ${isWeekView ? 'is-week-calendar' : ''}`}
        intensity="medium"
      >
        {/* Header */}
        <div className={`calendar-toolbar flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 flex-shrink-0 ${isWeekView ? 'is-week-toolbar' : ''}`}>
          <div className="calendar-title-block flex flex-col text-center md:text-left absolute top-6 left-1/2 -translate-x-1/2 md:static md:translate-x-0">
            <div className="calendar-title-row flex items-center gap-3">
              <h1 className="calendar-title text-4xl md:text-5xl font-semibold tracking-tight text-black">
                {isWeekView ? `${formatYear(currentDate)} ${currentDate.getMonth() + 1}月` : formatMonthName(currentDate)}
              </h1>
              {isWeekView && (
                <button
                  onClick={() => {
                    setCurrentDate(new Date());
                    setSelectedDate(new Date());
                  }}
                  className="calendar-week-today-button px-3 h-8 rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-all active:scale-95 text-xs font-medium"
                >
                  今天
                </button>
              )}
            </div>
            <span className={`calendar-subtitle text-xl text-gray-400 font-normal tracking-widest ${isWeekView ? 'week-hidden-subtitle' : ''}`}>
              {formatYear(currentDate)}
            </span>
          </div>

          <div className="calendar-toolbar-actions flex items-center gap-4 ml-auto">
            {/* Segmented Control */}
            <div className="calendar-segmented flex bg-gray-100 rounded-lg p-1 border border-gray-200">
              {[
                { id: ViewMode.Day, label: '日' },
                { id: ViewMode.Week, label: '周' },
                { id: ViewMode.Month, label: '月' }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  aria-label={`切换到${mode.label}视图`}
                  className={`calendar-segment px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${viewMode === mode.id
                    ? 'bg-white text-black shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="calendar-nav-cluster flex items-center gap-2">
              <button
                onClick={handlePrev}
                title="上一页"
                aria-label="上一页"
                className="calendar-nav-button w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-all active:scale-95"
              >
                <Icons.ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                title="下一页"
                aria-label="下一页"
                className="calendar-nav-button w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-all active:scale-95"
              >
                <Icons.ChevronRight size={18} />
              </button>

              <button
                onClick={onToggleSidebarCollapsed}
                title={isSidebarCollapsed ? "展开左侧栏" : "隐藏左侧栏"}
                aria-label={isSidebarCollapsed ? "展开左侧栏" : "隐藏左侧栏"}
                className={`calendar-nav-button calendar-sidebar-toggle w-8 h-8 flex items-center justify-center rounded-full ${isSidebarCollapsed ? 'bg-gray-200 text-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} transition-colors`}
              >
                {isSidebarCollapsed ? <Icons.PanelRight size={18} /> : <Icons.PanelLeft size={18} />}
              </button>

              <div className="calendar-toolbar-divider w-px h-5 bg-gray-200 mx-1"></div>
              <button
                onClick={() => setIsPanelVisible(!isPanelVisible)}
                className={`calendar-nav-button calendar-panel-toggle w-8 h-8 flex items-center justify-center rounded-full ${isPanelVisible ? 'bg-gray-200 text-black' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} transition-colors`}
                title={isPanelVisible ? "隐藏日程" : "显示日程"}
                aria-label={isPanelVisible ? "隐藏日程" : "显示日程"}
              >
                <Icons.PanelRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="calendar-content flex-1 relative overflow-hidden min-h-0">
          {isMonthView ? (
            <div className="month-view h-full flex flex-col">
              <div className="month-week-header grid grid-cols-7 border-b border-gray-200 flex-shrink-0">
                {weekDays.map(day => (
                  <div key={day} className="month-weekday text-center text-gray-400 text-xs py-2 uppercase tracking-widest font-semibold">
                    {day}
                  </div>
                ))}
              </div>
              <div className="month-grid grid grid-cols-7 grid-rows-6 flex-1 border-l border-t border-gray-200">
                {calendarData.map((day, index) => (
                  <div
                    key={day.date.toISOString()}
                    className="month-grid-cell border-r border-b border-gray-200 animate-[fadeIn_0.5s_ease-out] [animation-fill-mode:forwards]"
                    style={{ animationDelay: `${index * 10}ms`, opacity: 0 }}
                  >
                    <DayCell day={day} onClick={handleDateClick} tags={tags} onEventClick={handleEventClick} />
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
              onScrollNavigate={handleScrollNavigate}
              viewMode={viewMode === ViewMode.Week ? ViewMode.Week : ViewMode.Day}
            />
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className={`calendar-footer flex items-center gap-4 ${isWeekView ? 'is-hidden-for-week' : ''}`}>
          <button
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(new Date());
            }}
            className="calendar-today-button flex items-center gap-2 hover:text-black transition-colors"
          >
            <Icons.Calendar size={16} />
            <span>回到今天</span>
          </button>
        </div>
      </GlassCard>

      {/* Right Side: Event Detail Panel - Independent Card Side-by-Side */}
      {isPanelVisible && (
        <div className="flex-shrink-0 h-full w-80 ml-6 animate-[fadeIn_0.2s_ease-out]">
          <div className="w-80 h-full">
            <EventPanel
              panelTitle={panelTitle}
              panelContext={panelContext}
              events={panelEvents}
              tags={tags}
              visibleTags={visibleTags}
              onToggleTagVisibility={onToggleTagVisibility}
              onAddEvent={onSmartAddEvent}
              onEventClick={handleEventClick}
              hasHiddenAllTags={hasHiddenAllTags}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Calendar;
