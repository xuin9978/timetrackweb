import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from './Icons';
import { ChatMode, streamChatMessage } from '../utils/chatService';
import { CalendarEvent, Tag } from '../types';
import { buildAgentClientContext } from '../utils/agentContext';
import { DiaryEntryRecord, fetchAllDiaryEntries } from '../utils/diaryService';
import {
  ChatMessageRecord,
  ChatSessionRecord,
  MAX_PINNED_SESSIONS,
  buildChatSessionTitle,
  createChatHistoryStore,
  createLocalChatHistoryStore,
  sortChatSessions,
} from '../utils/chatHistoryService';
import { loadDemoDiaryEntries } from '../utils/demoMode';
import ChatHistorySidebar from './chat/ChatHistorySidebar';
import ChatInputBar from './chat/ChatInputBar';
import ChatMessageList from './chat/ChatMessageList';
import ChatSessionModals from './chat/ChatSessionModals';
import type { ChatMessage } from './chat/types';

interface ChatProps {
  events: CalendarEvent[];
  tags: Tag[];
  currentDate: Date;
  userId?: string;
  demoDiaryEntries?: DiaryEntryRecord[];
  demoStorageNamespace?: string;
  enableContextExport?: boolean;
}

const quickPrompts = [
  '我今天先做什么比较好？',
  '帮我看看这周是不是太满了',
  '最近状态有什么规律吗？',
];

const toChatMessage = (message: ChatMessageRecord): ChatMessage => ({
  id: message.id,
  role: message.role,
  content: message.content,
  status: 'done',
  contextSources: message.contextSources,
});

const createNotice = (message: string, tone: 'info' | 'warning' | 'error' = 'warning') => ({ message, tone });

const noticeClasses = {
  info: 'border-blue-100 bg-blue-50 text-blue-600',
  warning: 'border-amber-100 bg-amber-50 text-amber-600',
  error: 'border-red-100 bg-red-50 text-red-500',
};

const noticeButtonClasses = {
  info: 'text-blue-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
};

const Chat: React.FC<ChatProps> = ({
  events,
  tags,
  currentDate,
  userId,
  demoDiaryEntries,
  demoStorageNamespace,
  enableContextExport = false,
}) => {
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
  const [notice, setNotice] = useState<{ message: string; tone: 'info' | 'warning' | 'error' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const store = useMemo(
    () => demoStorageNamespace
      ? createLocalChatHistoryStore(undefined, demoStorageNamespace, 'local')
      : createChatHistoryStore(userId),
    [userId, demoStorageNamespace]
  );
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
        if (isMounted) setNotice(createNotice(err instanceof Error ? err.message : '聊天历史读取失败', 'error'));
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
        if (isMounted) setNotice(createNotice(err instanceof Error ? err.message : '会话消息读取失败', 'error'));
      });
    return () => {
      isMounted = false;
    };
  }, [activeSessionId, store]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      refreshSessions(searchQuery).catch(() => setNotice(createNotice('聊天历史搜索失败', 'error')));
    }, userId ? 300 : 0);
    return () => window.clearTimeout(timeout);
  }, [searchQuery, store, userId]);

  useEffect(() => {
    if (demoDiaryEntries) {
      const localEntries = loadDemoDiaryEntries();
      setDiaryEntries(localEntries.length > 0 ? localEntries : demoDiaryEntries);
      setDiaryLoadError('');
      setIsDiaryLoading(false);
      return;
    }

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
  }, [userId, demoDiaryEntries]);

  const ensureSession = async (firstMessage: string) => {
    if (activeSessionId) return activeSessionId;
    const session = await store.createSession(buildChatSessionTitle(firstMessage));
    setActiveSessionId(session.id);
    await refreshSessions('');
    return session.id;
  };

  const buildRequestContext = () => {
    const { clientContext, contextSources } = buildAgentClientContext(events, tags, diaryEntries, currentDate);
    const requestSources = diaryLoadError && !contextSources.missing.includes('最近 7 天日记')
      ? { ...contextSources, missing: [...contextSources.missing, '最近 7 天日记'] }
      : contextSources;
    return {
      requestContext: { ...clientContext, contextSources: requestSources },
      requestSources,
    };
  };

  const submitMessage = async (content: string, retryAssistantId?: string) => {
    const retryIndex = retryAssistantId
      ? messages.findIndex(message => message.id === retryAssistantId && message.role === 'assistant')
      : -1;
    const retryUserIndex = retryIndex >= 0
      ? [...messages.slice(0, retryIndex)].reverse().findIndex(message => message.role === 'user')
      : -1;
    const previousUserIndex = retryUserIndex >= 0 ? retryIndex - retryUserIndex - 1 : -1;
    const isRetry = retryIndex >= 0 && previousUserIndex >= 0;
    const text = (isRetry ? messages[previousUserIndex].content : content).trim();

    if (!text || isSending) return;

    const { requestContext, requestSources } = buildRequestContext();
    const userMessage: ChatMessage | null = isRetry ? null : {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      status: 'done',
    };
    const baseMessages = isRetry ? messages.slice(0, retryIndex) : messages;
    const nextMessages = userMessage ? [...baseMessages, userMessage] : baseMessages;
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
      if (userMessage) {
        const savedUser = await store.saveMessage({ sessionId, role: 'user', content: text });
        if (savedUser.storageScope === 'unsynced') setNotice(createNotice('已临时保存在本机，未同步云端'));
      }

      const requestMessages = nextMessages
        .slice(-20)
        .map(({ role, content: messageContent }) => ({ role, content: messageContent }));
      const streamedText = await streamChatMessage(
        requestMessages,
        chatMode,
        requestContext,
        nextContent => {
          setMessages(prev => prev.map(message => (
            message.id === assistantMessage.id
              ? { ...message, content: nextContent }
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
      if (savedAssistant.storageScope === 'unsynced') setNotice(createNotice('已临时保存在本机，未同步云端'));
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
    if (isSending) return;
    setActiveSessionId(null);
    setMessages([]);
    setError('');
    setIsHistoryOpen(false);
  };

  const selectSession = (sessionId: string) => {
    if (isSending) return;
    setActiveSessionId(sessionId);
    setIsHistoryOpen(false);
  };

  const openRename = (session: ChatSessionRecord) => {
    if (isSending) return;
    setRenameTarget(session);
    setRenameValue(session.title);
  };

  const renameSession = async () => {
    if (!renameTarget || isSending) return;
    try {
      await store.renameSession(renameTarget.id, renameValue);
      setRenameTarget(null);
      setRenameValue('');
      await refreshSessions(searchQuery);
    } catch (err: any) {
      setNotice(createNotice(err?.message || '重命名失败', 'error'));
    }
  };

  const deleteSession = async () => {
    if (!deleteTarget || isSending) return;
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
      setNotice(createNotice(err?.message || '删除失败', 'error'));
    }
  };

  const togglePinned = async (session: ChatSessionRecord) => {
    if (isSending) return;
    try {
      if (!session.pinned && sessions.filter(item => item.pinned).length >= MAX_PINNED_SESSIONS) {
        throw new Error('最多置顶 4 个会话');
      }
      await store.setPinned(session.id, !session.pinned);
      await refreshSessions(searchQuery);
    } catch (err: any) {
      setNotice(createNotice(err?.message || '置顶失败', 'error'));
    }
  };

  const downloadRealClientContext = (payload: unknown) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clientContext.real.local（真实上下文本地导出）.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const exportRealClientContext = async () => {
    const { requestContext } = buildRequestContext();

    try {
      const response = await fetch('/api/agent-context/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestContext),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || '本地保存失败');
      setNotice(createNotice('真实上下文已保存到 private，可直接运行 real 评估。', 'info'));
    } catch {
      downloadRealClientContext(requestContext);
      setNotice(createNotice('本地保存接口不可用，已改为浏览器下载真实上下文 JSON。', 'info'));
    }
  };

  const inputBar = (
    <ChatInputBar
      draft={draft}
      chatMode={chatMode}
      isSending={isSending}
      inputRef={inputRef}
      onDraftChange={setDraft}
      onChatModeChange={setChatMode}
      onSubmit={handleSubmit}
    />
  );

  const history = (
    <ChatHistorySidebar
      sessions={sessions}
      activeSessionId={activeSessionId}
      searchQuery={searchQuery}
      disabled={isSending}
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
            disabled={isSending}
            className="flex h-9 items-center gap-2 rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icons.History size={15} />
            历史
          </button>
          {activeSession && <div className="min-w-0 truncate text-xs font-semibold text-gray-400">{activeSession.title}</div>}
        </div>
        {enableContextExport && (
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
        )}
        {notice && (
          <div className={`mx-auto mb-3 flex w-full max-w-3xl items-center justify-between rounded-2xl border px-3 py-2 text-xs font-semibold ${noticeClasses[notice.tone]}`}>
            <span>{notice.message}</span>
            <button type="button" onClick={() => setNotice(null)} className={noticeButtonClasses[notice.tone]}>
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
                  disabled={isSending}
                  className="rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-500 shadow-sm transition hover:border-gray-300 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            {isDiaryLoading && (
              <p className="mt-4 max-w-2xl text-center text-xs font-semibold text-gray-400">正在读取日记上下文...</p>
            )}
            {error && (
              <p className="mt-4 max-w-2xl text-center text-sm font-medium text-red-500">{error}</p>
            )}
          </div>
        ) : (
          <>
            <ChatMessageList messages={messages} onRetry={assistantId => submitMessage('', assistantId)} />
            {error && <p className="mx-auto mb-3 w-full max-w-3xl text-sm font-medium text-red-500">{error}</p>}
            {inputBar}
          </>
        )}
      </div>
      <ChatSessionModals
        renameTarget={renameTarget}
        renameValue={renameValue}
        deleteTarget={deleteTarget}
        isBusy={isSending}
        onRenameValueChange={setRenameValue}
        onCancelRename={() => setRenameTarget(null)}
        onSaveRename={renameSession}
        onCancelDelete={() => setDeleteTarget(null)}
        onConfirmDelete={deleteSession}
      />
    </section>
  );
};

export default Chat;
