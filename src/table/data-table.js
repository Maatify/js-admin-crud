import { escapeHtml, safeUrl } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { showAlert } from '../ui/alerts.js';
import { exportCsv, exportExcel, exportPrint } from './export.js';
import { pageInfo, pageWindow } from './pagination.js';
import { createSelection } from './selection.js';
import { defaultTableClasses } from './table-classes.js';

const PAGE_SIZES = [10, 25, 50, 100];
const EXPORT_KINDS = [
  { kind: 'csv', messageKey: 'table.export_csv' },
  { kind: 'excel', messageKey: 'table.export_excel' },
  { kind: 'print', messageKey: 'table.export_print' },
];

/** ` class="x"`, or nothing at all when the slot's class is empty. */
const attrClass = (value) => (value ? ` class="${value}"` : '');

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
 *
 * Theming (see docs/HOW-TO-USE.md §10 and #37):
 *  - classes: { [slot]: 'classes' } — replaces `defaultTableClasses` per slot, so
 *    a host can match its own skin, dark variants included. Compose with
 *    `defaultTableClasses.<slot>` to extend rather than replace.
 *  - renderHeaderCell(column, { classes, index, label }) => TRUSTED html for one <th>
 *  - renderExportButtons({ classes, kinds }) => TRUSTED html for the export group's
 *    contents; each button must keep its `data-export` attribute
 *  - renderPaginationButton({ page, label, text, active, disabled, kind, classes })
 *    => TRUSTED html for one <li>; the button must keep its `data-page` attribute
 *
 * Those three exist because classes alone cannot add structure the default
 * markup never emits (icons, a sort affordance). Delegation is driven by the
 * data-* attributes above, so a custom renderer that drops them stops working.
 *
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
  const c = { ...defaultTableClasses, ...(options.classes || {}) };
  const state = { params: { page: 1, per_page: 10, ...(options.params || {}) }, data: [], pagination: null };
  const controller = new AbortController();

  if (!container || !columns.length || typeof options.fetchPage !== 'function') {
    notify('danger', t('table.config_error'));
    return null;
  }

  const labels = columns.map((col) => col.label ?? col.key);
  const keys = columns.map((col) => col.key);

  function cell(column, row) {
    const value = row[column.key];
    if (typeof column.render === 'function') return `<td${attrClass(c.tdRendered)}>${column.render(value, row)}</td>`;
    if (value === undefined || value === null || value === '') {
      return `<td${attrClass(c.tdEmptyValue)}><span${attrClass(c.emptyValue)}>${escapeHtml(t('table.empty_value'))}</span></td>`;
    }
    if (column.key === 'image' || column.key === 'icon') {
      const src = safeUrl(value);
      return src
        ? `<td${attrClass(c.tdImage)}><img src="${escapeHtml(src)}" alt=""${attrClass(c.image)}/></td>`
        : `<td${attrClass(c.tdImage)}></td>`;
    }
    return `<td${attrClass(c.td)}>${escapeHtml(value)}</td>`;
  }

  function rowHtml(row, idx) {
    const id = String(row[primaryKey]);
    const isSelected = selection.has(id);
    const cls = isSelected ? c.trSelected : idx % 2 ? c.trStriped : '';
    let box = '';
    if (options.selection) {
      const can = selection.canSelect(id);
      box = `<td${attrClass(c.checkboxCell)}>${can ? `<input type="checkbox" class="${c.rowCheckbox}" value="${escapeHtml(id)}" ${isSelected ? 'checked' : ''}>` : `<span${attrClass(c.notSelectable)}>—</span>`}</td>`;
    }
    return `<tr class="${cls} ${c.tr}">${box}${columns.map((col) => cell(col, row)).join('')}</tr>`;
  }

  /** One <th>. Replaceable wholesale, since a sort affordance is structure, not colour. */
  function headerCell(column, index) {
    const label = column.label ?? column.key;
    if (typeof options.renderHeaderCell === 'function') {
      return String(options.renderHeaderCell(column, { classes: c, index, label }));
    }
    return `<th${attrClass(c.th)}>${escapeHtml(label)}</th>`;
  }

  /** The export group's contents. Buttons must keep their data-export attribute. */
  function exportButtons() {
    if (typeof options.renderExportButtons === 'function') {
      return String(options.renderExportButtons({ classes: c, kinds: EXPORT_KINDS.map((e) => e.kind) }));
    }
    return EXPORT_KINDS.map(
      ({ kind, messageKey }) => `<button type="button" data-export="${kind}"${attrClass(c.exportButton)}>${escapeHtml(t(messageKey))}</button>`,
    ).join('\n      ');
  }

  /** One pagination <li>. The button must keep its data-page attribute. */
  function paginationButton(ctx) {
    if (typeof options.renderPaginationButton === 'function') {
      return String(options.renderPaginationButton({ ...ctx, classes: c }));
    }
    const { page, label, text, active, disabled, kind } = ctx;
    if (kind === 'page') {
      return `<li><button type="button" data-page="${page}" class="${c.pageButton} ${active ? c.pageButtonActive : c.pageButtonInactive}" ${active ? 'aria-current="page" disabled' : ''}>${escapeHtml(text)}</button></li>`;
    }
    return `<li><button type="button" data-page="${page}" aria-label="${escapeHtml(label)}" class="${c.navButton} ${disabled ? c.navButtonDisabled : ''}" ${disabled ? 'disabled' : ''}>${text}</button></li>`;
  }

  function render() {
    const { data, pagination } = state;
    const custom = typeof options.getPaginationInfo === 'function' ? options.getPaginationInfo(pagination, state.params) : null;
    const info = pageInfo(pagination, Number(state.params.per_page) || 10);
    const infoHtml = custom ? custom.info : escapeHtml(info.text); // custom info is trusted HTML by contract
    const total = custom ? custom.total : info.total;
    const totalPages = Math.ceil(total / info.perPage) || 1;
    const head = columns.map(headerCell).join('');
    const selAll = options.selection ? `<th${attrClass(c.selectAllCell)}><input type="checkbox" id="select-all"${attrClass(c.selectAllCheckbox)}></th>` : '';
    const colspan = columns.length + (options.selection ? 1 : 0);
    const body = data.length
      ? data.map(rowHtml).join('')
      : `<tr><td colspan="${colspan}"${attrClass(c.emptyCell)}><p${attrClass(c.emptyTitle)}>${escapeHtml(t('table.empty_title'))}</p><p${attrClass(c.emptyHint)}>${escapeHtml(t('table.empty_hint'))}</p></td></tr>`;
    const pages = pageWindow(info.page, totalPages)
      .map((p) => paginationButton({ page: p, text: String(p), label: String(p), active: p === info.page, disabled: p === info.page, kind: 'page' }))
      .join('');
    const nav = (kind, label, page, disabled, text) => paginationButton({ page, label, text, active: false, disabled, kind });
    const sizes = PAGE_SIZES.map((n) => `<option value="${n}" ${n === info.perPage ? 'selected' : ''}>${n}</option>`).join('');
    container.innerHTML = `
<div${attrClass(c.container)}>
  <div${attrClass(c.header)}>
    <div id="table-custom-filters"${attrClass(c.customFilters)}></div>
    <div${attrClass(c.exportGroup)}>
      ${exportButtons()}
    </div>
  </div>
  <div${attrClass(c.tableWrap)}><table${attrClass(c.table)}><thead><tr${attrClass(c.theadRow)}>${selAll}${head}</tr></thead><tbody>${body}</tbody></table></div>
  <footer${attrClass(c.footer)}>
    <div${attrClass(c.footerStart)}><span${attrClass(c.pageInfo)} data-page-info>${infoHtml}</span>
      <label${attrClass(c.perPageLabel)}>${escapeHtml(t('table.rows'))} <select data-per-page${attrClass(c.perPageSelect)}>${sizes}</select></label></div>
    <nav><ul${attrClass(c.pagination)}>${totalPages > 1 ? nav('first', 'First', 1, info.page <= 1, '«') + nav('prev', 'Previous', info.page - 1, info.page <= 1, '‹') + pages + nav('next', 'Next', info.page + 1, info.page >= totalPages, '›') + nav('last', 'Last', totalPages, info.page >= totalPages, '»') : ''}</ul></nav>
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
      container.innerHTML = `<div${attrClass(c.errorBox)}><h3${attrClass(c.errorTitle)}>${escapeHtml(t('table.load_error_title'))}</h3><p${attrClass(c.errorText)}>${escapeHtml(message)}</p><button type="button" data-retry${attrClass(c.retryButton)}>${escapeHtml(t('table.retry'))}</button></div>`;
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
