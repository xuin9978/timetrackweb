
import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { Tag } from '../types';

interface LogSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (description: string, tagIds: string[]) => void;
  startTime?: string;
  endTime?: string;
  tags: Tag[];
  onOpenCreateTagModal: () => void;
  loadMoreTags: () => void;
  hasMoreTags: boolean;
}

const LogSessionModal: React.FC<LogSessionModalProps> = ({ isOpen, onClose, onConfirm, startTime, endTime, tags, onOpenCreateTagModal, loadMoreTags, hasMoreTags }) => {
  const [description, setDescription] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId].slice(0, 5) // Limit to 5 tags
    );
  };

  const handleConfirm = () => {
    onConfirm(description, selectedTagIds);
    // Reset state for next time
    setDescription('');
    setSelectedTagIds([]);
    onClose();
  };
  
  const handleCancel = () => {
    setDescription('');
    setSelectedTagIds([]);
    onClose();
  }

  // A vibrant color map for this specific modal's tags
  const tagColorMap: Record<string, string> = {
    'bg-cyan-400': 'bg-blue-500 text-white',
    'bg-emerald-400': 'bg-green-500 text-white',
    'bg-orange-400': 'bg-orange-500 text-white',
    'bg-purple-400': 'bg-purple-500 text-white',
    'bg-rose-400': 'bg-pink-500 text-white',
    'bg-pink-400': 'bg-pink-500 text-white',
    'bg-indigo-400': 'bg-indigo-500 text-white',
    'bg-teal-400': 'bg-teal-500 text-white',
    'bg-yellow-400': 'bg-yellow-500 text-white',
    'bg-lime-400': 'bg-lime-500 text-white',
    'bg-red-400': 'bg-red-500 text-white',
    'bg-blue-400': 'bg-blue-500 text-white',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.3s]" onClick={handleCancel} />
      <GlassCard intensity="high" className="w-full max-w-sm relative animate-[modalEnter_0.3s_ease-out] !rounded-3xl bg-white/80 backdrop-blur-2xl shadow-2xl p-6 space-y-5 border border-gray-200/80">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-bold text-black">计时已结束</h2>
                <p className="text-sm text-gray-500 font-mono mt-1">
                    计时时段: {startTime} - {endTime}
                </p>
            </div>
            <button onClick={handleCancel} className="text-gray-400 hover:text-black"><Icons.X size={20} /></button>
        </div>

        <div>
            <label className="text-xs font-semibold text-gray-500">说明描述 (可选)</label>
            <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请描述该时间段的事项 (可选)"
                className="mt-2 w-full p-3 rounded-lg bg-gray-100/80 border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-sm text-black placeholder-gray-400"
                rows={3}
            />
        </div>

        <div>
            <label className="text-xs font-semibold text-gray-500">添加标签 (可选, 最多5个)</label>
            <div className="flex flex-wrap gap-2 mt-2">
                {tags.map(tag => (
                    <button
                        key={tag.id}
                        onClick={() => handleToggleTag(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            selectedTagIds.includes(tag.id)
                            ? (tagColorMap[tag.color] || 'bg-blue-500 text-white')
                            : 'bg-gray-100/80 text-gray-700 hover:bg-gray-200/80'
                        }`}
                    >
                        {tag.label}
                    </button>
                ))}
                <button 
                    onClick={onOpenCreateTagModal}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100/80 text-gray-700 flex items-center gap-1 hover:bg-gray-200/80"
                >
                    <Icons.Plus size={14} /> 添加
                </button>
                {hasMoreTags && (
                    <button 
                        onClick={loadMoreTags}
                        className="px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100/80 text-gray-700 flex items-center gap-1 hover:bg-gray-200/80"
                    >
                        加载更多
                    </button>
                )}
            </div>
        </div>
        
        <div className="flex gap-3 pt-4">
            <button onClick={handleCancel} className="flex-1 py-3 rounded-xl bg-gray-100/80 text-gray-700 font-semibold hover:bg-gray-200/80 transition-colors">
                取消同步
            </button>
            <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
                确认同步
            </button>
        </div>
      </GlassCard>
    </div>
  );
};

export default LogSessionModal;