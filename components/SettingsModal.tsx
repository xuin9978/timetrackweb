import React, { useMemo, useState } from 'react';
import { endOfMonth, endOfWeek, format, isValid, isWithinInterval, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { Icons } from './Icons';
import { CalendarEvent, Tag } from '../types';
import ImportTagSelectionModal from './ImportTagSelectionModal';
import GlassCard from './GlassCard';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: CalendarEvent[];
    tags: Tag[];
    onRestoreData: (events: CalendarEvent[], tags: Tag[]) => void;
    onImportEvents: (events: Partial<CalendarEvent>[]) => void;
}

type SyncRangeMode = 'all' | 'day' | 'week' | 'month' | 'custom';

const formatDateInput = (date: Date) => format(date, 'yyyy-MM-dd');
const formatMonthInput = (date: Date) => format(date, 'yyyy-MM');

const toDateOnly = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const parseInputDate = (value: string, fallback = new Date()) => {
    const parsed = parseISO(value);
    return isValid(parsed) ? parsed : fallback;
};

const safeFilenamePart = (value: string) => {
    return value.trim().replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '');
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, events, tags, onRestoreData, onImportEvents }) => {
    const [pendingImportEvents, setPendingImportEvents] = useState<Partial<CalendarEvent>[] | null>(null);
    const [resultSummary, setResultSummary] = useState<{ tone: 'success' | 'error' | 'info'; title: string; detail: string } | null>(null);
    const [syncRangeMode, setSyncRangeMode] = useState<SyncRangeMode>('all');
    const [syncDate, setSyncDate] = useState(formatDateInput(new Date()));
    const [syncMonth, setSyncMonth] = useState(formatMonthInput(new Date()));
    const [syncStartDate, setSyncStartDate] = useState(formatDateInput(new Date()));
    const [syncEndDate, setSyncEndDate] = useState(formatDateInput(new Date()));

    const handleExportJSON = () => {
        const data = {
            events,
            tags,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `liquid_calendar_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setResultSummary({ tone: 'success', title: '导出完成', detail: `已导出 ${events.length} 个日程、${tags.length} 个标签。` });
    };

    const handleRestoreJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.events && data.tags) {
                    // Revive dates
                    const revivedEvents = data.events.map((evt: any) => ({
                        ...evt,
                        date: new Date(evt.date)
                    }));
                    onRestoreData(revivedEvents, data.tags);
                    setResultSummary({ tone: 'success', title: '数据恢复成功', detail: `恢复 ${revivedEvents.length} 个日程、${data.tags.length} 个标签。` });
                } else {
                    setResultSummary({ tone: 'error', title: '恢复失败', detail: '无效的备份文件格式。' });
                }
            } catch (err) {
                console.error(err);
                setResultSummary({ tone: 'error', title: '恢复失败', detail: '解析备份文件失败。' });
            }
        };
        reader.readAsText(file);
    };

    const handleImportICS = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset input value to allow selecting the same file again
        e.target.value = '';

        const reader = new FileReader();
        reader.onload = (event) => {
            import('../utils/dateUtils').then(({ parseICS }) => {
                try {
                    const content = event.target?.result as string;
                    const parsedEvents = parseICS(content);

                    if (parsedEvents.length > 0) {
                        setPendingImportEvents(parsedEvents);
                        setResultSummary({ tone: 'info', title: '已读取日历文件', detail: `解析出 ${parsedEvents.length} 个日程，请选择导入标签。` });
                    } else {
                        setResultSummary({ tone: 'error', title: '导入失败', detail: '未找到有效的日程数据。' });
                    }
                } catch (err) {
                    console.error(err);
                    setResultSummary({ tone: 'error', title: '导入失败', detail: '解析日历文件失败。' });
                }
            });
        };
        reader.readAsText(file);
    };

    const handleConfirmImport = (tagId: string) => {
        if (pendingImportEvents) {
            const eventsWithTag = pendingImportEvents.map(evt => ({
                ...evt,
                category: tagId
            }));
            onImportEvents(eventsWithTag);
            setResultSummary({ tone: 'success', title: '导入已提交', detail: `已提交 ${eventsWithTag.length} 个日程，结果会在底部提示。` });
            setPendingImportEvents(null);
        }
    };

    const syncRange = useMemo(() => {
        if (syncRangeMode === 'all') {
            return {
                label: '全部时间',
                filename: 'all',
                start: null as Date | null,
                end: null as Date | null,
            };
        }

        if (syncRangeMode === 'month') {
            const monthDate = parseInputDate(`${syncMonth}-01`);
            return {
                label: format(monthDate, 'yyyy-MM'),
                filename: format(monthDate, 'yyyy-MM'),
                start: startOfMonth(monthDate),
                end: endOfMonth(monthDate),
            };
        }

        if (syncRangeMode === 'week') {
            const date = parseInputDate(syncDate);
            const start = startOfWeek(date, { weekStartsOn: 1 });
            const end = endOfWeek(date, { weekStartsOn: 1 });
            return {
                label: `${format(start, 'yyyy-MM-dd')} 至 ${format(end, 'yyyy-MM-dd')}`,
                filename: `${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}`,
                start,
                end,
            };
        }

        if (syncRangeMode === 'custom') {
            const first = parseInputDate(syncStartDate);
            const second = parseInputDate(syncEndDate, first);
            const start = first <= second ? first : second;
            const end = first <= second ? second : first;
            return {
                label: `${format(start, 'yyyy-MM-dd')} 至 ${format(end, 'yyyy-MM-dd')}`,
                filename: `${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}`,
                start,
                end,
            };
        }

        const date = parseInputDate(syncDate);
        return {
            label: format(date, 'yyyy-MM-dd'),
            filename: format(date, 'yyyy-MM-dd'),
            start: date,
            end: date,
        };
    }, [syncDate, syncEndDate, syncMonth, syncRangeMode, syncStartDate]);

    const getFilteredSyncEvents = (tag?: Tag) => {
        return events.filter(event => {
            if (tag && event.category !== tag.id) return false;
            if (!syncRange.start || !syncRange.end) return true;

            const eventDate = toDateOnly(event.date);
            return isWithinInterval(eventDate, {
                start: toDateOnly(syncRange.start),
                end: toDateOnly(syncRange.end),
            });
        });
    };

    const allSyncEventsCount = getFilteredSyncEvents().length;

    if (!isOpen) return null;

    const handleSyncToCalendar = (tag?: Tag) => {
        import('../utils/dateUtils').then(({ exportToICS }) => {
            const filteredEvents = getFilteredSyncEvents(tag);
            const scopeLabel = tag ? `"${tag.label}" 标签` : '全部日程';

            if (filteredEvents.length === 0) {
                setResultSummary({ tone: 'info', title: '没有可同步日程', detail: `${scopeLabel}在「${syncRange.label}」范围内暂无日程。` });
                return;
            }

            const filenameParts = [tag?.label, syncRangeMode === 'all' ? undefined : syncRange.filename]
                .filter(Boolean)
                .map(part => safeFilenamePart(part as string));
            const filenameSuffix = filenameParts.join('_');
            const filename = filenameSuffix ? `calendar_export_${filenameSuffix}.ics` : 'calendar_export.ics';
            exportToICS(filteredEvents, filenameSuffix);
            setResultSummary({ tone: 'success', title: '日历文件已生成', detail: `文件：${filename}。已导出${scopeLabel} ${filteredEvents.length} 个，范围：${syncRange.label}。` });
        });
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.3s]" onClick={onClose} />
                <GlassCard intensity="high" className="w-full max-w-2xl relative animate-[modalEnter_0.3s_ease-out] overflow-hidden !rounded-3xl bg-white/90 shadow-2xl flex flex-col max-h-[85vh] border border-gray-200/50">

                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100">
                        <h2 className="text-2xl font-bold text-black">数据备份与同步</h2>
                        <button onClick={onClose} aria-label="关闭设置" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Icons.X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
                        {resultSummary && (
                            <div className={`settings-result settings-result-${resultSummary.tone} rounded-2xl border px-4 py-3 flex items-start justify-between gap-3`}>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">{resultSummary.title}</div>
                                    <div className="text-xs text-gray-500 mt-1">{resultSummary.detail}</div>
                                </div>
                                <button onClick={() => setResultSummary(null)} aria-label="关闭提示" className="text-gray-400 hover:text-gray-700">
                                    <Icons.X size={16} />
                                </button>
                            </div>
                        )}

                        {/* Section 1: Data Backup */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                    <Icons.Settings size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">应用数据备份</h3>
                                    <p className="text-xs text-gray-500">导出或恢复完整的应用数据 (JSON)</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleExportJSON}
                                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-all border border-gray-200 hover:border-gray-300"
                                >
                                    <Icons.Download size={16} />
                                    <span>导出数据</span>
                                </button>
                                <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-all border border-gray-200 hover:border-gray-300">
                                    <input type="file" accept=".json" className="hidden" onChange={handleRestoreJSON} />
                                    <Icons.History size={16} />
                                    <span>恢复数据</span>
                                </label>
                            </div>
                        </div>

                        <div className="h-px bg-gray-100"></div>

                        {/* Section 2: Sync External Calendar */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                                    <Icons.Calendar size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">同步外部日历</h3>
                                    <p className="text-xs text-gray-500">智能导入 Apple/Google 日历 (.ics)</p>
                                </div>
                            </div>

                            <label className="cursor-pointer w-full">
                                <input
                                    type="file"
                                    accept=".ics"
                                    className="hidden"
                                    onChange={handleImportICS}
                                />
                                <div className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-all border border-gray-200 hover:border-gray-300">
                                    <Icons.Plus size={16} />
                                    <span>导入日历文件</span>
                                </div>
                            </label>
                        </div>

                        {/* Section 3: Sync TO Calendar (New Feature) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                                    <Icons.Download size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">同步到系统日历</h3>
                                    <p className="text-xs text-gray-500">导出日程到 Apple Calendar / Outlook</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3 space-y-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-xs font-semibold text-gray-500">同步范围</span>
                                        <span className="text-[11px] text-gray-400 truncate">当前：{syncRange.label}</span>
                                    </div>
                                    <div className="grid grid-cols-5 gap-1 rounded-xl bg-white p-1 border border-gray-100">
                                        {[
                                            { id: 'all', label: '全部' },
                                            { id: 'day', label: '日' },
                                            { id: 'week', label: '周' },
                                            { id: 'month', label: '月' },
                                            { id: 'custom', label: '自定义' },
                                        ].map(option => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                onClick={() => setSyncRangeMode(option.id as SyncRangeMode)}
                                                className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${syncRangeMode === option.id
                                                    ? 'bg-black text-white shadow-sm'
                                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>

                                    {syncRangeMode !== 'all' && (
                                        <div className="flex items-center gap-2">
                                            {(syncRangeMode === 'day' || syncRangeMode === 'week') && (
                                                <input
                                                    type="date"
                                                    value={syncDate}
                                                    onChange={(e) => setSyncDate(e.target.value)}
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            )}
                                            {syncRangeMode === 'month' && (
                                                <input
                                                    type="month"
                                                    value={syncMonth}
                                                    onChange={(e) => setSyncMonth(e.target.value)}
                                                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            )}
                                            {syncRangeMode === 'custom' && (
                                                <>
                                                    <input
                                                        type="date"
                                                        value={syncStartDate}
                                                        onChange={(e) => setSyncStartDate(e.target.value)}
                                                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                    <span className="text-xs font-semibold text-gray-400">至</span>
                                                    <input
                                                        type="date"
                                                        value={syncEndDate}
                                                        onChange={(e) => setSyncEndDate(e.target.value)}
                                                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => handleSyncToCalendar()}
                                    disabled={allSyncEventsCount === 0}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 group disabled:opacity-45 disabled:cursor-not-allowed"
                                >
                                    <span className="text-sm font-medium text-gray-700">同步全部日程 · {allSyncEventsCount}条</span>
                                    <Icons.ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    {tags.map(tag => {
                                        const count = getFilteredSyncEvents(tag).length;
                                        return (
                                            <button
                                                key={tag.id}
                                                onClick={() => handleSyncToCalendar(tag)}
                                                disabled={count === 0}
                                                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:shadow-none"
                                            >
                                                <div className={`w-2 h-2 rounded-full ${tag.color}`}></div>
                                                <span className="text-xs font-medium text-gray-600 truncate">同步 {tag.label} · {count}条</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>

            <ImportTagSelectionModal
                isOpen={!!pendingImportEvents}
                onClose={() => setPendingImportEvents(null)}
                onConfirm={handleConfirmImport}
                tags={tags}
                eventCount={pendingImportEvents?.length || 0}
            />
        </>
    );
};

export default SettingsModal;
