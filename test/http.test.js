import { describe, it, expect, vi } from 'vitest';
import { createHttpClient } from '../src/index.js';

const jsonResponse = (status, body) => ({
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  ok: status >= 200 && status < 300,
  text: async () => JSON.stringify(body),
});

const emptyResponse = (status = 200) => ({ status, statusText: 'OK', ok: true, text: async () => '' });

describe('createHttpClient', () => {
  it('joins baseUrl and endpoint, and builds a query string for GET', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { data: [] }));
    const http = createHttpClient({ baseUrl: '/api/', fetch: fetchImpl });
    await http.get('languages/query', { page: 1, search: '' });
    expect(fetchImpl).toHaveBeenCalledWith('/api/languages/query?page=1', expect.objectContaining({ method: 'GET' }));
  });

  it('sends a JSON body for POST and merges injected headers/locale', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { ok: true }));
    const http = createHttpClient({ baseUrl: '/api', headers: () => ({ 'X-CSRF-Token': 'tok' }), locale: () => 'ar', fetch: fetchImpl });
    await http.post('languages/create', { name: 'Arabic' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('/api/languages/create');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ name: 'Arabic' }));
    expect(init.headers).toMatchObject({ 'X-CSRF-Token': 'tok', 'Accept-Language': 'ar' });
  });

  it('treats a 200 with an empty body as success with null data', async () => {
    const http = createHttpClient({ fetch: async () => emptyResponse() });
    const result = await http.post('x', {});
    expect(result).toEqual({ success: true, data: null, status: 200 });
  });

  it('extracts a normalized error message on failure responses', async () => {
    const http = createHttpClient({ fetch: async () => jsonResponse(422, { error: 'Invalid', errors: { name: 'required' } }) });
    const result = await http.post('x', {});
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid (name: required)');
    expect(result.status).toBe(422);
  });

  it('reports network errors without throwing', async () => {
    const http = createHttpClient({ fetch: async () => { throw new Error('offline'); } });
    const result = await http.get('x');
    expect(result).toEqual({ success: false, error: 'Network error: offline' });
  });

  it('reports invalid JSON bodies instead of throwing', async () => {
    const http = createHttpClient({ fetch: async () => ({ status: 200, statusText: 'OK', ok: true, text: async () => '<html>oops</html>' }) });
    const result = await http.get('x');
    expect(result.success).toBe(false);
    expect(result.rawBody).toBe('<html>oops</html>');
  });
});
