import React, { useState } from 'react';
import GlassCard from './GlassCard';
import { Icons } from './Icons';

interface TimerSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (duration: number) => void;
}

const TimerSetupModal: React.FC<TimerSetupModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [timerInput, setTimerInput] = useState('00:05:00');

    if (!isOpen) return null;

    const handleStartTimer = () => {
        const parts = timerInput.split(':').map(Number);
        let duration = 0;
        if (parts.length === 3) {
            duration = (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
        } else if (parts.length === 2) {
            duration = (parts[0] * 3600 + parts[1] * 60) * 1000;
        }
        
        if (duration > 0) {
            onConfirm(duration);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <GlassCard intensity="high" className="w-full max-w-sm relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-xl animate-[modalEnter_0.3s_ease-out]">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <span className="text-black font-semibold">设置倒计时</span>
                    <button className="text-gray-400 hover:text-black" onClick={onClose}><Icons.X size={16} /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <input
                            type="time"
                            step="1"
                            value={timerInput}
                            onChange={(e) => setTimerInput(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 text-black text-2xl font-mono w-full text-center focus:outline-none focus:border-blue-500 transition-colors"
                        />
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">取消</button>
                    <button onClick={handleStartTimer} className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors font-medium">开始</button>
                </div>
            </GlassCard>
        </div>
    );
};

export default TimerSetupModal;