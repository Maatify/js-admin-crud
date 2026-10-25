import { escapeHtml, safeUrl } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { showAlert } from '../ui/alerts.js';
import { exportCsv, exportExcel, exportPrint } from './export.js';
import { pageInfo, pageWindow } from './pagination.js';
import { createSelection } from './selection.js';

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * Instance-based data table (no module-level state, one instance per container).
 *
 * options:
 *  - container: element or selector
 *  - columns: [{ key, label, render?(value,row)=>html string (TRUSTED), }]
 *  - fetchPage: async (params) => ({ data: [], pagination: {page, per_page, total, filtered?} })
 *  - params: initial request params ({page, per_page, ...filters})
 *  - primaryKey ('id'), selection (false), selectableIds (Set|Array|null)
 *  - onSelectionChange(Set), getPaginationInfo(pagination, params) => ({total, info: TRUSTED html})
 *  - onRowAction(action, { id, row, dataset, element }) — called when an element
 *    matching `rowActionSelector` ('[data-action]') is clicked inside the table.
 *    Runs on the table's own delegated listener, so consumers never add a second
 *    one. `id` is the matching row's primaryKey value (correctly typed), falling
 *    back to the raw data-id string when no loaded row matches; `row` is null then.
 *  - rowActionSelector: override the '[data-action]' convention
 *  - notify(type, message) => alert function (defaults to showAlert)
 *  - document / window: injectable for tests
 * Cell values are escaped unless the column has a `render`, whose return value is trusted HTML.
 */
export function createDataTable(options) {
  const doc = options.document || document;
  const win = options.window || window;
  const container = typeof options.container === 'string' ? doc.querySelector(options.container) : options.container;
  const columns = options.columns || [];
  const primaryKey = options.primaryKey || 'id';
  const notify = options.notify || ((type, msg) => showAlert(type, msg));
  const selection = createSelection({ selectableIds: options.selectableIds });
  const rowActionSelector = options.rowActionSelector || '[data-action]';
  const state = { params: { page: 1, per_page: 10, ...(options.params || {}) }, data: [], pagination: null };
  const controller = new AbortController();

  if (!container || !columns.length || typeof options.fetchPage !== 'function') {
    notify('danger', t('table.config_error'));
    return null;
  }

  const labels = columns.map((c) => c.label ?? c.key);
  const keys = columns.map((c) => c.key);

  function cell(column, row) {
    const value = row[column.key];
    if (typeof column.render === 'function') return `<td class="ps-3">${column.render(value, row)}</td>`;
    if (value === undefined || value === null || value === '') {
      return `<td><span class="text-gray-400 italic text-sm">${escapeHtml(t('table.empty_value'))}</span></td>`;
    }
    if (column.key === 'image' || column.key === 'icon') {
      const src = safeUrl(value);
      return src ? `<td><img src="${escapeHtml(src)}" alt="" class="w-12 h-12 object-cover rounded"/></td>` : '<td></td>';
    }
    return `<td class="ps-3 text-sm">${escapeHtml(value)}</td>`;
  }

  function rowHtml(row, idx) {
    const id = String(row[primaryKey]);
    const isSelected = selection.has(id);
    const cls = isSelected ? 'bg-blue-100 dark:bg-blue-900/20' : idx % 2 ? 'bg-gray-100 dark:bg-gray-700/20' : '';
    let box = '';
    if (options.selection) {
      const can = selection.canSelect(id);
      box = `<td class="ps-4">${can ? `<input type="checkbox" class="row-checkbox w-4 h-4" value="${escapeHtml(id)}" ${isSelected ? 'checked' : ''}>` : '<span class="text-gray-300 text-xs">—</span>'}</td>`;
    }
    return `<tr class="${cls} transition-colors duration-150 hover:bg-blue-200/50 dark:hover:bg-blue-900/20">${box}${columns.map((c) => cell(c, row)).join('')}</tr>`;
  }

  function render() {
    const { data, pagination } = state;
    const custom = typeof options.getPaginationInfo === 'function' ? options.getPaginationInfo(pagination, state.params) : null;
    const info = pageInfo(pagination, Number(state.params.per_page) || 10);
    const infoHtml = custom ? custom.info : escapeHtml(info.text); // custom info is trusted HTML by contract
    const total = custom ? custom.total : info.total;
    const totalPages = Math.ceil(total / info.perPage) || 1;
    const head = columns.map((c) => `<th class="pe-6 ps-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400">${escapeHtml(c.label ?? c.key)}</th>`).join('');
    const selAll = options.selection ? '<th class="w-10 ps-4 py-3"><input type="checkbox" id="select-all" class="w-4 h-4"></th>' : '';
    const colspan = columns.length + (options.selection ? 1 : 0);
    const body = data.length
      ? data.map(rowHtml).join('')
      : `<tr><td colspan="${colspan}" class="py-16 text-center"><p class="text-sm font-medium text-gray-400">${escapeHtml(t('table.empty_title'))}</p><p class="text-xs text-gray-300">${escapeHtml(t('table.empty_hint'))}</p></td></tr>`;
    const pages = pageWindow(info.page, totalPages)
      .map((p) => `<li><button type="button" data-page="${p}" class="min-w-[36px] h-9 px-2 rounded-lg text-sm ${p === info.page ? 'bg-blue-500 text-white font-semibold' : 'text-gray-500 hover:bg-gray-100'}" ${p === info.page ? 'aria-current="page" disabled' : ''}>${p}</button></li>`)
      .join('');
    const nav = (label, page, disabled, text) => `<li><button type="button" data-page="${page}" aria-label="${escapeHtml(label)}" class="w-9 h-9 rounded-lg border border-gray-300 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}" ${disabled ? 'disabled' : ''}>${text}</button></li>`;
    const sizes = PAGE_SIZES.map((n) => `<option value="${n}" ${n === info.perPage ? 'selected' : ''}>${n}</option>`).join('');
    container.innerHTML = `
<div class="table-container bg-white dark:bg-gray-800 rounded-lg py-4 shadow-lg border border-gray-100 dark:border-gray-700">
  <div class="tableHeader flex flex-wrap justify-between items-center mb-4 gap-4 px-3">
    <div id="table-custom-filters" class="flex-1 flex justify-start"></div>
    <div class="flex items-center gap-1.5">
      <button type="button" data-export="csv" class="text-xs px-3 py-1.5 border rounded-md">${escapeHtml(t('table.export_csv'))}</button>
      <button type="button" data-export="excel" class="text-xs px-3 py-1.5 border rounded-md">${escapeHtml(t('table.export_excel'))}</button>
      <button type="button" data-export="print" class="text-xs px-3 py-1.5 border rounded-md">${escapeHtml(t('table.export_print'))}</button>
    </div>
  </div>
  <div class="overflow-x-auto"><table class="min-w-full"><thead><tr class="border-b-2 border-gray-200">${selAll}${head}</tr></thead><tbody>${body}</tbody></table></div>
  <footer class="pt-4 p-5 flex flex-wrap justify-between items-center gap-4 border-t border-gray-100">
    <div class="flex items-center gap-3"><span class="text-sm text-gray-600" data-page-info>${infoHtml}</span>
      <label class="text-xs text-gray-400">${escapeHtml(t('table.rows'))} <select data-per-page class="h-7 border rounded-md text-sm">${sizes}</select></label></div>
    <nav><ul class="pagination flex flex-wrap items-center gap-1">${totalPages > 1 ? nav('First', 1, info.page <= 1, '«') + nav('Previous', info.page - 1, info.page <= 1, '‹') + pages + nav('Next', info.page + 1, info.page >= totalPages, '›') + nav('Last', totalPages, info.page >= totalPages, '»') : ''}</ul></nav>
  </footer>
</div>`;
    syncSelectAll();
  }

  function syncSelectAll() {
    const sel = container.querySelector('#select-all');
    if (!sel) return;
    const boxes = [...container.querySelectorAll('.row-checkbox')];
    const all = boxes.length > 0 && boxes.every((b) => b.checked);
    sel.checked = all;
    sel.indeterminate = !all && boxes.some((b) => b.checked);
  }

  const notifySelection = () => options.onSelectionChange && options.onSelectionChange(selection.toSet());

  /** The loaded row whose primary key matches a button's data-id, if any. */
  function findRow(rawId) {
    if (rawId === undefined || rawId === null) return null;
    return state.data.find((r) => String(r[primaryKey]) === rawId) || null;
  }

  // One delegated listener set per instance, removed by destroy(). Row actions
  // share it rather than needing a second listener on the same container.
  const opts = { signal: controller.signal };
  container.addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn && !pageBtn.disabled) return void load({ page: Number(pageBtn.dataset.page) });
    const exp = e.target.closest('[data-export]');
    if (exp) {
      const kind = exp.dataset.export;
      if (kind === 'csv') exportCsv(doc, labels, keys, state.data);
      else if (kind === 'excel') exportExcel(doc, labels, keys, state.data);
      else exportPrint(win, labels, keys, state.data);
      return;
    }
    if (e.target.closest('[data-retry]')) return void load();
    if (typeof options.onRowAction !== 'function') return;
    const actionEl = e.target.closest(rowActionSelector);
    if (!actionEl || actionEl.disabled) return;
    const row = findRow(actionEl.dataset.id);
    // Prefer the row's own primary key so handlers get it correctly typed,
    // instead of the string every dataset read returns.
    const id = row ? row[primaryKey] : actionEl.dataset.id;
    options.onRowAction(actionEl.dataset.action, { id, row, dataset: { ...actionEl.dataset }, element: actionEl });
  }, opts);
  container.addEventListener('change', (e) => {
    if (e.target.matches('[data-per-page]')) return void load({ per_page: Number(e.target.value), page: 1 });
    if (e.target.id === 'select-all') {
      container.querySelectorAll('.row-checkbox').forEach((cb) => {
        cb.checked = e.target.checked;
        selection.toggle(cb.value, e.target.checked);
      });
    } else if (e.target.classList.contains('row-checkbox')) {
      selection.toggle(e.target.value, e.target.checked);
    } else return;
    syncSelectAll();
    notifySelection();
  }, opts);

  let token = 0;
  async function load(patch = {}) {
    Object.assign(state.params, patch);
    const mine = ++token;
    try {
      const result = await options.fetchPage({ ...state.params });
      if (mine !== token) return null; // a newer request superseded this one
      const data = Array.isArray(result?.data) ? result.data : null;
      if (!data) throw new Error('Invalid data format');
      state.data = data;
      state.pagination = result.pagination || { page: state.params.page, per_page: state.params.per_page, total: data.length };
      render();
      return { success: true, data, pagination: state.pagination };
    } catch (error) {
      if (mine !== token) return null;
      const message = error?.message || t('table.load_error_default');
      notify('danger', message);
      container.innerHTML = `<div class="rounded-lg p-8 text-center"><h3 class="text-lg font-medium text-red-600">${escapeHtml(t('table.load_error_title'))}</h3><p class="text-sm text-gray-600">${escapeHtml(message)}</p><button type="button" data-retry class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">${escapeHtml(t('table.retry'))}</button></div>`;
      return { success: false, error: message };
    }
  }

  return {
    load,
    reload: () => load(),
    getParams: () => ({ ...state.params }),
    getData: () => [...state.data],
    getSelected: () => selection.toArray(),
    clearSelection() {
      selection.clear();
      container.querySelectorAll('.row-checkbox').forEach((cb) => (cb.checked = false));
      syncSelectAll();
      notifySelection();
    },
    destroy() {
      controller.abort();
      token++;
      container.innerHTML = '';
    },
  };
}
