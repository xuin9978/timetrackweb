import assert from 'node:assert/strict';
import {
  CHAT_LOCAL_LIMIT,
  MAX_PINNED_SESSIONS,
  ChatHistoryStore,
  buildChatSessionTitle,
  createLocalChatHistoryStore,
  getRecentMessagesForPrompt,
  sortChatSessions,
} from '../utils/chatHistoryService';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const storage = new MemoryStorage();
const store: ChatHistoryStore = createLocalChatHistoryStore(storage, 'test-user');

assert.equal(buildChatSessionTitle('  帮我安排今天的优先级，并结合日记  '), '帮我安排今天的优先级，并结合日记');
assert.equal(buildChatSessionTitle(''), '新对话');

const firstSession = await store.createSession('复盘最近状态和长期模式');
await store.saveMessage({
  sessionId: firstSession.id,
  role: 'user',
  content: '复盘最近状态和长期模式',
});
await store.saveMessage({
  sessionId: firstSession.id,
  role: 'assistant',
  content: '你最近的状态和作品集准备有关。',
  contextSources: {
    used: ['最近 7 天日记'],
    missing: ['长期记忆'],
    confidence: 'medium',
  },
});

const messages = await store.fetchMessages(firstSession.id);
assert.equal(messages.length, 2);
assert.deepEqual(messages[1].contextSources, {
  used: ['最近 7 天日记'],
  missing: ['长期记忆'],
  confidence: 'medium',
});

for (let index = 0; index < CHAT_LOCAL_LIMIT + 2; index += 1) {
  await store.createSession(`本地会话 ${index}`);
}

const trimmedSessions = await store.listSessions();
assert.equal(trimmedSessions.length, CHAT_LOCAL_LIMIT);
assert.equal(
  trimmedSessions.some(session => session.id === firstSession.id),
  false,
  'local fallback should keep only the most recent sessions',
);

const pinStore = createLocalChatHistoryStore(new MemoryStorage(), 'pin-user');
const pinSessions = [];
for (let index = 0; index < MAX_PINNED_SESSIONS + 1; index += 1) {
  pinSessions.push(await pinStore.createSession(`置顶会话 ${index}`));
}
for (const session of pinSessions.slice(0, MAX_PINNED_SESSIONS)) {
  await pinStore.setPinned(session.id, true);
}
await assert.rejects(
  () => pinStore.setPinned(pinSessions[MAX_PINNED_SESSIONS].id, true),
  /最多置顶 4 个会话/,
);

const sorted = sortChatSessions([
  { ...pinSessions[4], pinned: false, updatedAt: '2026-07-19T08:00:00.000Z' },
  { ...pinSessions[0], pinned: true, updatedAt: '2026-07-19T07:00:00.000Z' },
  { ...pinSessions[1], pinned: true, updatedAt: '2026-07-19T09:00:00.000Z' },
]);
assert.deepEqual(sorted.map(session => session.title), ['置顶会话 1', '置顶会话 0', '置顶会话 4']);

const searchStore = createLocalChatHistoryStore(new MemoryStorage(), 'search-user');
const searchSession = await searchStore.createSession('面试准备');
await searchStore.saveMessage({
  sessionId: searchSession.id,
  role: 'user',
  content: '我想聊一下支付宝阿宝的产品体验',
});
const titleResults = await searchStore.searchSessions('面试');
assert.equal(titleResults[0]?.id, searchSession.id);
const contentResults = await searchStore.searchSessions('阿宝');
assert.equal(contentResults[0]?.id, searchSession.id);

const longMessages = Array.from({ length: 24 }, (_, index) => ({
  id: `message-${index}`,
  sessionId: 'session',
  role: index % 2 === 0 ? 'user' as const : 'assistant' as const,
  content: `消息 ${index}`,
  createdAt: new Date(2026, 6, 19, 10, index).toISOString(),
  storageScope: 'local' as const,
}));
const recent = getRecentMessagesForPrompt(longMessages, 20);
assert.equal(recent.length, 20);
assert.equal(recent[0].content, '消息 4');
assert.equal(recent[19].content, '消息 23');

console.log('Chat history service tests passed');
