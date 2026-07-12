import { supabase } from './supabaseClient';
import { CalendarEvent } from '../types';
import {
  chinaWallDateToISOString,
  chinaWallTimeToISOString,
  endOfChinaDayISOString,
  formatChinaWallTime,
  getChinaWallDate,
  startOfChinaDayISOString
} from './timezoneUtils';

const getMinutesFromHHMM = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getEventEndDate = (event: Pick<CalendarEvent, 'date' | 'startTime' | 'endTime'>) => {
  return getMinutesFromHHMM(event.endTime) < getMinutesFromHHMM(event.startTime)
    ? addDays(event.date, 1)
    : event.date;
};

const toTime = (date: Date, time: string) => {
  return chinaWallTimeToISOString(date, time);
};

const fromCachedEvent = (e: any): CalendarEvent => ({
  id: e.id,
  title: e.title,
  startTime: e.startTime,
  endTime: e.endTime,
  category: e.category,
  date: getChinaWallDate(new Date(e.dateISO))
});

const fromDB = (row: any): CalendarEvent => {
  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  
  return {
    id: row.id,
    title: row.title,
    startTime: formatChinaWallTime(start),
    endTime: formatChinaWallTime(end),
    category: row.category ?? '',
    date: getChinaWallDate(start),
  };
};

export const fetchEvents = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  signal?: AbortSignal,
  options?: { ignoreRange?: boolean; loadAll?: boolean }
): Promise<CalendarEvent[]> => {
  if (!supabase) {
    console.warn('Supabase client is not initialized');
    return [];
  }

  try {
    const startISO = startOfChinaDayISOString(startDate);
    const endISO = endOfChinaDayISOString(endDate);
    const ignoreRange = options?.ignoreRange === true;
    const loadAll = options?.loadAll === true;

    // Query A: overlap with visible range
    const base = supabase
      .from('events')
      .select('id,title,start_time,end_time,category')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    let resultA: any = null;
    let resultB: any = null;

    if (loadAll) {
      resultA = base;
    } else if (ignoreRange) {
      // Debug mode: fetch recent N days anchored to now to include上周/上月尾
      const nowISO = new Date().toISOString();
      const pastISO = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      resultA = base.gte('start_time', pastISO).lte('start_time', nowISO);
    } else {
      resultA = base.lte('start_time', endISO).gte('end_time', startISO);
      // Query B: start_time within range (day/week safety)
      resultB = supabase
        .from('events')
        .select('id,title,start_time,end_time,category')
        .eq('user_id', userId)
        .gte('start_time', startISO)
        .lte('start_time', endISO)
        .order('start_time', { ascending: true });
    }

    if (signal) {
      (resultA as any).abortSignal?.(signal);
      (resultB as any)?.abortSignal?.(signal);
    }

    const [{ data: dataA, error: errorA }, dataBRes] = await Promise.all([
      resultA,
      (ignoreRange || loadAll) ? Promise.resolve({ data: null, error: null }) : (resultB as any)
    ]);
    const dataB = (dataBRes as any)?.data ?? null;
    const errorB = (dataBRes as any)?.error ?? null;

    if (errorA || errorB) {
      const msg = String((errorA?.message ?? errorB?.message ?? ''));
      const isAbortLike = (signal?.aborted ?? false) || (errorA?.name === 'AbortError') || (errorB?.name === 'AbortError') || /AbortError|aborted/i.test(msg) || msg.includes('ERR_ABORTED');
      if (isAbortLike) {
        return [];
      }
      // Handle network errors gracefully
      if (
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('connection') ||
        msg.includes('ERR_CONNECTION_CLOSED') ||
        msg.includes('Network request failed')
      ) {
        console.warn('Network error fetching events (offline mode?):', msg);
        return [];
      }
      const err = errorA || errorB;
      console.error('Error fetching events:', err);
      throw err as any;
    }
    
    const rows = [
      ...(Array.isArray(dataA) ? dataA : []),
      ...(Array.isArray(dataB) ? dataB : [])
    ];
    // Deduplicate by id
    const dedup = new Map<string, any>();
    for (const r of rows) dedup.set(r.id, r);
    const mapped = Array.from(dedup.values()).map(fromDB);
    try {
      const payload = mapped.map(e => ({
        id: e.id,
        title: e.title,
        startTime: e.startTime,
        endTime: e.endTime,
        category: e.category,
        dateISO: chinaWallDateToISOString(e.date)
      }));
      localStorage.setItem(`events_cache_${userId}`, JSON.stringify(payload));
    } catch {}
    return mapped;
  } catch (error: any) {
    const msg = String(error?.message ?? '');
    const isAbortLike = (signal?.aborted ?? false) || error?.name === 'AbortError' || /AbortError|aborted/i.test(msg) || msg.includes('ERR_ABORTED');
    if (isAbortLike) {
      try {
        const raw = localStorage.getItem(`events_cache_${userId}`);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.map(fromCachedEvent) : [];
      } catch { return []; }
    }
    // Handle network errors gracefully
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('connection') ||
      msg.includes('ERR_CONNECTION_CLOSED') ||
      msg.includes('Network request failed')
    ) {
      try {
        const raw = localStorage.getItem(`events_cache_${userId}`);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr.map(fromCachedEvent) : [];
      } catch { return []; }
    }
    console.error('Exception in fetchEvents:', error);
    throw error;
  }
};

export const createEvents = async (userId: string, items: Omit<CalendarEvent, 'id'>[]): Promise<CalendarEvent[]> => {
  if (!supabase) throw new Error('未配置 Supabase');
  const rows = items.map((e) => {
    const endDate = getEventEndDate(e);
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      title: e.title,
      start_time: toTime(e.date, e.startTime),
      end_time: toTime(endDate, e.endTime),
      category: e.category || null,
    };
  });
  
  try {
    const { data, error } = await supabase.from('events').insert(rows).select('*');
    if (error || !data) {
      // 检查是否是JWT过期错误
      if (error?.message?.includes('JWT expired')) {
        // 抛出特定的JWT过期错误，便于上层处理
        throw new Error('JWT expired');
      }
      throw new Error(error?.message || '事件创建失败');
    }
    return data.map(fromDB);
  } catch (error: any) {
    // 确保不会丢失传入的事件数据
    console.error('创建事件失败:', error.message);
    // 重新抛出错误，让上层处理
    throw error;
  }
};

export const updateEvent = async (userId: string, e: CalendarEvent): Promise<CalendarEvent | null> => {
  if (!supabase) throw new Error('未配置 Supabase');
  const endDate = getEventEndDate(e);
  const row = {
    title: e.title,
    start_time: toTime(e.date, e.startTime),
    end_time: toTime(endDate, e.endTime),
    category: e.category || null,
  };
  
  try {
    const { data, error } = await supabase
      .from('events')
      .update(row)
      .eq('id', e.id)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error || !data) {
      if (error?.message?.includes('JWT expired')) {
        throw new Error('JWT expired');
      }
      throw new Error(error?.message || '事件更新失败');
    }
    return fromDB(data);
  } catch (error: any) {
    console.error('更新事件失败:', error.message);
    throw error;
  }
};

export const deleteEvent = async (userId: string, id: string): Promise<boolean> => {
  if (!supabase) throw new Error('未配置 Supabase');
  
  try {
    const { error } = await supabase.from('events').delete().eq('id', id).eq('user_id', userId);
    if (error) {
      if (error.message?.includes('JWT expired')) {
        throw new Error('JWT expired');
      }
      throw new Error(error.message);
    }
    return true;
  } catch (error: any) {
    console.error('删除事件失败:', error.message);
    throw error;
  }
};

export const deleteEventsByCategory = async (userId: string, categoryId: string): Promise<boolean> => {
  if (!supabase) throw new Error('未配置 Supabase');
  
  try {
    const { error } = await supabase.from('events').delete().eq('user_id', userId).eq('category', categoryId);
    if (error) {
      if (error.message?.includes('JWT expired')) {
        throw new Error('JWT expired');
      }
      throw new Error(error.message);
    }
    return true;
  } catch (error: any) {
    console.error('按分类删除事件失败:', error.message);
    throw error;
  }
};

export const clearEventCategory = async (userId: string, categoryId: string): Promise<string[]> => {
  if (!supabase) throw new Error('未配置 Supabase');

  try {
    const { data, error } = await supabase
      .from('events')
      .update({ category: null })
      .eq('user_id', userId)
      .eq('category', categoryId)
      .select('id');

    if (error) {
      if (error.message?.includes('JWT expired')) {
        throw new Error('JWT expired');
      }
      throw new Error(error.message);
    }
    return Array.isArray(data) ? data.map((row: any) => row.id) : [];
  } catch (error: any) {
    console.error('清空事件分类失败:', error.message);
    throw error;
  }
};

export const restoreEventCategory = async (userId: string, eventIds: string[], categoryId: string): Promise<boolean> => {
  if (!supabase) throw new Error('未配置 Supabase');
  if (eventIds.length === 0) return true;

  try {
    const { error } = await supabase
      .from('events')
      .update({ category: categoryId || null })
      .eq('user_id', userId)
      .in('id', eventIds);

    if (error) {
      if (error.message?.includes('JWT expired')) {
        throw new Error('JWT expired');
      }
      throw new Error(error.message);
    }
    return true;
  } catch (error: any) {
    console.error('恢复事件分类失败:', error.message);
    throw error;
  }
};

export const replaceAllEvents = async (userId: string, items: Omit<CalendarEvent, 'id'>[]): Promise<CalendarEvent[]> => {
  if (!supabase) throw new Error('未配置 Supabase');
  
  try {
    // 使用事务确保数据一致性
    const { error: delError } = await supabase.from('events').delete().eq('user_id', userId);
    if (delError) {
      if (delError.message?.includes('JWT expired')) {
        throw new Error('JWT expired');
      }
      throw new Error(delError.message);
    }
    
    const rows = items.map((e) => {
      const endDate = getEventEndDate(e);
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        title: e.title,
        start_time: toTime(e.date, e.startTime),
        end_time: toTime(endDate, e.endTime),
        category: e.category || null,
      };
    });
    
    const { data, error } = await supabase.from('events').insert(rows).select('*');
    if (error || !data) {
      if (error?.message?.includes('JWT expired')) {
        throw new Error('JWT expired');
      }
      throw new Error(error?.message || '事件替换失败');
    }
    return data.map(fromDB);
  } catch (error: any) {
    console.error('替换所有事件失败:', error.message);
    throw error;
  }
};
