
import React, { useMemo, useState } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';
import { Tag } from '../types';
import { APPLE_CALENDAR_COLORS, AVAILABLE_COLORS, getTagColorHex, getTagColorRgba } from '../utils/dateUtils';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface TagManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: Tag[];
  onAddTag: (label: string, color: string, icon: string) => Promise<void> | void;
  onUpdateTag: (tag: Tag) => Promise<void> | void;
  onDeleteTag: (id: string) => Promise<void> | void;
  onMergeTag: (sourceTagId: string, targetTagId: string) => Promise<void> | void;
  onReorderTags: (tags: Tag[]) => void;
  onSaveOrder?: (tagsToSave?: Tag[]) => Promise<void>;
  getTagEventCount?: (tagId: string) => number;
}

const TagManagerModal: React.FC<TagManagerModalProps> = ({
  isOpen,
  onClose,
  tags,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onMergeTag,
  onReorderTags,
  onSaveOrder,
  getTagEventCount,
}) => {
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');
  const [editColor, setEditColor] = useState(AVAILABLE_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFormSaving, setIsFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [mergeSourceTagId, setMergeSourceTagId] = useState<string | null>(null);
  const [mergeTargetTagId, setMergeTargetTagId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [mergeNotice, setMergeNotice] = useState('');

  // Reset dirty state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setHasUnsavedChanges(false);
      setOrderError('');
      setFormError('');
      setMergeSourceTagId(null);
      setMergeTargetTagId(null);
      setMergeError('');
      setMergeNotice('');
    }
  }, [isOpen]);

  const handleSaveOrderClick = async () => {
    if (!onSaveOrder) return;
    setIsSaving(true);
    setOrderError('');
    try {
      await onSaveOrder(tags);
      setHasUnsavedChanges(false);
    } catch (e) {
      setOrderError('排序保存失败，请检查网络后重试。');
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
    setFormError('');
  };

  const resetMerge = () => {
    setMergeSourceTagId(null);
    setMergeTargetTagId(null);
    setMergeError('');
  };

  const handleStartEdit = (tag: Tag) => {
    const normalizedColor = AVAILABLE_COLORS.includes(tag.color)
      ? tag.color
      : APPLE_CALENDAR_COLORS.find(color => color.hex === getTagColorHex(tag.color))?.className || AVAILABLE_COLORS[0];

    setEditingTagId(tag.id);
    setEditLabel(tag.label);
    setEditIcon(tag.icon || '🏷️');
    setEditColor(normalizedColor);
    setIsCreating(false);
    setFormError('');
  };

  const handleStartCreate = () => {
    setEditingTagId(null);
    setEditLabel('');
    setEditIcon('🏷️');
    setEditColor(AVAILABLE_COLORS[Math.floor(Math.random() * AVAILABLE_COLORS.length)]);
    setIsCreating(true);
    setFormError('');
  };

  const handleSave = async () => {
    if (!editLabel.trim()) {
      setFormError('请输入标签名称。');
      return;
    }

    const normalizedIcon = editIcon.trim();

    setIsFormSaving(true);
    setFormError('');
    try {
      if (isCreating) {
        await onAddTag(editLabel.trim(), editColor, normalizedIcon);
      } else if (editingTagId) {
        await onUpdateTag({
          id: editingTagId,
          label: editLabel.trim(),
          color: editColor,
          icon: normalizedIcon,
        });
      }
      resetForm();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '标签保存失败，请稍后重试。');
    } finally {
      setIsFormSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingTagId(id);
    setFormError('');
    try {
      await onDeleteTag(id);
      if (editingTagId === id) {
        resetForm();
      }
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '标签删除失败，请稍后重试。');
    } finally {
      setDeletingTagId(null);
    }
  };

  const mergeSourceTag = useMemo(
    () => tags.find(tag => tag.id === mergeSourceTagId) || null,
    [tags, mergeSourceTagId]
  );
  const mergeTargetTag = useMemo(
    () => tags.find(tag => tag.id === mergeTargetTagId) || null,
    [tags, mergeTargetTagId]
  );
  const mergeTargetTags = useMemo(
    () => tags.filter(tag => tag.id !== mergeSourceTagId),
    [tags, mergeSourceTagId]
  );

  if (!isOpen) return null;

  const handleStartMerge = (tagId: string) => {
    setMergeSourceTagId(tagId);
    setMergeTargetTagId(null);
    setMergeError('');
    setMergeNotice('');
    resetForm();
  };

  const handleConfirmMerge = async () => {
    if (!mergeSourceTag || !mergeTargetTag) return;

    setIsMerging(true);
    setMergeError('');
    try {
      await onMergeTag(mergeSourceTag.id, mergeTargetTag.id);
      setMergeNotice(`已将“${mergeSourceTag.label}”合并到“${mergeTargetTag.label}”`);
      resetMerge();
    } catch (e) {
      setMergeError(e instanceof Error ? e.message : '合并失败，请稍后重试。');
    } finally {
      setIsMerging(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      setHasUnsavedChanges(false);
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) {
      setHasUnsavedChanges(false);
      return;
    }

    const newTags = Array.from(tags);
    const [reorderedTag] = newTags.splice(sourceIndex, 1);
    newTags.splice(destinationIndex, 0, reorderedTag);

    const previousTags = tags;
    onReorderTags(newTags);
    setOrderError('');
    if (onSaveOrder) {
      setIsSaving(true);
      try {
        await onSaveOrder(newTags);
        setHasUnsavedChanges(false);
      } catch (e) {
        onReorderTags(previousTags);
        setHasUnsavedChanges(true);
        setOrderError('排序保存失败，已恢复原顺序。');
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
            <button onClick={mergeSourceTag ? resetMerge : onClose} className="text-gray-500 hover:text-black text-sm font-medium transition-colors px-2">
              {mergeSourceTag ? '返回' : '关闭'}
            </button>
            {!mergeSourceTag && hasUnsavedChanges && (
              <button
                onClick={handleSaveOrderClick}
                disabled={isSaving}
                className="text-green-600 hover:text-green-700 text-sm font-semibold transition-colors px-2 flex items-center gap-1 animate-fadeIn"
              >
                {isSaving ? '保存中...' : '保存排序'}
              </button>
            )}
          </div>
          <span className="text-black font-semibold text-base">{mergeSourceTag ? '合并标签' : '标签管理'}</span>
          {mergeSourceTag ? (
            <span className="w-[52px]" />
          ) : (
            <button
              onClick={handleStartCreate}
              className="text-blue-600 hover:text-blue-700 text-sm font-semibold transition-colors px-2 flex items-center gap-1"
            >
              <Icons.Plus size={14} /> 新建
            </button>
          )}
        </div>

        {(mergeNotice || orderError || isSaving) && (
          <div className={`px-4 py-2 text-xs border-b ${orderError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
            {mergeNotice || orderError || '正在保存排序...'}
          </div>
        )}

        <div className="flex flex-col h-full overflow-hidden">
          {/* Edit/Create Area */}
          {!mergeSourceTag && (editingTagId || isCreating) && (
            <div className="p-4 bg-gray-50 border-b border-gray-100 animate-[slideInRight_0.3s_ease-out]">
              <div className="space-y-4">
                <div className="flex gap-4">
                  {/* Icon Input */}
                  <div className="w-14">
                    <label className="text-xs text-gray-400 block mb-1 uppercase font-bold">图标</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        disabled={isFormSaving}
                        className="w-full h-12 bg-white border border-gray-200 rounded-xl text-center text-2xl focus:outline-none focus:border-blue-500 transition-all"
                        placeholder=""
                        maxLength={4}
                        aria-label="自定义标签图标"
                      />
                      {!editIcon && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-300">
                          无图标
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Name Input */}
                  <div className="flex-1">
                    <label className="text-xs text-gray-400 block mb-1 uppercase font-bold">名称</label>
                    <input
                      type="text"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      disabled={isFormSaving}
                      className="w-full h-12 bg-white border border-gray-200 rounded-xl px-4 text-black text-lg focus:outline-none focus:border-blue-500 transition-all"
                      placeholder="标签名称"
                      autoFocus
                    />
                  </div>
                </div>

                {formError && (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {formError}
                  </div>
                )}

                {/* Color Picker */}
                <div>
                  <label className="text-xs text-gray-400 block mb-2 uppercase font-bold">颜色</label>
                  <div className="grid grid-cols-6 gap-2.5">
                    {APPLE_CALENDAR_COLORS.map(({ className: color, label, hex }) => (
                      <button
                        key={color}
                        onClick={() => setEditColor(color)}
                        disabled={isFormSaving}
                        className={`w-8 h-8 rounded-full transition-all hover:scale-110 relative flex items-center justify-center shadow-sm ${editColor === color ? 'scale-110 ring-2 ring-[#007AFF] ring-offset-2' : 'opacity-90'}`}
                        style={{ backgroundColor: hex }}
                        title={label}
                        aria-label={label}
                      >
                        {editColor === color && <Icons.Check size={14} className="text-white drop-shadow-sm" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    disabled={isFormSaving}
                    className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium"
                  >
                    {isFormSaving ? '保存中...' : isCreating ? '创建标签' : '保存修改'}
                  </button>
                  <button
                    onClick={resetForm}
                    disabled={isFormSaving}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-500 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          )}

          {mergeSourceTag ? (
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4 bg-white">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">将标签</div>
                <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: getTagColorRgba(mergeSourceTag.color, 0.18), color: getTagColorHex(mergeSourceTag.color) }}
                  >
                    {mergeSourceTag.icon || <span className="w-2 h-2 rounded-full bg-white/70" />}
                  </div>
                  <div>
                    <div className="text-black font-medium">{mergeSourceTag.label}</div>
                    <div className="text-xs text-gray-500">{getTagEventCount?.(mergeSourceTag.id) || 0} 条事项会保留</div>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">合并到</div>
                <div className="space-y-2">
                  {mergeTargetTags.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => setMergeTargetTagId(tag.id)}
                      className="group flex w-full items-center justify-between rounded-xl border border-gray-100 bg-white p-3 text-left hover:border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                          style={{ backgroundColor: getTagColorRgba(tag.color, 0.18), color: getTagColorHex(tag.color) }}
                        >
                          {tag.icon || <span className="w-2 h-2 rounded-full bg-white/70" />}
                        </div>
                        <div>
                          <div className="text-black font-medium">{tag.label}</div>
                          <div className="text-xs text-gray-400">{getTagEventCount?.(tag.id) || 0} 条事项</div>
                        </div>
                      </div>
                      <Icons.ChevronRight className="text-gray-300 group-hover:text-gray-500" size={16} />
                    </button>
                  ))}

                  {mergeTargetTags.length === 0 && (
                    <div className="text-center text-gray-400 py-8">
                      暂无可合并的目标标签
                    </div>
                  )}
                </div>
              </div>

              {mergeError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
                  {mergeError}
                </div>
              )}
            </div>
          ) : (
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
                      <React.Fragment key={tag.id}>
                        <Draggable draggableId={tag.id} index={index}>
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
                              <div
                                {...provided.dragHandleProps}
                                className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-1 -ml-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Icons.GripVertical size={16} />
                              </div>

                              <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                                style={{ backgroundColor: getTagColorRgba(tag.color, 0.18), color: getTagColorHex(tag.color) }}
                              >
                                {tag.icon ? tag.icon : <span className="w-2 h-2 rounded-full bg-white/70" />}
                              </div>
                              <div>
                                <div className="text-black font-medium">{tag.label}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(tag.id); }}
                                disabled={deletingTagId === tag.id}
                                aria-label={`删除标签 ${tag.label}`}
                                className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg transition-colors"
                              >
                                {deletingTagId === tag.id ? <span className="text-xs text-red-500">删</span> : <Icons.X size={16} />}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleStartMerge(tag.id); }}
                                aria-label={`合并标签 ${tag.label}`}
                                className="p-2 text-gray-300 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                <Icons.ChevronRight size={16} />
                              </button>
                            </div>
                          </div>
                          )}
                        </Draggable>
                      </React.Fragment>
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
          )}
        </div>

        {mergeSourceTag && mergeTargetTag && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
              <h3 className="text-base font-semibold text-black">
                将“{mergeSourceTag.icon || ''} {mergeSourceTag.label}”合并到“{mergeTargetTag.icon || ''} {mergeTargetTag.label}”？
              </h3>
              <div className="mt-3 space-y-2 text-sm leading-relaxed text-gray-600">
                <p>合并后，“{mergeSourceTag.label}”下的所有事项会保留，并移动到“{mergeTargetTag.label}”。</p>
                <p>
                  标题前缀会同步改变：
                  <span className="font-medium text-gray-800">
                    {mergeSourceTag.icon || ''}：看书复盘 → {mergeTargetTag.icon || ''}：看书复盘
                  </span>
                </p>
                <p>“{mergeSourceTag.label}”标签会被删除。此操作无法撤销。</p>
              </div>
              <div className="mt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setMergeTargetTagId(null)}
                  disabled={isMerging}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMerge}
                  disabled={isMerging}
                  className="px-4 py-2 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
                >
                  {isMerging ? '合并中...' : '合并'}
                </button>
              </div>
            </div>
          </div>
        )}

      </GlassCard>
    </div>
  );
};

export default TagManagerModal;
