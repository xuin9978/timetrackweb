// Supabase Connection Status Checker
// This script checks the Supabase connection status

const SUPABASE_URL = 'https://qlnwwewhbgjffjevevij.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbnd3ZXdoYmdqZmZqZXZldmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4OTc2NjQsImV4cCI6MjA5NDc0NzY2NH0.gbdc85N8Tj27I1n4WZvK4boiT6BlsCcd3TSkK1Xm4wI';

async function checkSupabaseConnection() {
  console.log('🔍 Checking Supabase connection status...\n');
  
  // Check 1: URL Accessibility
  console.log('1️⃣ Testing URL accessibility...');
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase URL is accessible');
    } else {
      console.log(`❌ URL test failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log('❌ URL is not accessible:', error.message);
  }
  
  // Check 2: Authentication endpoint
  console.log('\n2️⃣ Testing authentication endpoint...');
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
      console.log('✅ Auth endpoint is working (expected 400 for wrong credentials)');
    } else {
      console.log(`⚠️  Auth endpoint returned: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Auth endpoint test failed:', error.message);
  }
  
  // Check 3: REST API endpoint
  console.log('\n3️⃣ Testing REST API endpoint...');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    
    if (response.ok || response.status === 404) {
      console.log('✅ REST API endpoint is accessible');
    } else {
      console.log(`⚠️  REST API returned: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ REST API test failed:', error.message);
  }
  
  // Check 4: Realtime connection
  console.log('\n4️⃣ Testing realtime connection...');
  try {
    const ws = new WebSocket(`wss://${SUPABASE_URL.replace('https://', '')}/realtime/v1/websocket?apikey=${SUPABASE_KEY}`);
    
    ws.onopen = () => {
      console.log('✅ Realtime WebSocket connection established');
      ws.close();
    };
    
    ws.onerror = (error) => {
      console.log('❌ Realtime WebSocket connection failed');
    };
    
    ws.onclose = () => {
      // Connection test completed
    };
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (ws.readyState === WebSocket.CONNECTING) {
        console.log('⏱️  Realtime connection timeout');
        ws.close();
      }
    }, 5000);
    
  } catch (error) {
    console.log('❌ Realtime test failed:', error.message);
  }
  
  console.log('\n📊 Connection Summary:');
  console.log('- URL: https://qlnwwewhbgjffjevevij.supabase.co');
  console.log('- Status: Configuration loaded from environment');
  console.log('- Key: Anonymous key configured');
  console.log('\n💡 Tips for troubleshooting:');
  console.log('1. Check if Supabase service is running');
  console.log('2. Verify API keys are correct');
  console.log('3. Check network connectivity');
  console.log('4. Review Supabase dashboard for service status');
}

// Run the connection check
checkSupabaseConnection();