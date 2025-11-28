
import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { Tag } from '../types';
import { AVAILABLE_COLORS } from '../utils/dateUtils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  onAddTag: (label: string, color: string, icon: string) => void;
  onUpdateTag: (tag: Tag) => void;
  onDeleteTag: (id: string) => void;
  onReorderTags: (tags: Tag[]) => void;
  onSaveOrder?: () => Promise<void>;
}

const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onReorderTags,
  onSaveOrder,
}) => {
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState(AVAILABLE_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Reset dirty state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setHasUnsavedChanges(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveOrderClick = async () => {
    if (!onSaveOrder) return;
    setIsSaving(true);
    try {
      await onSaveOrder();
      setHasUnsavedChanges(false);
    } catch (e) {
      // Error is handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingTagId(null);
    setEditLabel('');
    setEditIcon('');
    setEditColor(AVAILABLE_COLORS[0]);
    setIsCreating(false);
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditLabel(tag.label);
    setEditIcon(tag.icon || '🏷️');
    setEditColor(tag.color);
    setIsCreating(false);
  };

  const handleStartCreate = () => {
    setEditingTagId(null);
    setEditLabel('');
    setEditIcon('🏷️');
    setEditColor(AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)]);
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!editLabel.trim()) return;

    if (isCreating) {
      onAddTag(editLabel, editColor, editIcon);
    } else if (editingTagId) {
      onUpdateTag({
        id: editingTagId,
        label: editLabel,
        color: editColor,
        icon: editIcon,
      });
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    onDeleteTag(id);
    if (editingTagId === id) {
      resetForm();
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newTags = Array.from(tags);
    const [reorderedTag] = newTags.splice(sourceIndex, 1);
    newTags.splice(destinationIndex, 0, reorderedTag);

    onReorderTags(newTags);
    if (onSaveOrder) {
      setIsSaving(true);
      try {
        await onSaveOrder();
        setHasUnsavedChanges(false);
      } catch (e) {
        setHasUnsavedChanges(true);
        alert('排序保存失败，请检查网络');
      } finally {
        setIsSaving(false);
      }
    } else {
      setHasUnsavedChanges(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      <GlassCard intensity="medium" className="w-full max-w-md relative animate-[modalEnter_0.3s_ease-out] overflow-hidden !rounded-2xl bg-white shadow-2xl flex flex-col max-h-[80vh] border border-gray-200">

        <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-500 hover:text-black text-sm font-medium transition-colors px-2">
              关闭
            </button>
            {hasUnsavedChanges && (
              <button
                onClick={handleSaveOrderClick}
                disabled={isSaving}
                className="text-green-600 hover:text-green-700 text-sm font-semibold transition-colors px-2 flex items-center gap-1 animate-fadeIn"
              >
                {isSaving ? '保存中...' : '保存排序'}
              </button>
            )}
          </div>
          <span className="text-black font-semibold text-base">标签管理</span>
          <button
            onClick={handleStartCreate}
            className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors px-2 flex items-center gap-1"
          >
            <Icons.Plus size={14} /> 新建
          </button>
        </div>

        <div className="flex flex-col h-full overflow-hidden">
          {/* Edit/Create Area */}
          {(editingTagId || isCreating) && (
            <div className="p-4 bg-gray-50 border-b border-gray-100 animate-[slideInRight_0.3s_ease-out]">
              <div className="space-y-4">
                <div className="flex gap-4">
                  {/* Icon Input */}
                  <div className="w-14">
                    <label className="text-xs text-gray-400 block mb-1 uppercase font-bold">图标</label>
                    <input
                      type="text"
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="w-full h-12 bg-white border border-gray-200 rounded-xl text-center text-2xl focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="🏷️"
                    />
                  </div>
                  {/* Name Input */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1 uppercase font-bold">名称</label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-black text-lg focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="标签名称"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2 uppercase font-bold">颜色</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        className={`w-8 h-8 rounded-full ${color} transition-transform hover:scale-110 relative flex items-center justify-center ${editColor === color ? 'scale-110 ring-2 ring-gray-400 ring-offset-2' : 'opacity-70'}`}
                      >
                        {editColor === color && <div className="w-2 h-2 bg-white rounded-full shadow-sm" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium"
                  >
                    {isCreating ? '创建标签' : '保存修改'}
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tag List with Drag and Drop */}
          <DragDropContext
            onDragStart={() => setHasUnsavedChanges(true)}
            onDragEnd={onDragEnd}
          >
            <Droppable droppableId="tag-list">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-2 bg-white"
                >
                  {tags.map((tag, index) => (
                    <Draggable key={tag.id} draggableId={tag.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`group flex items-center justify-between p-3 rounded-xl border bg-white ${snapshot.isDragging ? 'shadow-xl z-50 ring-2 ring-blue-500 ring-offset-1 border-transparent' :
                            editingTagId === tag.id ? 'bg-gray-50 border-blue-200' : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                            }`}
                          style={{
                            ...provided.draggableProps.style,
                            transition: snapshot.isDragging
                              ? 'none'
                              : 'transform 0.18s linear, box-shadow 0s, border-color 0s',
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1" onClick={() => handleStartEdit(tag)}>
                            {/* Drag Handle */}
                            <div
                              {...provided.dragHandleProps}
                              className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-1 -ml-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Icons.GripVertical size={16} />
                            </div>

                            <div className={`w-10 h-10 rounded-lg ${tag.color} bg-opacity-20 flex items-center justify-center text-xl flex-shrink-0`}>
                              {tag.icon || '🏷️'}
                            </div>
                            <div>
                              <div className="text-black font-medium">{tag.label}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }}
                              className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                            >
                              <Icons.X size={16} />
                            </button>
                            <Icons.ChevronRight className="text-gray-300" size={16} />
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {tags.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      暂无标签
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

      </GlassCard>
    </div>
  );
};

export default TagManagerModal;
