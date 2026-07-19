import React, { useMemo, useState } from 'react';
import { Icons } from '../Icons';
import type { ContextSources } from '../../utils/agentContext';
import type { ChatMessage } from './types';

const confidenceLabel: Record<ContextSources['confidence'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const SourceSummary: React.FC<{ sources?: ContextSources }> = ({ sources }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!sources) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="inline-flex items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold leading-none text-gray-400 transition hover:border-gray-200 hover:text-gray-600"
        aria-expanded={isOpen}
      >
        来源 · 可信度{confidenceLabel[sources.confidence]}
        <Icons.ChevronRight
          size={12}
          strokeWidth={2.4}
          className={`transition ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="mt-2 space-y-1 rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2 text-[11px] font-semibold leading-5 text-gray-500">
          <div>已参考：{sources.used.length ? sources.used.join('、') : '无'}</div>
          <div>未参考：{sources.missing.length ? sources.missing.join('、') : '无'}</div>
          <div>可信度：{confidenceLabel[sources.confidence]}</div>
        </div>
      )}
    </div>
  );
};

interface ChatMessageListProps {
  messages: ChatMessage[];
  onRetry: (assistantMessageId: string) => void;
}

const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages, onRetry }) => {
  const latestAssistantIdWithSources = useMemo(() => {
    const latest = [...messages].reverse().find(message => (
      message.role === 'assistant' && message.contextSources && message.status !== 'error'
    ));
    return latest?.id;
  }, [messages]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto py-6 pr-1">
      {messages.map(message => (
        <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-[78%] whitespace-pre-wrap rounded-[22px] px-4 py-3 text-[15px] leading-7 shadow-sm ${
              message.role === 'user'
                ? 'bg-[#151515] text-white'
                : 'border border-gray-100 bg-white text-gray-800'
            }`}
          >
            <div>{message.content || '正在思考...'}</div>
            {message.role === 'assistant' && message.status === 'error' && (
              <button
                type="button"
                onClick={() => onRetry(message.id)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-500 transition hover:bg-red-100"
              >
                <Icons.RotateCcw size={13} strokeWidth={2.2} />
                重试回答
              </button>
            )}
            {message.role === 'assistant' && message.id === latestAssistantIdWithSources && (
              <SourceSummary sources={message.contextSources} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChatMessageList;
