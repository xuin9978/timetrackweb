import React, { useState, useMemo } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { CalendarEvent, Tag } from '../types';
import { getDurationInMinutes, formatDurationFromMinutes, getMinutesFromTime } from '../utils/dateUtils';

type PanelContext = 'day' | 'week' | 'month';

interface EventPanelProps {
    panelTitle: string;
    panelContext: PanelContext;
    events: CalendarEvent[];
    tags: Tag[];
    visibleTags: string[];
    onToggleTagVisibility: (tagId: string) => void;
    onAddEvent: () => void;
    onEventClick?: (event: CalendarEvent) => void;
    hasHiddenAllTags?: boolean;
}

type EventViewType = 'list' | 'group' | 'stats';

interface EventCardProps {
    event: CalendarEvent;
    tag: Tag;
    onClick?: (event: CalendarEvent) => void;
    index: number;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getDisplayTitle = (title: string, icon?: string) => {
    if (!icon) return title.replace(/^[\p{Extended_Pictographic}\uFE0F]+\s*[：:]\s*/u, '');
    return title
        .replace(new RegExp(`^${escapeRegExp(icon)}\\s*[：:]\\s*`), '')
        .replace(/^[\p{Extended_Pictographic}\uFE0F]+\s*[：:]\s*/u, '');
};

const EventCard = React.memo(({ event, tag, onClick, index }: EventCardProps) => {
    const displayTitle = getDisplayTitle(event.title, tag.icon);

    return (
        <div
            onClick={() => onClick?.(event)}
            className="event-panel-card group flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer animate-[slideInUp_0.4s_ease-out_forwards]"
            style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
        >
            <div className={`
        w-1 h-8 rounded-full
        ${tag.color}
        `} />

            <div className="flex-1 min-w-0">
                <h3 className="text-gray-900 font-medium text-sm truncate group-hover:text-black transition-colors">
                    {displayTitle}
                </h3>
                <div className="flex items-center gap-2 text-gray-500 text-[11px] mt-0.5">
                    <Icons.Clock size={11} />
                    <span className="font-medium">{event.startTime} - {event.endTime}</span>
                </div>
            </div>

            <div className="opacity-0 group-hover:opacity-100 text-gray-400 group-hover:text-gray-600 transition-all duration-200" aria-hidden="true">
                <Icons.ChevronRight size={16} />
            </div>
        </div>
    );
});

const EventPanel: React.FC<EventPanelProps> = ({ panelTitle, panelContext, events, tags, visibleTags, onToggleTagVisibility, onAddEvent, onEventClick, hasHiddenAllTags = false }) => {
    const [viewType, setViewType] = useState<EventViewType>('list');
    const [isButtonAnimating, setIsButtonAnimating] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const toggleGroup = (categoryId: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(categoryId)) {
                next.delete(categoryId);
            } else {
                next.add(categoryId);
            }
            return next;
        });
    };

    const getTagInfo = useMemo(() => {
        const cache = new Map<string, Tag>();
        const defaultTag = { id: 'unknown', label: '未分类', color: 'bg-gray-400', icon: '❓' } as Tag;
        return (id: string) => {
            if (cache.has(id)) return cache.get(id)!;
            const tag = tags.find(t => t.id === id) || defaultTag;
            cache.set(id, tag);
            return tag;
        };
    }, [tags]);

    const groupedEvents = useMemo(() => {
        if (viewType !== 'group') return null;
        const groups: Record<string, CalendarEvent[]> = {};
        events.forEach(e => {
            if (!groups[e.category]) groups[e.category] = [];
            groups[e.category].push(e);
        });
        return groups;
    }, [events, viewType]);

    const timeStatistics = useMemo(() => {
        if (viewType !== 'stats') return null;
        const stats: Record<string, number> = {};
        events.forEach(e => {
            if (!stats[e.category]) stats[e.category] = 0;
            stats[e.category] += getDurationInMinutes(e.startTime, e.endTime);
        });
        return Object.entries(stats).sort(([, timeA], [, timeB]) => timeB - timeA);
    }, [events, viewType]);

    const insights = useMemo(() => {
        const sorted = [...events].sort((a, b) => {
            const dateDiff = a.date.getTime() - b.date.getTime();
            if (dateDiff !== 0) return dateDiff;
            return a.startTime.localeCompare(b.startTime);
        });
        const totalMinutes = sorted.reduce((sum, event) => sum + getDurationInMinutes(event.startTime, event.endTime), 0);
        const tagTotals = sorted.reduce<Record<string, number>>((acc, event) => {
            acc[event.category] = (acc[event.category] || 0) + getDurationInMinutes(event.startTime, event.endTime);
            return acc;
        }, {});
        const topTagEntry = Object.entries(tagTotals).sort(([, a], [, b]) => b - a)[0];

        const eventsByDay = sorted.reduce<Record<string, CalendarEvent[]>>((acc, event) => {
            const key = event.date.toDateString();
            acc[key] = acc[key] || [];
            acc[key].push(event);
            return acc;
        }, {});

        let longestContinuous = 0;
        let nextFree = '暂无明显空档';
        let foundFree = false;
        const now = new Date();
        const nowMinutes = getMinutesFromTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);

        Object.values(eventsByDay).forEach(dayEvents => {
            const daySorted = [...dayEvents].sort((a, b) => a.startTime.localeCompare(b.startTime));
            let clusterStart = getMinutesFromTime(daySorted[0].startTime);
            let clusterEnd = getMinutesFromTime(daySorted[0].endTime);
            const isTodayGroup = daySorted[0].date.toDateString() === now.toDateString();
            let previousEnd = isTodayGroup ? nowMinutes : 0;

            daySorted.forEach((event, index) => {
                const start = getMinutesFromTime(event.startTime);
                const end = getMinutesFromTime(event.endTime);
                if (!foundFree && start - previousEnd >= 15) {
                    const freeStartH = Math.floor(previousEnd / 60).toString().padStart(2, '0');
                    const freeStartM = (previousEnd % 60).toString().padStart(2, '0');
                    nextFree = `${freeStartH}:${freeStartM} - ${event.startTime}`;
                    foundFree = true;
                }

                if (index === 0) {
                    clusterStart = start;
                    clusterEnd = end;
                } else if (start - clusterEnd <= 5) {
                    clusterEnd = Math.max(clusterEnd, end);
                } else {
                    longestContinuous = Math.max(longestContinuous, clusterEnd - clusterStart);
                    clusterStart = start;
                    clusterEnd = end;
                }
                previousEnd = Math.max(previousEnd, end);
            });

            longestContinuous = Math.max(longestContinuous, clusterEnd - clusterStart);
            if (!foundFree && 1440 - previousEnd >= 15) {
                const freeStartH = Math.floor(previousEnd / 60).toString().padStart(2, '0');
                const freeStartM = (previousEnd % 60).toString().padStart(2, '0');
                nextFree = `${freeStartH}:${freeStartM} - 24:00`;
                foundFree = true;
            }
        });

        const topTag = topTagEntry ? getTagInfo(topTagEntry[0]) : null;

        return {
            total: formatDurationFromMinutes(totalMinutes),
            topTagLabel: topTag ? `${topTag.icon || ''} ${topTag.label}`.trim() : '暂无',
            longest: longestContinuous > 0 ? formatDurationFromMinutes(longestContinuous) : '暂无',
            nextFree
        };
    }, [events, getTagInfo]);


    const handleSetViewType = (type: EventViewType) => {
        setIsButtonAnimating(type);
        setViewType(current => current === type ? 'list' : type);
        setTimeout(() => setIsButtonAnimating(''), 300);
    };

    const noEventsMessage = hasHiddenAllTags
        ? '已隐藏全部标签'
        : panelContext === 'month'
            ? '本月无日程'
            : panelContext === 'week'
                ? '本周无日程'
                : '今日无日程';

    const renderEventCard = (event: CalendarEvent, index: number, tag?: Tag) => {
        const tagInfo = tag || getTagInfo(event.category);
        return (
            <EventCard
                key={event.id}
                event={event}
                tag={tagInfo}
                onClick={onEventClick}
                index={index}
            />
        );
    };

    return (
        <GlassCard intensity="medium" className="event-panel h-full flex flex-col p-5 overflow-hidden bg-white shadow-lg border-l border-gray-100">
            {/* Header */}
            <div className="flex flex-col gap-4 mb-4 flex-shrink-0">
                <div>
                    <h2 className="text-xl font-semibold text-black tracking-tight">日程</h2>
                    <p className="text-gray-400 text-xs font-medium tracking-wide uppercase mt-1">
                        {panelTitle}
                    </p>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleSetViewType('group')}
                            title="分类"
                            aria-label="分类"
                            className={`
                        event-panel-chip
                        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 text-xs font-medium border
                        ${viewType === 'group'
                                    ? 'bg-gray-100 text-black border-gray-200'
                                    : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                                }
                        ${isButtonAnimating === 'group' ? 'scale-95' : ''}
                        `}
                        >
                            <Icons.Timer size={14} className={`transition-transform duration-500 ${viewType === 'group' ? 'rotate-180' : ''}`} />
                        </button>

                        <button
                            onClick={() => handleSetViewType('stats')}
                            title="统计"
                            aria-label="统计"
                            className={`
                        event-panel-chip
                        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 text-xs font-medium border
                        ${viewType === 'stats'
                                    ? 'bg-gray-100 text-black border-gray-200'
                                    : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                                }
                        ${isButtonAnimating === 'stats' ? 'scale-95' : ''}
                    `}
                        >
                            <Icons.PieChart size={14} />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(prev => !prev)}
                                title="筛选标签"
                                aria-label="筛选标签"
                                className={`
                            event-panel-chip
                            flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 text-xs font-medium border
                            ${isFilterOpen
                                        ? 'bg-gray-100 text-black border-gray-200'
                                        : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                                    }
                        `}
                            >
                                <Icons.Filter size={14} />
                            </button>
                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)}></div>
                                    <div className="event-panel-popover absolute top-full left-0 mt-2 w-60 bg-white shadow-xl rounded-2xl border border-gray-100 z-50 p-3 animate-[scaleIn_0.2s_ease-out_forwards] origin-top-left">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pb-2">显示日历</h4>
                                        <div className="space-y-1">
                                            {tags.map(tag => (
                                                <label key={tag.id} className="event-panel-filter-row flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleTags.includes(tag.id)}
                                                        onChange={() => onToggleTagVisibility(tag.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className={`w-2 h-2 rounded-full ${tag.color}`} />
                                                    <span className="text-sm font-medium text-gray-800">{tag.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={onAddEvent}
                        title="新增日程"
                        aria-label="新增日程"
                        className="event-panel-add w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-all duration-200 hover:rotate-90 active:scale-90"
                    >
                        <Icons.Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto hide-scrollbar relative space-y-3 pr-1">
                {events.length > 0 ? (
                    <div key={viewType} className="space-y-4">
                        {viewType === 'group' && groupedEvents ? (
                            Object.entries(groupedEvents)
                                .map(([categoryId, items]: [string, CalendarEvent[]]) => {
                                    const totalDurationMinutes = items.reduce((acc, event) => acc + getDurationInMinutes(event.startTime, event.endTime), 0);
                                    return { categoryId, items, totalDurationMinutes };
                                })
                                .sort((a, b) => {
                                    const indexA = tags.findIndex(t => t.id === a.categoryId);
                                    const indexB = tags.findIndex(t => t.id === b.categoryId);
                                    return (indexA === -1 ? 9999 : indexA) - (indexB === -1 ? 9999 : indexB);
                                })
                                .map(({ categoryId, items, totalDurationMinutes }, groupIndex) => {
                                    const tagInfo = getTagInfo(categoryId);
                                    const formattedDuration = formatDurationFromMinutes(totalDurationMinutes);
                                    const isCollapsed = collapsedGroups.has(categoryId);

                                    return (
                                        <div
                                            key={categoryId}
                                            className="space-y-2 animate-[slideInUp_0.4s_ease-out_forwards]"
                                            style={{ animationDelay: `${groupIndex * 100}ms`, opacity: 0 }}
                                        >
                                            <div className="event-panel-group-header flex items-center gap-3 py-1 text-gray-400">
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${tagInfo.color}`} />
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                                                        {tagInfo.label}
                                                    </span>
                                                </div>
                                                <div className="flex-1 flex items-center gap-2 text-xs font-medium justify-center min-w-0">
                                                    <div className="h-px w-full bg-gray-100"></div>
                                                    <span className="whitespace-nowrap">{formattedDuration}</span>
                                                    <div className="h-px w-full bg-gray-100"></div>
                                                </div>

                                                {/* Toggle Button */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleGroup(categoryId);
                                                    }}
                                                    className="p-1 hover:bg-gray-100 rounded-md transition-colors focus:outline-none"
                                                    aria-label={isCollapsed ? "展开分组" : "折叠分组"}
                                                >
                                                    <Icons.ChevronRight
                                                        size={12}
                                                        className={`text-gray-400 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-90'}`}
                                                    />
                                                </button>

                                                <span className="font-mono text-[10px] flex-shrink-0 w-3 text-right">{items.length}</span>
                                            </div>

                                            {/* Collapsible Content */}
                                            <div
                                                className={`space-y-2 overflow-hidden transition-all duration-300 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0 margin-0' : 'max-h-[1000px] opacity-100'
                                                    }`}
                                            >
                                                {items.map((event, index) => renderEventCard(event, index, tagInfo))}
                                            </div>
                                        </div>
                                    );
                                })
                        ) : viewType === 'stats' && timeStatistics ? (
                            <div className="space-y-4">
                                {timeStatistics.map(([categoryId, totalMinutes], index) => {
                                    const tagInfo = getTagInfo(categoryId);
                                    return (
                                        <div
                                            key={categoryId}
                                            className="space-y-2 animate-[slideInUp_0.4s_ease-out_forwards]"
                                            style={{ animationDelay: `${index * 100}ms`, opacity: 0 }}
                                        >
                                            <div className="flex items-center gap-2 py-1 opacity-80">
                                                <div className={`w-1.5 h-1.5 rounded-full ${tagInfo.color}`} />
                                                <span className={`text-[10px] font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap`}>
                                                    {tagInfo.label}
                                                </span>
                                                <div className="h-[1px] flex-1 bg-gray-100" />
                                            </div>
                                            <div className="event-panel-stat-row flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                                <div className={`w-10 h-10 rounded-lg ${tagInfo.color} bg-opacity-20 flex items-center justify-center text-xl shrink-0`}>
                                                    {tagInfo.icon || '⏱️'}
                                                </div>
                                                <div className="font-mono text-sm font-semibold text-gray-800 bg-white px-3 py-1.5 rounded-md border border-gray-200">
                                                    {formatDurationFromMinutes(totalMinutes)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            events.map((event, index) => renderEventCard(event, index))
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 animate-[fadeIn_0.5s]">
                        <div className="event-panel-empty-icon w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                            <Icons.Calendar size={24} className="text-gray-300" />
                        </div>
                        <p className="font-medium text-sm text-gray-400">{noEventsMessage}</p>
                        {hasHiddenAllTags && (
                            <p className="max-w-40 text-center text-xs text-gray-300">在筛选里至少勾选一个标签即可恢复显示。</p>
                        )}
                    </div>
                )}
            </div>

            {/* Insight Footer */}
            <div className="event-panel-insights mt-4 pt-3 border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2 text-indigo-500 text-[10px] uppercase tracking-widest font-bold mb-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    智能洞察
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="event-panel-insight rounded-xl bg-gray-50 border border-gray-100 p-2">
                        <div className="text-gray-400">总时长</div>
                        <div className="font-semibold text-gray-800">{insights.total}</div>
                    </div>
                    <div className="event-panel-insight rounded-xl bg-gray-50 border border-gray-100 p-2">
                        <div className="text-gray-400">最多标签</div>
                        <div className="font-semibold text-gray-800 truncate">{insights.topTagLabel}</div>
                    </div>
                    <div className="event-panel-insight rounded-xl bg-gray-50 border border-gray-100 p-2">
                        <div className="text-gray-400">最长连续</div>
                        <div className="font-semibold text-gray-800">{insights.longest}</div>
                    </div>
                    <div className="event-panel-insight rounded-xl bg-gray-50 border border-gray-100 p-2">
                        <div className="text-gray-400">下一段空闲</div>
                        <div className="font-semibold text-gray-800 truncate">{insights.nextFree}</div>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

export default EventPanel;
