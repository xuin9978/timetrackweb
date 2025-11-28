import { createClient } from '@supabase/supabase-js';

const norm = (v: any) => typeof v === 'string' ? v.trim().replace(/^['"`]|['"`]$/g, '') : undefined;
const url = norm(import.meta.env.VITE_SUPABASE_URL);
const key = norm(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase = url && key && url.length > 6 && key.length > 6 ? createClient(url, key) : null;
