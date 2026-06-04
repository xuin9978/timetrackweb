import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { APPLE_CALENDAR_COLORS, AVAILABLE_COLORS, getTagColorHex } from '../utils/dateUtils';
import { Tag } from '../types';

interface CreateTagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (label: string, color: string, icon: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (tag: Tag) => void;
  initialTag?: Tag;
  mode: 'create' | 'edit';
}

const CreateTagModal: React.FC<CreateTagModalProps> = ({ isOpen, onClose, onConfirm, onDelete, onUpdate, initialTag, mode }) => {
  const [label, setLabel] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [selectedColor, setSelectedColor] = useState(AVAILABLE_COLORS[0]);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialTag) {
        const normalizedColor = AVAILABLE_COLORS.includes(initialTag.color)
          ? initialTag.color
          : APPLE_CALENDAR_COLORS.find(color => color.hex === getTagColorHex(initialTag.color))?.className || AVAILABLE_COLORS[0];

        setLabel(initialTag.label);
        setIcon(initialTag.icon);
        setSelectedColor(normalizedColor);
      } else {
        setLabel('');
        setIcon('🏷️');
        setSelectedColor(AVAILABLE_COLORS[0]);
      }
    }
  }, [isOpen, mode, initialTag]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (label.trim()) {
      if (mode === 'edit' && initialTag && onUpdate) {
        onUpdate({
          ...initialTag,
          label: label.trim(),
          color: selectedColor,
          icon: icon || '🏷️'
        });
      } else {
        onConfirm(label.trim(), selectedColor, icon || '🏷️');
      }
      onClose();
    }
  };

  const handleDelete = () => {
    if (mode === 'edit' && initialTag && onDelete) {
      if (window.confirm(`确定要删除标签 "${initialTag.label}" 吗？`)) {
        onDelete(initialTag.id);
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.3s]" onClick={onClose} />
      <div className="w-full max-w-sm relative animate-[modalEnter_0.3s_ease-out] rounded-3xl bg-white/80 backdrop-blur-2xl shadow-2xl p-6 space-y-5 border border-gray-200/80">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-black">{mode === 'create' ? '创建标签' : '编辑标签'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black"><Icons.X size={20} /></button>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">标签名称</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="请输入标签名称 (1-10字)"
            maxLength={10}
            className="mt-2 w-full p-3 rounded-lg bg-gray-100/80 border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-sm text-black placeholder-gray-400"
            autoFocus
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">颜色选择</label>
          <div className="grid grid-cols-6 gap-3 mt-2">
            {APPLE_CALENDAR_COLORS.map(({ className: color, label, hex }) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`w-10 h-10 rounded-full transition-transform hover:scale-110 flex items-center justify-center shadow-sm ${selectedColor === color ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : ''}`}
                style={{ backgroundColor: hex }}
                title={label}
                aria-label={label}
              >
                {selectedColor === color && <Icons.Check size={18} className="text-white" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">图标选择 (可选)</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🏷️"
            maxLength={2}
            className="mt-2 w-full p-3 rounded-lg bg-gray-100/80 border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-sm text-center text-black placeholder-gray-400"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500">预览</label>
          <div className="flex gap-2 mt-2">
            <div
              className="px-3 py-1.5 rounded-full text-sm font-medium text-white flex items-center gap-1.5"
              style={{ backgroundColor: getTagColorHex(selectedColor) }}
            >
              <span>{icon || '🏷️'}</span>
              <span>{label || '标签预览'}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          {mode === 'edit' && (
            <button onClick={handleDelete} className="px-4 py-3 rounded-xl bg-red-50 text-red-500 font-semibold hover:bg-red-100 transition-colors">
              <Icons.Trash size={20} />
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-gray-100/80 text-gray-700 font-semibold hover:bg-gray-200/80 transition-colors">
            取消
          </button>
          <button onClick={handleConfirm} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
            {mode === 'create' ? '确认' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateTagModal;
