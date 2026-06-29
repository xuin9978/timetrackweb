import { supabase } from './supabaseClient';

export interface DayJourneyRecord {
  id: string;
  userId: string;
  date: string;
  markdown: string;
  promptVersion?: string;
  modelProvider?: string;
  modelName?: string;
  sourceEventIds: string[];
  inputSnapshot?: Record<string, unknown>;
  warnings: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface SaveDayJourneyPayload {
  userId: string;
  date: string;
  markdown: string;
  promptVersion?: string;
  modelProvider?: string;
  modelName?: string;
  sourceEventIds: string[];
  inputSnapshot: Record<string, unknown>;
  warnings: string[];
}

const DAY_JOURNEY_TABLE_MISSING_MESSAGE = '一天之旅保存表尚未创建，请先执行 supabase/migrations/004_ai_day_journeys.sql';

const isMissingDayJourneyTableError = (message: string) => {
  return /ai_day_journeys|schema cache|does not exist|relation .* not exist|Could not find the table/i.test(message);
};

const normalizeDayJourneyError = (error: any) => {
  const message = String(error?.message ?? error ?? '');
  if (isMissingDayJourneyTableError(message)) {
    return new Error(DAY_JOURNEY_TABLE_MISSING_MESSAGE);
  }
  return new Error(message || '一天之旅保存失败');
};

const fromDB = (row: any): DayJourneyRecord => ({
  id: row.id,
  userId: row.user_id,
  date: row.date,
  markdown: row.markdown,
  promptVersion: row.prompt_version ?? undefined,
  modelProvider: row.model_provider ?? undefined,
  modelName: row.model_name ?? undefined,
  sourceEventIds: Array.isArray(row.source_event_ids) ? row.source_event_ids : [],
  inputSnapshot: row.input_snapshot ?? undefined,
  warnings: Array.isArray(row.warnings) ? row.warnings : [],
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

export const getDayJourney = async (userId: string, date: string): Promise<DayJourneyRecord | null> => {
  if (!supabase) throw new Error('未配置 Supabase，暂时无法读取已保存的一天之旅');

  const { data, error } = await supabase
    .from('ai_day_journeys')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle();

  if (error) throw normalizeDayJourneyError(error);
  return data ? fromDB(data) : null;
};

export const saveDayJourney = async (payload: SaveDayJourneyPayload): Promise<DayJourneyRecord> => {
  if (!supabase) throw new Error('未配置 Supabase，暂时无法保存一天之旅');

  const row = {
    user_id: payload.userId,
    date: payload.date,
    markdown: payload.markdown,
    prompt_version: payload.promptVersion ?? null,
    model_provider: payload.modelProvider ?? null,
    model_name: payload.modelName ?? null,
    source_event_ids: payload.sourceEventIds,
    input_snapshot: payload.inputSnapshot,
    warnings: payload.warnings,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('ai_day_journeys')
    .upsert(row, { onConflict: 'user_id,date' })
    .select('*')
    .single();

  if (error || !data) throw normalizeDayJourneyError(error);
  return fromDB(data);
};
