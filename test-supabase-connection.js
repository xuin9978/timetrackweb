// Test Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qlnwwewhbgjffjevevij.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbnd3ZXdoYmdqZmZqZXZldmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTc2NjQsImV4cCI6MjA5NDc0NzY2NH0.gbdc85N8Tj27I1n4WZvK4boiT6BlsCcd3TSkK1Xm4wI';

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey.substring(0, 20) + '...');

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test connection by fetching session
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.error('Auth test failed:', error.message);
    } else {
      console.log('Auth test successful:', data.session ? 'Has session' : 'No session');
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