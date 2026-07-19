import type { AgentClientContext } from './agentContext';

export interface ChatServiceMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type ChatMode = 'quick' | 'deep';

export const streamChatMessage = async (
  messages: ChatServiceMessage[],
  chatMode: ChatMode,
  clientContext: AgentClientContext | undefined,
  onDelta: (delta: string) => void
) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, chatMode, clientContext }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || '聊天请求失败，请稍后重试。');
  }

  if (!response.body) {
    throw new Error('聊天流式响应为空。');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  const handleEventLine = (line: string) => {
    if (!line.startsWith('data:')) return;
    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') return;

    try {
      const payload = JSON.parse(data);
      const delta = payload?.choices?.[0]?.delta?.content;
      if (typeof delta === 'string' && delta.length > 0) {
        fullText += delta;
        onDelta(delta);
      }
    } catch {
      // Ignore incomplete or non-JSON SSE lines; the buffer handles chunk boundaries.
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    lines.forEach(handleEventLine);
  }

  buffer
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach(handleEventLine);

  return fullText;
};
