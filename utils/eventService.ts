import { supabase } from './supabaseClient';
import { CalendarEvent } from '../types';

const toTime = (date: Date, time: string) => {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toHHMM = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

const fromDB = (row: any): CalendarEvent => {
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  
  // 统一时区处理：确保事件日期与本地时区一致
  // 将UTC时间转换为本地时间，避免时区偏移导致的日期判断错误
  const normalizeToLocalDate = (date: Date): Date => {
    const localDate = new Date(date);
    // 确保日期部分正确，避免UTC转换导致的日期偏移
    const year = localDate.getFullYear();
    const month = localDate.getMonth();
    const day = localDate.getDate();
    return new Date(year, month, day);
  };
  
  return {
    id: row.id,
    title: row.title,
    startTime: toHHMM(start),
    endTime: toHHMM(end),
    category: row.category ?? '',
    date: normalizeToLocalDate(start), // 使用标准化后的本地日期
  };
};

export const fetchEvents = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  signal?: AbortSignal
): Promise<CalendarEvent[]> => {
  if (!supabase) {
    console.warn('Supabase client is not initialized');
    return [];
  }

  try {
    const query = supabase
      .from('events')
      .select('id,title,start_time,end_time,category')
      .eq('user_id', userId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (signal) {
      query.abortSignal(signal);
    }

    const { data, error } = await query;

    if (error) {
      const msg = String(error?.message ?? '');
      const isAbortLike = (signal?.aborted ?? false) || error?.name === 'AbortError' || /AbortError|aborted/i.test(msg) || msg.includes('ERR_ABORTED');
      if (isAbortLike) {
        return [];
      }
      // Handle network errors gracefully
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('connection') || msg.includes('ERR_CONNECTION_CLOSED')) {
        console.warn('Network error fetching events (offline mode?):', msg);
        return [];
      }
      console.error('Error fetching events:', error);
      throw error;
    }
    
    if (!data) return [];
    return data.map(fromDB);
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    const isAbortLike = (signal?.aborted ?? false) || error?.name === 'AbortError' || /AbortError|aborted/i.test(msg) || msg.includes('ERR_ABORTED');
    if (isAbortLike) {
      return [];
    }
    // Handle network errors gracefully
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('connection') || msg.includes('ERR_CONNECTION_CLOSED')) {
      console.warn('Network error in fetchEvents (offline mode?):', msg);
      return [];
    }
    console.error('Exception in fetchEvents:', error);
    throw error;
  }
};

export const createEvents = async (userId: string, items: Omit<CalendarEvent, 'id'>[]): Promise<CalendarEvent[]> => {
  if (!supabase) throw new Error('未配置 Supabase');
  const rows = items.map((e) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    title: e.title,
    start_time: toTime(e.date, e.startTime),
    end_time: toTime(e.date, e.endTime),
    category: e.category || null,
  }));
  const { data, error } = await supabase.from('events').insert(rows).select('*');
  if (error || !data) throw new Error(error?.message || '事件创建失败');
  return data.map(fromDB);
};

export const updateEvent = async (userId: string, e: CalendarEvent): Promise<CalendarEvent | null> => {
  if (!supabase) throw new Error('未配置 Supabase');
  const row = {
    title: e.title,
    start_time: toTime(e.date, e.startTime),
    end_time: toTime(e.date, e.endTime),
    category: e.category || null,
  };
  const { data, error } = await supabase
    .from('events')
    .update(row)
    .eq('id', e.id)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || '事件更新失败');
  return fromDB(data);
};

export const deleteEvent = async (userId: string, id: string): Promise<boolean> => {
  if (!supabase) throw new Error('未配置 Supabase');
  const { error } = await supabase.from('events').delete().eq('id', id).eq('user_id', userId);
  if (error) throw new Error(error.message);
  return true;
};

export const deleteEventsByCategory = async (userId: string, categoryId: string): Promise<boolean> => {
  if (!supabase) throw new Error('未配置 Supabase');
  const { error } = await supabase.from('events').delete().eq('user_id', userId).eq('category', categoryId);
  if (error) throw new Error(error.message);
  return true;
};

export const replaceAllEvents = async (userId: string, items: Omit<CalendarEvent, 'id'>[]): Promise<CalendarEvent[]> => {
  if (!supabase) throw new Error('未配置 Supabase');
  const delRes = await supabase.from('events').delete().eq('user_id', userId);
  if (delRes.error) throw new Error(delRes.error.message);
  const rows = items.map((e) => ({
    id: crypto.randomUUID(),
    user_id: userId,
    title: e.title,
    start_time: toTime(e.date, e.startTime),
    end_time: toTime(e.date, e.endTime),
    category: e.category || null,
  }));
  const { data, error } = await supabase.from('events').insert(rows).select('*');
  if (error || !data) throw new Error(error?.message || '事件替换失败');
  return data.map(fromDB);
};
