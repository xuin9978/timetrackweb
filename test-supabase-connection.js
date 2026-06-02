import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const norm = v => typeof v === 'string' ? v.trim().replace(/^['"`]|['"`]$/g, '') : undefined;
const supabaseUrl = norm(process.env.VITE_SUPABASE_URL) || 'https://qlnwwewhbgjffjevevij.supabase.co';
const supabaseKey = norm(process.env.VITE_SUPABASE_ANON_KEY);

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', (supabaseKey || '').substring(0, 20) + '...');

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection by fetching session
  supabase.auth.getSession().then(async ({ data, error }) => {
    if (error) {
      console.error('Auth test failed:', error.message);
    } else {
      console.log('Auth test successful:', data.session ? 'Has session' : 'No session');
      const uid = data.session?.user?.id;
      if (uid) {
        const { data: evs, error: evErr } = await supabase
          .from('events')
          .select('id,title,start_time,end_time,category')
          .eq('user_id', uid)
          .order('start_time', { ascending: true })
          .limit(5);
        if (evErr) {
          console.error('Events query failed:', evErr.message);
        } else {
          console.log('Events query successful:', Array.isArray(evs) ? `Found ${evs.length} rows` : 'No data');
        }

        const { data: tags, error: tagErr } = await supabase
          .from('tags')
          .select('id,label,color,icon,order')
          .eq('user_id', uid)
          .order('order', { ascending: true, nullsFirst: false })
          .limit(5);
        if (tagErr) {
          console.error('Tags query failed:', tagErr.message);
        } else {
          console.log('Tags query successful:', Array.isArray(tags) ? `Found ${tags.length} rows` : 'No data');
        }
      }
    }
  });

  // Test database connection by fetching events table structure
  supabase.from('events').select('*').limit(1).then(({ data, error }) => {
    if (error) {
      console.error('Database test failed:', error.message);
      console.error('Error details:', error);
    } else {
      console.log('Database test successful:', data ? `Found ${data.length} rows` : 'No data');
    }
  });

  // Test tags table
  supabase.from('tags').select('*').limit(1).then(({ data, error }) => {
    if (error) {
      console.error('Tags table test failed:', error.message);
    } else {
      console.log('Tags table test successful:', data ? `Found ${data.length} rows` : 'No data');
    }
  });

} catch (error) {
  console.error('Supabase client creation failed:', error);
}
