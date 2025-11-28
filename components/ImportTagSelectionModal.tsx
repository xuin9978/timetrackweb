import React from 'react';
import { Tag } from '../types';
import { Icons } from './Icons';

interface ImportTagSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tagId: string) => void;
    tags: Tag[];
    eventCount: number;
}

const ImportTagSelectionModal: React.FC<ImportTagSelectionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    tags,
    eventCount
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-[fadeIn_0.3s]" onClick={onClose} />
            <div className="w-full max-w-sm relative animate-[modalEnter_0.3s_ease-out] rounded-3xl bg-white/90 backdrop-blur-2xl shadow-2xl p-6 space-y-5 border border-gray-200/80">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-black">选择导入标签</h2>
                        <p className="text-xs text-gray-500 mt-1">即将导入 {eventCount} 个日程，请选择归属标签</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-black"><Icons.X size={20} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                    {tags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => onConfirm(tag.id)}
                            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 hover:border-blue-200 hover:shadow-sm transition-all group text-left"
                        >
                            <div className={`w-8 h-8 rounded-full ${tag.color} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                                <span className="text-xs">{tag.icon}</span>
                            </div>
                            <span className="font-medium text-gray-700 group-hover:text-black truncate">{tag.label}</span>
                        </button>
                    ))}
                </div>

                <div className="pt-2">
                    <button onClick={onClose} className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors">
                        取消导入
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportTagSelectionModal;
