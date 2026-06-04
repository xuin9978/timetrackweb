import React, { useState, useMemo, useRef } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { isSameDay, getDurationString, getDurationInMinutes, formatDurationFromMinutes, getTagColorHex } from '../utils/dateUtils';
import { CalendarEvent, Tag } from '../types';
import TagManagerModal from './TagManagerModal';
import MiniCalendar from './MiniCalendar';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface HistoryProps {
    events: CalendarEvent[];
    tags: Tag[];
    onOpenModal: (startTime?: string, endTime?: string, date?: Date, event?: CalendarEvent) => void;
    onAddTag: (label: string, color: string, icon: string) => Promise<void> | void;
    onUpdateTag: (tag: Tag) => Promise<void> | void;
    onDeleteTag: (id: string) => Promise<void> | void;
    onReorderTags: (tags: Tag[]) => void;
    onSaveOrder?: (tagsToSave?: Tag[]) => Promise<void>;
}

const History: React.FC<HistoryProps> = ({ events, tags, onOpenModal, onAddTag, onUpdateTag, onDeleteTag, onReorderTags, onSaveOrder }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [groupMode, setGroupMode] = useState(false);
    const [isButtonAnimating, setIsButtonAnimating] = useState(false);
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [visibleHistoryTags, setVisibleHistoryTags] = useState<string[]>([]);
    const hasInitializedHistoryTags = useRef(false);

    React.useEffect(() => {
        const tagIds = tags.map(tag => tag.id);
        setVisibleHistoryTags(prev => {
            if (!hasInitializedHistoryTags.current) {
                hasInitializedHistoryTags.current = true;
                return tagIds;
            }
            const kept = prev.filter(id => tagIds.includes(id));
            const added = tagIds.filter(id => !prev.includes(id));
            return [...kept, ...added];
        });
    }, [tags]);

    const eventDates = useMemo(() => {
        return events.map(event => event.date);
    }, [events]);

    const allEventsForDate = useMemo(() => {
        return events
            .filter(e => isSameDay(e.date, viewDate))
            .sort((a, b) => {
                const dateDiff = a.date.getTime() - b.date.getTime();
                if (dateDiff !== 0) return dateDiff;
                return a.startTime.localeCompare(b.startTime);
            });
    }, [events, viewDate]);

    const displayedEvents = useMemo(() => {
        return allEventsForDate.filter(event => {
            if (!event.category) return true;
            return visibleHistoryTags.includes(event.category);
        });
    }, [allEventsForDate, visibleHistoryTags]);

    const hasHiddenAllTags = tags.length > 0 && visibleHistoryTags.length === 0;
    const hiddenByFilter = allEventsForDate.length > 0 && displayedEvents.length === 0 && !hasHiddenAllTags;

    const handleDateSelect = React.useCallback((date: Date) => {
        setViewDate(date);
        setIsCalendarOpen(false);
    }, []);

    const getSmartIcon = (tag?: Tag) => {
        if (tag?.icon) return tag.icon;
        return '📅';
    };

    const getTagInfo = (categoryId: string) => {
        const tag = tags.find(t => t.id === categoryId);
        return tag || { id: 'unknown', label: '未分类', color: 'bg-gray-400', icon: '❓' };
    };

    const handleToggleHistoryTag = React.useCallback((tagId: string) => {
        setVisibleHistoryTags(prev =>
            prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
        );
    }, []);

    const handleRestoreAllTags = React.useCallback(() => {
        setVisibleHistoryTags(tags.map(tag => tag.id));
    }, [tags]);

    const groupedEvents = useMemo(() => {
        if (!groupMode) return null;
        const groups: Record<string, CalendarEvent[]> = {};
        displayedEvents.forEach(e => {
            if (!groups[e.category]) groups[e.category] = [];
            groups[e.category].push(e);
        });
        return groups;
    }, [displayedEvents, groupMode]);

    const handleToggleGroup = () => {
        setIsButtonAnimating(true);
        setGroupMode(!groupMode);
        setTimeout(() => setIsButtonAnimating(false), 300);
    };

    const handleEventClick = React.useCallback((event: CalendarEvent) => {
        onOpenModal(undefined, undefined, undefined, event);
    }, [onOpenModal]);

    return (
        <>
            <GlassCard intensity="medium" className="history-card w-full h-full md:h-[85vh] max-w-4xl mx-auto flex flex-col relative overflow-hidden bg-[#FAFAFA]">
                <div className="history-toolbar flex items-center justify-between p-6 md:p-8 border-b border-gray-100 z-10 relative gap-4">
                    <div className="relative">
                        <button
                            onClick={() => setIsCalendarOpen(prev => !prev)}
                            className="history-date-button flex items-center gap-2 text-lg font-semibold text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-xl transition-colors"
                        >
                            <Icons.Calendar size={18} className="text-gray-500" />
                            <span>{format(viewDate, 'yyyy年 M月 d日', { locale: zhCN })}</span>
                        </button>

                        {isCalendarOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsCalendarOpen(false)}></div>
                                <div className="absolute top-full left-0 mt-2 z-20 animate-[scaleIn_0.2s_ease-out_forwards] origin-top-left">
                                    <MiniCalendar
                                        selectedDate={viewDate}
                                        onDateSelect={handleDateSelect}
                                        eventDates={eventDates}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleToggleGroup}
                            title="按标签分组"
                            aria-label="按标签分组"
                            className={`
                            history-tool-button
                            flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 border text-sm font-medium
                            ${groupMode
                                    ? 'bg-black text-white border-black shadow-md'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                }
                            ${isButtonAnimating ? 'scale-95' : ''}
                        `}
                        >
                            <Icons.Timer size={18} className={`transition-transform duration-500 ${groupMode ? 'rotate-180' : ''}`} />
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsFilterOpen(prev => !prev)}
                            className={`
                                history-tool-button
                                flex items-center justify-center w-10 h-10 rounded-full border transition-all
                                ${isFilterOpen || visibleHistoryTags.length !== tags.length
                                    ? 'bg-black text-white border-black shadow-md'
                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black'
                                }
                            `}
                                title="筛选标签"
                                aria-label="筛选标签"
                            >
                                <Icons.Filter size={18} />
                            </button>
                            {isFilterOpen && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                                    <div className="history-filter-popover absolute top-full right-0 mt-2 w-64 bg-white shadow-xl rounded-2xl border border-gray-100 z-20 p-3 animate-[scaleIn_0.2s_ease-out_forwards] origin-top-right">
                                        <div className="flex items-center justify-between px-2 pb-2">
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">历史筛选</h4>
                                            <button onClick={handleRestoreAllTags} className="text-xs text-blue-600 font-medium hover:text-blue-700">全选</button>
                                        </div>
                                        <div className="space-y-1">
                                            {tags.map(tag => (
                                                <label key={tag.id} className="history-filter-row flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleHistoryTags.includes(tag.id)}
                                                        onChange={() => handleToggleHistoryTag(tag.id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full"
                                                        style={{ backgroundColor: getTagColorHex(tag.color) }}
                                                    />
                                                    <span className="text-sm font-medium text-gray-800">{tag.icon ? `${tag.icon} ` : ''}{tag.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={() => setIsTagManagerOpen(true)}
                            className="history-tool-button flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black transition-all"
                            title="标签管理"
                        >
                            <Icons.Tags size={18} />
                        </button>
                    </div>
                </div>

                <div className="history-content flex-1 overflow-y-auto hide-scrollbar p-6 md:p-8 relative">
                    {displayedEvents.length === 0 ? (
                        <div className="history-empty h-full flex flex-col items-center justify-center text-gray-400 space-y-6 animate-[fadeIn_0.5s_ease-out]">
                            <div className="history-empty-icon w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                <Icons.History size={48} className="opacity-20" />
                            </div>
                            <div className="text-center space-y-3">
                                <p className="text-xl font-normal tracking-tight text-gray-300">
                                    {hasHiddenAllTags ? '已隐藏全部标签' : hiddenByFilter ? '当前筛选下无记录' : isSameDay(viewDate, new Date()) ? '今日暂无记录' : '该日无记录'}
                                </p>
                                {(hasHiddenAllTags || hiddenByFilter) && (
                                    <button
                                        onClick={handleRestoreAllTags}
                                        className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-sm font-medium"
                                    >
                                        恢复全部标签
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div key={groupMode ? 'grouped' : 'list'} className="space-y-6 max-w-3xl mx-auto">
                            {groupMode && groupedEvents ? (
                                // Sort groups by tag order
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
                                        return (
                                            <div
                                                key={categoryId}
                                                className="space-y-3 animate-[slideInUp_0.5s_ease-out_forwards]"
                                                style={{ animationDelay: `${groupIndex * 100}ms`, opacity: 0 }}
                                            >
                                                {/* Group Header */}
                                                <div className="flex items-center gap-3 py-1 text-gray-400">
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {tagInfo.icon && <span className="text-base">{tagInfo.icon}</span>}
                                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">
                                                            {tagInfo.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 flex items-center gap-2 text-xs font-medium justify-center min-w-0">
                                                        <div className="h-px w-full bg-gray-100"></div>
                                                        <span className="whitespace-nowrap text-gray-400">{formattedDuration}</span>
                                                        <div className="h-px w-full bg-gray-100"></div>
                                                    </div>
                                                    <span className="font-mono text-xs text-gray-400 flex-shrink-0 bg-gray-100 px-2 py-1 rounded-md">{items.length}</span>
                                                </div>

                                                {items.map((event, index) => (
                                                    <div
                                                        key={event.id}
                                                        className="animate-[scaleIn_0.4s_ease-out_forwards]"
                                                        style={{ animationDelay: `${(groupIndex * 100) + (index * 50) + 100}ms`, opacity: 0 }}
                                                    >
                                                        <HistoryCard
                                                            event={event}
                                                            icon={getSmartIcon(tagInfo)}
                                                            tag={tagInfo}
                                                            showCategoryChrome={false}
                                                            onEventClick={handleEventClick}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })
                            ) : (
                                displayedEvents.map((event, index) => {
                                    const tagInfo = getTagInfo(event.category);
                                    return (
                                        <div
                                            key={event.id}
                                            className="animate-[slideInUp_0.4s_ease-out_forwards]"
                                            style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
                                        >
                                            <HistoryCard
                                                event={event}
                                                icon={getSmartIcon(tagInfo)}
                                                tag={tagInfo}
                                                onEventClick={handleEventClick}
                                            />
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </GlassCard>

            <TagManagerModal
                isOpen={isTagManagerOpen}
                onClose={() => setIsTagManagerOpen(false)}
                tags={tags}
                onAddTag={onAddTag}
                onUpdateTag={onUpdateTag}
                onDeleteTag={onDeleteTag}
                onReorderTags={onReorderTags}
                onSaveOrder={onSaveOrder}
            />
        </>
    );
};

interface HistoryCardProps {
    event: CalendarEvent;
    icon: string;
    tag: Tag;
    showCategoryChrome?: boolean;
    onEventClick: (event: CalendarEvent) => void;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const HistoryCard: React.FC<HistoryCardProps> = React.memo(({ event, icon, tag, showCategoryChrome = true, onEventClick }) => {
    const displayTitle = !icon
        ? event.title.replace(/^[\p{Extended_Pictographic}\uFE0F]+\s*[：:]\s*/u, '')
        : event.title
            .replace(new RegExp(`^${escapeRegExp(icon)}\\s*[：:]\\s*`), '')
            .replace(/^[\p{Extended_Pictographic}\uFE0F]+\s*[：:]\s*/u, '');

    return (
        <div
            onClick={() => onEventClick(event)}
            className={`history-event-card group relative bg-white border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-2 flex items-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer ${showCategoryChrome ? 'gap-2' : 'gap-0'}`}
        >
            {showCategoryChrome && (
                <div className={`w-8 h-8 rounded-md ${tag.color} bg-opacity-20 flex flex-shrink-0 items-center justify-center text-base`}>
                    {icon}
                </div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2 mb-0.5">
                    <h3 className="text-black font-medium text-xs leading-tight truncate">{displayTitle}</h3>
                </div>

                <div className="flex items-center gap-1.5 text-gray-400 text-[10px] leading-none">
                    <span className="font-mono bg-gray-50 px-1 py-[1px] rounded text-[9px] text-gray-500 border border-gray-100">
                        {event.startTime} - {event.endTime}
                    </span>
                    <span className="flex items-center gap-1">
                        <Icons.Clock size={9} />
                        <span>{getDurationString(event.startTime, event.endTime)}</span>
                    </span>
                </div>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-2 text-gray-300 hover:text-gray-500">
                <Icons.ChevronRight size={12} />
            </div>
        </div>
    );
});

export default History;
