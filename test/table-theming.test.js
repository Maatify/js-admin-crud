import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDataTable, defaultTableClasses, resetMessages } from '../src/index.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
let el;
beforeEach(() => {
  document.body.innerHTML = '<div id="t"></div>';
  el = document.getElementById('t');
  resetMessages();
});

const cols = [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }];
const page = (data, p = 1, total = data.length) => ({ data, pagination: { page: p, per_page: 10, total } });
const build = (opts = {}) =>
  createDataTable({ container: el, columns: cols, fetchPage: async (prm) => page([{ id: 1, name: 'A' }], prm.page, opts.total ?? 95), ...opts });

describe('defaultTableClasses', () => {
  it('is exported, frozen, and covers every themable slot', () => {
    expect(defaultTableClasses.container).toContain('table-container');
    expect(Object.isFrozen(defaultTableClasses)).toBe(true);
    expect(() => { defaultTableClasses.th = 'x'; }).toThrow();
  });
});

describe('default output is unchanged by the theming support', () => {
  it('emits exactly the pre-theming class strings when nothing is passed', async () => {
    const t = createDataTable({
      container: el,
      selection: true,
      columns: [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }],
      fetchPage: async (p) => page([{ id: 1, name: 'A' }, { id: 2, name: 'B' }], p.page, 95),
    });
    await t.load();
    expect(el.querySelector('div').className).toBe('table-container bg-white dark:bg-gray-800 rounded-lg py-4 shadow-lg border border-gray-100 dark:border-gray-700');
    expect(el.querySelector('thead tr').className).toBe('border-b-2 border-gray-200');
    expect(el.querySelectorAll('thead th')[1].className).toBe('pe-6 ps-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400');
    expect(el.querySelector('tbody tr').className).toBe(' transition-colors duration-150 hover:bg-blue-200/50 dark:hover:bg-blue-900/20');
    expect(el.querySelectorAll('tbody tr')[1].className).toBe('bg-gray-100 dark:bg-gray-700/20 transition-colors duration-150 hover:bg-blue-200/50 dark:hover:bg-blue-900/20');
    expect(el.querySelector('[data-export="csv"]').className).toBe('text-xs px-3 py-1.5 border rounded-md');
    expect(el.querySelector('[data-page-info]').className).toBe('text-sm text-gray-600');
    expect(el.querySelector('[data-per-page]').className).toBe('h-7 border rounded-md text-sm');
    expect(el.querySelector('ul').className).toBe('pagination flex flex-wrap items-center gap-1');
    // "First" is disabled on page 1, "Next" is not — both class strings unchanged
    expect(el.querySelector('[data-page="1"]').className).toBe('w-9 h-9 rounded-lg border border-gray-300 opacity-50 cursor-not-allowed');
    expect(el.querySelector('[aria-label="Next"]').className).toBe('w-9 h-9 rounded-lg border border-gray-300 ');
    expect(el.querySelector('[data-page="2"]:not([aria-label])').className).toBe('min-w-[36px] h-9 px-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100');
  });

  it('still renders an unclassed <td> for empty values and images', async () => {
    const t = createDataTable({
      container: el,
      columns: [{ key: 'note', label: 'Note' }, { key: 'image', label: 'Img' }],
      fetchPage: async () => page([{ note: '', image: 'https://x.test/a.png' }]),
    });
    await t.load();
    const tds = el.querySelectorAll('tbody td');
    expect(tds[0].hasAttribute('class')).toBe(false);
    expect(tds[0].querySelector('span').className).toBe('text-gray-400 italic text-sm');
    expect(tds[1].hasAttribute('class')).toBe(false);
    expect(tds[1].querySelector('img').className).toBe('w-12 h-12 object-cover rounded');
  });
});

describe('createDataTable classes', () => {
  it('replaces a slot and leaves the others at their defaults', async () => {
    const t = build({ classes: { container: 'my-shell', th: 'my-th' } });
    await t.load();
    expect(el.querySelector('.my-shell')).not.toBeNull();
    expect(el.querySelector('.table-container')).toBeNull(); // replaced, not merged
    expect(el.querySelector('th').className).toBe('my-th');
    // untouched slot keeps its default
    expect(el.querySelector('tbody tr').className).toContain('transition-colors');
  });

  it('lets a host restore dark mode on the slots that lack it', async () => {
    const t = build({
      classes: {
        table: 'min-w-full dark:bg-gray-900',
        th: `${defaultTableClasses.th} dark:text-gray-500`,
        td: `${defaultTableClasses.td} dark:text-gray-200`,
        theadRow: 'border-b-2 border-gray-200 dark:border-gray-700',
      },
    });
    await t.load();
    expect(el.querySelector('table').className).toContain('dark:bg-gray-900');
    expect(el.querySelector('th').className).toContain('dark:text-gray-500');
    expect(el.querySelector('th').className).toContain('uppercase'); // composed, not lost
    expect(el.querySelector('tbody td').className).toContain('dark:text-gray-200');
    expect(el.querySelector('thead tr').className).toContain('dark:border-gray-700');
  });

  it('omits the class attribute entirely when a slot is empty', async () => {
    const t = createDataTable({
      container: el,
      columns: [{ key: 'name', label: 'N' }],
      classes: { td: '' },
      fetchPage: async () => page([{ name: 'A' }]),
    });
    await t.load();
    expect(el.querySelector('tbody td').hasAttribute('class')).toBe(false);
  });

  it('themes the empty state', async () => {
    const t = createDataTable({
      container: el,
      columns: cols,
      classes: { emptyTitle: 'my-empty' },
      fetchPage: async () => page([]),
    });
    await t.load();
    expect(el.querySelector('.my-empty')).not.toBeNull();
  });

  it('themes the error state', async () => {
    const t = createDataTable({
      container: el,
      columns: cols,
      classes: { errorBox: 'my-error', retryButton: 'my-retry' },
      notify: vi.fn(),
      fetchPage: async () => { throw new Error('boom'); },
    });
    await t.load();
    expect(el.querySelector('.my-error')).not.toBeNull();
    expect(el.querySelector('[data-retry]').className).toBe('my-retry');
  });

  it('themes selection chrome', async () => {
    const t = createDataTable({
      container: el,
      columns: cols,
      selection: true,
      classes: { checkboxCell: 'my-cb-cell', selectAllCell: 'my-all' },
      fetchPage: async () => page([{ id: 1, name: 'A' }]),
    });
    await t.load();
    expect(el.querySelector('thead th').className).toBe('my-all');
    expect(el.querySelector('tbody td').className).toBe('my-cb-cell');
  });
});

describe('createDataTable renderers', () => {
  it('renderHeaderCell replaces the th and receives the column, index and label', async () => {
    const renderHeaderCell = vi.fn((column, ctx) => `<th data-key="${column.key}" class="${ctx.classes.th}">${ctx.label} <svg data-sort></svg></th>`);
    const t = build({ renderHeaderCell });
    await t.load();
    expect(renderHeaderCell).toHaveBeenCalledTimes(2);
    expect(renderHeaderCell.mock.calls[1][1]).toMatchObject({ index: 1, label: 'Name' });
    expect(el.querySelectorAll('th[data-key]')).toHaveLength(2);
    expect(el.querySelector('th[data-key="name"] svg[data-sort]')).not.toBeNull();
    expect(el.querySelector('th').className).toBe(defaultTableClasses.th); // classes still reachable
  });

  it('renderExportButtons replaces the group and keeps export working via data-export', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    // export.js downloads via a.click(); jsdom logs an unimplemented-navigation
    // error for that, which has nothing to do with what this test asserts.
    vi.spyOn(window.HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const renderExportButtons = vi.fn(({ kinds }) => kinds.map((k) => `<button data-export="${k}" class="pill"><svg></svg>${k.toUpperCase()}</button>`).join(''));
    const t = build({ renderExportButtons });
    await t.load();
    expect(renderExportButtons.mock.calls[0][0].kinds).toEqual(['csv', 'excel', 'print']);
    expect(el.querySelectorAll('button.pill')).toHaveLength(3);
    expect(el.querySelector('[data-export="csv"] svg')).not.toBeNull();
    expect(el.textContent).toContain('PDF'.slice(0, 0) + 'CSV'); // custom label replaced the default
    el.querySelector('[data-export="csv"]').click();
    expect(URL.createObjectURL).toHaveBeenCalled(); // delegation still reached exportCsv
  });

  it('renderPaginationButton replaces each li and keeps paging working via data-page', async () => {
    const seen = [];
    const renderPaginationButton = (ctx) => {
      seen.push({ kind: ctx.kind, page: ctx.page, active: ctx.active, disabled: ctx.disabled });
      return `<li><button data-page="${ctx.page}" class="pg">${ctx.text}</button></li>`;
    };
    const fetchPage = vi.fn(async (p) => page([{ id: p.page, name: 'A' }], p.page, 95));
    const t = createDataTable({ container: el, columns: cols, fetchPage, renderPaginationButton });
    await t.load();
    expect(seen.some((s) => s.kind === 'first')).toBe(true);
    expect(seen.some((s) => s.kind === 'page' && s.active)).toBe(true);
    expect(el.querySelectorAll('button.pg').length).toBeGreaterThan(1);
    el.querySelector('[data-page="3"]').click();
    await flush();
    expect(fetchPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 }));
  });

  it('passes the merged classes, not the defaults, into every renderer', async () => {
    const got = {};
    const t = build({
      classes: { th: 'custom-th', exportButton: 'custom-exp', pageButton: 'custom-pg' },
      renderHeaderCell: (col, ctx) => { got.th = ctx.classes.th; return '<th></th>'; },
      renderExportButtons: (ctx) => { got.exp = ctx.classes.exportButton; return ''; },
      renderPaginationButton: (ctx) => { got.pg = ctx.classes.pageButton; return '<li></li>'; },
    });
    await t.load();
    expect(got).toEqual({ th: 'custom-th', exp: 'custom-exp', pg: 'custom-pg' });
  });

  it('a renderer that drops the data attribute stops driving the table', async () => {
    const fetchPage = vi.fn(async (p) => page([{ id: 1, name: 'A' }], p.page, 95));
    const t = createDataTable({
      container: el,
      columns: cols,
      fetchPage,
      renderPaginationButton: ({ text }) => `<li><button class="pg">${text}</button></li>`, // no data-page
    });
    await t.load();
    expect(fetchPage).toHaveBeenCalledTimes(1);
    el.querySelector('button.pg').click();
    await flush();
    expect(fetchPage).toHaveBeenCalledTimes(1); // nothing happened, as documented
  });

  it('row actions and selection are unaffected by a custom header renderer', async () => {
    const onRowAction = vi.fn();
    const t = createDataTable({
      container: el,
      columns: [{ key: 'id', label: 'ID', render: (v) => `<button data-action="edit" data-id="${v}">E</button>` }],
      fetchPage: async () => page([{ id: 7 }]),
      renderHeaderCell: () => '<th>custom</th>',
      onRowAction,
    });
    await t.load();
    el.querySelector('[data-action="edit"]').click();
    expect(onRowAction).toHaveBeenCalledWith('edit', expect.objectContaining({ id: 7 }));
  });
});
