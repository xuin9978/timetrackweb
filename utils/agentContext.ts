import {
  addDays,
  endOfMonth,
  format,
  isWithinInterval,
  startOfMonth,
  startOfWeek,
  subDays,
} from 'date-fns';
import { CalendarEvent, Tag } from '../types';
import { DiaryEntryRecord } from './diaryService';
import { getDurationInMinutes } from './dateUtils';

export interface ContextSources {
  used: string[];
  missing: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface AgentEventItem {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  durationMinutes: number;
  tagId: string | null;
  tagLabel: string;
  isUncategorized: boolean;
  seriesId?: string;
  segmentIndex?: number;
  segmentCount?: number;
  continuesFromPreviousDay?: boolean;
  continuesToNextDay?: boolean;
}

interface SummaryTag {
  tagId: string | null;
  label: string;
  eventCount: number;
  totalMinutes: number;
}

interface DiaryItem {
  date: string;
  titleOrFirstLine: string;
  summary: string;
  preview: string;
  length: number;
}

export interface AgentClientContext {
  currentDate: string;
  timezone: string;
  calendarContext: {
    todayEvents: AgentEventItem[];
    weekEvents: AgentEventItem[];
    monthSummary: {
      eventCount: number;
      totalScheduledMinutes: number;
      busyDays: string[];
      overloadedDays: string[];
      topTags: SummaryTag[];
    };
    allTimeSummary: {
      eventCount: number;
      trackedDays: number;
      firstDate?: string;
      lastDate?: string;
      topTags: SummaryTag[];
      commonBusyWindows: string[];
      commonFreeWindows: string[];
    };
  };
  diaryContext: {
    recentSevenDays: DiaryItem[];
    monthSummary: {
      entryCount: number;
      totalCharacters: number;
      topKeywords: string[];
      recurringIssues: string[];
      moodSignals: string[];
    };
    allTimeSummary: {
      entryCount: number;
      firstDate?: string;
      lastDate?: string;
      averageCharacters: number;
      topKeywords: string[];
      recurringIssues: string[];
      longTermThemes: string[];
    };
  };
  contextSources?: ContextSources;
}

export interface BuiltAgentContext {
  clientContext: AgentClientContext;
  contextSources: ContextSources;
}

const toDateKey = (date: Date) => format(date, 'yyyy-MM-dd');
const normalizeDate = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const truncate = (text: string, maxLength: number) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
};

const keywordStopWords = new Set([
  '今天',
  '自己',
  '感觉',
  '还是',
  '因为',
  '但是',
  '然后',
  '一个',
  '这个',
  '那个',
  '没有',
  '就是',
  '比较',
  '需要',
  '可以',
  '已经',
  '如果',
  '所以',
]);

const extractKeywords = (texts: string[], limit = 8) => {
  const counts = new Map<string, number>();
  texts.forEach(text => {
    const matches = text.match(/[\u4e00-\u9fa5]{2,}|[A-Za-z][A-Za-z0-9_-]{2,}/g) ?? [];
    matches.forEach(raw => {
      const word = raw.toLowerCase();
      if (keywordStopWords.has(word) || word.length > 16) return;
      counts.set(word, (counts.get(word) ?? 0) + 1);
    });
  });

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
};

const summarizeTags = (events: CalendarEvent[], tagById: Map<string, string>, limit = 5): SummaryTag[] => {
  const stats = new Map<string, SummaryTag>();
  events.forEach(event => {
    const label = tagById.get(event.category) ?? '未分类';
    const tagId = tagById.has(event.category) ? event.category : null;
    const key = tagId ?? 'uncategorized';
    const current = stats.get(key) ?? { tagId, label, eventCount: 0, totalMinutes: 0 };
    current.eventCount += 1;
    current.totalMinutes += getDurationInMinutes(event.startTime, event.endTime);
    stats.set(key, current);
  });

  return Array.from(stats.values())
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, limit);
};

const summarizeBusyWindows = (events: CalendarEvent[]) => {
  const buckets = new Map<string, number>();
  events.forEach(event => {
    const hour = Number(event.startTime.split(':')[0]);
    if (Number.isNaN(hour)) return;
    const start = Math.floor(hour / 3) * 3;
    const label = `${String(start).padStart(2, '0')}:00-${String(start + 3).padStart(2, '0')}:00`;
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  });

  return Array.from(buckets.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);
};

const summarizeFreeWindows = (events: CalendarEvent[]) => {
  const busyBuckets = new Set<string>();
  events.forEach(event => {
    const hour = Number(event.startTime.split(':')[0]);
    if (Number.isNaN(hour)) return;
    const start = Math.floor(hour / 3) * 3;
    busyBuckets.add(`${String(start).padStart(2, '0')}:00-${String(start + 3).padStart(2, '0')}:00`);
  });

  return ['06:00-09:00', '09:00-12:00', '12:00-15:00', '15:00-18:00', '18:00-21:00']
    .filter(label => !busyBuckets.has(label))
    .slice(0, 3);
};

const toAgentEvent = (event: CalendarEvent, tagById: Map<string, string>): AgentEventItem => ({
  id: event.id,
  title: event.title,
  date: toDateKey(event.date),
  start: event.startTime,
  end: event.endTime,
  durationMinutes: getDurationInMinutes(event.startTime, event.endTime),
  tagId: tagById.has(event.category) ? event.category : null,
  tagLabel: tagById.get(event.category) ?? '未分类',
  isUncategorized: !tagById.has(event.category),
  seriesId: event.seriesId,
  segmentIndex: event.segmentIndex,
  segmentCount: event.segmentCount,
  continuesFromPreviousDay: event.continuesFromPreviousDay,
  continuesToNextDay: event.continuesToNextDay,
});

const getDayTotals = (events: CalendarEvent[]) => {
  const totals = new Map<string, number>();
  events.forEach(event => {
    const key = toDateKey(event.date);
    totals.set(key, (totals.get(key) ?? 0) + getDurationInMinutes(event.startTime, event.endTime));
  });
  return totals;
};

const firstLine = (content: string) => {
  const line = content.split(/\r?\n/).find(item => item.trim());
  return truncate(line ?? content, 40);
};

const findRecurringIssues = (texts: string[], limit = 5) => (
  extractKeywords(texts, limit).filter(keyword => /焦虑|拖延|压力|累|混乱|迟|忙|困|低效|复盘|面试|作品集|简历/.test(keyword))
);

const findMoodSignals = (texts: string[], limit = 5) => {
  const signals = ['焦虑', '压力', '疲惫', '开心', '兴奋', '低落', '稳定', '拖延', '充实', '混乱'];
  const joined = texts.join(' ');
  return signals.filter(signal => joined.includes(signal)).slice(0, limit);
};

export const buildAgentClientContext = (
  events: CalendarEvent[],
  tags: Tag[],
  diaryEntries: DiaryEntryRecord[],
  anchorDate: Date,
): BuiltAgentContext => {
  const normalizedAnchor = normalizeDate(anchorDate);
  const todayKey = toDateKey(normalizedAnchor);
  const weekStart = startOfWeek(normalizedAnchor, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const monthStart = startOfMonth(normalizedAnchor);
  const monthEnd = endOfMonth(normalizedAnchor);
  const recentDiaryStart = subDays(normalizedAnchor, 6);
  const tagById = new Map(tags.map(tag => [tag.id, tag.label]));

  const sortedEvents = [...events].sort((a, b) => {
    const dateDelta = a.date.getTime() - b.date.getTime();
    return dateDelta || a.startTime.localeCompare(b.startTime);
  });
  const todayEvents = sortedEvents.filter(event => toDateKey(event.date) === todayKey);
  const weekEvents = sortedEvents.filter(event => isWithinInterval(normalizeDate(event.date), { start: weekStart, end: weekEnd }));
  const monthEvents = sortedEvents.filter(event => isWithinInterval(normalizeDate(event.date), { start: monthStart, end: monthEnd }));
  const monthDayTotals = getDayTotals(monthEvents);
  const allDayTotals = getDayTotals(sortedEvents);
  const eventDates = sortedEvents.map(event => toDateKey(event.date));

  const sortedDiary = [...diaryEntries]
    .filter(entry => entry.content.trim())
    .sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  const recentDiary = sortedDiary.filter(entry => {
    const entryDate = new Date(`${entry.entryDate}T00:00:00`);
    return isWithinInterval(entryDate, { start: recentDiaryStart, end: normalizedAnchor });
  });
  const monthDiary = sortedDiary.filter(entry => {
    const entryDate = new Date(`${entry.entryDate}T00:00:00`);
    return isWithinInterval(entryDate, { start: monthStart, end: monthEnd });
  });

  const used: string[] = [];
  const missing: string[] = [];
  if (todayEvents.length > 0) used.push('今日日程'); else missing.push('今日日程');
  if (weekEvents.length > 0) used.push('本周日程'); else missing.push('本周日程');
  if (monthEvents.length > 0) used.push('本月时间趋势'); else missing.push('本月时间趋势');
  if (sortedEvents.length > 0) used.push('全部历史时间摘要'); else missing.push('全部历史时间摘要');
  if (recentDiary.length > 0) used.push('最近 7 天日记'); else missing.push('最近 7 天日记');
  if (monthDiary.length > 0) used.push('本月日记趋势'); else missing.push('本月日记趋势');
  if (sortedDiary.length > 0) used.push('全部日记长期摘要'); else missing.push('全部日记长期摘要');

  const confidence: ContextSources['confidence'] = used.length >= 5 ? 'high' : used.length >= 2 ? 'medium' : 'low';

  const contextSources = { used, missing, confidence };

  return {
    clientContext: {
      currentDate: todayKey,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local',
      calendarContext: {
        todayEvents: todayEvents.map(event => toAgentEvent(event, tagById)),
        weekEvents: weekEvents.map(event => toAgentEvent(event, tagById)),
        monthSummary: {
          eventCount: monthEvents.length,
          totalScheduledMinutes: Array.from(monthDayTotals.values()).reduce((sum, minutes) => sum + minutes, 0),
          busyDays: Array.from(monthDayTotals.entries()).filter(([, minutes]) => minutes >= 360).map(([date]) => date),
          overloadedDays: Array.from(monthDayTotals.entries()).filter(([, minutes]) => minutes >= 480).map(([date]) => date),
          topTags: summarizeTags(monthEvents, tagById),
        },
        allTimeSummary: {
          eventCount: sortedEvents.length,
          trackedDays: allDayTotals.size,
          firstDate: eventDates[0],
          lastDate: eventDates[eventDates.length - 1],
          topTags: summarizeTags(sortedEvents, tagById),
          commonBusyWindows: summarizeBusyWindows(sortedEvents),
          commonFreeWindows: summarizeFreeWindows(sortedEvents),
        },
      },
      diaryContext: {
        recentSevenDays: recentDiary.map(entry => ({
          date: entry.entryDate,
          titleOrFirstLine: firstLine(entry.content),
          summary: truncate(entry.content, 120),
          preview: truncate(entry.content, 300),
          length: entry.content.length,
        })),
        monthSummary: {
          entryCount: monthDiary.length,
          totalCharacters: monthDiary.reduce((sum, entry) => sum + entry.content.length, 0),
          topKeywords: extractKeywords(monthDiary.map(entry => entry.content)),
          recurringIssues: findRecurringIssues(monthDiary.map(entry => entry.content)),
          moodSignals: findMoodSignals(monthDiary.map(entry => entry.content)),
        },
        allTimeSummary: {
          entryCount: sortedDiary.length,
          firstDate: sortedDiary[0]?.entryDate,
          lastDate: sortedDiary[sortedDiary.length - 1]?.entryDate,
          averageCharacters: sortedDiary.length
            ? Math.round(sortedDiary.reduce((sum, entry) => sum + entry.content.length, 0) / sortedDiary.length)
            : 0,
          topKeywords: extractKeywords(sortedDiary.map(entry => entry.content)),
          recurringIssues: findRecurringIssues(sortedDiary.map(entry => entry.content)),
          longTermThemes: extractKeywords(sortedDiary.map(entry => entry.content), 5),
        },
      },
      contextSources,
    },
    contextSources,
  };
};
