import assert from 'node:assert/strict';
import { createChatCompletionStream } from '../server/llmChat';

type CapturedRequest = {
  url: string;
  body: any;
};

const makeStream = () => new ReadableStream({
  start(controller) {
    controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
    controller.close();
  },
});

const captureRequest = async (chatMode: 'quick' | 'deep') => {
  let captured: CapturedRequest | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured = {
      url: String(input),
      body: JSON.parse(String(init?.body)),
    };
    return new Response(makeStream(), { status: 200 });
  }) as typeof fetch;

  try {
    const result = await createChatCompletionStream({
      messages: [{ role: 'user', content: '测试模式' }],
      chatMode,
    }, {
      DEEPSEEK_API_KEY: 'test-key',
    });
    assert.equal(result.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(captured, 'The chat service should call the LLM API');
  return captured.body;
};

const quickBody = await captureRequest('quick');
assert.equal(quickBody.model, 'deepseek-v4-flash');
assert.deepEqual(quickBody.thinking, { type: 'disabled' });
assert.equal('reasoning_effort' in quickBody, false);

const deepBody = await captureRequest('deep');
assert.equal(deepBody.model, 'deepseek-v4-flash');
assert.deepEqual(deepBody.thinking, { type: 'enabled' });
assert.equal(deepBody.reasoning_effort, 'high');

console.log('DeepSeek chat mode tests passed');
