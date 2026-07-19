import { supabase } from './supabaseClient';

export interface DiaryEntryRecord {
  id: string;
  userId: string;
  entryDate: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

const fromDB = (row: any): DiaryEntryRecord => ({
  id: row.id,
  userId: row.user_id,
  entryDate: row.entry_date,
  content: row.content ?? '',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const fetchDiaryEntries = async (
  userId: string,
  startDate: string,
  endDate: string,
  signal?: AbortSignal
): Promise<DiaryEntryRecord[]> => {
  if (!supabase) {
    console.warn('Supabase client is not initialized');
    return [];
  }

  const query = supabase
    .from('diary_entries')
    .select('id,user_id,entry_date,content,created_at,updated_at')
    .eq('user_id', userId)
    .gte('entry_date', startDate)
    .lte('entry_date', endDate)
    .order('entry_date', { ascending: true });

  if (signal) query.abortSignal(signal);

  const { data, error } = await query;
  if (error) {
    const msg = String(error.message ?? '');
    const isAbortLike = signal?.aborted || error.name === 'AbortError' || /AbortError|aborted/i.test(msg);
    if (isAbortLike) return [];
    throw new Error(error.message || '日记读取失败');
  }

  return (data ?? []).map(fromDB);
};

export const fetchAllDiaryEntries = async (
  userId: string,
  signal?: AbortSignal
): Promise<DiaryEntryRecord[]> => {
  if (!supabase) {
    console.warn('Supabase client is not initialized');
    return [];
  }

  const pageSize = 1000;
  const rows: any[] = [];

  for (let from = 0; ; from += pageSize) {
    const query = supabase
      .from('diary_entries')
      .select('id,user_id,entry_date,content,created_at,updated_at')
      .eq('user_id', userId)
      .order('entry_date', { ascending: true })
      .range(from, from + pageSize - 1);

    if (signal) query.abortSignal(signal);

    const { data, error } = await query;
    if (error) {
      const msg = String(error.message ?? '');
      const isAbortLike = signal?.aborted || error.name === 'AbortError' || /AbortError|aborted/i.test(msg);
      if (isAbortLike) return [];
      throw new Error(error.message || '日记读取失败');
    }

    const page = Array.isArray(data) ? data : [];
    rows.push(...page);

    if (page.length < pageSize) break;
  }

  return rows.map(fromDB);
};

export const saveDiaryEntry = async (
  userId: string,
  entryDate: string,
  content: string
): Promise<DiaryEntryRecord | null> => {
  if (!supabase) throw new Error('未配置 Supabase');

  const normalizedContent = content.trimEnd();
  if (!normalizedContent.trim()) {
    await deleteDiaryEntry(userId, entryDate);
    return null;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('diary_entries')
    .upsert({
      user_id: userId,
      entry_date: entryDate,
      content: normalizedContent,
      updated_at: now,
    }, { onConflict: 'user_id,entry_date' })
    .select('id,user_id,entry_date,content,created_at,updated_at')
    .single();

  if (error || !data) {
    throw new Error(error?.message || '日记保存失败');
  }

  return fromDB(data);
};

export const deleteDiaryEntry = async (
  userId: string,
  entryDate: string
): Promise<boolean> => {
  if (!supabase) throw new Error('未配置 Supabase');

  const { error } = await supabase
    .from('diary_entries')
    .delete()
    .eq('user_id', userId)
    .eq('entry_date', entryDate);

  if (error) {
    throw new Error(error.message || '日记删除失败');
  }

  return true;
};
