
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Manually load env if dotenv not working or to be sure
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
let url = process.env.VITE_SUPABASE_URL;
let key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.log('Trying to read .env.local manually...');
    try {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        lines.forEach(line => {
            const [k, v] = line.split('=');
            if (k && v) {
                if (k.trim() === 'VITE_SUPABASE_URL') url = v.trim();
                if (k.trim() === 'VITE_SUPABASE_ANON_KEY') key = v.trim();
            }
        });
    } catch (e) {
        console.error('Could not read .env.local:', e.message);
    }
}

console.log('URL:', url);
console.log('Key (masked):', key ? key.substring(0, 10) + '...' : 'MISSING');

if (!url || !key) {
    console.error('Missing URL or Key');
    process.exit(1);
}

const supabase = createClient(url, key);

async function testConnection() {
    console.log('Testing connection to Supabase...');
    try {
        // Try a simple select
        const { data, error } = await supabase.from('events').select('count').limit(1);
        
        if (error) {
            console.error('Supabase Error:', error);
            console.error('Error Details:', JSON.stringify(error, null, 2));
        } else {
            console.log('Connection Successful!');
            console.log('Data:', data);
        }
    } catch (e) {
        console.error('Network/Client Error:', e);
    }
}

testConnection();
