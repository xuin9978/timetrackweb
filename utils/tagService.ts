import { supabase } from './supabaseClient';
import { Tag } from '../types';

export const fetchTags = async (userId: string, page: number = 1, perPage: number = 50, signal?: AbortSignal): Promise<Tag[]> => {
  if (!supabase) {
    console.warn('Supabase client is not initialized');
    return [];
  }

  try {
    // Attempt 1: Fetch with 'order' column
    try {
      const query = supabase
        .from('tags')
        .select('id,label,color,icon,created_at,order')
        .eq('user_id', userId)
        .order('order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true })
        .range((page - 1) * perPage, page * perPage - 1);

      if (signal) query.abortSignal(signal);

      const { data, error } = await query;

      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          label: row.label,
          color: row.color,
          icon: row.icon,
          order: row.order
        }));
      }

      // If error is unrelated to schema (e.g. abort), throw it
      const msg = String(error?.message ?? '');
      if (msg.includes('order') || msg.includes('column')) {
        // Fallthrough to retry
        console.warn('Fetch with order failed, falling back to basic fetch:', msg);
      } else {
        throw error;
      }
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.includes('order') || msg.includes('column')) {
        // Fallthrough to retry
      } else {
        throw e;
      }
    }


    // Attempt 2: Fallback without 'order'
    const query = supabase
      .from('tags')
      .select('id,label,color,icon,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .range((page - 1) * perPage, page * perPage - 1);

    if (signal) query.abortSignal(signal);

    const { data, error } = await query;

    if (error) {
      const msg = String(error?.message ?? '');
      const isAbortLike = (signal?.aborted ?? false) || error?.name === 'AbortError' || /AbortError|aborted/i.test(msg) || msg.includes('ERR_ABORTED');
      if (isAbortLike) return [];
      
      // Handle network errors gracefully
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('connection') || msg.includes('ERR_CONNECTION_CLOSED')) {
        console.warn('Network error fetching tags (offline mode?):', msg);
        return [];
      }

      console.error('Error fetching tags (fallback):', error);
      throw error;
    }

    if (!data) return [];

    let tags = data.map((row: any) => ({ id: row.id, label: row.label, color: row.color, icon: row.icon }));

    // Apply local storage order if available
    try {
      const localOrder = localStorage.getItem(`tag_order_${userId}`);
      if (localOrder) {
        const orderMap = new Map(JSON.parse(localOrder).map((id: string, index: number) => [id, index]));
        tags = tags.sort((a: any, b: any) => {
          const indexA = (orderMap.get(a.id) as number) ?? 9999;
          const indexB = (orderMap.get(b.id) as number) ?? 9999;
          return indexA - indexB;
        });
      }
    } catch (e) {
      console.warn('Failed to apply local sort order', e);
    }

    return tags;

  } catch (error: any) {
    const msg = String(error?.message ?? '');
    const isAbortLike = (signal?.aborted ?? false) || error?.name === 'AbortError' || /AbortError|aborted/i.test(msg) || msg.includes('ERR_ABORTED');
    
    if (isAbortLike) return [];

    // Handle network errors gracefully
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('connection') || msg.includes('ERR_CONNECTION_CLOSED')) {
      console.warn('Network error in fetchTags (offline mode?):', msg);
      return [];
    }
    
    console.error('Exception in fetchTags:', error);
    throw error;
  }
};

export const createTag = async (userId: string, tag: Tag): Promise<Tag | null> => {
  if (!supabase) throw new Error('未配置 Supabase');

  try {
    // Try with order
    const { data, error } = await supabase
      .from('tags')
      .insert([{
        id: tag.id,
        user_id: userId,
        label: tag.label,
        color: tag.color,
        icon: tag.icon,
        order: tag.order
      }])
      .select('*')
      .single();

    if (!error && data) return { id: data.id, label: data.label, color: data.color, icon: data.icon, order: data.order };

    if (error && (error.message.includes('order') || error.message.includes('column'))) {
      console.warn('Create with order failed, falling back:', error.message);
    } else {
      throw new Error(error?.message || '标签创建失败');
    }
  } catch (e) {
    // Fallback
  }

  // Fallback: Create without order
  const { data, error } = await supabase
    .from('tags')
    .insert([{
      id: tag.id,
      user_id: userId,
      label: tag.label,
      color: tag.color,
      icon: tag.icon
    }])
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || '标签创建失败');
  return { id: data.id, label: data.label, color: data.color, icon: data.icon };
};

export const updateTag = async (userId: string, tag: Tag): Promise<Tag | null> => {
  if (!supabase) throw new Error('未配置 Supabase');

  try {
    const { data, error } = await supabase
      .from('tags')
      .update({ label: tag.label, color: tag.color, icon: tag.icon, order: tag.order })
      .eq('id', tag.id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (!error && data) return { id: data.id, label: data.label, color: data.color, icon: data.icon, order: data.order };

    if (error && (error.message.includes('order') || error.message.includes('column'))) {
      // Fallback
    } else {
      throw new Error(error?.message || '标签更新失败');
    }
  } catch (e) { }

  // Fallback
  const { data, error } = await supabase
    .from('tags')
    .update({ label: tag.label, color: tag.color, icon: tag.icon })
    .eq('id', tag.id)
    .eq('user_id', userId)
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || '标签更新失败');
  return { id: data.id, label: data.label, color: data.color, icon: data.icon };
};

export const updateTagOrder = async (userId: string, tags: Tag[]): Promise<boolean> => {
  // Always save to local storage as a backup/primary source for order
  try {
    const orderList = tags.map(t => t.id);
    localStorage.setItem(`tag_order_${userId}`, JSON.stringify(orderList));
  } catch (e) {
    console.warn('Failed to save order to local storage', e);
  }

  if (!supabase) throw new Error('未配置 Supabase');

  const updates = tags.map((tag, index) => ({
    id: tag.id,
    user_id: userId,
    label: tag.label,
    color: tag.color,
    icon: tag.icon,
    order: index
  }));

  const { error } = await supabase
    .from('tags')
    .upsert(updates, { onConflict: 'id' });

  if (error) {
    const msg = String(error?.message ?? '');
    if (msg.includes('order') || msg.includes('column')) {
      console.warn('Cannot persist tag order: database missing "order" column.');
      // Return true because we saved to localStorage, so from user perspective it IS saved (locally)
      return true;
    }
    // Gracefully handle network/abort errors
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('connection') ||
      msg.includes('ERR_CONNECTION_CLOSED') ||
      msg.includes('ERR_ABORTED')
    ) {
      console.warn('Network error updating tag order (saved locally):', msg);
      return true;
    }
    console.error('Error updating tag order:', error);
    throw error;
  }
  return true;
};

export const deleteTag = async (userId: string, id: string): Promise<boolean> => {
  if (!supabase) throw new Error('未配置 Supabase');
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
  return true;
};
