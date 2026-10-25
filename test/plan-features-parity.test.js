/**
 * Acceptance proof for examples/plan-features.js: the athar-platform page that
 * is 597 lines across 4 files (helpers + modals + actions + with-components),
 * rewritten as one file on top of this library.
 *
 * This runs that exact file — read off disk, not reimplemented — against the
 * DOM contract of its Twig template and a mocked API, asserting the behaviours
 * the legacy version had.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as lib from '../src/index.js';

const PAGE_SOURCE = readFileSync(resolve(process.cwd(), 'examples/plan-features.js'), 'utf8');
const flush = () => new Promise((r) => setTimeout(r, 0));

const FEATURES = [
  { feature_id: 11, feature_key: 'ar_images_limit', feature_category: 'Media', value_type: 'int', quota_scope: 'plan', is_extendable: 1, feature_is_visible: 1, is_assigned: true, value_int: 50, unit: 'imgs', value_mode: 'fixed', reset_policy: 'monthly', value_text: null },
  { feature_id: 12, feature_key: 'custom_domain', feature_category: null, value_type: 'bool', quota_scope: null, is_extendable: 0, feature_is_visible: 0, is_assigned: false, value_int: null, value_text: null, value_mode: null, reset_policy: null },
];

const TEMPLATE = `
  <form id="features-filter-form">
    <input type="text" id="filter-feature-key">
    <select id="filter-quota-scope"><option value=""></option><option value="plan">plan</option></select>
    <select id="filter-is-assigned"><option value=""></option><option value="1">1</option></select>
    <select id="filter-is-extendable"><option value=""></option></select>
    <select id="filter-is-visible"><option value=""></option></select>
  </form>
  <input id="features-global-search">
  <button id="features-search-btn"></button>
  <button id="features-clear-search"></button>
  <button id="features-reset-filters"></button>
  <div id="table-container"></div>

  <div id="plan-feature-modal-assign" class="modal-backdrop hidden">
    <form id="assignFeatureForm">
      <input id="assign-feature_id"><input id="assign-feature_name">
      <div id="assign-value_int-container"><select id="assign-value_int"><option value="1">1</option><option value="0">0</option></select><input id="assign-value_int-input"></div>
      <div id="assign-value_text-container"><input id="assign-value_text"></div>
      <select id="assign-value_mode"><option value="fixed">fixed</option><option value="base">base</option></select>
      <button type="submit">Save</button>
      <button type="button" data-modal-close="plan-feature-modal-assign"></button>
    </form>
  </div>

  <div id="plan-feature-modal-edit" class="modal-backdrop hidden">
    <form id="editFeatureForm">
      <input id="edit-feature_id"><input id="edit-feature_name">
      <div id="edit-value_int-container"><select id="edit-value_int"><option value="1">1</option><option value="50">50</option></select><input id="edit-value_int-input"></div>
      <div id="edit-value_text-container"><input id="edit-value_text"></div>
      <select id="edit-value_mode"><option value="fixed">fixed</option></select>
      <select id="edit-reset_policy"><option value="none">none</option><option value="monthly">monthly</option></select>
      <button type="submit">Save</button>
    </form>
  </div>`;

let fetchMock;

function apiResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 400, statusText: ok ? 'OK' : 'Bad Request', text: async () => JSON.stringify(body) };
}

/** Boot the real page file against the template, as a <script> tag would. */
async function bootPage({ capabilities = { can_list: true, can_assign: true, can_update: true, can_unassign: true }, features = FEATURES, pagination, search = '' } = {}) {
  document.body.innerHTML = TEMPLATE;
  window.history.replaceState({}, '', `/admin/plans/9/features${search}`);
  window.planFeaturesContext = { plan_id: 9 };
  window.planFeaturesCapabilities = capabilities;
  window.MaatifyAdminCrud = lib;

  fetchMock = vi.fn(async (url) => {
    if (String(url).includes('/features/query')) {
      return apiResponse({ data: features, pagination: pagination || { page: 1, per_page: 10, total: features.length, filtered: features.length } });
    }
    return apiResponse({ success: true });
  });
  globalThis.fetch = fetchMock;

  new Function(PAGE_SOURCE)();
  await flush();
  await flush();
  return document.getElementById('table-container');
}

const listCalls = () => fetchMock.mock.calls.filter(([u]) => String(u).includes('/features/query'));
const lastListBody = () => JSON.parse(listCalls().at(-1)[1].body);
const mutationCalls = () => fetchMock.mock.calls.filter(([u]) => !String(u).includes('/features/query'));

beforeEach(() => {
  vi.restoreAllMocks();
  lib.resetMessages();
});
afterEach(() => {
  delete window.planFeaturesContext;
  delete window.planFeaturesCapabilities;
  delete window.MaatifyAdminCrud;
  delete window.PlanFeaturesPage;
});

describe('plan-features as a single file', () => {
  it('loads the list over POST with the nested search body the endpoint expects', async () => {
    await bootPage();
    expect(listCalls()).toHaveLength(1);
    const [url, init] = listCalls()[0];
    expect(url).toBe('/api/plans/9/features/query');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ page: 1, per_page: 10 });
  });

  it('renders every column the legacy page rendered', async () => {
    const el = await bootPage();
    const text = el.textContent;
    expect(text).toContain('ar_images_limit');
    expect(text).toContain('Media');
    expect(text).toContain('General');      // category fallback
    expect(text).toContain('50 imgs');      // int + unit
    expect(text).toContain('plan');
    expect(text).toContain('Global');       // quota_scope fallback
    expect(text).toContain('YES');
    expect(text).toContain('NO');
    expect(text).toContain('VISIBLE');
    expect(text).toContain('HIDDEN');
    expect(text).toContain('Fixed');        // value_mode pill
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('shows assign for an unassigned row and edit+unassign for an assigned one', async () => {
    const el = await bootPage();
    const rows = el.querySelectorAll('tbody tr');
    expect(rows[0].querySelector('[data-action="edit"]')).not.toBeNull();
    expect(rows[0].querySelector('[data-action="unassign"]')).not.toBeNull();
    expect(rows[0].querySelector('[data-action="assign"]')).toBeNull();
    expect(rows[1].querySelector('[data-action="assign"]')).not.toBeNull();
    expect(rows[1].querySelector('[data-action="edit"]')).toBeNull();
  });

  it('honours each capability flag independently', async () => {
    const el = await bootPage({ capabilities: { can_list: true, can_assign: false, can_update: true, can_unassign: false } });
    expect(el.querySelector('[data-action="edit"]')).not.toBeNull();
    expect(el.querySelector('[data-action="unassign"]')).toBeNull();
    expect(el.querySelector('[data-action="assign"]')).toBeNull();
  });

  it('renders the permission notice and never calls the API without can_list', async () => {
    const el = await bootPage({ capabilities: { can_list: false } });
    expect(el.textContent).toContain('You do not have permission to view plan features.');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('escapes a hostile feature_key instead of rendering it', async () => {
    const el = await bootPage({
      features: [{ ...FEATURES[0], feature_key: '<img src=x onerror=alert(1)>' }],
    });
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('sends column filters and the global search nested under search', async () => {
    await bootPage();
    document.getElementById('filter-feature-key').value = 'storage';
    document.getElementById('features-global-search').value = 'abc';
    document.getElementById('features-filter-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    expect(lastListBody()).toEqual({ page: 1, per_page: 10, search: { global: 'abc', columns: { feature_key: 'storage' } } });
  });

  it('applies a select filter immediately on change', async () => {
    await bootPage();
    const select = document.getElementById('filter-quota-scope');
    select.value = 'plan';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect(lastListBody().search).toEqual({ columns: { quota_scope: 'plan' } });
  });

  it('reset-filters clears the form and reloads at page 1', async () => {
    await bootPage();
    document.getElementById('filter-feature-key').value = 'storage';
    document.getElementById('features-reset-filters').click();
    await flush();
    expect(document.getElementById('filter-feature-key').value).toBe('');
    expect(lastListBody()).toEqual({ page: 1, per_page: 10 });
  });

  it('clear-search empties the box and reloads', async () => {
    await bootPage();
    document.getElementById('features-global-search').value = 'abc';
    document.getElementById('features-clear-search').click();
    await flush();
    expect(document.getElementById('features-global-search').value).toBe('');
    expect(lastListBody().search).toBeUndefined();
  });

  it('reports the filtered count and the "filtered from" note', async () => {
    await bootPage({ pagination: { page: 1, per_page: 10, total: 40, filtered: 2 } });
    document.getElementById('features-global-search').value = 'abc';
    document.getElementById('features-filter-form').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    const info = document.querySelector('[data-page-info]').textContent;
    expect(info).toContain('1 to 2');
    expect(info).toContain('of 2');
    expect(info).toContain('filtered from 40 total');
  });

  it('prefills a filter from the query string', async () => {
    await bootPage({ search: '?is_assigned=1' });
    expect(document.getElementById('filter-is-assigned').value).toBe('1');
  });

  it('opens the edit modal prefilled from the clicked row', async () => {
    const el = await bootPage();
    el.querySelector('[data-action="edit"]').click();
    await flush();
    expect(document.getElementById('plan-feature-modal-edit').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('edit-feature_id').value).toBe('11');
    expect(document.getElementById('edit-feature_name').value).toBe('ar_images_limit');
    expect(document.getElementById('edit-value_int-input').value).toBe('50');
    expect(document.getElementById('edit-value_mode').value).toBe('fixed');
    expect(document.getElementById('edit-reset_policy').value).toBe('monthly');
    // value_type 'int' shows the free input and hides the select
    expect(document.getElementById('edit-value_int-input').style.display).toBe('');
    expect(document.getElementById('edit-value_int').style.display).toBe('none');
    expect(document.getElementById('edit-value_text-container').style.display).toBe('none');
  });

  it('opens the assign modal reset, with bool showing the select not the input', async () => {
    const el = await bootPage();
    el.querySelectorAll('tbody tr')[1].querySelector('[data-action="assign"]').click();
    await flush();
    expect(document.getElementById('plan-feature-modal-assign').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('assign-feature_id').value).toBe('12');
    expect(document.getElementById('assign-value_int-input').value).toBe('');
    expect(document.getElementById('assign-value_mode').value).toBe('fixed');
    expect(document.getElementById('assign-value_int').style.display).toBe('');
    expect(document.getElementById('assign-value_int-input').style.display).toBe('none');
  });

  it('submits assign with the legacy payload shape, closes the modal and reloads', async () => {
    const el = await bootPage();
    el.querySelectorAll('tbody tr')[1].querySelector('[data-action="assign"]').click();
    await flush();
    document.getElementById('assign-value_int').value = '0';
    document.getElementById('assignFeatureForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    await flush();
    const [url, init] = mutationCalls().at(-1);
    expect(url).toBe('/api/plans/9/features/assign');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ feature_id: 12, value_mode: 'fixed', reset_policy: 'none', value_int: 0 });
    expect(document.getElementById('plan-feature-modal-assign').classList.contains('hidden')).toBe(true);
    expect(listCalls().length).toBeGreaterThan(1); // table reloaded
  });

  it('submits edit including reset_policy', async () => {
    const el = await bootPage();
    el.querySelector('[data-action="edit"]').click();
    await flush();
    document.getElementById('edit-value_int-input').value = '75';
    document.getElementById('editFeatureForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    await flush();
    const [url, init] = mutationCalls().at(-1);
    expect(url).toBe('/api/plans/9/features/update');
    expect(JSON.parse(init.body)).toEqual({ feature_id: 11, value_mode: 'fixed', reset_policy: 'monthly', value_int: 75 });
    expect(document.getElementById('plan-feature-modal-edit').classList.contains('hidden')).toBe(true);
  });

  it('unassign asks for confirmation first and does nothing if declined', async () => {
    const el = await bootPage();
    el.querySelector('[data-action="unassign"]').click();
    await flush();
    const dialog = document.querySelector('[data-confirm-cancel]') ? document : null;
    expect(dialog).not.toBeNull(); // a confirm dialog was built
    document.querySelector('[data-confirm-cancel]').click();
    await flush();
    expect(mutationCalls()).toHaveLength(0);
  });

  it('unassign posts feature_id once confirmed', async () => {
    const el = await bootPage();
    el.querySelector('[data-action="unassign"]').click();
    await flush();
    document.querySelector('[data-confirm-ok]').click();
    await flush();
    await flush();
    const [url, init] = mutationCalls().at(-1);
    expect(url).toBe('/api/plans/9/features/unassign');
    expect(JSON.parse(init.body)).toEqual({ feature_id: 11 });
  });

  it('closes a modal via data-modal-close and via Escape', async () => {
    const el = await bootPage();
    el.querySelectorAll('tbody tr')[1].querySelector('[data-action="assign"]').click();
    await flush();
    document.querySelector('[data-modal-close]').click();
    expect(document.getElementById('plan-feature-modal-assign').classList.contains('hidden')).toBe(true);

    el.querySelector('[data-action="edit"]').click();
    await flush();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('plan-feature-modal-edit').classList.contains('hidden')).toBe(true);
  });

  it('paginates through the same POST body', async () => {
    const el = await bootPage({ pagination: { page: 1, per_page: 10, total: 95, filtered: 95 } });
    el.querySelector('[data-page="3"]').click();
    await flush();
    expect(lastListBody()).toEqual({ page: 3, per_page: 10 });
  });

  it('adds exactly one click listener to the table container', async () => {
    document.body.innerHTML = TEMPLATE;
    const el = document.getElementById('table-container');
    const spy = vi.spyOn(el, 'addEventListener');
    window.planFeaturesContext = { plan_id: 9 };
    window.planFeaturesCapabilities = { can_list: true, can_assign: true, can_update: true, can_unassign: true };
    window.MaatifyAdminCrud = lib;
    globalThis.fetch = vi.fn(async () => apiResponse({ data: FEATURES, pagination: { page: 1, per_page: 10, total: 2 } }));
    new Function(PAGE_SOURCE)();
    await flush();
    await flush();
    expect(spy.mock.calls.filter(([type]) => type === 'click')).toHaveLength(1);
  });
});
