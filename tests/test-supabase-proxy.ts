import assert from 'node:assert/strict';
import { createSupabaseProxyFetch, toSupabaseProxyUrl } from '../utils/supabaseProxy';
import { resolveSupabaseTarget } from '../server/supabaseProxy';

const supabaseUrl = 'https://project-ref.supabase.co';

const rewritten = toSupabaseProxyUrl(
  'https://project-ref.supabase.co/rest/v1/events?select=*',
  supabaseUrl,
);
assert.equal(
  rewritten,
  '/api/supabase-proxy',
  'Supabase REST requests should use the same-origin proxy',
);

assert.equal(
  toSupabaseProxyUrl('https://example.com/data', supabaseUrl),
  'https://example.com/data',
  'Unrelated requests must not be rewritten',
);

assert.equal(
  resolveSupabaseTarget(supabaseUrl, '/rest/v1/events?select=*'),
  'https://project-ref.supabase.co/rest/v1/events?select=*',
  'The proxy should resolve an allowed REST path against the configured project',
);

assert.throws(
  () => resolveSupabaseTarget(supabaseUrl, 'https://example.com/private'),
  /invalid proxy path/i,
  'Absolute external URLs must be rejected',
);

assert.throws(
  () => resolveSupabaseTarget(supabaseUrl, '/unrelated/path'),
  /unsupported Supabase API path/i,
  'Only known Supabase API prefixes may be forwarded',
);

let capturedInput: RequestInfo | URL | undefined;
let capturedInit: RequestInit | undefined;
const proxyFetch = createSupabaseProxyFetch(supabaseUrl, async (input, init) => {
  capturedInput = input;
  capturedInit = init;
  return new Response('{}', { status: 200 });
});

await proxyFetch(`${supabaseUrl}/rest/v1/events?select=*`, {
  method: 'GET',
  headers: {
    apikey: 'publishable-key',
    authorization: 'Bearer user-token',
  },
});

assert.equal(capturedInput, '/api/supabase-proxy');
const localHeaders = new Headers(capturedInit?.headers);
assert.equal(localHeaders.has('authorization'), false, 'JWT must not inflate the local request headers');
assert.equal(localHeaders.has('apikey'), false, 'The API key must travel inside the proxy envelope');
const envelope = JSON.parse(String(capturedInit?.body));
assert.equal(envelope.path, '/rest/v1/events?select=*');
assert.equal(envelope.headers.authorization, 'Bearer user-token');
assert.equal(envelope.headers.apikey, 'publishable-key');

console.log('Supabase proxy tests passed');
