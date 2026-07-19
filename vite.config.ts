import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createChatCompletionStream } from './server/llmChat';
import { handleSupabaseProxy } from './server/supabaseProxy';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    console.log('VITE_SUPABASE_URL:', env.VITE_SUPABASE_URL ? '已加载' : '未加载');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        {
          name: 'local-supabase-proxy',
          configureServer(server) {
            server.middlewares.use('/api/supabase-proxy', async (req, res) => {
              await handleSupabaseProxy(req, res, env.VITE_SUPABASE_URL);
            });
          },
        },
        {
          name: 'local-chat-api',
          configureServer(server) {
            server.middlewares.use('/api/chat', async (req, res) => {
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: '只支持 POST 请求。' }));
                return;
              }

              let rawBody = '';
              req.on('data', chunk => {
                rawBody += chunk;
              });
              req.on('end', async () => {
                let parsedBody = {};
                try {
                  parsedBody = rawBody ? JSON.parse(rawBody) : {};
                } catch {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: '请求格式不是有效 JSON。' }));
                  return;
                }

                const result = await createChatCompletionStream(parsedBody, {
                  LLM_API_KEY: env.LLM_API_KEY,
                  LLM_API_BASE_URL: env.LLM_API_BASE_URL,
                  LLM_MODEL: env.LLM_MODEL,
                  DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY,
                  DEEPSEEK_API_BASE_URL: env.DEEPSEEK_API_BASE_URL,
                  DEEPSEEK_MODEL: env.DEEPSEEK_MODEL,
                });

                if ('body' in result) {
                  res.statusCode = result.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(result.body));
                  return;
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
              });
            });
          },
        },
        {
          name: 'local-agent-context-export',
          configureServer(server) {
            server.middlewares.use('/api/agent-context/export', async (req, res) => {
              if (req.method !== 'POST') {
                res.statusCode = 405;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: '只支持 POST 请求。' }));
                return;
              }

              let rawBody = '';
              req.on('data', chunk => {
                rawBody += chunk;
              });
              req.on('end', async () => {
                try {
                  const parsedBody = rawBody ? JSON.parse(rawBody) : null;
                  if (!parsedBody || typeof parsedBody !== 'object') {
                    throw new Error('请求格式不是有效 JSON。');
                  }

                  const privateDir = path.join(process.cwd(), '聊天', 'Agent聊天效果评估', 'private');
                  const outputPath = path.join(privateDir, 'clientContext.real.local（真实上下文本地导出）.json');
                  await mkdir(privateDir, { recursive: true });
                  await writeFile(outputPath, JSON.stringify(parsedBody, null, 2), 'utf8');

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ saved: true, path: outputPath }));
                } catch (error) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    error: error instanceof Error ? error.message : '真实上下文保存失败。',
                  }));
                }
              });
            });
          },
        },
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
  });
