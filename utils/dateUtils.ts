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
import {
  APP_TIME_ZONE,
  formatChinaWallTime,
  getChinaWallDate,
  isSameDaySafe,
  normalizeDateToLocal,
} from './timezoneUtils';

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

export const APPLE_CALENDAR_COLORS = [
  { label: '红色', className: 'bg-[#FF3B30]', hex: '#FF3B30' },
  { label: '橙色', className: 'bg-[#FF9500]', hex: '#FF9500' },
  { label: '黄色', className: 'bg-[#FFCC00]', hex: '#FFCC00' },
  { label: '绿色', className: 'bg-[#34C759]', hex: '#34C759' },
  { label: '薄荷', className: 'bg-[#00C7BE]', hex: '#00C7BE' },
  { label: '青色', className: 'bg-[#32ADE6]', hex: '#32ADE6' },
  { label: '蓝色', className: 'bg-[#007AFF]', hex: '#007AFF' },
  { label: '靛蓝', className: 'bg-[#5856D6]', hex: '#5856D6' },
  { label: '紫色', className: 'bg-[#AF52DE]', hex: '#AF52DE' },
  { label: '粉色', className: 'bg-[#FF2D55]', hex: '#FF2D55' },
  { label: '棕色', className: 'bg-[#A2845E]', hex: '#A2845E' },
  { label: '灰色', className: 'bg-[#8E8E93]', hex: '#8E8E93' },
];

export const AVAILABLE_COLORS = APPLE_CALENDAR_COLORS.map(color => color.className);

const LEGACY_COLOR_HEX_MAP: Record<string, string> = {
  'bg-cyan-400': '#32ADE6',
  'bg-purple-400': '#AF52DE',
  'bg-rose-400': '#FF2D55',
  'bg-orange-400': '#FF9500',
  'bg-emerald-400': '#34C759',
  'bg-pink-400': '#FF2D55',
  'bg-indigo-400': '#5856D6',
  'bg-teal-400': '#00C7BE',
  'bg-yellow-400': '#FFCC00',
  'bg-lime-400': '#34C759',
  'bg-blue-400': '#007AFF',
  'bg-red-400': '#FF3B30',
  'bg-amber-400': '#FF9500',
  'bg-green-400': '#34C759',
  'bg-sky-400': '#32ADE6',
  'bg-violet-400': '#AF52DE',
  'bg-fuchsia-400': '#FF2D55',
  'bg-slate-400': '#8E8E93',
  'bg-gray-400': '#8E8E93',
  'bg-stone-400': '#8E8E93',
};

export const getTagColorHex = (color?: string): string => {
  if (!color) return '#8E8E93';

  const appleColor = APPLE_CALENDAR_COLORS.find(item => item.className === color);
  if (appleColor) return appleColor.hex;

  const arbitraryHexMatch = color.match(/^bg-\[(#[0-9A-Fa-f]{6})\]$/);
  if (arbitraryHexMatch) return arbitraryHexMatch[1];

  return LEGACY_COLOR_HEX_MAP[color] || '#8E8E93';
};

export const getTagColorRgba = (color: string | undefined, alpha: number): string => {
  const hex = getTagColorHex(color);
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

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
  
  const today = getChinaWallDate(new Date());

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

export interface EventBlockPresentation {
  showTitle: boolean;
  showTimeRange: boolean;
  layoutDirection: 'row' | 'column';
  titleClamp: 'truncate' | 'wrap';
  titleMaxLines: number;
  fontSize: string;
  timeFontSize: string;
  compact: boolean;
}

export const getEventBlockPresentation = ({
  duration,
  viewMode,
  columnWidth = 0,
}: {
  duration: number;
  viewMode: ViewMode.Day | ViewMode.Week;
  columnWidth?: number;
}): EventBlockPresentation => {
  const isWeek = viewMode === ViewMode.Week;
  const isVeryShort = duration < 30;
  const isShort = duration < 45;
  const narrowColumn = columnWidth > 0 && columnWidth < 96;
  const crampedColumn = columnWidth > 0 && columnWidth < 72;
  const compact = isVeryShort || (isShort && (isWeek || narrowColumn)) || (crampedColumn && duration < 60);
  const titleMaxLines = compact ? 1 : duration >= 90 ? 4 : duration >= 60 ? 3 : 2;

  return {
    showTitle: true,
    showTimeRange: duration >= 30,
    layoutDirection: compact ? 'row' : 'column',
    titleClamp: compact ? 'truncate' : 'wrap',
    titleMaxLines,
    fontSize: isWeek ? (compact ? '10px' : '10.5px') : (isShort ? '10px' : '11px'),
    timeFontSize: isWeek ? (compact ? '9px' : '9.5px') : (isShort ? '9px' : '10px'),
    compact,
  };
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

  const rawSegments: Omit<CalendarEvent, 'id'>[] = [];
  let currentStart = startDateTime;

  while (isAfter(endDateTime, currentStart)) {
    const endOfCurrentDay = endOfDay(currentStart);
    const segmentEnd = isAfter(endDateTime, endOfCurrentDay) ? endOfCurrentDay : endDateTime;

    rawSegments.push({
      ...event,
      date: currentStart,
      startTime: formatTime(currentStart),
      endTime: formatTime(segmentEnd),
    });

    currentStart = startOfDay(addDays(currentStart, 1));
  }

  if (rawSegments.length <= 1) {
    return rawSegments;
  }

  const seriesId = event.seriesId || crypto.randomUUID();
  return rawSegments.map((segment, index) => ({
    ...segment,
    seriesId,
    segmentIndex: index,
    segmentCount: rawSegments.length,
    continuesFromPreviousDay: index > 0,
    continuesToNextDay: index < rawSegments.length - 1,
  }));
};

export const exportToICS = (events: CalendarEvent[], filenameSuffix?: string) => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Liquid Calendar//CN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${APP_TIME_ZONE}`,
    `X-LIC-LOCATION:${APP_TIME_ZONE}`,
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0800',
    'TZOFFSETTO:+0800',
    'TZNAME:CST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  const formatICSLocalDate = (date: Date, time: string) => {
    return `${format(date, 'yyyyMMdd')}T${time.replace(':', '')}00`;
  };

  events.forEach(event => {
    const endDate = getMinutesFromTime(event.endTime) < getMinutesFromTime(event.startTime)
      ? addDays(event.date, 1)
      : event.date;

    // DTSTAMP should stay UTC; event times are exported as China local time via TZID.
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    icsContent.push('BEGIN:VEVENT');
    icsContent.push(`UID:${event.id}@liquidcalendar.com`);
    icsContent.push(`DTSTAMP:${formatICSDate(new Date())}`);
    icsContent.push(`DTSTART;TZID=${APP_TIME_ZONE}:${formatICSLocalDate(event.date, event.startTime)}`);
    icsContent.push(`DTEND;TZID=${APP_TIME_ZONE}:${formatICSLocalDate(endDate, event.endTime)}`);
    icsContent.push(`SUMMARY:${event.title}`);
    icsContent.push(`DESCRIPTION:Category: ${event.category}`);
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  const url = window.URL.createObjectURL(blob);
  link.href = url;
  const filename = filenameSuffix ? `calendar_export_${filenameSuffix}.ics` : 'calendar_export.ics';
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  window.setTimeout(() => {
    document.body.removeChild(link);
  }, 0);
  return { filename, url };
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
          const isUTC = propValue.trim().endsWith('Z');
          currentEvent.date = isUTC ? getChinaWallDate(startDate) : startDate;
          currentEvent.startTime = isUTC ? formatChinaWallTime(startDate) : formatTime(startDate);
        }
        break;
      case 'DTEND':
        const endDate = parseICSDate(propValue);
        if (endDate) {
          const isUTC = propValue.trim().endsWith('Z');
          currentEvent.endTime = isUTC ? formatChinaWallTime(endDate) : formatTime(endDate);
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

type NormalizedEventInterval = {
  event: CalendarEvent;
  index: number;
  start: number;
  end: number;
};

const getNormalizedEventInterval = (event: CalendarEvent, index = 0): NormalizedEventInterval => {
  const start = getMinutesFromTime(event.startTime);
  let end = getMinutesFromTime(event.endTime);
  if (end <= start) {
    end += 24 * 60;
  }

  return { event, index, start, end };
};

/**
 * Check if two events overlap in time
 */
export const eventsOverlap = (event1: CalendarEvent, event2: CalendarEvent): boolean => {
  const { start: start1, end: end1 } = getNormalizedEventInterval(event1);
  const { start: start2, end: end2 } = getNormalizedEventInterval(event2);

  return start1 < end2 && start2 < end1;
};

/**
 * Determine the type of overlap between two events
 */
export const getOverlapType = (event1: CalendarEvent, event2: CalendarEvent): OverlapType => {
  if (!eventsOverlap(event1, event2)) {
    return 'none';
  }

  const { start: start1, end: end1 } = getNormalizedEventInterval(event1);
  const { start: start2, end: end2 } = getNormalizedEventInterval(event2);

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

  const sortedEvents = events
    .map((event, index) => getNormalizedEventInterval(event, index))
    .sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.end !== b.end) return b.end - a.end;
      return a.index - b.index;
    });

  const activeLanes: Array<{ lane: number; end: number }> = [];

  sortedEvents.forEach(item => {
    for (let index = activeLanes.length - 1; index >= 0; index -= 1) {
      if (activeLanes[index].end <= item.start) {
        activeLanes.splice(index, 1);
      }
    }

    let lane = 0;
    while (activeLanes.some(active => active.lane === lane)) {
      lane += 1;
    }

    activeLanes.push({ lane, end: item.end });

    const overlappingEvents = events.filter(otherEvent => otherEvent.id !== item.event.id && eventsOverlap(item.event, otherEvent));
    const overlapType = overlappingEvents.reduce<OverlapType>((current, otherEvent) => {
      if (current === 'complete') return current;
      const nextType = getOverlapType(item.event, otherEvent);
      if (nextType === 'complete') return 'complete';
      if (nextType === 'nested') return current === 'partial' ? 'partial' : 'nested';
      if (nextType === 'partial') return 'partial';
      return current;
    }, 'none');

    layouts.set(item.event.id, {
      eventId: item.event.id,
      overlapType,
      column: 0,
      totalColumns: 1,
      width: 100,
      left: 0,
      indent: Math.min(lane * 24, 72),
      isNested: overlapType === 'nested',
      isContainer: overlappingEvents.some(otherEvent => {
        const { start, end } = getNormalizedEventInterval(item.event);
        const other = getNormalizedEventInterval(otherEvent);
        return start <= other.start && end >= other.end;
      })
    });
  });

  return layouts;
};
