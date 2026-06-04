// Supabase Connection Status Checker
// Reads credentials from .env.local/.env and never prints secrets.
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env', override: false });

const norm = v => typeof v === 'string' ? v.trim().replace(/^['"`]|['"`]$/g, '') : undefined;
const SUPABASE_URL = norm(process.env.VITE_SUPABASE_URL);
const SUPABASE_KEY = norm(process.env.VITE_SUPABASE_ANON_KEY);

async function checkSupabaseConnection() {
  console.log('Checking Supabase connection status...\n');

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  // Check 1: URL Accessibility
  console.log('1. Testing URL accessibility...');
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.ok) {
      console.log('OK: Supabase URL is accessible');
    } else {
      console.log(`FAILED: URL test failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('FAILED: URL is not accessible:', error.message);
  }
  
  // Check 2: Authentication endpoint
  console.log('\n2. Testing authentication endpoint...');
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
    
    if (response.status === 400) {
      console.log('OK: Auth endpoint is working (expected 400 for wrong credentials)');
    } else {
      console.log(`WARN: Auth endpoint returned: ${response.status}`);
    }
  } catch (error) {
    console.log('FAILED: Auth endpoint test failed:', error.message);
  }
  
  // Check 3: REST API endpoint
  console.log('\n3. Testing REST API endpoint...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.ok || response.status === 404) {
      console.log('OK: REST API endpoint is accessible');
    } else {
      console.log(`WARN: REST API returned: ${response.status}`);
    }
  } catch (error) {
    console.log('FAILED: REST API test failed:', error.message);
  }
  
  // Check 4: Events table access
  console.log('\n4. Testing events table access...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok) {
      console.log('OK: events table is reachable');
    } else {
      console.log(`FAILED: events table returned: ${response.status}`);
    }
  } catch (error) {
    console.log('FAILED: events table test failed:', error.message);
  }

  // Check 5: Tags table access
  console.log('\n5. Testing tags table access...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/tags?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (response.ok) {
      console.log('OK: tags table is reachable');
    } else {
      console.log(`FAILED: tags table returned: ${response.status}`);
    }
  } catch (error) {
    console.log('FAILED: tags table test failed:', error.message);
  }
  
  console.log('\nConnection Summary:');
  console.log('- URL configured:', Boolean(SUPABASE_URL));
  console.log('- Status: Configuration loaded from environment');
  console.log('- Key: Anonymous key configured');
  console.log('\nTips for troubleshooting:');
  console.log('1. Check if Supabase service is running');
  console.log('2. Verify API keys are correct');
  console.log('3. Check network connectivity');
  console.log('4. Review Supabase dashboard for service status');
}

// Run the connection check
checkSupabaseConnection();
