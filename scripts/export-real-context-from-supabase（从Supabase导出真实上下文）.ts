import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { buildAgentClientContext } from '../utils/agentContext';
import { CalendarEvent, Tag } from '../types';
import { DiaryEntryRecord } from '../utils/diaryService';

const cwd = process.cwd();
loadDotenv({ path: path.join(cwd, '.env'), quiet: true });
loadDotenv({ path: path.join(cwd, '.env.local'), quiet: true });

const outputPath = path.join(
  cwd,
  '聊天',
  'Agent聊天效果评估',
  'private',
  'clientContext.real.local（真实上下文本地导出）.json'
);

const getArgValue = (name: string) => {
  const values = process.argv.slice(2);
  const prefix = `${name}=`;
  const item = values.find(value => value.startsWith(prefix));
  if (item) return item.slice(prefix.length);
  const index = values.indexOf(name);
  if (index >= 0) return values[index + 1];
  return undefined;
};

const normalizeEnv = (value: unknown) => (
  typeof value === 'string' ? value.trim().replace(/^['"`]|['"`]$/g, '') : ''
);

const toHHMM = (date: Date) => (
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
);

const eventFromDB = (row: any): CalendarEvent => {
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  return {
    id: row.id,
    title: row.title,
    startTime: toHHMM(start),
    endTime: toHHMM(end),
    category: row.category ?? '',
    date: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
  };
};

const tagFromDB = (row: any): Tag => ({
  id: row.id,
  label: row.label,
  color: row.color,
  icon: row.icon,
  order: row.order,
});

const diaryFromDB = (row: any): DiaryEntryRecord => ({
  id: row.id,
  userId: row.user_id,
  entryDate: row.entry_date,
  content: row.content ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const fetchPaged = async <T>(
  label: string,
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
) => {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw new Error(`${label} 读取失败：${error.message || error.code || 'unknown error'}`);
    const page = Array.isArray(data) ? data : [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
};

const main = async () => {
  const url = normalizeEnv(process.env.VITE_SUPABASE_URL);
  const anonKey = normalizeEnv(process.env.VITE_SUPABASE_ANON_KEY);
  const accessToken = normalizeEnv(
    process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_USER_ACCESS_TOKEN || getArgValue('--access-token')
  );

  if (!url || !anonKey) {
    throw new Error('缺少 VITE_SUPABASE_URL 或 VITE_SUPABASE_ANON_KEY。');
  }

  if (!accessToken) {
    throw new Error(
      [
        '缺少 Supabase 用户 access token，无法在 RLS 保护下读取你的历史数据。',
        '请把当前登录用户的 access token 仅以本地环境变量 SUPABASE_ACCESS_TOKEN 提供，或改用前端“导出上下文”按钮。',
        '脚本不会打印 token，也不会把真实上下文提交到 Git。',
      ].join('\n')
    );
  }

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user?.id) {
    throw new Error(`Supabase 用户校验失败：${userError?.message || '没有拿到用户 ID'}`);
  }

  const userId = userData.user.id;
  const eventsRows = await fetchPaged<any>('events', (from, to) => (
    supabase
      .from('events')
      .select('id,title,start_time,end_time,category')
      .eq('user_id', userId)
      .order('start_time', { ascending: true })
      .range(from, to)
  ));
  const tagRows = await fetchPaged<any>('tags', (from, to) => (
    supabase
      .from('tags')
      .select('id,label,color,icon,order,created_at')
      .eq('user_id', userId)
      .order('order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .range(from, to)
  ));

  let diaryRows: any[] = [];
  try {
    diaryRows = await fetchPaged<any>('diary_entries', (from, to) => (
      supabase
        .from('diary_entries')
        .select('id,user_id,entry_date,content,created_at,updated_at')
        .eq('user_id', userId)
        .order('entry_date', { ascending: true })
        .range(from, to)
    ));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`日记读取跳过：${message}`);
  }

  const { clientContext } = buildAgentClientContext(
    eventsRows.map(eventFromDB),
    tagRows.map(tagFromDB),
    diaryRows.map(diaryFromDB),
    new Date()
  );

  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(clientContext, null, 2));

  console.log(JSON.stringify({
    saved: outputPath,
    events: eventsRows.length,
    tags: tagRows.length,
    diaryEntries: diaryRows.length,
    confidence: clientContext.contextSources?.confidence,
    usedSources: clientContext.contextSources?.used.length ?? 0,
    missingSources: clientContext.contextSources?.missing.length ?? 0,
  }, null, 2));
};

await main();
