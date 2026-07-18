import React from 'react';
import { addDays, addWeeks, format, isAfter, isSameDay, startOfWeek } from 'date-fns';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { fetchDiaryEntries, saveDiaryEntry } from '../utils/diaryService';

type DiaryView = 'daily' | 'weekly';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface DiaryEntry {
  id: string;
  day: string;
  date: string;
  fullDate: string;
  isoDate: string;
  saved: boolean;
  future: boolean;
  text: string;
}

interface DiaryWeek {
  monthLabel: string;
  title: string;
  helper: string;
  entries: DiaryEntry[];
}

interface DiaryProps {
  userId?: string;
  onWeeklyModeChange?: (isWeekly: boolean) => void;
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

const formatFullDate = (date: Date, day: string) => `${format(date, 'yyyy 年 M 月 d 日')} · ${day}`;

const buildWeek = (anchorDate: Date, entriesByDate: Map<string, string>): DiaryWeek => {
  const today = new Date();
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekLabel = weekStart.getTime() < todayWeekStart.getTime()
    ? '上周'
    : weekStart.getTime() > todayWeekStart.getTime()
      ? '下周'
      : '本周';
  const entries = WEEK_DAYS.map((day, index) => {
    const date = addDays(weekStart, index);
    const isoDate = format(date, 'yyyy-MM-dd');
    const text = entriesByDate.get(isoDate) ?? '';
    return {
      id: isoDate,
      day,
      date: format(date, 'MM.dd'),
      fullDate: formatFullDate(date, day),
      isoDate,
      saved: text.trim().length > 0,
      future: isAfter(date, today),
      text,
    };
  });

  return {
    monthLabel: `${format(weekStart, 'M 月')} · ${weekLabel}`,
    title: `${format(weekStart, 'yyyy 年 M 月 d 日')} - ${format(weekEnd, 'M 月 d 日')}`,
    helper: '横向浏览这一周的日记；已到日期可以记录，未来日期暂不提前显示内容。',
    entries,
  };
};

const getEntryStatus = (entry: DiaryEntry) => {
  if (entry.future) return '未到';
  return entry.saved ? '已写' : '未写';
};

const getEntryPreview = (entry: DiaryEntry) => {
  if (entry.text.trim()) return entry.text;
  if (entry.future) return '还未到这一天。';
  return '还没有写日记，点击后可以从空白页开始。';
};

const getWeekBounds = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  return {
    start,
    end: addDays(start, 6),
    startISO: format(start, 'yyyy-MM-dd'),
    endISO: format(addDays(start, 6), 'yyyy-MM-dd'),
  };
};

const Diary: React.FC<DiaryProps> = ({ userId, onWeeklyModeChange }) => {
  const today = React.useMemo(() => new Date(), []);
  const [view, setView] = React.useState<DiaryView>('daily');
  const [activeDate, setActiveDate] = React.useState(today);
  const [entriesByDate, setEntriesByDate] = React.useState<Map<string, string>>(() => new Map());
  const [draftsByDate, setDraftsByDate] = React.useState<Map<string, string>>(() => new Map());
  const [isLoading, setIsLoading] = React.useState(false);
  const [saveState, setSaveState] = React.useState<SaveState>('idle');
  const [toast, setToast] = React.useState('');

  const isWeekly = view === 'weekly';
  const activeISODate = format(activeDate, 'yyyy-MM-dd');
  const activeWeekStartISO = format(startOfWeek(activeDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const week = React.useMemo(() => buildWeek(activeDate, draftsByDate), [activeDate, draftsByDate]);
  const isFutureWeek = week.entries.every(entry => entry.future);
  const visibleEntries = week.entries.filter(entry => isFutureWeek || !entry.future || entry.saved || isSameDay(new Date(`${entry.isoDate}T00:00:00`), today));
  const activeEntry = visibleEntries.find(entry => entry.isoDate === activeISODate) ?? visibleEntries[0] ?? week.entries[0];
  const writtenCount = visibleEntries.filter(entry => entry.saved).length;

  React.useEffect(() => {
    onWeeklyModeChange?.(isWeekly);
    return () => onWeeklyModeChange?.(false);
  }, [isWeekly, onWeeklyModeChange]);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  React.useEffect(() => {
    if (!userId) {
      setEntriesByDate(new Map());
      setDraftsByDate(new Map());
      return;
    }

    const controller = new AbortController();
    const { startISO, endISO } = getWeekBounds(activeDate);
    setIsLoading(true);

    fetchDiaryEntries(userId, startISO, endISO, controller.signal)
      .then(records => {
        if (controller.signal.aborted) return;
        const nextEntries = new Map<string, string>();
        records.forEach(record => nextEntries.set(record.entryDate, record.content));
        setEntriesByDate(nextEntries);
        setDraftsByDate(nextEntries);
        setSaveState('idle');
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        console.error('日记读取失败:', error);
        setToast('日记读取失败，请稍后重试');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [userId, activeWeekStartISO]);

  const isToday = (entry: DiaryEntry) => isSameDay(new Date(`${entry.isoDate}T00:00:00`), today);

  const openDailyEntry = (isoDate: string) => {
    setActiveDate(new Date(`${isoDate}T00:00:00`));
    setView('daily');
  };

  const switchWeek = (direction: 1 | -1) => {
    const nextDate = addWeeks(activeDate, direction);
    setActiveDate(nextDate);
    setView('weekly');
    setToast(direction > 0 ? '已切换到下一周' : '已切换到上一周');
  };

  const updateActiveEntryText = (text: string) => {
    setDraftsByDate(prev => {
      const next = new Map(prev);
      next.set(activeEntry.isoDate, text);
      return next;
    });
    setSaveState('idle');
  };

  const saveActiveEntry = async () => {
    if (!userId) {
      setToast('请先登录后再保存日记');
      return;
    }

    const content = draftsByDate.get(activeEntry.isoDate) ?? '';
    setSaveState('saving');

    try {
      const saved = await saveDiaryEntry(userId, activeEntry.isoDate, content);
      setEntriesByDate(prev => {
        const next = new Map(prev);
        if (saved) {
          next.set(saved.entryDate, saved.content);
        } else {
          next.delete(activeEntry.isoDate);
        }
        return next;
      });
      setDraftsByDate(prev => {
        const next = new Map(prev);
        if (saved) {
          next.set(saved.entryDate, saved.content);
        } else {
          next.delete(activeEntry.isoDate);
        }
        return next;
      });
      setSaveState('saved');
      setToast(saved ? '已同步到 Supabase' : '已清空当天日记');
    } catch (error) {
      console.error('日记保存失败:', error);
      setSaveState('error');
      setToast('保存失败，请检查网络或数据库表');
    }
  };

  const createTodayEntry = () => {
    setActiveDate(today);
    setView('daily');
    setToast('已打开今日');
  };

  const statusLabel = (() => {
    if (isLoading) return '读取中';
    if (saveState === 'saving') return '同步中';
    if (saveState === 'saved') return '已同步';
    if (saveState === 'error') return '同步失败';
    if (entriesByDate.has(activeEntry.isoDate)) return '已保存';
    return activeEntry.future ? '未到' : '未保存';
  })();

  return (
    <GlassCard
      intensity="medium"
      className={`board-diary-card w-full h-[85vh] flex flex-col bg-white overflow-hidden animate-[fadeIn_0.2s_ease-out] ${isWeekly ? 'md:h-[88vh]' : ''}`}
    >
      <header className="flex flex-col gap-4 border-b border-gray-100 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-white text-gray-700 shadow-sm">
            <Icons.BookOpen size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-gray-950">日记</h2>
            <p className="mt-1 truncate text-sm font-semibold text-gray-500">
              {isWeekly ? '从周一到周日横向浏览，快速看到这一周的记录脉络。' : '每日记录，周末回看这一周的完整故事。'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setView('daily')}
              className={`h-8 min-w-16 rounded-full px-4 text-xs font-bold transition ${view === 'daily' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              每日
            </button>
            <button
              type="button"
              onClick={() => setView('weekly')}
              className={`h-8 min-w-16 rounded-full px-4 text-xs font-bold transition ${view === 'weekly' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              每周
            </button>
          </div>

          {isWeekly && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => switchWeek(-1)}
                aria-label="查看上一周"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
              >
                <Icons.ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => switchWeek(1)}
                aria-label="查看下一周"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 transition hover:bg-gray-50"
              >
                <Icons.ChevronRight size={18} />
              </button>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 text-[11px] font-bold text-gray-500">
                <Icons.Check size={14} />已到 {visibleEntries.length} 天 · 已写 {writtenCount} 天
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={createTodayEntry}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 text-xs font-bold text-gray-900 transition hover:bg-gray-50"
          >
            <Icons.Plus size={17} />新建今日
          </button>
        </div>
      </header>

      {view === 'daily' ? (
        <section className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[306px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-gray-100 bg-gray-50/80 p-4 md:border-b-0 md:border-r md:p-[18px]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold tracking-tight text-gray-950">{week.monthLabel}</h3>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 text-[11px] font-bold text-gray-500">
                <Icons.Check size={13} />已到 {visibleEntries.length} 天 · 已写 {writtenCount} 天
              </span>
            </div>

            <div className="grid gap-2.5">
              {visibleEntries.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setActiveDate(new Date(`${entry.isoDate}T00:00:00`))}
                  className={`w-full rounded-[18px] border p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-white ${entry.isoDate === activeEntry.isoDate ? 'border-gray-200 bg-white shadow-[0_10px_24px_rgba(28,33,42,0.045)]' : 'border-transparent bg-transparent'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-950">{entry.day}{isToday(entry) ? ' · 今天' : ''}</p>
                      <p className="mt-1 text-[11px] font-bold text-gray-500">{entry.date} · {getEntryStatus(entry)}</p>
                    </div>
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${entry.saved ? 'bg-gray-700' : 'bg-gray-300'}`} />
                  </div>
                  <p className="mt-2.5 line-clamp-2 text-xs font-medium leading-5 text-gray-500">
                    {getEntryPreview(entry)}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="grid min-h-0 grid-rows-[auto_minmax(260px,1fr)_auto] bg-white px-5 py-6 md:px-12 md:py-8">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <h3 className="text-lg font-extrabold tracking-tight text-gray-950 md:text-[21px]">{activeEntry.fullDate}</h3>
              <span className="inline-flex h-7 shrink-0 items-center rounded-full border border-gray-200 bg-white px-3 text-[11px] font-bold text-gray-500">
                {statusLabel}
              </span>
            </div>

            <textarea
              className="min-h-0 w-full resize-none border-0 bg-transparent pt-5 text-base font-medium leading-8 text-gray-900 outline-none placeholder:text-gray-400 disabled:text-gray-400"
              value={draftsByDate.get(activeEntry.isoDate) ?? ''}
              onChange={(event) => updateActiveEntryText(event.target.value)}
              placeholder="开始记录..."
              spellCheck={false}
              disabled={activeEntry.future}
            />

            <footer className="flex items-center justify-between gap-4 pt-4 text-xs font-bold text-gray-500">
              <span>{(draftsByDate.get(activeEntry.isoDate) ?? '').trim() ? `约 ${(draftsByDate.get(activeEntry.isoDate) ?? '').length} 字 · Supabase 同步` : '空白日记 · 等待输入'}</span>
              <button
                type="button"
                onClick={saveActiveEntry}
                disabled={saveState === 'saving' || activeEntry.future}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gray-950 px-5 text-xs font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:translate-y-0"
              >
                <Icons.Check size={16} />{saveState === 'saving' ? '同步中' : '保存日记'}
              </button>
            </footer>
          </section>
        </section>
      ) : (
        <section className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-white p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-extrabold tracking-tight text-gray-950">{week.title}</h3>
              <p className="mt-1 text-sm font-semibold text-gray-500">{week.helper}</p>
            </div>
          </div>

          <div
            className={`grid min-h-0 gap-3 overflow-x-auto pb-1 ${visibleEntries.length < 7 ? 'justify-start' : ''}`}
            style={{ gridTemplateColumns: visibleEntries.length < 7 ? `repeat(${visibleEntries.length}, minmax(220px, 280px))` : `repeat(${visibleEntries.length}, minmax(170px, 1fr))` }}
          >
            {visibleEntries.map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openDailyEntry(entry.isoDate)}
                className={`grid min-h-[520px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[20px] border bg-white text-left transition hover:-translate-y-0.5 ${isToday(entry) ? 'border-gray-200 shadow-[0_10px_24px_rgba(28,33,42,0.045)]' : 'border-gray-200'} ${entry.saved ? '' : 'bg-gray-50'}`}
              >
                <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
                  <div>
                    <p className="text-sm font-black text-gray-950">{entry.day}{isToday(entry) ? ' · 今天' : ''}</p>
                    <p className="mt-1 text-[11px] font-bold text-gray-500">{entry.date} · {getEntryStatus(entry)}</p>
                  </div>
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${entry.saved ? 'bg-gray-700' : 'bg-gray-300'}`} />
                </div>
                <div className="min-h-0 overflow-y-auto whitespace-pre-line px-4 pb-4 text-[13px] font-medium leading-6 text-gray-800">
                  {getEntryPreview(entry)}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {toast && (
        <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-gray-950 px-4 py-2 text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </GlassCard>
  );
};

export default Diary;
