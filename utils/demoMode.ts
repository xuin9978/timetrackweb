import { addDays, format, startOfWeek } from 'date-fns';
import { CalendarEvent, Tag } from '../types';
import { DiaryEntryRecord } from './diaryService';

export const DEMO_USER_ID = 'liquid-calendar-demo-user';

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: 'demo@liquid-calendar.local',
  user_metadata: {
    display_name: 'Demo 体验者',
    name: 'Demo 体验者',
    tagline: '免登录体验，数据仅保存在本地',
  },
};

export type DemoStorageKind = 'events' | 'tags' | 'diary';

export const getDemoStorageKey = (kind: DemoStorageKind) => `liquid_calendar_demo_${kind}`;

export const isDemoUser = (user: { id?: string } | null | undefined) => user?.id === DEMO_USER_ID;

const demoWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
const dateAt = (offset: number) => addDays(demoWeekStart, offset);
const isoAt = (offset: number) => format(dateAt(offset), 'yyyy-MM-dd');

export const DEMO_TAGS: Tag[] = [
  { id: 'demo-portfolio', label: '作品集', color: 'bg-[#007AFF]', icon: '💼', order: 1 },
  { id: 'demo-interview', label: '面试准备', color: 'bg-[#AF52DE]', icon: '🎯', order: 2 },
  { id: 'demo-study', label: '学习', color: 'bg-[#34C759]', icon: '📚', order: 3 },
  { id: 'demo-health', label: '运动休息', color: 'bg-[#FF9500]', icon: '🌿', order: 4 },
  { id: 'demo-life', label: '生活', color: 'bg-[#8E8E93]', icon: '☕', order: 5 },
];

export const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: 'demo-event-1',
    title: '整理时间管理项目作品集',
    startTime: '09:30',
    endTime: '11:00',
    category: 'demo-portfolio',
    date: dateAt(0),
  },
  {
    id: 'demo-event-2',
    title: '录制 Demo 操作视频',
    startTime: '14:00',
    endTime: '15:30',
    category: 'demo-portfolio',
    date: dateAt(0),
  },
  {
    id: 'demo-event-3',
    title: '前端面试题复盘',
    startTime: '10:00',
    endTime: '11:30',
    category: 'demo-interview',
    date: dateAt(1),
  },
  {
    id: 'demo-event-4',
    title: '优化个人时间 Agent 叙事',
    startTime: '16:00',
    endTime: '17:30',
    category: 'demo-portfolio',
    date: dateAt(2),
  },
  {
    id: 'demo-event-5',
    title: 'React 状态管理练习',
    startTime: '19:30',
    endTime: '20:30',
    category: 'demo-study',
    date: dateAt(2),
  },
  {
    id: 'demo-event-6',
    title: '散步恢复精力',
    startTime: '18:30',
    endTime: '19:10',
    category: 'demo-health',
    date: dateAt(3),
  },
  {
    id: 'demo-event-7',
    title: '投递岗位和整理反馈',
    startTime: '09:00',
    endTime: '10:00',
    category: 'demo-interview',
    date: dateAt(4),
  },
  {
    id: 'demo-event-8',
    title: '周复盘：计划、执行、记录',
    startTime: '20:00',
    endTime: '21:00',
    category: 'demo-life',
    date: dateAt(4),
  },
];

export const DEMO_DIARY_ENTRIES: DiaryEntryRecord[] = [
  {
    id: 'demo-diary-1',
    userId: DEMO_USER_ID,
    entryDate: isoAt(0),
    content: '今天主要推进作品集结构。最大的收获是发现这个项目不只是日历，而是计划、计时、历史、日记和 Agent 的完整闭环。下午录 Demo 时有点紧张，但流程比想象中清楚。',
  },
  {
    id: 'demo-diary-2',
    userId: DEMO_USER_ID,
    entryDate: isoAt(2),
    content: '今天优化了个人时间 Agent 的叙事。感觉难点不是功能本身，而是怎么让 HR 快速看懂价值。接下来要把截图和核心用户路径整理出来。',
  },
  {
    id: 'demo-diary-3',
    userId: DEMO_USER_ID,
    entryDate: isoAt(4),
    content: '这周明显把更多时间放在作品集和面试准备上。晚上做周复盘时发现，上午更适合深度整理，晚上适合轻量复盘，不适合继续塞太重的任务。',
  },
];

const storage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const readJson = <T,>(key: string, fallback: T, revive?: (value: any) => T): T => {
  const target = storage();
  if (!target) return fallback;
  try {
    const raw = target.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return revive ? revive(parsed) : parsed;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  const target = storage();
  if (!target) return;
  target.setItem(key, JSON.stringify(value));
};

export const loadDemoEvents = () => readJson<CalendarEvent[]>(
  getDemoStorageKey('events'),
  DEMO_EVENTS,
  value => Array.isArray(value)
    ? value.map(event => ({ ...event, date: new Date(event.date) }))
    : DEMO_EVENTS
);

export const saveDemoEvents = (events: CalendarEvent[]) => writeJson(getDemoStorageKey('events'), events);

export const loadDemoTags = () => readJson<Tag[]>(getDemoStorageKey('tags'), DEMO_TAGS);

export const saveDemoTags = (tags: Tag[]) => writeJson(getDemoStorageKey('tags'), tags);

export const loadDemoDiaryEntries = () => readJson<DiaryEntryRecord[]>(
  getDemoStorageKey('diary'),
  DEMO_DIARY_ENTRIES,
  value => Array.isArray(value) ? value : DEMO_DIARY_ENTRIES
);

export const saveDemoDiaryEntries = (entries: DiaryEntryRecord[]) => writeJson(getDemoStorageKey('diary'), entries);

export const resetDemoStorage = () => {
  const target = storage();
  if (!target) return;
  target.removeItem(getDemoStorageKey('events'));
  target.removeItem(getDemoStorageKey('tags'));
  target.removeItem(getDemoStorageKey('diary'));
};
