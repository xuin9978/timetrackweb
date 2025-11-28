import React, { useState, useMemo } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { CalendarEvent, Tag } from '../types';
import { getDurationInMinutes, formatDurationFromMinutes } from '../utils/dateUtils';

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
}

type EventViewType = 'list' | 'group' | 'stats';

interface EventCardProps {
    event: CalendarEvent;
    tag: Tag;
    onClick?: (event: CalendarEvent) => void;
    index: number;
}

const EventCard = React.memo(({ event, tag, onClick, index }: EventCardProps) => {
    return (
        <div
            onClick={() => onClick?.(event)}
            className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-transparent hover:border-gray-200 hover:shadow-sm transition-all duration-200 cursor-pointer animate-[slideInUp_0.4s_ease-out_forwards]"
            style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
        >
            <div className={`
        w-1 h-8 rounded-full
        ${tag.color}
        `} />

            <div className="flex-1 min-w-0">
                <h3 className="text-gray-900 font-medium text-sm truncate group-hover:text-black transition-colors">
                    {event.title}
                </h3>
                <div className="flex items-center gap-2 text-gray-500 text-[11px] mt-0.5">
                    <Icons.Clock size={11} />
                    <span className="font-medium">{event.startTime} - {event.endTime}</span>
                </div>
            </div>

            <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-all duration-200">
                <Icons.ChevronRight size={16} />
            </button>
        </div>
    );
});

const EventPanel: React.FC<EventPanelProps> = ({ panelTitle, panelContext, events, tags, visibleTags, onToggleTagVisibility, onAddEvent, onEventClick }) => {
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

    const getTagInfo = (id: string) => {
        return tags.find(t => t.id === id) || { id: 'unknown', label: '未分类', color: 'bg-gray-400', icon: '❓' };
    };

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


    const handleSetViewType = (type: EventViewType) => {
        setIsButtonAnimating(type);
        setViewType(current => current === type ? 'list' : type);
        setTimeout(() => setIsButtonAnimating(''), 300);
    };

    const noEventsMessage = useMemo(() => {
        switch (panelContext) {
            case 'month': return '本月无日程';
            case 'week': return '本周无日程';
            default: return '今日无日程';
        }
    }, [panelContext]);

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
        <GlassCard intensity="medium" className="h-full flex flex-col p-5 overflow-hidden bg-white shadow-lg border-l border-gray-100">
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
                            className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 text-xs font-medium border
                        ${viewType === 'group'
                                    ? 'bg-gray-100 text-black border-gray-200'
                                    : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'
                                }
                        ${isButtonAnimating === 'group' ? 'scale-95' : ''}
                    `}
                        >
                            <Icons.Timer size={14} className={`transition-transform duration-500 ${viewType === 'group' ? 'rotate-180' : ''}`} />
                            <span>分类</span>
                        </button>

                        <button
                            onClick={() => handleSetViewType('stats')}
                            className={`
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
                                className={`
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
                                    <div className="absolute top-full left-0 mt-2 w-60 bg-white shadow-xl rounded-2xl border border-gray-100 z-50 p-3 animate-[scaleIn_0.2s_ease-out_forwards] origin-top-left">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2 pb-2">显示日历</h4>
                                        <div className="space-y-1">
                                            {tags.map(tag => (
                                                <label key={tag.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
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
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-black hover:bg-gray-200 transition-all duration-200 hover:rotate-90 active:scale-90"
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
                                            <div className="flex items-center gap-3 py-1 text-gray-400">
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
                                            <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
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
                        <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
                            <Icons.Calendar size={24} className="text-gray-300" />
                        </div>
                        <p className="font-medium text-sm text-gray-400">{noEventsMessage}</p>
                    </div>
                )}
            </div>

            {/* Insight Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-2 text-indigo-500 text-[10px] uppercase tracking-widest font-bold mb-1">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                    智能洞察
                </div>
            </div>
        </GlassCard>
    );
};

export default EventPanel;
