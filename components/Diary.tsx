import React from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';

type DiaryView = 'daily' | 'weekly';

interface DiaryEntry {
  id: string;
  day: string;
  date: string;
  fullDate: string;
  saved: boolean;
  future?: boolean;
  text: string;
}

interface DiaryWeek {
  id: string;
  monthLabel: string;
  title: string;
  helper: string;
  currentDayIndex: number;
  entries: DiaryEntry[];
}

interface DiaryProps {
  onWeeklyModeChange?: (isWeekly: boolean) => void;
}

const INITIAL_WEEKS: DiaryWeek[] = [
  {
    id: 'prev',
    monthLabel: '七月 · 上周',
    title: '2026 年 7 月 6 日 - 7 月 12 日',
    helper: '上一周的记录可以完整回看；未写日期保留为补写入口。',
    currentDayIndex: 6,
    entries: [
      { id: 'prev-mon', day: '周一', date: '07.06', fullDate: '2026 年 7 月 6 日 · 周一', saved: true, text: '上周一主要在整理日历模块的结构。事情很多，但真正推进的是把入口和状态理清楚。\n\n我发现只要页面能让我快速知道自己在哪里，后面的操作就会轻很多。' },
      { id: 'prev-tue', day: '周二', date: '07.07', fullDate: '2026 年 7 月 7 日 · 周二', saved: true, text: '今天把一些零碎想法收拢到一起。不是每个功能都要立刻做完整，先把最核心的路径打通更重要。' },
      { id: 'prev-wed', day: '周三', date: '07.08', fullDate: '2026 年 7 月 8 日 · 周三', saved: false, text: '' },
      { id: 'prev-thu', day: '周四', date: '07.09', fullDate: '2026 年 7 月 9 日 · 周四', saved: true, text: '今天回看前几天的记录，发现有些判断当时看很小，但连起来就是方向。\n\n日记如果能帮我看到这种连续性，就已经很有价值。' },
      { id: 'prev-fri', day: '周五', date: '07.10', fullDate: '2026 年 7 月 10 日 · 周五', saved: true, text: '这一周接近尾声，节奏比预想中稳。没有全部做完，但关键的取舍更清楚了。' },
      { id: 'prev-sat', day: '周六', date: '07.11', fullDate: '2026 年 7 月 11 日 · 周六', saved: false, text: '' },
      { id: 'prev-sun', day: '周日', date: '07.12', fullDate: '2026 年 7 月 12 日 · 周日', saved: true, text: '周日适合做一次轻复盘。上周的重点不是产出很多，而是把后面要走的路变得更清楚。' }
    ]
  },
  {
    id: 'current',
    monthLabel: '七月 · 本周',
    title: '2026 年 7 月 13 日 - 7 月 19 日',
    helper: '这一周已经走完，横向浏览七天；没写的日期仍保留为补写入口。',
    currentDayIndex: 6,
    entries: [
      { id: 'mon', day: '周一', date: '07.13', fullDate: '2026 年 7 月 13 日 · 周一', saved: true, text: '今天继续整理时间管理项目。上午先把晚上模式清掉，再给侧边栏留出新的日记入口。做这件事的时候，我能感觉到这个产品正在从单纯记录时间，慢慢变成记录生活轨迹的工具。\n\n我希望日记不是另一个沉重的输入框，而是每天收尾时自然打开的地方。它应该能接住当天发生过的事、我对这些事情的判断，以及下一步想改变的小动作。' },
      { id: 'tue', day: '周二', date: '07.14', fullDate: '2026 年 7 月 14 日 · 周二', saved: true, text: '今天把日记模块重新打开看了一遍。昨天主要是在清理旧功能，今天开始想它真正应该怎么被使用。\n\n我发现这个入口不能太吵。它只需要在我想记录的时候安静地出现，左边让我知道这一周走到哪里，右边给我一个足够大的空间把想法写下来。' },
      { id: 'wed', day: '周三', date: '07.15', fullDate: '2026 年 7 月 15 日 · 周三', saved: true, text: '今天没有安排特别多任务。下午散步的时候想到，日记功能需要允许“不完整”。不是每天都要写成一篇漂亮文章，有时候一句话、几行片段就够了。\n\n好的记录系统应该降低心理负担，而不是每天提醒我还有一份作业没完成。' },
      { id: 'thu', day: '周四', date: '07.16', fullDate: '2026 年 7 月 16 日 · 周四', saved: true, text: '今天主要在想日记看板的结构。每日页面应该服务输入，每周页面应该服务观察。\n\n每日是安静的、可写的、能沉下来的；每周是展开的、横向比较的、能看出节奏的。这两个模式如果切换足够顺，日记就不只是存档，而会变成一个帮助我做选择的界面。' },
      { id: 'fri', day: '周五', date: '07.17', fullDate: '2026 年 7 月 17 日 · 周五', saved: true, text: '今天回看这一周的记录，发现自己其实完成了不少小的推进。以前我容易只看到没做完的部分，但日记把过程留下来了。\n\n如果系统能在周回顾里保留原文预览，我就能重新进入当时的语境，而不是只看到冰冷的统计。这一点很重要。' },
      { id: 'sat', day: '周六', date: '07.18', fullDate: '2026 年 7 月 18 日 · 周六', saved: true, text: '今天没有急着继续推进功能，而是把这一周的想法重新看了一遍。周一到周五其实一直在围绕同一个问题：怎么让记录变得更自然。\n\n如果把日记和日程放在一起，我希望它不是一个额外负担，而是一个收束动作。周末看这些记录时，能感到这一周不是散的，而是有一条线慢慢连起来。' },
      { id: 'sun', day: '周日', date: '07.19', fullDate: '2026 年 7 月 19 日 · 周日', saved: true, text: '今天是这一周的最后一天。现在再看七篇日记，会发现每天的重点其实不一样：有推进、有犹豫、有休息，也有重新选择。\n\n我希望每周视图在这个时候才完整展开。不是提前摆出七个空格逼我填满，而是等一周自然发生以后，把已经记录下来的东西铺开，让我看到这一周真实走过的路径。' }
    ]
  },
  {
    id: 'next',
    monthLabel: '七月 · 下周',
    title: '2026 年 7 月 20 日 - 7 月 26 日',
    helper: '下一周还没有开始，先作为未来周预览；到达日期后会变成可记录状态。',
    currentDayIndex: 6,
    entries: [
      { id: 'next-mon', day: '周一', date: '07.20', fullDate: '2026 年 7 月 20 日 · 周一', saved: false, future: true, text: '' },
      { id: 'next-tue', day: '周二', date: '07.21', fullDate: '2026 年 7 月 21 日 · 周二', saved: false, future: true, text: '' },
      { id: 'next-wed', day: '周三', date: '07.22', fullDate: '2026 年 7 月 22 日 · 周三', saved: false, future: true, text: '' },
      { id: 'next-thu', day: '周四', date: '07.23', fullDate: '2026 年 7 月 23 日 · 周四', saved: false, future: true, text: '' },
      { id: 'next-fri', day: '周五', date: '07.24', fullDate: '2026 年 7 月 24 日 · 周五', saved: false, future: true, text: '' },
      { id: 'next-sat', day: '周六', date: '07.25', fullDate: '2026 年 7 月 25 日 · 周六', saved: false, future: true, text: '' },
      { id: 'next-sun', day: '周日', date: '07.26', fullDate: '2026 年 7 月 26 日 · 周日', saved: false, future: true, text: '' }
    ]
  }
];

const getEntryStatus = (entry: DiaryEntry) => {
  if (entry.future) return '未到';
  return entry.saved ? '已写' : '未写';
};

const getEntryPreview = (entry: DiaryEntry) => {
  if (entry.text.trim()) return entry.text;
  if (entry.future) return '还未到这一天，先作为未来日记占位。';
  return '还没有写日记，点击后可以从空白页开始。';
};

const Diary: React.FC<DiaryProps> = ({ onWeeklyModeChange }) => {
  const [view, setView] = React.useState<DiaryView>('daily');
  const [weeks, setWeeks] = React.useState<DiaryWeek[]>(INITIAL_WEEKS);
  const [activeWeekIndex, setActiveWeekIndex] = React.useState(1);
  const [activeEntryId, setActiveEntryId] = React.useState('mon');
  const [toast, setToast] = React.useState('');

  const activeWeek = weeks[activeWeekIndex];
  const visibleEntries = activeWeek.entries.slice(0, activeWeek.currentDayIndex + 1);
  const activeEntry = visibleEntries.find(entry => entry.id === activeEntryId) ?? visibleEntries[0] ?? activeWeek.entries[0];
  const writtenCount = visibleEntries.filter(entry => entry.saved).length;
  const isWeekly = view === 'weekly';

  React.useEffect(() => {
    onWeeklyModeChange?.(isWeekly);
    return () => onWeeklyModeChange?.(false);
  }, [isWeekly, onWeeklyModeChange]);

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const isToday = (entry: DiaryEntry) => {
    return activeWeek.id === 'current' && activeWeek.entries[activeWeek.currentDayIndex]?.id === entry.id;
  };

  const openDailyEntry = (entryId: string) => {
    setActiveEntryId(entryId);
    setView('daily');
  };

  const switchWeek = (direction: 1 | -1) => {
    const nextIndex = (activeWeekIndex + direction + weeks.length) % weeks.length;
    const nextWeek = weeks[nextIndex];
    const nextEntry = nextWeek.entries.slice(0, nextWeek.currentDayIndex + 1)[0] ?? nextWeek.entries[0];
    setActiveWeekIndex(nextIndex);
    setActiveEntryId(nextEntry.id);
    setToast(direction > 0 ? '已切换到下一周' : '已切换到上一周');
  };

  const updateActiveEntryText = (text: string) => {
    setWeeks(prevWeeks => prevWeeks.map((week, weekIndex) => {
      if (weekIndex !== activeWeekIndex) return week;
      return {
        ...week,
        entries: week.entries.map(entry => (
          entry.id === activeEntry.id
            ? { ...entry, text, saved: false, future: false }
            : entry
        ))
      };
    }));
  };

  const saveActiveEntry = () => {
    setWeeks(prevWeeks => prevWeeks.map((week, weekIndex) => {
      if (weekIndex !== activeWeekIndex) return week;
      return {
        ...week,
        entries: week.entries.map(entry => (
          entry.id === activeEntry.id
            ? { ...entry, saved: entry.text.trim().length > 0, future: false }
            : entry
        ))
      };
    }));
    setToast('已保存当前日记');
  };

  const createTodayEntry = () => {
    setActiveWeekIndex(1);
    setActiveEntryId('mon');
    setView('daily');
    setToast('已打开今日');
  };

  return (
    <GlassCard
      intensity="medium"
      className={`w-full h-[85vh] flex flex-col bg-white overflow-hidden animate-[fadeIn_0.2s_ease-out] ${isWeekly ? 'md:h-[88vh]' : ''}`}
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
              <h3 className="text-base font-extrabold tracking-tight text-gray-950">{activeWeek.monthLabel}</h3>
              <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 text-[11px] font-bold text-gray-500">
                <Icons.Check size={13} />已到 {visibleEntries.length} 天 · 已写 {writtenCount} 天
              </span>
            </div>

            <div className="grid gap-2.5">
              {visibleEntries.map(entry => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setActiveEntryId(entry.id)}
                  className={`w-full rounded-[18px] border p-3.5 text-left transition hover:-translate-y-0.5 hover:bg-white ${entry.id === activeEntry.id ? 'border-gray-200 bg-white shadow-[0_10px_24px_rgba(28,33,42,0.045)]' : 'border-transparent bg-transparent'}`}
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
                {activeEntry.saved ? '已保存' : activeEntry.future ? '未到' : '未保存'}
              </span>
            </div>

            <textarea
              className="min-h-0 w-full resize-none border-0 bg-transparent pt-5 text-base font-medium leading-8 text-gray-900 outline-none placeholder:text-gray-400"
              value={activeEntry.text}
              onChange={(event) => updateActiveEntryText(event.target.value)}
              placeholder="开始记录..."
              spellCheck={false}
            />

            <footer className="flex items-center justify-between gap-4 pt-4 text-xs font-bold text-gray-500">
              <span>{activeEntry.text.trim() ? `约 ${activeEntry.text.length} 字 · 静态演示` : '空白日记 · 等待输入'}</span>
              <button
                type="button"
                onClick={saveActiveEntry}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-gray-950 px-5 text-xs font-black text-white transition hover:-translate-y-0.5"
              >
                <Icons.Check size={16} />保存日记
              </button>
            </footer>
          </section>
        </section>
      ) : (
        <section className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden bg-white p-5 md:p-6">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-gray-950">{activeWeek.title}</h3>
            <p className="mt-1 text-sm font-semibold text-gray-500">{activeWeek.helper}</p>
          </div>

          <div
            className={`grid min-h-0 gap-3 overflow-x-auto pb-1 ${visibleEntries.length < 7 ? 'justify-start' : ''}`}
            style={{ gridTemplateColumns: visibleEntries.length < 7 ? `repeat(${visibleEntries.length}, minmax(220px, 280px))` : `repeat(${visibleEntries.length}, minmax(170px, 1fr))` }}
          >
            {visibleEntries.map(entry => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openDailyEntry(entry.id)}
                className={`grid min-h-[520px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[20px] border bg-white text-left transition hover:-translate-y-0.5 ${isToday(entry) ? 'border-gray-200 shadow-[0_10px_24px_rgba(28,33,42,0.045)]' : 'border-gray-200'} ${entry.saved ? '' : 'bg-gray-50'}`}
              >
                <div className="flex items-start justify-between gap-3 px-4 pb-2 pt-4">
                  <div>
                    <p className="text-sm font-black text-gray-950">{entry.day}{isToday(entry) ? ' · 今天' : ''}</p>
                    <p className="mt-1 text-[11px] font-bold text-gray-500">{entry.date} · {getEntryStatus(entry)}</p>
                  </div>
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${entry.saved ? 'bg-gray-700' : 'bg-gray-300'}`} />
                </div>
                <div className="min-h-0 overflow-y-auto px-4 pb-4 text-[13px] font-medium leading-6 text-gray-800 whitespace-pre-line">
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
