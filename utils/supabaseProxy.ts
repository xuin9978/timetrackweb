const PROXY_ENDPOINT = '/api/supabase-proxy';
const FORWARDED_HEADERS = [
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

const inputUrl = (input: RequestInfo | URL) => (
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url
);

export const toSupabaseProxyUrl = (requestUrl: string, supabaseUrl: string) => {
  const request = new URL(requestUrl);
  const project = new URL(supabaseUrl);
  if (request.origin !== project.origin) return requestUrl;
  return PROXY_ENDPOINT;
};

const mergeHeaders = (input: RequestInfo | URL, init?: RequestInit) => {
  const source = input instanceof Request ? input.headers : undefined;
  const headers = new Headers(source);
  new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
  return Object.fromEntries(
    FORWARDED_HEADERS.flatMap(name => {
      const value = headers.get(name);
      return value ? [[name, value]] : [];
    }),
  );
};

const requestBody = async (input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.body != null) {
    if (typeof init.body === 'string') return init.body;
    if (init.body instanceof URLSearchParams) return init.body.toString();
    if (init.body instanceof Blob) return init.body.text();
    if (init.body instanceof ArrayBuffer) return new TextDecoder().decode(init.body);
    if (ArrayBuffer.isView(init.body)) return new TextDecoder().decode(init.body);
    throw new Error('Unsupported Supabase proxy request body');
  }
  if (input instanceof Request && input.method !== 'GET' && input.method !== 'HEAD') {
    return input.clone().text();
  }
  return null;
};

export const createSupabaseProxyFetch = (
  supabaseUrl: string,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): typeof fetch => async (input, init) => {
  const originalUrl = inputUrl(input);
  const proxyUrl = toSupabaseProxyUrl(originalUrl, supabaseUrl);
  if (proxyUrl === originalUrl) return fetchImpl(input, init);

  const request = new URL(originalUrl);
  const method = init?.method || (input instanceof Request ? input.method : 'GET');
  const envelope = {
    path: `${request.pathname}${request.search}`,
    method,
    headers: mergeHeaders(input, init),
    body: await requestBody(input, init),
  };

  return fetchImpl(proxyUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(envelope),
    credentials: 'omit',
    signal: init?.signal || (input instanceof Request ? input.signal : undefined),
  });
};
