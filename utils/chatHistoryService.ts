import { supabase } from './supabaseClient';
import { ChatServiceMessage } from './chatService';
import { ContextSources } from './agentContext';

export const CHAT_LOCAL_LIMIT = 10;
export const CHAT_CLOUD_LIMIT = 50;
export const MAX_PINNED_SESSIONS = 4;
export const CHAT_PROMPT_MESSAGE_LIMIT = 20;

const LOCAL_SESSIONS_KEY = 'timestep-chat-sessions-v1';
const LOCAL_MESSAGES_KEY = 'timestep-chat-messages-v1';

export type ChatStorageScope = 'cloud' | 'local' | 'unsynced';

export interface ChatSessionRecord {
  id: string;
  userId?: string;
  title: string;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  storageScope: ChatStorageScope;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  userId?: string;
  role: 'user' | 'assistant';
  content: string;
  contextSources?: ContextSources;
  createdAt: string;
  storageScope: ChatStorageScope;
}

export interface ChatHistoryStore {
  listSessions(): Promise<ChatSessionRecord[]>;
  searchSessions(query: string): Promise<ChatSessionRecord[]>;
  createSession(title: string): Promise<ChatSessionRecord>;
  renameSession(sessionId: string, title: string): Promise<ChatSessionRecord>;
  deleteSession(sessionId: string): Promise<void>;
  setPinned(sessionId: string, pinned: boolean): Promise<ChatSessionRecord>;
  fetchMessages(sessionId: string): Promise<ChatMessageRecord[]>;
  saveMessage(input: {
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    contextSources?: ContextSources;
  }): Promise<ChatMessageRecord>;
  touchSession(sessionId: string): Promise<ChatSessionRecord | null>;
}

interface LocalPayload {
  sessions: ChatSessionRecord[];
  messages: ChatMessageRecord[];
}

const fallbackStorage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

const nowIso = () => new Date().toISOString();
const normalizeTitle = (title: string) => {
  const normalized = title.replace(/\s+/g, ' ').trim();
  return normalized || '新对话';
};

export const buildChatSessionTitle = (content: string, maxLength = 20) => {
  const normalized = normalizeTitle(content);
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
};

export const sortChatSessions = (sessions: ChatSessionRecord[]) => (
  [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  })
);

const mergeChatSessions = (sessions: ChatSessionRecord[]) => {
  const byId = new Map<string, ChatSessionRecord>();
  sessions.forEach(session => {
    const existing = byId.get(session.id);
    if (!existing) {
      byId.set(session.id, session);
      return;
    }
    if (session.storageScope === 'unsynced' || existing.storageScope === 'unsynced') {
      byId.set(session.id, {
        ...existing,
        ...session,
        title: existing.storageScope === 'cloud' ? existing.title : session.title,
        pinned: existing.pinned || session.pinned,
        updatedAt: new Date(existing.updatedAt) > new Date(session.updatedAt) ? existing.updatedAt : session.updatedAt,
        storageScope: 'unsynced',
      });
      return;
    }
    byId.set(session.id, new Date(existing.updatedAt) > new Date(session.updatedAt) ? existing : session);
  });
  return sortChatSessions(Array.from(byId.values()));
};

export const getRecentMessagesForPrompt = (
  messages: ChatMessageRecord[],
  limit = CHAT_PROMPT_MESSAGE_LIMIT
): ChatServiceMessage[] => (
  [...messages]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-limit)
    .map(({ role, content }) => ({ role, content }))
);

export const formatChatRelativeTime = (iso: string, anchor = new Date()) => {
  const date = new Date(iso);
  const diffMs = anchor.getTime() - date.getTime();
  if (diffMs < 60_000) return '刚刚';
  if (diffMs < 60 * 60_000) return `${Math.max(1, Math.floor(diffMs / 60_000))}分钟前`;

  const sameDay = date.toDateString() === anchor.toDateString();
  const yesterday = new Date(anchor);
  yesterday.setDate(anchor.getDate() - 1);
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return `今天 ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`;

  const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (date.getFullYear() === anchor.getFullYear()) return monthDay;
  return `${date.getFullYear()}-${monthDay}`;
};

const matchesQuery = (value: string, query: string) => (
  value.toLowerCase().includes(query.toLowerCase())
);

const readLocalPayload = (storage: Storage, namespace: string): LocalPayload => {
  try {
    const sessions = JSON.parse(storage.getItem(`${LOCAL_SESSIONS_KEY}:${namespace}`) ?? '[]');
    const messages = JSON.parse(storage.getItem(`${LOCAL_MESSAGES_KEY}:${namespace}`) ?? '[]');
    return {
      sessions: Array.isArray(sessions) ? sessions : [],
      messages: Array.isArray(messages) ? messages : [],
    };
  } catch {
    return { sessions: [], messages: [] };
  }
};

const writeLocalPayload = (storage: Storage, namespace: string, payload: LocalPayload) => {
  storage.setItem(`${LOCAL_SESSIONS_KEY}:${namespace}`, JSON.stringify(payload.sessions));
  storage.setItem(`${LOCAL_MESSAGES_KEY}:${namespace}`, JSON.stringify(payload.messages));
};

const trimLocalPayload = (payload: LocalPayload): LocalPayload => {
  const sessions = sortChatSessions(payload.sessions).slice(0, CHAT_LOCAL_LIMIT);
  const ids = new Set(sessions.map(session => session.id));
  return {
    sessions,
    messages: payload.messages.filter(message => ids.has(message.sessionId)),
  };
};

export const createLocalChatHistoryStore = (
  storage: Storage = fallbackStorage() as Storage,
  namespace = 'guest',
  storageScope: ChatStorageScope = 'local'
): ChatHistoryStore => {
  if (!storage) throw new Error('当前环境不支持本地聊天记录');

  const read = () => trimLocalPayload(readLocalPayload(storage, namespace));
  const write = (payload: LocalPayload) => writeLocalPayload(storage, namespace, trimLocalPayload(payload));

  const updateSession = (sessionId: string, updater: (session: ChatSessionRecord) => ChatSessionRecord) => {
    const payload = read();
    const session = payload.sessions.find(item => item.id === sessionId);
    if (!session) throw new Error('会话不存在');
    const next = updater(session);
    write({
      ...payload,
      sessions: payload.sessions.map(item => item.id === sessionId ? next : item),
    });
    return next;
  };

  return {
    async listSessions() {
      return sortChatSessions(read().sessions);
    },
    async searchSessions(query: string) {
      const text = query.trim();
      const payload = read();
      if (!text) return sortChatSessions(payload.sessions);
      const matchedMessageSessionIds = new Set(
        payload.messages
          .filter(message => matchesQuery(message.content, text))
          .map(message => message.sessionId)
      );
      return sortChatSessions(payload.sessions.filter(session => (
        matchesQuery(session.title, text) || matchedMessageSessionIds.has(session.id)
      )));
    },
    async createSession(title: string) {
      const payload = read();
      const time = nowIso();
      const session: ChatSessionRecord = {
        id: crypto.randomUUID(),
        title: buildChatSessionTitle(title),
        pinned: false,
        createdAt: time,
        updatedAt: time,
        storageScope,
      };
      write({ ...payload, sessions: [session, ...payload.sessions] });
      return session;
    },
    async renameSession(sessionId: string, title: string) {
      return updateSession(sessionId, session => ({
        ...session,
        title: normalizeTitle(title),
        updatedAt: nowIso(),
      }));
    },
    async deleteSession(sessionId: string) {
      const payload = read();
      write({
        sessions: payload.sessions.filter(session => session.id !== sessionId),
        messages: payload.messages.filter(message => message.sessionId !== sessionId),
      });
    },
    async setPinned(sessionId: string, pinned: boolean) {
      const payload = read();
      const current = payload.sessions.find(session => session.id === sessionId);
      if (!current) throw new Error('会话不存在');
      if (pinned && !current.pinned && payload.sessions.filter(session => session.pinned).length >= MAX_PINNED_SESSIONS) {
        throw new Error('最多置顶 4 个会话');
      }
      return updateSession(sessionId, session => ({
        ...session,
        pinned,
        updatedAt: nowIso(),
      }));
    },
    async fetchMessages(sessionId: string) {
      return read().messages
        .filter(message => message.sessionId === sessionId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    async saveMessage(input) {
      const payload = read();
      const hasSession = payload.sessions.some(session => session.id === input.sessionId);
      const sessionFallback: ChatSessionRecord = {
        id: input.sessionId,
        title: buildChatSessionTitle(input.content),
        pinned: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        storageScope,
      };
      const message: ChatMessageRecord = {
        id: crypto.randomUUID(),
        sessionId: input.sessionId,
        role: input.role,
        content: input.content,
        contextSources: input.contextSources,
        createdAt: nowIso(),
        storageScope,
      };
      const baseSessions = hasSession ? payload.sessions : [sessionFallback, ...payload.sessions];
      const sessions = baseSessions.map(session => (
        session.id === input.sessionId ? { ...session, updatedAt: message.createdAt } : session
      ));
      write({ sessions, messages: [...payload.messages, message] });
      return message;
    },
    async touchSession(sessionId: string) {
      try {
        return updateSession(sessionId, session => ({ ...session, updatedAt: nowIso() }));
      } catch {
        return null;
      }
    },
  };
};

const fromSessionRow = (row: any): ChatSessionRecord => ({
  id: row.id,
  userId: row.user_id,
  title: row.title ?? '新对话',
  pinned: row.pinned === true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  storageScope: 'cloud',
});

const fromMessageRow = (row: any): ChatMessageRecord => ({
  id: row.id,
  sessionId: row.session_id,
  userId: row.user_id,
  role: row.role,
  content: row.content ?? '',
  contextSources: row.context_sources ?? undefined,
  createdAt: row.created_at,
  storageScope: 'cloud',
});

export const createSupabaseChatHistoryStore = (
  userId: string,
  fallback: ChatHistoryStore = createLocalChatHistoryStore(fallbackStorage() as Storage, `unsynced:${userId}`, 'unsynced')
): ChatHistoryStore => {
  if (!supabase) return fallback;

  const runWithFallback = async <T>(operation: () => Promise<T>, fallbackOperation: () => Promise<T>) => {
    try {
      return await operation();
    } catch {
      return fallbackOperation();
    }
  };

  return {
    async listSessions() {
      const cloud = await supabase
        .from('chat_sessions')
        .select('id,user_id,title,pinned,created_at,updated_at')
        .eq('user_id', userId)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(CHAT_CLOUD_LIMIT);
      if (cloud.error) return fallback.listSessions();
      const local = await fallback.listSessions();
      return mergeChatSessions([...(cloud.data ?? []).map(fromSessionRow), ...local]);
    },
    async searchSessions(query: string) {
      const text = query.trim();
      if (!text) return this.listSessions();
      const sessions = await this.listSessions();
      const cloudSessions = sessions.filter(session => session.storageScope === 'cloud').slice(0, CHAT_CLOUD_LIMIT);
      const sessionIds = cloudSessions.map(session => session.id);
      let matchedIds = new Set<string>();
      if (sessionIds.length > 0) {
        const { data } = await supabase
          .from('chat_messages')
          .select('session_id')
          .eq('user_id', userId)
          .in('session_id', sessionIds)
          .ilike('content', `%${text}%`)
          .limit(200);
        matchedIds = new Set((data ?? []).map((row: any) => row.session_id));
      }
      const localResults = await fallback.searchSessions(text);
      const localIds = new Set(localResults.map(session => session.id));
      return sortChatSessions(sessions.filter(session => (
        matchesQuery(session.title, text) ||
        matchedIds.has(session.id) ||
        localIds.has(session.id)
      )));
    },
    async createSession(title: string) {
      return runWithFallback(async () => {
        const time = nowIso();
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({ user_id: userId, title: buildChatSessionTitle(title), updated_at: time })
          .select('id,user_id,title,pinned,created_at,updated_at')
          .single();
        if (error || !data) throw new Error(error?.message || '会话创建失败');
        return fromSessionRow(data);
      }, () => fallback.createSession(title));
    },
    async renameSession(sessionId: string, title: string) {
      return runWithFallback(async () => {
        const { data, error } = await supabase
          .from('chat_sessions')
          .update({ title: normalizeTitle(title), updated_at: nowIso() })
          .eq('user_id', userId)
          .eq('id', sessionId)
          .select('id,user_id,title,pinned,created_at,updated_at')
          .single();
        if (error || !data) throw new Error(error?.message || '会话重命名失败');
        return fromSessionRow(data);
      }, () => fallback.renameSession(sessionId, title));
    },
    async deleteSession(sessionId: string) {
      try {
        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('user_id', userId)
          .eq('id', sessionId);
        if (error) throw new Error(error.message || '会话删除失败');
      } catch {
        await fallback.deleteSession(sessionId);
      }
    },
    async setPinned(sessionId: string, pinned: boolean) {
      const sessions = await this.listSessions();
      const target = sessions.find(session => session.id === sessionId);
      if (!target) throw new Error('会话不存在');
      if (pinned && !target.pinned && sessions.filter(session => session.pinned).length >= MAX_PINNED_SESSIONS) {
        throw new Error('最多置顶 4 个会话');
      }
      if (target.storageScope !== 'cloud') return fallback.setPinned(sessionId, pinned);
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({ pinned, updated_at: nowIso() })
        .eq('user_id', userId)
        .eq('id', sessionId)
        .select('id,user_id,title,pinned,created_at,updated_at')
        .single();
      if (error || !data) throw new Error(error?.message || '置顶更新失败');
      return fromSessionRow(data);
    },
    async fetchMessages(sessionId: string) {
      const sessions = await this.listSessions();
      const target = sessions.find(session => session.id === sessionId);
      if (target && target.storageScope !== 'cloud') return fallback.fetchMessages(sessionId);
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id,session_id,user_id,role,content,context_sources,created_at')
        .eq('user_id', userId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (error) return fallback.fetchMessages(sessionId);
      return (data ?? []).map(fromMessageRow);
    },
    async saveMessage(input) {
      const sessions = await this.listSessions();
      const target = sessions.find(session => session.id === input.sessionId);
      if (target && target.storageScope !== 'cloud') return fallback.saveMessage(input);
      return runWithFallback(async () => {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            session_id: input.sessionId,
            user_id: userId,
            role: input.role,
            content: input.content,
            context_sources: input.contextSources ?? null,
          })
          .select('id,session_id,user_id,role,content,context_sources,created_at')
          .single();
        if (error || !data) throw new Error(error?.message || '消息保存失败');
        await this.touchSession(input.sessionId);
        return fromMessageRow(data);
      }, () => fallback.saveMessage(input));
    },
    async touchSession(sessionId: string) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({ updated_at: nowIso() })
        .eq('user_id', userId)
        .eq('id', sessionId)
        .select('id,user_id,title,pinned,created_at,updated_at')
        .single();
      if (error || !data) return fallback.touchSession(sessionId);
      return fromSessionRow(data);
    },
  };
};

export const createChatHistoryStore = (userId?: string) => (
  userId
    ? createSupabaseChatHistoryStore(userId)
    : createLocalChatHistoryStore(fallbackStorage() as Storage, 'guest', 'local')
);
