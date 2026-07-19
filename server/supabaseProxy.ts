import type { IncomingMessage, ServerResponse } from 'node:http';

const ALLOWED_PATH_PREFIXES = [
  '/rest/v1/',
  '/auth/v1/',
  '/storage/v1/',
  '/functions/v1/',
];

const REQUEST_HEADERS = [
  'accept',
  'accept-profile',
  'apikey',
  'authorization',
  'content-profile',
  'content-type',
  'prefer',
  'range',
  'x-client-info',
];

const RESPONSE_HEADERS = [
  'content-type',
  'content-range',
  'location',
  'preference-applied',
  'range-unit',
];

export const resolveSupabaseTarget = (supabaseUrl: string, path: string) => {
  if (!path.startsWith('/')) throw new Error('Invalid proxy path');
  if (!ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix))) {
    throw new Error('Unsupported Supabase API path');
  }

  const project = new URL(supabaseUrl);
  const target = new URL(path, project);
  if (target.origin !== project.origin) throw new Error('Invalid proxy path');
  return target.toString();
};

interface ProxyEnvelope {
  path: string;
  method: string;
  headers?: Record<string, string>;
  body?: string | null;
}

const readEnvelope = async (req: IncomingMessage & { body?: unknown }): Promise<ProxyEnvelope> => {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as ProxyEnvelope;
  }
  if (typeof req.body === 'string') return JSON.parse(req.body);
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8'));

  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const requestHeaders = (source: Record<string, string> = {}) => {
  const headers = new Headers();
  REQUEST_HEADERS.forEach(name => {
    const value = source[name];
    if (value) headers.set(name, value);
  });
  return headers;
};

export const handleSupabaseProxy = async (
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
  supabaseUrl?: string,
) => {
  if (!supabaseUrl) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Supabase proxy is not configured.' }));
    return;
  }

  try {
    const envelope = await readEnvelope(req);
    const method = String(envelope.method || '').toUpperCase();
    if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      throw new Error('Unsupported proxy method');
    }
    const target = resolveSupabaseTarget(supabaseUrl, envelope.path || '');
    const upstream = await fetch(target, {
      method,
      headers: requestHeaders(envelope.headers),
      body: method === 'GET' || method === 'HEAD' ? undefined : envelope.body,
    });

    res.statusCode = upstream.status;
    RESPONSE_HEADERS.forEach(name => {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    });
    res.setHeader('Cache-Control', 'no-store');
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Supabase proxy failed.';
    const isInvalidPath = /proxy path|Supabase API path/i.test(message);
    res.statusCode = isInvalidPath ? 400 : 502;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: isInvalidPath ? message : 'Supabase is temporarily unreachable.' }));
  }
};
