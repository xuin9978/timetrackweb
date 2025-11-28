
import React, { useState, useRef, useEffect } from 'react';
import GlassCard from './GlassCard';
import { formatTime as formatTimeStr } from '../utils/dateUtils';
import { AlarmState, AlarmMode } from '../types';
import { Icons } from './Icons';
import TimerSetupModal from './TimerSetupModal';

interface AlarmProps {
    alarmState: AlarmState;
    onStart: () => void;
    onPause: () => void;
    onReset: () => void;
    onSetMode: (mode: AlarmMode) => void;
    onSetDuration: (duration: number) => void;
    onOpenLogSessionModal: (startTime: string, endTime: string, startDate: Date, endDate: Date) => void;
}

const Alarm: React.FC<AlarmProps> = ({ 
  alarmState, 
  onStart, 
  onPause, 
  onReset,
  onSetMode,
  onSetDuration,
  onOpenLogSessionModal
}) => {
  const [displayTime, setDisplayTime] = useState(0);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const { status, mode, startTime, accumulatedTime, totalDuration } = alarmState;

  // Sync display time with global state
  useEffect(() => {
    const updateDisplay = () => {
      if (status === 'running') {
        const now = Date.now();
        const elapsed = now - startTime;
        
        if (mode === 'stopwatch') {
            setDisplayTime(elapsed + accumulatedTime);
        } else {
            // Timer Logic
            const remaining = totalDuration - (elapsed + accumulatedTime);
            if (remaining <= 0) {
                setDisplayTime(0);
                onPause(); // Stop the timer when done
            } else {
                setDisplayTime(remaining);
            }
        }
        timerRef.current = requestAnimationFrame(updateDisplay);
      } else {
          // Paused or Idle
          if (mode === 'stopwatch') {
              setDisplayTime(accumulatedTime);
          } else {
              // If idle and timer, show totalDuration
              if (status === 'idle' && accumulatedTime === 0) {
                  setDisplayTime(totalDuration);
              } else {
                  setDisplayTime(Math.max(0, totalDuration - accumulatedTime));
              }
          }
      }
    };

    if (status === 'running') {
       timerRef.current = requestAnimationFrame(updateDisplay);
    } else {
       updateDisplay();
       if (timerRef.current) {
         cancelAnimationFrame(timerRef.current);
         timerRef.current = null;
       }
    }

    return () => {
      if (timerRef.current) {
          cancelAnimationFrame(timerRef.current);
      }
    };
  }, [status, startTime, accumulatedTime, mode, totalDuration, onPause]);

  const formatDisplayTime = (ms: number) => {
    const date = new Date(ms);
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    
    const hStr = hours.toString().padStart(2, '0');
    return `${hStr}:${minutes}:${seconds}`;
  };

  const handleFinishSession = () => {
    // Calculate final elapsed time
    let finalElapsed = 0;
    
    if (mode === 'stopwatch') {
        finalElapsed = (status === 'running' ? Date.now() - startTime : 0) + accumulatedTime;
    } else {
        const spent = (status === 'running' ? Date.now() - startTime : 0) + accumulatedTime;
        finalElapsed = Math.min(spent, totalDuration);
    }
    
    const now = new Date();
    const endTimeStr = formatTimeStr(now);
    const startTimeDate = new Date(now.getTime() - finalElapsed);
    const startTimeStr = formatTimeStr(startTimeDate);

    onOpenLogSessionModal(startTimeStr, endTimeStr, startTimeDate, now);
    onReset(); 
  };

  const handleModeSwitch = (newMode: AlarmMode) => {
      onSetMode(newMode);
      if (newMode === 'timer' && totalDuration === 0) {
          setIsSetupModalOpen(true);
      }
  };

  const renderMainButton = () => {
    if (status === 'idle') {
        const isDisabled = mode === 'timer' && totalDuration === 0;
        
        return (
            <button 
            onClick={onStart}
            disabled={isDisabled}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 text-xl font-medium
                ${isDisabled 
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed' 
                    : 'bg-green-100 text-green-600 hover:bg-green-200'
                }
            `}
            >
            启动
            </button>
        );
    } else if (status === 'running') {
        return (
            <button 
            onClick={onPause}
            className="w-24 h-24 rounded-full bg-red-100 text-red-600 flex items-center justify-center transition-all hover:bg-red-200 active:scale-95 text-xl font-medium"
            >
            停止
            </button>
        );
    } else {
        // Paused
        return (
             <div className="flex gap-6">
                <button 
                    onClick={onStart}
                    className="w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center transition-all hover:bg-green-200 active:scale-95 text-lg font-medium"
                >
                    继续
                </button>
                <button 
                    onClick={handleFinishSession}
                    className="w-24 h-24 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center transition-all hover:bg-gray-200 active:scale-95 text-lg font-medium"
                >
                    完成
                </button>
             </div>
        );
    }
  };

  return (
    <>
        <GlassCard intensity="medium" className="w-full h-full md:h-[85vh] max-w-2xl mx-auto flex flex-col relative overflow-hidden bg-white">
        <div className="flex-1 flex flex-col items-center justify-center p-8 pb-20">
            {/* Time Display */}
            <div 
                className="flex flex-col items-center justify-center relative mb-20 cursor-pointer" 
                onClick={() => { if(mode === 'timer') setIsSetupModalOpen(true) }}
            >
                <h1 className="text-7xl md:text-9xl font-light text-black tabular-nums tracking-tight select-none">
                {formatDisplayTime(displayTime)}
                </h1>
            </div>

            {/* Main Control (Start/Stop) */}
            <div className="flex flex-col items-center gap-8 z-10 mb-16 h-32 justify-center">
                {renderMainButton()}
            </div>

            {/* Mode Switchers */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => handleModeSwitch('stopwatch')}
                    className={`
                        px-6 py-2 rounded-full flex items-center gap-2 transition-all duration-200 border text-sm font-medium
                        ${mode === 'stopwatch' 
                            ? 'border-orange-200 text-orange-600 bg-orange-50' 
                            : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                        }
                    `}
                >
                    <Icons.Stopwatch size={18} />
                    <span>秒表</span>
                </button>

                <button
                    onClick={() => handleModeSwitch('timer')}
                    className={`
                        px-6 py-2 rounded-full flex items-center gap-2 transition-all duration-200 border text-sm font-medium
                        ${mode === 'timer' 
                            ? 'border-cyan-200 text-cyan-600 bg-cyan-50' 
                            : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                        }
                    `}
                >
                    <Icons.Hourglass size={18} />
                    <span>计时</span>
                </button>
            </div>
        </div>
        </GlassCard>

        <TimerSetupModal 
            isOpen={isSetupModalOpen}
            onClose={() => setIsSetupModalOpen(false)}
            onConfirm={(duration) => onSetDuration(duration)}
        />
    </>
  );
};

export default Alarm;
