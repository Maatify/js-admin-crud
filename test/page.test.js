import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCrudPage, createTranslationsPage, resetMessages } from '../src/index.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="table"></div>';
  resetMessages();
});

const jsonResponse = (body) => ({ status: 200, statusText: 'OK', ok: true, text: async () => JSON.stringify(body) });
const cols = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];

describe('createCrudPage', () => {
  it('wires the table to the list endpoint through the http client', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ id: 1, name: 'Arabic' }], pagination: { page: 1, per_page: 10, total: 1 } }));
    const page = createCrudPage({
      http: { baseUrl: '/api', fetch: fetchImpl },
      table: { container: '#table', columns: cols },
      list: { endpoint: 'languages/query' },
    });
    await page.table.load();
    expect(fetchImpl).toHaveBeenCalledWith('/api/languages/query?page=1&per_page=10', expect.objectContaining({ method: 'GET' }));
    expect(document.getElementById('table').textContent).toContain('Arabic');
    page.destroy();
  });

  it('passes a top-level onRowAction down to the table', async () => {
    const onRowAction = vi.fn();
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ id: 4, name: 'Arabic' }], pagination: { page: 1, per_page: 10, total: 1 } }));
    const page = createCrudPage({
      http: { baseUrl: '/api', fetch: fetchImpl },
      table: {
        container: '#table',
        columns: [{ key: 'id', label: 'ID', render: (v) => `<button data-action="delete" data-id="${v}">D</button>` }],
      },
      list: { endpoint: 'languages/query' },
      onRowAction,
    });
    await page.table.load();
    document.querySelector('[data-action="delete"]').click();
    expect(onRowAction).toHaveBeenCalledWith('delete', expect.objectContaining({ id: 4, row: { id: 4, name: 'Arabic' } }));
    page.destroy();
  });

  it('lets a top-level onRowAction win over one given under table', async () => {
    const top = vi.fn();
    const nested = vi.fn();
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [{ id: 1 }], pagination: { page: 1, per_page: 10, total: 1 } }));
    const page = createCrudPage({
      http: { baseUrl: '/api', fetch: fetchImpl },
      table: {
        container: '#table',
        columns: [{ key: 'id', label: 'ID', render: (v) => `<button data-action="x" data-id="${v}">X</button>` }],
        onRowAction: nested,
      },
      list: { endpoint: 'q' },
      onRowAction: top,
    });
    await page.table.load();
    document.querySelector('[data-action="x"]').click();
    expect(top).toHaveBeenCalledTimes(1);
    expect(nested).not.toHaveBeenCalled();
    page.destroy();
  });

  it('runs a named action through the shared http client and reloads the table', async () => {
    const calls = [];
    const fetchImpl = vi.fn(async (url) => {
      calls.push(url);
      if (url.includes('set-active')) return jsonResponse({});
      return jsonResponse({ data: [], pagination: { page: 1, per_page: 10, total: 0 } });
    });
    const page = createCrudPage({
      http: { baseUrl: '/api', fetch: fetchImpl },
      table: { container: '#table', columns: cols },
      list: { endpoint: 'languages/query' },
      actions: { setActive: { endpoint: 'languages/set-active' } },
    });
    await page.table.load();
    await page.actions.setActive({ payload: { id: 1, active: true } });
    expect(calls.some((u) => u.includes('set-active'))).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(3); // initial load + mutation + reload
    page.destroy();
  });

  it('selects locale-keyed messages', () => {
    createCrudPage({
      http: { baseUrl: '/api' },
      table: { container: '#table', columns: cols },
      list: { endpoint: 'x' },
      locale: 'ar',
      messages: { ar: { 'table.rows': 'صفوف' }, en: { 'table.rows': 'Rows (en)' } },
    });
    expect(document.getElementById('table')).not.toBeNull();
  });

  it('returns null when the table configuration is invalid', () => {
    const notify = vi.fn();
    const page = createCrudPage({ table: { container: '#table', columns: [], notify }, list: { endpoint: 'x' } });
    expect(page).toBeNull();
  });
});

describe('createTranslationsPage', () => {
  it('exposes saveTranslation() backed by the update action', async () => {
    const fetchImpl = vi.fn(async (url) => {
      if (url.includes('update')) return jsonResponse({});
      return jsonResponse({ data: [], pagination: { page: 1, per_page: 10, total: 0 } });
    });
    const page = createTranslationsPage({
      http: { baseUrl: '/api', fetch: fetchImpl },
      table: { container: '#table', columns: cols },
      list: { endpoint: 'languages_translations/query' },
      update: { endpoint: 'languages_translations/update' },
    });
    await page.table.load();
    const result = await page.saveTranslation(3, 'Bonjour');
    expect(result.success).toBe(true);
    const updateCall = fetchImpl.mock.calls.find(([url]) => url.includes('update'));
    expect(updateCall[1].body).toBe(JSON.stringify({ id: 3, value: 'Bonjour' }));
    page.destroy();
  });
});
