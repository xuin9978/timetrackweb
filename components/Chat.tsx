import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from './Icons';
import { ChatMode, ChatServiceMessage, streamChatMessage } from '../utils/chatService';
import { CalendarEvent, Tag } from '../types';
import { buildAgentClientContext, ContextSources } from '../utils/agentContext';
import { DiaryEntryRecord, fetchAllDiaryEntries } from '../utils/diaryService';
import {
  ChatMessageRecord,
  ChatSessionRecord,
  MAX_PINNED_SESSIONS,
  buildChatSessionTitle,
  createChatHistoryStore,
  formatChatRelativeTime,
  sortChatSessions,
} from '../utils/chatHistoryService';

interface ChatMessage extends ChatServiceMessage {
  id: string;
  status?: 'streaming' | 'done' | 'error';
  contextSources?: ContextSources;
}

interface ChatProps {
  events: CalendarEvent[];
  tags: Tag[];
  currentDate: Date;
  userId?: string;
}

const quickPrompts = [
  '我今天先做什么比较好？',
  '帮我看看这周是不是太满了',
  '最近状态有什么规律吗？',
];

const confidenceLabel: Record<ContextSources['confidence'], string> = {
  high: '高',
  medium: '中',
  low: '低',
};

const toChatMessage = (message: ChatMessageRecord): ChatMessage => ({
  id: message.id,
  role: message.role,
  content: message.content,
  status: 'done',
  contextSources: message.contextSources,
});

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

interface HistorySidebarProps {
  sessions: ChatSessionRecord[];
  activeSessionId: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onNewSession: () => void;
  onSelectSession: (sessionId: string) => void;
  onRename: (session: ChatSessionRecord) => void;
  onDelete: (session: ChatSessionRecord) => void;
  onTogglePinned: (session: ChatSessionRecord) => void;
  hasSearchResults: boolean;
}

const HistorySidebar: React.FC<HistorySidebarProps> = ({
  sessions,
  activeSessionId,
  searchQuery,
  onSearchChange,
  onNewSession,
  onSelectSession,
  onRename,
  onDelete,
  onTogglePinned,
  hasSearchResults,
}) => (
  <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-100 bg-white/70 px-3 py-4">
    <div className="mb-3 flex items-center justify-between px-1">
      <h2 className="text-[15px] font-bold text-gray-900">历史</h2>
    </div>
    <button
      type="button"
      onClick={onNewSession}
      className="mb-3 flex h-10 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50"
    >
      <Icons.Plus size={16} strokeWidth={2.2} />
      新对话
    </button>
    <label className="mb-3 flex h-9 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 text-gray-400">
      <Icons.Search size={15} strokeWidth={2.1} />
      <input
        value={searchQuery}
        onChange={event => onSearchChange(event.target.value)}
        placeholder="搜索历史"
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-gray-700 outline-none placeholder:text-gray-400"
      />
    </label>
    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
      {sessions.map(session => (
        <div
          key={session.id}
          className={`group relative rounded-xl border px-3 py-2.5 transition ${
            session.id === activeSessionId
              ? 'border-gray-900 bg-gray-950 text-white shadow-sm'
              : 'border-transparent text-gray-600 hover:border-gray-100 hover:bg-white'
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectSession(session.id)}
            className="block w-full pr-7 text-left"
          >
            <div className="flex items-center gap-1.5">
              {session.pinned && (
                <Icons.Pin size={12} strokeWidth={2.2} className="shrink-0" />
              )}
              <div className="min-w-0 flex-1 truncate text-[13px] font-semibold" title={session.title}>
                {session.title}
              </div>
            </div>
            <div className={`mt-1 flex items-center gap-1.5 text-[11px] font-semibold ${
              session.id === activeSessionId ? 'text-white/60' : 'text-gray-400'
            }`}>
              <span>{formatChatRelativeTime(session.updatedAt)}</span>
              {session.storageScope === 'local' && <span>本机</span>}
              {session.storageScope === 'unsynced' && <span>未同步</span>}
            </div>
          </button>
          <div className={`absolute right-2 top-2 ${session.id === activeSessionId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition`}>
            <details className="relative">
              <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full hover:bg-black/5">
                <Icons.MoreHorizontal size={16} strokeWidth={2.2} />
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-28 rounded-xl border border-gray-100 bg-white p-1 text-gray-700 shadow-lg">
                <button type="button" onClick={() => onRename(session)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-gray-50">
                  <Icons.Pencil size={13} />
                  重命名
                </button>
                <button type="button" onClick={() => onTogglePinned(session)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold hover:bg-gray-50">
                  <Icons.Pin size={13} />
                  {session.pinned ? '取消置顶' : '置顶'}
                </button>
                <button type="button" onClick={() => onDelete(session)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">
                  <Icons.Trash size={13} />
                  删除
                </button>
              </div>
            </details>
          </div>
        </div>
      ))}
      {searchQuery.trim() && !hasSearchResults && (
        <div className="px-3 py-5 text-center text-xs font-semibold text-gray-400">没有找到相关历史</div>
      )}
    </div>
  </aside>
);

const Chat: React.FC<ChatProps> = ({ events, tags, currentDate, userId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [chatMode, setChatMode] = useState<ChatMode>('quick');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryRecord[]>([]);
  const [isDiaryLoading, setIsDiaryLoading] = useState(false);
  const [diaryLoadError, setDiaryLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<ChatSessionRecord | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ChatSessionRecord | null>(null);
  const [syncNotice, setSyncNotice] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const store = useMemo(() => createChatHistoryStore(userId), [userId]);
  const hasMessages = messages.length > 0;
  const activeSession = sessions.find(session => session.id === activeSessionId);

  const refreshSessions = async (query = searchQuery) => {
    const nextSessions = query.trim()
      ? await store.searchSessions(query)
      : await store.listSessions();
    setSessions(nextSessions);
    return nextSessions;
  };

  useEffect(() => {
    let isMounted = true;
    setMessages([]);
    setActiveSessionId(null);
    setError('');
    store.listSessions()
      .then(nextSessions => {
        if (!isMounted) return;
        setSessions(nextSessions);
        const first = sortChatSessions(nextSessions)[0];
        if (first) setActiveSessionId(first.id);
      })
      .catch(err => {
        if (isMounted) setError(err instanceof Error ? err.message : '聊天历史读取失败');
      });
    return () => {
      isMounted = false;
    };
  }, [store]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }
    if (isSending) return;
    let isMounted = true;
    store.fetchMessages(activeSessionId)
      .then(records => {
        if (isMounted) setMessages(records.map(toChatMessage));
      })
      .catch(err => {
        if (isMounted) setError(err instanceof Error ? err.message : '会话消息读取失败');
      });
    return () => {
      isMounted = false;
    };
  }, [activeSessionId, store, isSending]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refreshSessions(searchQuery).catch(() => setError('聊天历史搜索失败'));
    }, userId ? 300 : 0);
    return () => window.clearTimeout(timeout);
  }, [searchQuery, store, userId]);

  useEffect(() => {
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

  const ensureSession = async (firstMessage: string) => {
    if (activeSessionId) return activeSessionId;
    const session = await store.createSession(buildChatSessionTitle(firstMessage));
    setActiveSessionId(session.id);
    await refreshSessions('');
    return session.id;
  };

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
      status: 'done',
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
      const sessionId = await ensureSession(text);
      const savedUser = await store.saveMessage({ sessionId, role: 'user', content: text });
      if (savedUser.storageScope === 'unsynced') setSyncNotice('已临时保存在本机，未同步云端');

      const requestMessages = nextMessages
        .slice(-20)
        .map(({ role, content }) => ({ role, content }));
      const streamedText = await streamChatMessage(
        requestMessages,
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
      const savedAssistant = await store.saveMessage({
        sessionId,
        role: 'assistant',
        content: streamedText.trim(),
        contextSources: requestSources,
      });
      if (savedAssistant.storageScope === 'unsynced') setSyncNotice('已临时保存在本机，未同步云端');
      setMessages(prev => prev.map(message => (
        message.id === assistantMessage.id
          ? { ...message, id: savedAssistant.id, content: streamedText.trim(), status: 'done' }
          : message
      )));
      await refreshSessions(searchQuery);
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

  const startNewSession = () => {
    setActiveSessionId(null);
    setMessages([]);
    setError('');
    setIsHistoryOpen(false);
  };

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setIsHistoryOpen(false);
  };

  const openRename = (session: ChatSessionRecord) => {
    setRenameTarget(session);
    setRenameValue(session.title);
  };

  const renameSession = async () => {
    if (!renameTarget) return;
    try {
      await store.renameSession(renameTarget.id, renameValue);
      setRenameTarget(null);
      setRenameValue('');
      await refreshSessions(searchQuery);
    } catch (err: any) {
      setError(err?.message || '重命名失败');
    }
  };

  const deleteSession = async () => {
    if (!deleteTarget) return;
    try {
      await store.deleteSession(deleteTarget.id);
      const nextSessions = await refreshSessions(searchQuery);
      if (activeSessionId === deleteTarget.id) {
        const next = sortChatSessions(nextSessions)[0];
        setActiveSessionId(next?.id ?? null);
        if (!next) setMessages([]);
      }
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.message || '删除失败');
    }
  };

  const togglePinned = async (session: ChatSessionRecord) => {
    try {
      if (!session.pinned && sessions.filter(item => item.pinned).length >= MAX_PINNED_SESSIONS) {
        throw new Error('最多置顶 4 个会话');
      }
      await store.setPinned(session.id, !session.pinned);
      await refreshSessions(searchQuery);
    } catch (err: any) {
      setError(err?.message || '置顶失败');
    }
  };

  const exportRealClientContext = () => {
    const { clientContext, contextSources } = buildAgentClientContext(events, tags, diaryEntries, currentDate);
    const requestSources = diaryLoadError && !contextSources.missing.includes('最近 7 天日记')
      ? { ...contextSources, missing: [...contextSources.missing, '最近 7 天日记'] }
      : contextSources;
    const payload = { ...clientContext, contextSources: requestSources };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clientContext.real.local（真实上下文本地导出）.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setSyncNotice('真实上下文 JSON 已生成，仅保存在你的浏览器下载位置。');
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
      <button
        type="button"
        aria-label="开启深度思考"
        aria-pressed={chatMode === 'deep'}
        onClick={() => setChatMode(prev => prev === 'deep' ? 'quick' : 'deep')}
        className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition active:scale-95 ${
          chatMode === 'deep'
            ? 'border-[#111111] bg-[#111111] text-white shadow-sm'
            : 'border-gray-200 bg-white text-[#111111] hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Icons.Atom size={15} strokeWidth={2.2} />
        <span>深度思考</span>
      </button>
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

  const history = (
    <HistorySidebar
      sessions={sessions}
      activeSessionId={activeSessionId}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onNewSession={startNewSession}
      onSelectSession={selectSession}
      onRename={openRename}
      onDelete={setDeleteTarget}
      onTogglePinned={togglePinned}
      hasSearchResults={sessions.length > 0}
    />
  );

  return (
    <section className="flex h-[85vh] w-full overflow-hidden rounded-[28px] border border-gray-100 bg-[#FAFAFA] shadow-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="hidden md:block">{history}</div>
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 md:hidden" onClick={() => setIsHistoryOpen(false)}>
          <div className="h-full" onClick={event => event.stopPropagation()}>{history}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-5 md:px-8 md:py-7">
        <div className="mb-3 flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600"
          >
            <Icons.History size={15} />
            历史
          </button>
          {activeSession && <div className="min-w-0 truncate text-xs font-semibold text-gray-400">{activeSession.title}</div>}
        </div>
        <div className="mb-3 flex items-center justify-end">
          <button
            type="button"
            onClick={exportRealClientContext}
            className="flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700"
          >
            <Icons.Download size={15} strokeWidth={2.1} />
            导出上下文
          </button>
        </div>
        {syncNotice && (
          <div className="mx-auto mb-3 flex w-full max-w-3xl items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600">
            <span>{syncNotice}</span>
            <button type="button" onClick={() => setSyncNotice('')} className="text-amber-500">
              <Icons.X size={14} />
            </button>
          </div>
        )}
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
              <p className="mt-4 max-w-2xl text-center text-xs font-semibold text-gray-400">正在读取日记上下文...</p>
            )}
            {diaryLoadError && (
              <p className="mt-4 max-w-2xl text-center text-xs font-semibold text-amber-500">未读取日记，仅基于日程回答。</p>
            )}
            {error && (
              <p className="mt-4 max-w-2xl text-center text-sm font-medium text-red-500">{error}</p>
            )}
          </div>
        ) : (
          <>
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
                    {message.role === 'assistant' && <SourceSummary sources={message.contextSources} />}
                  </div>
                </div>
              ))}
            </div>
            {error && <p className="mx-auto mb-3 w-full max-w-3xl text-sm font-medium text-red-500">{error}</p>}
            {inputBar}
          </>
        )}
      </div>
      {renameTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">重命名会话</h3>
            <input
              value={renameValue}
              onChange={event => setRenameValue(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') renameSession();
              }}
              className="mt-4 h-11 w-full rounded-xl border border-gray-200 px-3 text-sm font-semibold outline-none focus:border-gray-400"
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setRenameTarget(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50">取消</button>
              <button type="button" onClick={renameSession} className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white">保存</button>
            </div>
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-gray-900">删除会话</h3>
            <p className="mt-2 text-sm font-medium leading-6 text-gray-500">确定删除这个会话吗？删除后不可恢复。</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteTarget(null)} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50">取消</button>
              <button type="button" onClick={deleteSession} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white">删除</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Chat;
