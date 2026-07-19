import { createChatCompletionStream } from '../server/llmChat';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: '只支持 POST 请求。' });
  }

  const result = await createChatCompletionStream(req.body ?? {}, {
    LLM_API_KEY: process.env.LLM_API_KEY,
    LLM_API_BASE_URL: process.env.LLM_API_BASE_URL,
    LLM_MODEL: process.env.LLM_MODEL,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_BASE_URL: process.env.DEEPSEEK_API_BASE_URL,
    DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
  });

  if ('body' in result) {
    return res.status(result.status).json(result.body);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  const reader = result.stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    res.end();
  }
}
