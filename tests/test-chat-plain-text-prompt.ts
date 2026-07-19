import { createChatCompletion } from '../server/llmChat';

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

let capturedBody = '';

(globalThis as any).fetch = async (_url: string, init?: RequestInit) => {
  capturedBody = String(init?.body ?? '');
  return new Response(JSON.stringify({
    choices: [{ message: { content: '好的，我会用纯文本回答。' } }],
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

const result = await createChatCompletion({
  messages: [{ role: 'user', content: '帮我安排今天的优先级' }],
  quality: 'balanced',
}, {
  DEEPSEEK_API_KEY: 'test-key',
});

assert(result.status === 200, 'chat completion should succeed with mocked fetch');

const payload = JSON.parse(capturedBody);
const systemText = payload.messages
  .filter((message: any) => message.role === 'system')
  .map((message: any) => message.content)
  .join('\n');

assert(systemText.includes('不要使用 Markdown'), 'system prompt should forbid Markdown output');
assert(systemText.includes('#、-、*、**、```'), 'system prompt should name common Markdown symbols');

console.log('Chat plain text prompt test passed');
