import React, { useState } from 'react';
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

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, events, tags, onRestoreData, onImportEvents }) => {
    const [pendingImportEvents, setPendingImportEvents] = useState<Partial<CalendarEvent>[] | null>(null);

    if (!isOpen) return null;

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
                    alert('数据恢复成功！');
                    onClose();
                } else {
                    alert('无效的备份文件格式');
                }
            } catch (err) {
                console.error(err);
                alert('解析备份文件失败');
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
                    } else {
                        alert('未找到有效的日程数据');
                    }
                } catch (err) {
                    console.error(err);
                    alert('解析日历文件失败');
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
            alert(`成功导入 ${eventsWithTag.length} 个日程！`);
            setPendingImportEvents(null);
            onClose();
        }
    };

    const handleSyncToCalendar = (tag?: Tag) => {
        import('../utils/dateUtils').then(({ exportToICS }) => {
            if (tag) {
                const filteredEvents = events.filter(e => e.category === tag.id);
                if (filteredEvents.length === 0) {
                    alert(`"${tag.label}" 标签下暂无日程`);
                    return;
                }
                exportToICS(filteredEvents, tag.label);
            } else {
                exportToICS(events);
            }
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
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <Icons.X size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
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
                                <button
                                    onClick={() => handleSyncToCalendar()}
                                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-all border border-gray-200 group"
                                >
                                    <span className="text-sm font-medium text-gray-700">同步全部日程</span>
                                    <Icons.ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600" />
                                </button>

                                <div className="grid grid-cols-2 gap-3">
                                    {tags.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleSyncToCalendar(tag)}
                                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all text-left"
                                        >
                                            <div className={`w-2 h-2 rounded-full ${tag.color}`}></div>
                                            <span className="text-xs font-medium text-gray-600 truncate">同步 {tag.label}</span>
                                        </button>
                                    ))}
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
