
import React, { useState, useEffect } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { CalendarEvent, ModalConfig, Tag } from '../types';
import { getMinutesFromTime, formatFullDate } from '../utils/dateUtils';

interface AddEventModalProps {
  config: ModalConfig;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  onUpdate: (event: CalendarEvent) => void;
  onDelete: (id: string) => void;
  tags: Tag[];
  onOpenCreateTagModal: () => void;
  onEditTag: (tag: Tag) => void;
  loadMoreTags: () => void;
  hasMoreTags: boolean;
}

const AddEventModal: React.FC<AddEventModalProps> = ({
  config,
  onClose,
  onSave,
  onUpdate,
  onDelete,
  tags,
  onOpenCreateTagModal,
  onEditTag,
  loadMoreTags,
  hasMoreTags,
}) => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [categoryId, setCategoryId] = useState<string>('');

  const { isOpen, mode, initialData } = config;

  useEffect(() => {
    if (isOpen && initialData) {
      setStartTime(initialData.start);
      setEndTime(initialData.end);

      if (mode === 'edit' && initialData.event) {
        setTitle(initialData.event.title);
        setCategoryId(initialData.event.category);
      } else {
        setTitle('');
        // Default to the 'work' tag if it exists, otherwise the first tag
        const workTag = tags.find(t => t.id === 'work');
        setCategoryId(workTag?.id || tags[0]?.id || '');
      }
    }
  }, [isOpen, initialData, mode, tags]);

  if (!isOpen || !initialData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      alert("请选择一个标签。");
      return;
    }
    const startMins = getMinutesFromTime(startTime);
    const endMins = getMinutesFromTime(endTime);
    let finalEndTime = endTime;
    if (endMins <= startMins) {
      const newEndTotal = startMins + 15;
      const hours = Math.floor(newEndTotal / 60) % 24;
      const mins = newEndTotal % 60;
      finalEndTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
    const eventData = {
      title: title.trim() || '新建日程',
      startTime,
      endTime: finalEndTime,
      category: categoryId,
      date: initialData.date
    };

    if (mode === 'edit' && initialData.event) {
      onUpdate({ ...eventData, id: initialData.event.id });
    } else {
      onSave(eventData);
    }
    onClose();
  };

  const handleDeleteEvent = () => {
    if (initialData.event) {
      onDelete(initialData.event.id);
      onClose();
    }
  };

  const selectedTag = tags.find(t => t.id === categoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out] z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <GlassCard intensity="high" className="w-full max-w-md relative z-50 animate-[fadeIn_0.3s_ease-out] overflow-hidden !rounded-2xl bg-gray-50 shadow-2xl flex flex-col max-h-[90vh] border border-gray-200">

        {/* Header Actions */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50/80 backdrop-blur-xl flex-shrink-0">
          <button onClick={onClose} className="text-blue-600 hover:text-blue-700 text-base font-medium transition-colors px-2">
            取消
          </button>
          <span className="text-black font-semibold text-base">{mode === 'create' ? '新建日程' : '编辑日程'}</span>
          <button
            onClick={handleSubmit}
            className="text-blue-600 hover:text-blue-700 text-base font-bold transition-colors px-2"
          >
            {mode === 'create' ? '添加' : '保存'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 bg-white overflow-y-auto hide-scrollbar flex-1">

          {/* Title Input */}
          <div className="bg-white rounded-xl flex items-center p-3 border border-gray-200 shadow-sm">
            <div className={`w-1 h-8 rounded-full mr-4 flex-shrink-0 ${selectedTag?.color || 'bg-gray-300'}`} />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="日程标题"
              className="flex-1 bg-transparent text-xl font-medium text-black placeholder-gray-400 focus:outline-none"
              inputMode="text"
              autoFocus
            />
          </div>

          {/* Tags Section */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-500 ml-1">标签</label>
            <div className="flex flex-wrap gap-2 items-center">
              {tags.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setCategoryId(tag.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onEditTag(tag);
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${categoryId === tag.id
                    ? `${tag.color} text-white border-transparent shadow-md scale-105`
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  {tag.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onOpenCreateTagModal}
                className="w-8 h-8 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-all"
              >
                <Icons.Plus size={16} />
              </button>
              {hasMoreTags && (
                <button
                  type="button"
                  onClick={loadMoreTags}
                  className="h-8 px-4 rounded-full bg-white border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:text-black hover:border-black transition-all"
                >
                  加载更多
                </button>
              )}
            </div>
          </div>

          {/* Date Time Section */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3 border border-gray-100">
            <span className="text-black font-semibold text-base">
              {formatFullDate(initialData.date)}
            </span>
            <div className="flex justify-between items-center gap-2">
              <div className="flex-1 bg-white rounded-lg p-3 text-black text-lg font-medium border border-gray-200 flex items-center justify-center gap-2 shadow-sm">
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="bg-transparent focus:outline-none w-full text-center"
                />
                <Icons.Clock size={18} className="text-gray-400" />
              </div>
              <span className="text-gray-400 font-medium text-sm">至</span>
              <div className="flex-1 bg-white rounded-lg p-3 text-black text-lg font-medium border border-gray-200 flex items-center justify-center gap-2 shadow-sm">
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="bg-transparent focus:outline-none w-full text-center"
                />
                <Icons.Clock size={18} className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Delete Button */}
          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDeleteEvent}
              className="w-full py-3 rounded-xl bg-red-50 text-red-500 font-medium hover:bg-red-100 transition-colors border border-red-100 mt-4"
            >
              删除日程
            </button>
          )}

        </form>
      </GlassCard>
    </div>
  );
};

export default AddEventModal;
