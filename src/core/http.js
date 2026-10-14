import { errorMessage } from './errors.js';
import { logger as defaultLogger } from './logger.js';

/**
 * The single HTTP client (replaces the three divergent `fetch` paths in the
 * legacy kernel: data_table.js, api_handler.js, callback_handler.js).
 *
 * options:
 *  - baseUrl: prefix joined with the endpoint (no hard-coded '/api')
 *  - headers: object or ()=>object, merged over Content-Type/Accept/locale
 *  - locale: string or ()=>string, sent as Accept-Language unless `headers` overrides it
 *  - credentials: fetch credentials mode (default 'same-origin')
 *  - fetch / logger: injectable for tests
 */
export function createHttpClient(options = {}) {
  const {
    baseUrl = '',
    headers,
    locale,
    credentials = 'same-origin',
    fetch: fetchImpl = typeof fetch !== 'undefined' ? fetch : undefined,
    logger = defaultLogger,
  } = options;

  function resolveUrl(endpoint, query) {
    const clean = String(endpoint).replace(/^\/+/, '');
    const base = String(baseUrl).replace(/\/+$/, '');
    const path = base ? `${base}/${clean}` : `/${clean}`;
    const usp = new URLSearchParams();
    Object.entries(query || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      usp.set(k, v);
    });
    const qs = usp.toString();
    return qs ? `${path}?${qs}` : path;
  }

  function resolveHeaders() {
    const loc = typeof locale === 'function' ? locale() : locale;
    const extra = typeof headers === 'function' ? headers() : headers || {};
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(loc ? { 'Accept-Language': loc } : {}),
      ...extra,
    };
  }

  async function request(endpoint, { method = 'GET', payload, operation = endpoint } = {}) {
    if (typeof fetchImpl !== 'function') {
      return { success: false, error: 'No fetch implementation available' };
    }

    const isQuery = method === 'GET' || method === 'HEAD';
    const url = resolveUrl(endpoint, isQuery ? payload : undefined);
    const init = { method, headers: resolveHeaders(), credentials };
    if (payload !== undefined && !isQuery) {
      init.body = JSON.stringify(payload);
    }

    logger.debug(`[http] ${operation} -> ${method} ${url}`, payload);

    let response;
    try {
      response = await fetchImpl(url, init);
    } catch (error) {
      logger.error(`[http] ${operation} network error`, error);
      return { success: false, error: `Network error: ${error?.message || error}` };
    }

    const rawText = await response.text();

    if (response.status === 200 && !rawText.trim()) {
      return { success: true, data: null, status: 200 };
    }

    let data = null;
    if (rawText.trim()) {
      try {
        data = JSON.parse(rawText);
      } catch {
        logger.error(`[http] ${operation} invalid JSON body`, rawText);
        return {
          success: false,
          error: `Server returned an invalid response (status ${response.status})`,
          status: response.status,
          rawBody: rawText,
        };
      }
    }

    if (response.ok && !(data && data.error)) {
      return { success: true, data, status: response.status };
    }

    const message = errorMessage(data) || `HTTP ${response.status}: ${response.statusText}`;
    logger.warn(`[http] ${operation} failed`, message);
    return { success: false, error: message, data, status: response.status };
  }

  return {
    request,
    get: (endpoint, params, opts) => request(endpoint, { ...opts, method: 'GET', payload: params }),
    post: (endpoint, payload, opts) => request(endpoint, { ...opts, method: 'POST', payload }),
    put: (endpoint, payload, opts) => request(endpoint, { ...opts, method: 'PUT', payload }),
    patch: (endpoint, payload, opts) => request(endpoint, { ...opts, method: 'PATCH', payload }),
    del: (endpoint, opts) => request(endpoint, { ...opts, method: 'DELETE' }),
  };
}
