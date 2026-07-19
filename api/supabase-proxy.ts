import { handleSupabaseProxy } from '../server/supabaseProxy';

export default async function handler(req: any, res: any) {
  await handleSupabaseProxy(req, res, process.env.VITE_SUPABASE_URL);
}
