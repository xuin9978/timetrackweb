import { createChatCompletion } from '../server/llmChat';
import { sanitizeChatPlainText } from '../utils/plainText';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

let capturedBody = '';

(globalThis as any).fetch = async (_url: string, init?: RequestInit) => {
  capturedBody = String(init?.body ?? '');
  return new Response(JSON.stringify({
    choices: [{ message: { content: '**好的**，我会用纯文本回答。' } }],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const result = await createChatCompletion({
  messages: [{ role: 'user', content: '帮我安排今天的优先级' }],
  chatMode: 'quick',
}, {
  DEEPSEEK_API_KEY: 'test-key',
});

assert(result.status === 200, 'chat completion should succeed with mocked fetch');
assert((result.body as any).message === '好的，我会用纯文本回答。', 'chat completion should strip Markdown markers');
assert(sanitizeChatPlainText('# 标题\n- 事项\n**重点**') === '标题\n事项\n重点', 'plain text sanitizer should remove common Markdown syntax');

const payload = JSON.parse(capturedBody);
const systemText = payload.messages
  .filter((message: any) => message.role === 'system')
  .map((message: any) => message.content)
  .join('\n');

assert(systemText.includes('不要使用 Markdown'), 'system prompt should forbid Markdown output');
assert(systemText.includes('#、-、*、**、```'), 'system prompt should name common Markdown symbols');
assert(systemText.includes('个人时间伙伴'), 'system prompt should frame the agent as a personal time companion');
assert(systemText.includes('自然聊天'), 'system prompt should ask for natural conversational replies');
assert(!systemText.includes('回答时必须区分“上下文事实”“统计趋势”“你的推断”'), 'system prompt should not force report-style sections every time');

console.log('Chat plain text prompt test passed');
