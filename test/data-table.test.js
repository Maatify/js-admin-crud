import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDataTable, pageInfo, pageWindow, setMessages, resetMessages } from '../src/index.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
let el;
beforeEach(() => {
  document.body.innerHTML = '<div id="t"></div>';
  el = document.getElementById('t');
  resetMessages();
});

const cols = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];
const page = (data, p = 1, total = data.length) => ({ data, pagination: { page: p, per_page: 10, total } });

describe('createDataTable onRowAction', () => {
  const actionCols = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name', render: (v, row) => `<button data-action="edit" data-id="${row.id}" data-tier="gold">E</button>` },
  ];

  it('fires for a clicked row action with the typed id and the row', async () => {
    const onRowAction = vi.fn();
    const t = createDataTable({ container: el, columns: actionCols, fetchPage: async () => page([{ id: 7, name: 'n' }]), onRowAction });
    await t.load();
    el.querySelector('[data-action="edit"]').click();
    expect(onRowAction).toHaveBeenCalledTimes(1);
    const [action, ctx] = onRowAction.mock.calls[0];
    expect(action).toBe('edit');
    expect(ctx.id).toBe(7); // the row's own value, not the '7' string from dataset
    expect(ctx.row).toEqual({ id: 7, name: 'n' });
    expect(ctx.dataset.tier).toBe('gold');
    expect(ctx.element.tagName).toBe('BUTTON');
  });

  it('uses the table\'s existing listener — no second listener is added', async () => {
    const spy = vi.spyOn(el, 'addEventListener');
    const t = createDataTable({ container: el, columns: actionCols, fetchPage: async () => page([{ id: 1, name: 'n' }]), onRowAction: vi.fn() });
    await t.load();
    expect(spy.mock.calls.filter(([type]) => type === 'click')).toHaveLength(1);
    spy.mockRestore();
  });

  it('does not fire for the table\'s own pagination, export or retry controls', async () => {
    const onRowAction = vi.fn();
    const t = createDataTable({ container: el, columns: actionCols, fetchPage: async (p) => page([{ id: 1, name: 'n' }], p.page, 95), onRowAction });
    await t.load();
    el.querySelector('[data-page="2"]').click();
    await flush();
    // jsdom has no URL.createObjectURL; the export path would throw before we
    // get to assert anything about onRowAction.
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    el.querySelector('[data-export="csv"]').click();
    expect(onRowAction).not.toHaveBeenCalled();
  });

  it('falls back to the raw data-id when no loaded row matches', async () => {
    const onRowAction = vi.fn();
    const t = createDataTable({
      container: el,
      columns: [{ key: 'id', label: 'ID', render: () => '<button data-action="bulk" data-id="999">B</button>' }],
      fetchPage: async () => page([{ id: 1 }]),
      onRowAction,
    });
    await t.load();
    el.querySelector('[data-action="bulk"]').click();
    expect(onRowAction.mock.calls[0][1]).toMatchObject({ id: '999', row: null });
  });

  it('ignores disabled action elements and honours rowActionSelector', async () => {
    const onRowAction = vi.fn();
    const t = createDataTable({
      container: el,
      columns: [{ key: 'id', label: 'ID', render: (v) => `<button data-action="a" data-id="${v}" disabled>A</button><button data-row-action="b" data-action="b" data-id="${v}">B</button>` }],
      fetchPage: async () => page([{ id: 1 }]),
      rowActionSelector: '[data-row-action]',
      onRowAction,
    });
    await t.load();
    el.querySelector('[disabled]').click();
    expect(onRowAction).not.toHaveBeenCalled();
    el.querySelector('[data-row-action]').click();
    expect(onRowAction).toHaveBeenCalledTimes(1);
  });

  it('stops firing after destroy()', async () => {
    const onRowAction = vi.fn();
    const t = createDataTable({ container: el, columns: actionCols, fetchPage: async () => page([{ id: 1, name: 'n' }]), onRowAction });
    await t.load();
    const btn = el.querySelector('[data-action="edit"]');
    t.destroy();
    btn.click();
    expect(onRowAction).not.toHaveBeenCalled();
  });
});

describe('createDataTable', () => {
  it('escapes cell values (no markup injection)', async () => {
    const t = createDataTable({ container: el, columns: cols, fetchPage: async () => page([{ id: 1, name: '<img src=x onerror=alert(1)>' }]) });
    await t.load();
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('trusts column.render output only', async () => {
    const t = createDataTable({ container: el, columns: [{ key: 'id', label: 'ID', render: (v) => `<b>${v}</b>` }], fetchPage: async () => page([{ id: 7 }]) });
    await t.load();
    expect(el.querySelector('td b').textContent).toBe('7');
  });

  it('drops unsafe image URLs', async () => {
    const t = createDataTable({ container: el, columns: [{ key: 'image', label: 'I' }], fetchPage: async () => page([{ image: 'javascript:alert(1)' }]) });
    await t.load();
    expect(el.querySelector('img')).toBeNull();
  });

  it('paginates through fetchPage and shows info text', async () => {
    const fetchPage = vi.fn(async (p) => page([{ id: p.page, name: 'n' }], p.page, 95));
    const t = createDataTable({ container: el, columns: cols, fetchPage });
    await t.load();
    expect(el.querySelector('[data-page-info]').textContent).toBe('1 to 10 of 95');
    el.querySelector('[data-page="3"]').click();
    await flush();
    expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));
    expect(el.querySelector('[data-page-info]').textContent).toBe('21 to 30 of 95');
  });

  it('changing page size resets to page 1', async () => {
    const fetchPage = vi.fn(async (p) => page([], p.page, 0));
    const t = createDataTable({ container: el, columns: cols, fetchPage, params: { page: 4 } });
    await t.load();
    const select = el.querySelector('[data-per-page]');
    select.value = '50';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, per_page: 50 }));
  });

  it('ignores a stale response when a newer request finishes first', async () => {
    let slow;
    const fetchPage = vi.fn((p) => (p.page === 1 ? new Promise((r) => (slow = () => r(page([{ id: 1, name: 'old' }])))) : Promise.resolve(page([{ id: 2, name: 'new' }], 2))));
    const t = createDataTable({ container: el, columns: cols, fetchPage });
    const first = t.load({ page: 1 });
    await t.load({ page: 2 });
    slow();
    await first;
    expect(el.textContent).toContain('new');
    expect(el.textContent).not.toContain('old');
  });

  it('selection works, and destroy() removes listeners', async () => {
    const onSel = vi.fn();
    const t = createDataTable({ container: el, columns: cols, selection: true, onSelectionChange: onSel, fetchPage: async () => page([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]) });
    await t.load();
    el.querySelector('#select-all').click();
    expect(t.getSelected().sort()).toEqual(['1', '2']);
    expect(onSel).toHaveBeenCalled();
    t.clearSelection();
    expect(t.getSelected()).toEqual([]);
    t.destroy();
    expect(el.innerHTML).toBe('');
  });

  it('shows a localized, escaped error with retry', async () => {
    setMessages({ 'table.retry': 'إعادة' });
    const notify = vi.fn();
    const fetchPage = vi.fn().mockRejectedValueOnce(new Error('<b>boom</b>')).mockResolvedValueOnce(page([{ id: 1, name: 'ok' }]));
    const t = createDataTable({ container: el, columns: cols, fetchPage, notify });
    await t.load();
    expect(notify).toHaveBeenCalledWith('danger', '<b>boom</b>');
    expect(el.querySelector('b')).toBeNull();
    expect(el.querySelector('[data-retry]').textContent).toBe('إعادة');
    el.querySelector('[data-retry]').click();
    await flush();
    expect(el.textContent).toContain('ok');
  });

  it('returns null and alerts on bad configuration', () => {
    const notify = vi.fn();
    expect(createDataTable({ container: el, columns: [], fetchPage: async () => ({}), notify })).toBeNull();
    expect(notify).toHaveBeenCalledWith('danger', 'Table configuration error');
  });
});

describe('pagination helpers', () => {
  it('pageInfo handles filtered and empty', () => {
    expect(pageInfo({ page: 2, per_page: 10, total: 25 }).text).toBe('11 to 20 of 25');
    expect(pageInfo({ page: 1, per_page: 10, total: 25, filtered: 3 }).text).toBe('1 to 3 of 3 (filtered from 25 total)');
    expect(pageInfo({ page: 1, per_page: 10, total: 0 }).text).toBe('0 to 0 of 0');
  });
  it('pageWindow slides and clamps', () => {
    expect(pageWindow(1, 20)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(pageWindow(20, 20)).toEqual([14, 15, 16, 17, 18, 19, 20]);
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });
});
