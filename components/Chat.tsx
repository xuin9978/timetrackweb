import React, { useRef, useState } from 'react';
import { Icons } from './Icons';
import { ChatMode, ChatServiceMessage, streamChatMessage } from '../utils/chatService';
import { CalendarEvent, Tag } from '../types';
import { buildAgentClientContext, ContextSources } from '../utils/agentContext';
import { DiaryEntryRecord, fetchAllDiaryEntries } from '../utils/diaryService';

interface ChatMessage extends ChatServiceMessage {
  id: string;
  status?: 'streaming' | 'done' | 'error';
  contextSources?: ContextSources;
}

const quickPrompts = [
  '帮我安排今天的优先级',
  '复盘最近状态和长期模式',
  '看看这周有没有过载',
];

interface ChatProps {
  events: CalendarEvent[];
  tags: Tag[];
  currentDate: Date;
  userId?: string;
}

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
          <div>
            已参考：{sources.used.length ? sources.used.join('、') : '无'}
          </div>
          <div>
            未参考：{sources.missing.length ? sources.missing.join('、') : '无'}
          </div>
          <div>可信度：{confidenceLabel[sources.confidence]}</div>
        </div>
      )}
    </div>
  );
};

const Chat: React.FC<ChatProps> = ({ events, tags, currentDate, userId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('quick');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryRecord[]>([]);
  const [isDiaryLoading, setIsDiaryLoading] = useState(false);
  const [diaryLoadError, setDiaryLoadError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const hasMessages = messages.length > 0;

  React.useEffect(() => {
    if (!userId) {
      setDiaryEntries([]);
      setDiaryLoadError('');
      setIsDiaryLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsDiaryLoading(true);
    setDiaryLoadError('');

    fetchAllDiaryEntries(userId, controller.signal)
      .then(records => {
        if (controller.signal.aborted) return;
        setDiaryEntries(records);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setDiaryEntries([]);
        setDiaryLoadError(err instanceof Error ? err.message : '日记读取失败');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsDiaryLoading(false);
      });

    return () => controller.abort();
  }, [userId]);

  const submitMessage = async (content: string) => {
    const text = content.trim();
    if (!text || isSending) return;
    const { clientContext, contextSources } = buildAgentClientContext(events, tags, diaryEntries, currentDate);
    const requestSources = diaryLoadError && !contextSources.missing.includes('最近 7 天日记')
      ? { ...contextSources, missing: [...contextSources.missing, '最近 7 天日记'] }
      : contextSources;
    const requestContext = { ...clientContext, contextSources: requestSources };

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    const nextMessages = [...messages, userMessage];
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      status: 'streaming',
      contextSources: requestSources,
    };

    setMessages([...nextMessages, assistantMessage]);
    setDraft('');
    setError('');
    setIsSending(true);

    try {
      const streamedText = await streamChatMessage(
        nextMessages.map(({ role, content }) => ({ role, content })),
        chatMode,
        requestContext,
        delta => {
          setMessages(prev => prev.map(message => (
            message.id === assistantMessage.id
              ? { ...message, content: message.content + delta }
              : message
          )));
        }
      );
      if (!streamedText.trim()) {
        throw new Error('LLM 返回为空，请稍后重试。');
      }
      setMessages(prev => prev.map(message => (
        message.id === assistantMessage.id
          ? { ...message, status: 'done' }
          : message
      )));
    } catch (err: any) {
      setMessages(prev => prev.map(message => (
        message.id === assistantMessage.id
          ? {
              ...message,
              status: 'error',
              content: message.content.trim() || '时间 Agent 暂时没有回应，请稍后重试。',
            }
          : message
      )));
      setError(err?.message || '时间 Agent 暂时没有回应，请稍后重试。');
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitMessage(draft);
  };

  const inputBar = (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-3xl items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 shadow-[0_16px_44px_rgba(15,23,42,0.08)] transition focus-within:border-gray-300"
    >
      <button
        type="button"
        aria-label="添加内容"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
      >
        <Icons.Plus size={20} strokeWidth={2.1} />
      </button>
      <input
        ref={inputRef}
        value={draft}
        onChange={event => setDraft(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-gray-700 outline-none placeholder:text-gray-400"
        placeholder="问问你的时间 Agent"
        disabled={isSending}
      />
      <label className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-gray-600">
        <select
          value={chatMode}
          onChange={event => setChatMode(event.target.value as ChatMode)}
          className="bg-transparent text-sm font-semibold outline-none"
          aria-label="DeepSeek 模式"
        >
          <option value="quick">快速回答</option>
          <option value="deep">深度分析</option>
        </select>
      </label>
      <button
        type="submit"
        aria-label="发送消息"
        disabled={!draft.trim() || isSending}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFD6C4] text-white transition hover:bg-[#ffc8b0] active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-200"
      >
        {isSending ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <Icons.ChevronRight className="-rotate-90" size={20} strokeWidth={2.6} />
        )}
      </button>
    </form>
  );

  return (
    <section className="flex h-[85vh] w-full flex-col overflow-hidden rounded-[28px] border border-gray-100 bg-[#FAFAFA] shadow-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="flex flex-1 flex-col overflow-hidden px-5 py-5 md:px-8 md:py-7">
        {!hasMessages ? (
          <div className="flex flex-1 flex-col items-center justify-center pb-[12vh]">
            <h1 className="mb-8 text-center text-[24px] font-semibold tracking-normal text-[#111111] md:text-[28px]">
              今天有什么计划？
            </h1>
            {inputBar}
            <div className="mt-5 flex max-w-3xl flex-wrap justify-center gap-2">
              {quickPrompts.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => submitMessage(prompt)}
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {isDiaryLoading && (
              <p className="mt-4 max-w-2xl text-center text-xs font-semibold text-gray-400">
                正在读取日记上下文...
              </p>
            )}
            {diaryLoadError && (
              <p className="mt-4 max-w-2xl text-center text-xs font-semibold text-amber-500">
                未读取日记，仅基于日程回答。
              </p>
            )}
            {error && (
              <p className="mt-4 max-w-2xl text-center text-sm font-medium text-red-500">{error}</p>
            )}
          </div>
        ) : (
          <>
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 overflow-y-auto py-6 pr-1">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] whitespace-pre-wrap rounded-[22px] px-4 py-3 text-[15px] leading-7 shadow-sm ${
                      message.role === 'user'
                        ? 'bg-[#151515] text-white'
                        : 'border border-gray-100 bg-white text-gray-800'
                    }`}
                  >
                    <div>{message.content || '正在思考...'}</div>
                    {message.role === 'assistant' && (
                      <SourceSummary sources={message.contextSources} />
                    )}
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <p className="mx-auto mb-3 w-full max-w-3xl text-sm font-medium text-red-500">{error}</p>
            )}
            {inputBar}
          </>
        )}
      </div>
    </section>
  );
};

export default Chat;
