/**
 * The gaps a host hits when matching an existing table skin: a tbody class,
 * current-page sorting, a page-jump box, a replaceable rows-per-page control,
 * and icon/colour row-action buttons. Defaults must not move.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDataTable, actionButton, statusBadge, actionButtonColors, defaultTableClasses, raw, html } from '../src/index.js';

const ROWS = [
  { id: 3, name: 'cherry', qty: 30 },
  { id: 1, name: 'apple', qty: 200 },
  { id: 2, name: 'banana', qty: 100 },
];
const COLUMNS = [{ key: 'name', label: 'Name' }, { key: 'qty', label: 'Qty' }];

function make(options = {}, pagination = { page: 1, per_page: 10, total: 3, filtered: 3 }) {
  document.body.innerHTML = '<div id="t"></div>';
  return createDataTable({
    container: '#t', columns: COLUMNS,
    fetchPage: vi.fn(async () => ({ data: ROWS, pagination })),
    ...options,
  });
}
const cells = (col = 0) => [...document.querySelectorAll('tbody tr')].map((tr) => tr.children[col].textContent.trim());

describe('tbody class slot', () => {
  it('is empty by default, so the markup is unchanged', async () => {
    await make().load();
    expect(document.querySelector('tbody').getAttribute('class')).toBe(null);
  });
  it('is applied when given', async () => {
    await make({ classes: { tbody: 'bg-white dark:bg-gray-800' } }).load();
    expect(document.querySelector('tbody').className).toBe('bg-white dark:bg-gray-800');
  });
});

describe('clientSort', () => {
  it('is off by default: no sort attributes, rows keep API order', async () => {
    await make().load();
    expect(document.querySelector('th[data-sort-index]')).toBe(null);
    expect(cells()).toEqual(['cherry', 'apple', 'banana']);
  });

  it('marks headers and sorts ascending on first click', async () => {
    await make({ clientSort: true }).load();
    const th = document.querySelector('th[data-sort-index="0"]');
    expect(th.getAttribute('aria-sort')).toBe('none');
    th.click();
    expect(cells()).toEqual(['apple', 'banana', 'cherry']);
    expect(document.querySelector('th[data-sort-index="0"]').getAttribute('aria-sort')).toBe('ascending');
  });

  it('toggles to descending on a second click of the same header', async () => {
    await make({ clientSort: true }).load();
    document.querySelector('th[data-sort-index="0"]').click();
    document.querySelector('th[data-sort-index="0"]').click();
    expect(cells()).toEqual(['cherry', 'banana', 'apple']);
    expect(document.querySelector('th[data-sort-index="0"]').getAttribute('aria-sort')).toBe('descending');
  });

  it('compares numerically, not as text', async () => {
    await make({ clientSort: true }).load();
    document.querySelector('th[data-sort-index="1"]').click();
    expect(cells(1)).toEqual(['30', '100', '200']);
  });

  it('survives a re-render, so paging back keeps the chosen order', async () => {
    const table = await make({ clientSort: true });
    await table.load();
    document.querySelector('th[data-sort-index="0"]').click();
    await table.load();
    expect(cells()).toEqual(['apple', 'banana', 'cherry']);
  });

  it('honours column.sortable === false', async () => {
    document.body.innerHTML = '<div id="t"></div>';
    const table = createDataTable({
      container: '#t', clientSort: true,
      columns: [{ key: 'name', label: 'Name', sortable: false }, { key: 'qty', label: 'Qty' }],
      fetchPage: async () => ({ data: ROWS, pagination: { page: 1, per_page: 10, total: 3 } }),
    });
    await table.load();
    expect(document.querySelector('th[data-sort-index="0"]')).toBe(null);
    expect(document.querySelector('th[data-sort-index="1"]')).not.toBe(null);
  });

  it('tells a custom header renderer whether the column sorts, and which way', async () => {
    const seen = [];
    await make({ clientSort: true, renderHeaderCell: (col, ctx) => { seen.push([col.key, ctx.sortable, ctx.sortDirection]); return `<th data-sort-index="${ctx.index}">${ctx.label}</th>`; } }).load();
    expect(seen).toEqual([['name', true, 'none'], ['qty', true, 'none']]);
  });
});

describe('pageJump', () => {
  const many = { page: 2, per_page: 10, total: 95, filtered: 95 };

  it('is absent by default', async () => {
    await make({}, many).load();
    expect(document.querySelector('[data-page-jump]')).toBe(null);
  });

  it('renders inside the pagination list with the page count', async () => {
    await make({ pageJump: true }, many).load();
    const input = document.querySelector('[data-page-jump]');
    expect(input.closest('ul.pagination')).not.toBe(null);
    expect(input.value).toBe('2');
    expect(input.max).toBe('10');
    expect(document.querySelector('[data-page-jump]').parentElement.textContent).toContain('/ 10');
  });

  it('is omitted when there is only one page', async () => {
    await make({ pageJump: true }, { page: 1, per_page: 10, total: 3, filtered: 3 }).load();
    expect(document.querySelector('[data-page-jump]')).toBe(null);
  });

  it('loads the typed page on Enter', async () => {
    const fetchPage = vi.fn(async () => ({ data: ROWS, pagination: many }));
    document.body.innerHTML = '<div id="t"></div>';
    const table = createDataTable({ container: '#t', columns: COLUMNS, pageJump: true, fetchPage });
    await table.load();
    const input = document.querySelector('[data-page-jump]');
    input.value = '7';
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchPage.mock.calls.at(-1)[0].page).toBe(7);
  });

  it('clamps an out-of-range page instead of requesting it', async () => {
    const fetchPage = vi.fn(async () => ({ data: ROWS, pagination: many }));
    document.body.innerHTML = '<div id="t"></div>';
    const table = createDataTable({ container: '#t', columns: COLUMNS, pageJump: true, fetchPage });
    await table.load();
    const input = document.querySelector('[data-page-jump]');
    input.value = '999';
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchPage.mock.calls.at(-1)[0].page).toBe(10);
  });
});

describe('renderPerPage', () => {
  it('replaces the control and still drives per_page', async () => {
    const fetchPage = vi.fn(async () => ({ data: ROWS, pagination: { page: 1, per_page: 10, total: 3 } }));
    document.body.innerHTML = '<div id="t"></div>';
    const table = createDataTable({
      container: '#t', columns: COLUMNS, fetchPage,
      renderPerPage: ({ sizes, label }) => `<label class="mine"><svg></svg>${label}<select data-per-page>${sizes}</select></label>`,
    });
    await table.load();
    expect(document.querySelector('label.mine svg')).not.toBe(null);
    const select = document.querySelector('[data-per-page]');
    select.value = '50';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchPage.mock.calls.at(-1)[0].per_page).toBe(50);
  });
});

describe('actionButton icon and colour', () => {
  it('inserts a SafeHtml icon as markup', () => {
    const out = String(actionButton({ action: 'edit', id: 1, label: 'Edit', icon: raw('<svg class="w-3 h-3"></svg>') }));
    expect(out).toContain('<svg class="w-3 h-3"></svg>');
    expect(out).toContain('Edit');
  });

  it('escapes a plain-string icon, so untrusted text cannot inject markup', () => {
    const out = String(actionButton({ action: 'x', id: 1, label: 'L', icon: '<img src=x onerror=alert(1)>' }));
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
  });

  it('composes the colour classes onto className', () => {
    const out = String(actionButton({ action: 'del', id: 1, label: 'Delete', color: 'red', className: 'mine' }));
    expect(out).toContain('class="mine ' + actionButtonColors.red + '"');
  });

  it('ignores an unknown colour rather than emitting undefined', () => {
    const out = String(actionButton({ action: 'x', id: 1, label: 'L', color: 'chartreuse', className: 'mine' }));
    expect(out).toContain('class="mine"');
    expect(out).not.toContain('undefined');
  });

  it('every colour carries dark variants', () => {
    for (const [name, value] of Object.entries(actionButtonColors)) {
      expect(value, name).toMatch(/dark:/);
    }
  });

  it('is unchanged when neither icon nor colour is passed', () => {
    const out = String(actionButton({ action: 'a', id: 2, label: 'Go' }));
    expect(out).toBe(`<button type="button" data-action="a" data-id="2" class="${defaultTableClasses ? 'text-xs px-3 py-1.5 border rounded-md' : ''}">Go</button>`);
  });

  it('statusBadge forwards icon and colour', () => {
    const out = String(statusBadge({ active: true, id: 5, icon: raw('<svg></svg>'), color: 'green' }));
    expect(out).toContain('<svg></svg>');
    expect(out).toContain(actionButtonColors.green);
  });

  it('composes inside an html template without double-escaping', () => {
    const out = String(html`<div>${actionButton({ action: 'a', id: 1, label: 'X', icon: raw('<svg></svg>') })}</div>`);
    expect(out).toContain('<div><button');
    expect(out).toContain('<svg></svg>');
  });
});
