import React, { useState, useMemo } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { isSameDay, getDurationString, getDurationInMinutes, formatDurationFromMinutes } from '../utils/dateUtils';
import { CalendarEvent, Tag } from '../types';
import TagManagerModal from './TagManagerModal';
import MiniCalendar from './MiniCalendar';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface HistoryProps {
    events: CalendarEvent[];
    tags: Tag[];
    onOpenModal: (startTime?: string, endTime?: string, date?: Date, event?: CalendarEvent) => void;
    onAddTag: (label: string, color: string, icon: string) => void;
    onUpdateTag: (tag: Tag) => void;
    onDeleteTag: (id: string) => void;
    onReorderTags: (tags: Tag[]) => void;
    onSaveOrder?: () => Promise<void>;
}

const History: React.FC<HistoryProps> = ({ events, tags, onOpenModal, onAddTag, onUpdateTag, onDeleteTag, onReorderTags, onSaveOrder }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [groupMode, setGroupMode] = useState(false);
    const [isButtonAnimating, setIsButtonAnimating] = useState(false);
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const displayedEvents = useMemo(() => {
        const filtered = events.filter(e => isSameDay(e.date, viewDate));
        return [...filtered].reverse();
    }, [events, viewDate]);

    const handleDateSelect = React.useCallback((date: Date) => {
        setViewDate(date);
        setIsCalendarOpen(false);
    }, []);

    const getSmartIcon = (event: CalendarEvent, tag?: Tag) => {
        if (tag?.icon) return tag.icon;
        return '📅';
    };

    const getTagInfo = (categoryId: string) => {
        const tag = tags.find(t => t.id === categoryId);
        return tag || { id: 'unknown', label: '未分类', color: 'bg-gray-400', icon: '❓' };
    };

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
            <GlassCard intensity="medium" className="w-full h-full md:h-[85vh] max-w-4xl mx-auto flex flex-col relative overflow-hidden bg-[#FAFAFA]">
                <div className="flex items-center justify-between p-6 md:p-8 border-b border-gray-100 z-10 relative gap-4">
                    <div className="relative">
                        <button
                            onClick={() => setIsCalendarOpen(prev => !prev)}
                            className="flex items-center gap-2 text-lg font-semibold text-black bg-gray-50 hover:bg-gray-100 border border-gray-200 px-4 py-2 rounded-xl transition-colors"
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
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleToggleGroup}
                            className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-300 border text-sm font-medium
                            ${groupMode
                                    ? 'bg-black text-white border-black shadow-md'
                                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                }
                            ${isButtonAnimating ? 'scale-95' : ''}
                        `}
                        >
                            <Icons.Timer size={18} className={`transition-transform duration-500 ${groupMode ? 'rotate-180' : ''}`} />
                            <span>分类</span>
                        </button>

                        <button
                            onClick={() => setIsTagManagerOpen(true)}
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-black transition-all"
                            title="标签管理"
                        >
                            <Icons.Tags size={18} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto hide-scrollbar p-6 md:p-8 relative">
                    {displayedEvents.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6 animate-[fadeIn_0.5s_ease-out]">
                            <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                                <Icons.History size={48} className="opacity-20" />
                            </div>
                            <p className="text-xl font-normal tracking-tight text-gray-300">
                                {isSameDay(viewDate, new Date()) ? '今日暂无记录' : '该日无记录'}
                            </p>
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
                                                            icon={getSmartIcon(event, tagInfo)}
                                                            tag={tagInfo}
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
                                                icon={getSmartIcon(event, tagInfo)}
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
    onEventClick: (event: CalendarEvent) => void;
}

const HistoryCard: React.FC<HistoryCardProps> = React.memo(({ event, icon, tag, onEventClick }) => (
    <div
        onClick={() => onEventClick(event)}
        className="group relative bg-white border border-gray-200 hover:border-gray-300 rounded-2xl p-5 flex items-center gap-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer"
    >
        <div className={`w-12 h-12 rounded-xl ${tag.color} bg-opacity-20 flex items-center justify-center text-2xl`}>
            {icon}
        </div>

        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
                <h3 className="text-black font-medium text-lg truncate pr-4">{event.title}</h3>
                <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100`}>
                    <span className="text-[10px] font-bold text-gray-600 uppercase whitespace-nowrap">{tag.label}</span>
                </div>
            </div>

            <div className="flex items-center gap-3 text-gray-400 text-sm">
                <span className="font-mono bg-gray-50 px-2 py-0.5 rounded text-xs text-gray-500 border border-gray-100">
                    {event.startTime} - {event.endTime}
                </span>
                <span className="flex items-center gap-1">
                    <Icons.Clock size={12} />
                    <span>{getDurationString(event.startTime, event.endTime)}</span>
                </span>
            </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 absolute right-4 text-gray-300 hover:text-gray-500">
            <Icons.ChevronRight size={20} />
        </div>
    </div>
));

export default History;