// FIX: Replaced barrel file imports with modular imports for date-fns to resolve module export errors.
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameMonth,
  isSameYear,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { DayData, CalendarEvent, ViewMode, Tag } from '../types';
import { isSameDaySafe, normalizeDateToLocal } from './timezoneUtils';

// FIX: Explicitly export date-fns functions used by other components.
export {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  isSameMonth,
};

// Re-export isSameDay from timezoneUtils for consistency
export const isSameDay = isSameDaySafe;

export const AVAILABLE_COLORS = [
  'bg-cyan-400',
  'bg-purple-400',
  'bg-rose-400',
  'bg-orange-400',
  'bg-emerald-400',
  'bg-pink-400',
  'bg-indigo-400',
  'bg-teal-400',
  'bg-yellow-400',
  'bg-lime-400',
  'bg-blue-400',
  'bg-red-400',
  'bg-amber-400',
  'bg-green-400',
  'bg-sky-400',
  'bg-violet-400',
  'bg-fuchsia-400',
  'bg-slate-400',
  'bg-gray-400',
  'bg-stone-400',
];

// Initial Mock Tags - Empty for clean default state
export const INITIAL_TAGS: Tag[] = [];

// Initial Mock Events - Empty for clean default state
export const INITIAL_EVENTS: CalendarEvent[] = [];

export const generateCalendarData = (
  currentDate: Date,
  selectedDate: Date,
  viewMode: ViewMode,
  events: CalendarEvent[]
): DayData[] => {
  const { startDate, endDate } = getVisibleDateRange(currentDate, viewMode, selectedDate);

  const dayInterval = eachDayOfInterval({ start: startDate, end: endDate });
  
  // 统一使用UTC时间进行"今天"判断，避免时区问题
  const today = new Date();

  // Optimization: Pre-group events by date key to avoid O(N*M) complexity
  const eventsByDate = new Map<string, CalendarEvent[]>();
  
  events.forEach(event => {
    const eventDate = normalizeDateToLocal(new Date(event.date));
    const key = eventDate.getTime().toString();
    if (!eventsByDate.has(key)) {
      eventsByDate.set(key, []);
    }
    eventsByDate.get(key)!.push(event);
  });

  return dayInterval.map((date) => {
    // Normalize the current cell date to match the key format
    const normalizedDate = normalizeDateToLocal(date);
    const key = normalizedDate.getTime().toString();
    const dayEvents = eventsByDate.get(key) || [];
    
    // 判断是否为今天：使用timezone-safe函数
    const isTodayDate = isSameDaySafe(date, today);
    
    return {
      date,
      isCurrentMonth: isSameMonth(date, currentDate),
      isToday: isTodayDate,
      isSelected: isSameDaySafe(date, selectedDate),
      events: dayEvents,
    };
  });
};

export const getVisibleDateRange = (
  currentDate: Date,
  viewMode: ViewMode,
  selectedDate: Date,
): { startDate: Date; endDate: Date } => {
  let startDate: Date;
  let endDate: Date;

  switch (viewMode) {
    case ViewMode.Week:
      startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
      break;
    case ViewMode.Day:
      startDate = startOfDay(selectedDate);
      endDate = endOfDay(selectedDate);
      break;
    case ViewMode.Month:
    default:
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
      endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
      break;
  }

  return { startDate, endDate };
};

export const formatDateTitle = (date: Date) => format(date, 'yyyy年 MMMM', { locale: zhCN });
export const formatMonthName = (date: Date) => format(date, 'MMMM', { locale: zhCN });
export const formatYear = (date: Date) => format(date, 'yyyy年', { locale: zhCN });
export const formatDayName = (date: Date) => format(date, 'EEE', { locale: zhCN });
export const formatDayNumber = (date: Date) => format(date, 'd');
export const formatFullDate = (date: Date) => format(date, 'yyyy年 MM月 dd日 EEEE', { locale: zhCN });

export const formatDateRange = (startDate: Date, endDate: Date): string => {
  const startFormat = 'yyyy年 MMMM d日';
  let endFormat = 'd日';

  if (!isSameMonth(startDate, endDate)) {
    endFormat = 'MMMM d日';
  }
  if (!isSameYear(startDate, endDate)) {
    endFormat = 'yyyy年 MMMM d日';
  }

  return `${format(startDate, startFormat, { locale: zhCN })} - ${format(endDate, endFormat, { locale: zhCN })}`;
};

export const getMinutesFromTime = (time: string): number => {
  if (!time || !time.includes(':')) return 0;
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export const getDurationInMinutes = (startTime: string, endTime: string): number => {
  const startMinutes = getMinutesFromTime(startTime);
  const endMinutes = getMinutesFromTime(endTime);
  // Handle overnight events
  if (endMinutes < startMinutes) {
    return (24 * 60 - startMinutes) + endMinutes;
  }
  return endMinutes - startMinutes;
};

export const getDurationString = (startTime: string, endTime: string): string => {
  const minutes = getDurationInMinutes(startTime, endTime);
  if (minutes < 60) {
    return `${minutes}分钟`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时 ${remainingMinutes}分钟`;
};

export const formatDurationFromMinutes = (totalMinutes: number): string => {
  if (totalMinutes < 60) {
    return `${totalMinutes}分钟`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}小时`;
  }
  return `${hours}小时 ${remainingMinutes}分钟`;
};

export const formatTime = (date: Date): string => {
  return format(date, 'HH:mm');
};

export const getPositionFromTime = (time: string): number => {
  const totalMinutesInDay = 24 * 60;
  const minutes = getMinutesFromTime(time);
  return (minutes / totalMinutesInDay) * 100;
};

export const getTimeFromPosition = (percentage: number): string => {
  const totalMinutesInDay = 24 * 60;
  let minutes = Math.round((percentage / 100) * totalMinutesInDay);
  minutes = Math.round(minutes / 15) * 15; // Snap to 15-minute intervals
  minutes = Math.min(totalMinutesInDay - 1, Math.max(0, minutes));

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export const splitEventAcrossDays = (event: Omit<CalendarEvent, 'id'>): Omit<CalendarEvent, 'id'>[] => {
  let startDateTime = parse(`${format(event.date, 'yyyy-MM-dd')}T${event.startTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
  let endDateTime = parse(`${format(event.date, 'yyyy-MM-dd')}T${event.endTime}`, "yyyy-MM-dd'T'HH:mm", new Date());

  if (!isValid(startDateTime) || !isValid(endDateTime)) {
    const safeStart = isValid(startDateTime) ? startDateTime : new Date(event.date);
    const safeEnd = addMinutes(safeStart, 5);
    return [{ ...event, date: safeStart, startTime: formatTime(safeStart), endTime: formatTime(safeEnd) }];
  }

  if (!isAfter(endDateTime, startDateTime)) {
    endDateTime = addDays(endDateTime, 1);
  }

  const eventsList: Omit<CalendarEvent, 'id'>[] = [];
  let currentStart = startDateTime;

  while (isAfter(endDateTime, currentStart)) {
    const endOfCurrentDay = endOfDay(currentStart);
    const segmentEnd = isAfter(endDateTime, endOfCurrentDay) ? endOfCurrentDay : endDateTime;

    eventsList.push({
      ...event,
      date: currentStart,
      startTime: formatTime(currentStart),
      endTime: formatTime(segmentEnd),
    });

    currentStart = startOfDay(addDays(currentStart, 1));
  }

  return eventsList;
};

export const exportToICS = (events: CalendarEvent[], filenameSuffix?: string) => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Liquid Calendar//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  events.forEach(event => {
    const startDateTime = parse(`${format(event.date, 'yyyy-MM-dd')}T${event.startTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
    const endDateTime = parse(`${format(event.date, 'yyyy-MM-dd')}T${event.endTime}`, "yyyy-MM-dd'T'HH:mm", new Date());

    // Format dates to UTC string: YYYYMMDDTHHMMSSZ
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${event.id}@liquidcalendar.com`);
    icsContent.push(`DTSTAMP:${formatICSDate(new Date())}`);
    icsContent.push(`DTSTART:${formatICSDate(startDateTime)}`);
    icsContent.push(`DTEND:${formatICSDate(endDateTime)}`);
    icsContent.push(`SUMMARY:${event.title}`);
    icsContent.push(`DESCRIPTION:Category: ${event.category}`);
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  const filename = filenameSuffix ? `calendar_export_${filenameSuffix}.ics` : 'calendar_export.ics';
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseICS = (icsContent: string): Partial<CalendarEvent>[] => {
  const events: Partial<CalendarEvent>[] = [];

  // 1. Unfold lines
  const rawLines = icsContent.split(/\r\n|\n|\r/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if (line.startsWith(' ') || line.startsWith('\t')) {
      if (lines.length > 0) {
        lines[lines.length - 1] += line.trimStart();
      }
    } else {
      lines.push(line.trim());
    }
  }

  let currentEvent: Partial<CalendarEvent> | null = null;

  const parseICSDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    // Clean up string
    const cleanStr = dateStr.trim();

    // Format 1: YYYYMMDD (All day)
    if (/^\d{8}$/.test(cleanStr)) {
      const year = parseInt(cleanStr.substring(0, 4));
      const month = parseInt(cleanStr.substring(4, 6)) - 1;
      const day = parseInt(cleanStr.substring(6, 8));
      return new Date(year, month, day, 9, 0); // Default to 9am for all-day import
    }

    // Format 2: YYYYMMDDTHHMMSS[Z]
    const match = cleanStr.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
    if (match) {
      const [_, year, month, day, hour, minute, second, isUTC] = match;

      if (isUTC) {
        return new Date(Date.UTC(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        ));
      } else {
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hour),
          parseInt(minute),
          parseInt(second)
        );
      }
    }
    return null;
  };

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
      continue;
    }

    if (line === 'END:VEVENT') {
      if (currentEvent && currentEvent.title && currentEvent.date) {
        // Ensure we have end time, default to 1 hour after start if missing
        if (!currentEvent.endTime && currentEvent.startTime) {
          const [h, m] = currentEvent.startTime.split(':').map(Number);
          const endH = (h + 1) % 24;
          currentEvent.endTime = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
        events.push(currentEvent);
      }
      currentEvent = null;
      continue;
    }

    if (!currentEvent) continue;

    // Split property name and value
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    let propName = line.substring(0, colonIndex);
    const propValue = line.substring(colonIndex + 1);

    // Handle parameters (e.g., DTSTART;TZID=Asia/Shanghai)
    if (propName.includes(';')) {
      propName = propName.split(';')[0];
    }

    switch (propName) {
      case 'SUMMARY':
        currentEvent.title = propValue;
        break;
      case 'DTSTART':
        const startDate = parseICSDate(propValue);
        if (startDate) {
          currentEvent.date = startDate;
          currentEvent.startTime = formatTime(startDate);
        }
        break;
      case 'DTEND':
        const endDate = parseICSDate(propValue);
        if (endDate) {
          currentEvent.endTime = formatTime(endDate);
        }
        break;
      case 'DESCRIPTION':
        // Try to extract category if we exported it
        if (propValue.includes('Category: ')) {
          const match = propValue.match(/Category: (.*)/);
          if (match) {
            currentEvent.category = match[1].trim();
          }
        }
        break;
    }
  }

  return events;
};

// ==================== Event Overlap Detection & Layout ====================

export type OverlapType = 'none' | 'complete' | 'partial' | 'nested';

export interface EventLayout {
  eventId: string;
  overlapType: OverlapType;
  column: number;
  totalColumns: number;
  width: number; // percentage
  left: number; // percentage
  indent: number; // pixels for nested events
  isNested: boolean;
  isContainer: boolean; // true if this event contains other events
}

/**
 * Check if two events overlap in time
 */
export const eventsOverlap = (event1: CalendarEvent, event2: CalendarEvent): boolean => {
  const start1 = getMinutesFromTime(event1.startTime);
  const end1 = getMinutesFromTime(event1.endTime);
  const start2 = getMinutesFromTime(event2.startTime);
  const end2 = getMinutesFromTime(event2.endTime);

  return start1 < end2 && start2 < end1;
};

/**
 * Determine the type of overlap between two events
 */
export const getOverlapType = (event1: CalendarEvent, event2: CalendarEvent): OverlapType => {
  if (!eventsOverlap(event1, event2)) {
    return 'none';
  }

  const start1 = getMinutesFromTime(event1.startTime);
  const end1 = getMinutesFromTime(event1.endTime);
  const start2 = getMinutesFromTime(event2.startTime);
  const end2 = getMinutesFromTime(event2.endTime);

  // Complete overlap: same start AND same end
  if (start1 === start2 && end1 === end2) {
    return 'complete';
  }

  // Nested: one event completely contains the other
  if ((start1 <= start2 && end1 >= end2) || (start2 <= start1 && end2 >= end1)) {
    return 'nested';
  }

  // Partial: events overlap but neither contains the other
  return 'partial';
};

/**
 * Calculate layout for overlapping events
 * Returns a map of event IDs to their layout information
 */
export const calculateEventLayouts = (events: CalendarEvent[]): Map<string, EventLayout> => {
  const layouts = new Map<string, EventLayout>();

  if (events.length === 0) return layouts;

  // Sort events by start time, then by duration (longer first)
  const sortedEvents = [...events].sort((a, b) => {
    const startDiff = getMinutesFromTime(a.startTime) - getMinutesFromTime(b.startTime);
    if (startDiff !== 0) return startDiff;

    const durationA = getMinutesFromTime(a.endTime) - getMinutesFromTime(a.startTime);
    const durationB = getMinutesFromTime(b.endTime) - getMinutesFromTime(b.startTime);
    return durationB - durationA; // Longer events first
  });

  // Group overlapping events
  const overlapGroups: CalendarEvent[][] = [];
  const processed = new Set<string>();

  for (const event of sortedEvents) {
    if (processed.has(event.id)) continue;

    const group: CalendarEvent[] = [event];
    processed.add(event.id);

    // Find all events that overlap with any event in the current group
    let changed = true;
    while (changed) {
      changed = false;
      for (const otherEvent of sortedEvents) {
        if (processed.has(otherEvent.id)) continue;

        // Check if otherEvent overlaps with any event in the group
        if (group.some(e => eventsOverlap(e, otherEvent))) {
          group.push(otherEvent);
          processed.add(otherEvent.id);
          changed = true;
        }
      }
    }

    overlapGroups.push(group);
  }

  // Calculate layout for each group
  for (const group of overlapGroups) {
    if (group.length === 1) {
      // Single event, no overlap
      layouts.set(group[0].id, {
        eventId: group[0].id,
        overlapType: 'none',
        column: 0,
        totalColumns: 1,
        width: 100,
        left: 0,
        indent: 0,
        isNested: false,
        isContainer: false
      });
      continue;
    }

    // Determine overlap type for the group
    const firstEvent = group[0];
    const allSameTime = group.every(e =>
      e.startTime === firstEvent.startTime && e.endTime === firstEvent.endTime
    );

    if (allSameTime) {
      // Complete overlap: side-by-side layout
      const columnWidth = 100 / group.length;
      group.forEach((event, index) => {
        layouts.set(event.id, {
          eventId: event.id,
          overlapType: 'complete',
          column: index,
          totalColumns: group.length,
          width: columnWidth,
          left: columnWidth * index,
          indent: 0,
          isNested: false,
          isContainer: false
        });
      });
    } else {
      // Check for nested relationships and partial overlaps
      const nestedPairs: Array<{ container: CalendarEvent; nested: CalendarEvent }> = [];
      let hasPartialOverlap = false;

      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const e1 = group[i];
          const e2 = group[j];

          if (!eventsOverlap(e1, e2)) continue;

          const start1 = getMinutesFromTime(e1.startTime);
          const end1 = getMinutesFromTime(e1.endTime);
          const start2 = getMinutesFromTime(e2.startTime);
          const end2 = getMinutesFromTime(e2.endTime);

          // Check for nesting
          const e1ContainsE2 = start1 <= start2 && end1 >= end2 && !(start1 === start2 && end1 === end2);
          const e2ContainsE1 = start2 <= start1 && end2 >= end1 && !(start1 === start2 && end1 === end2);

          if (e1ContainsE2) {
            nestedPairs.push({ container: e1, nested: e2 });
          } else if (e2ContainsE1) {
            nestedPairs.push({ container: e2, nested: e1 });
          } else {
            // If they overlap but neither contains the other, it's a partial overlap
            hasPartialOverlap = true;
          }
        }
      }

      // Only use nested layout if we have nesting AND no partial overlaps that would cause collisions
      if (nestedPairs.length > 0 && !hasPartialOverlap) {
        // Nested layout
        const containerIds = new Set(nestedPairs.map(p => p.container.id));
        const nestedIds = new Set(nestedPairs.map(p => p.nested.id));

        group.forEach(event => {
          const isContainer = containerIds.has(event.id);
          const isNested = nestedIds.has(event.id);

          layouts.set(event.id, {
            eventId: event.id,
            overlapType: 'nested',
            column: 0,
            totalColumns: 1,
            width: 100,
            left: 0,
            indent: isNested ? 16 : 0,
            isNested,
            isContainer
          });
        });
      } else {
        // Partial overlap: column-based layout
        // This handles both pure partial overlaps and mixed scenarios (nesting + partial)
        const columns: CalendarEvent[][] = [];

        for (const event of group) {
          let placed = false;

          // Try to place in existing column
          for (const column of columns) {
            const canPlace = column.every(e => !eventsOverlap(e, event));
            if (canPlace) {
              column.push(event);
              placed = true;
              break;
            }
          }

          // Create new column if needed
          if (!placed) {
            columns.push([event]);
          }
        }

        const totalColumns = columns.length;
        const columnWidth = 100 / totalColumns;

        columns.forEach((column, columnIndex) => {
          column.forEach(event => {
            layouts.set(event.id, {
              eventId: event.id,
              overlapType: 'partial',
              column: columnIndex,
              totalColumns,
              width: columnWidth,
              left: columnWidth * columnIndex,
              indent: 0,
              isNested: false,
              isContainer: false
            });
          });
        });
      }
    }
  }

  return layouts;
};
