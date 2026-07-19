import { createClient } from '@supabase/supabase-js';
import { createSupabaseProxyFetch } from './supabaseProxy';

const norm = (v: any) => typeof v === 'string' ? v.trim().replace(/^['"`]|['"`]$/g, '') : undefined;
const url = norm(import.meta.env.VITE_SUPABASE_URL);
const key = norm(import.meta.env.VITE_SUPABASE_ANON_KEY);

// 配置Supabase客户端，优化令牌刷新机制
export const supabase = url && key && url.length > 6 && key.length > 6 ? 
  createClient(url, key, {
    global: {
      fetch: createSupabaseProxyFetch(url),
    },
    auth: {
      // 配置令牌自动刷新选项
      autoRefreshToken: true,
      persistSession: true,
      // 确保刷新令牌的有效性
      detectSessionInUrl: false
    }
  }) : null;
