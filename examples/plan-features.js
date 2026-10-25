/**
 * AR Platform — Plan Features.
 *
 * The whole page: replaces plan-features-helpers.js + plan-features-modals.js
 * + plan-features-actions.js + plan-features-with-components.js (597 lines,
 * 4 files, loaded in a fixed <script> order and talking to each other through
 * window.*) with one module and no globals of its own.
 *
 * Loaded after the IIFE build, which the host app serves by <script src>:
 *   <script src="/assets/maatify-admin-crud.iife.min.js"></script>
 *   <script src="/assets/js/modules/ar-platform/plan-features.js"></script>
 */
(function () {
  'use strict';

  const { createCrudPage, bindFormAction, actionButton, confirm, showAlert, html, escapeHtml } = window.MaatifyAdminCrud;

  const context = window.planFeaturesContext;
  const caps = window.planFeaturesCapabilities || {};
  const container = document.getElementById('table-container');

  if (!context || !container) {
    console.error('❌ Missing window.planFeaturesContext or #table-container for plan-features');
    return;
  }

  // Capability gate: the legacy page rendered this instead of the table.
  if (!caps.can_list) {
    container.innerHTML = '<div class="alert alert-warning">You do not have permission to view plan features.</div>';
    return;
  }

  const planId = context.plan_id;
  const $ = (id) => document.getElementById(id);

  // ---------------------------------------------------------------- renderers

  const pill = (classes, text) => html`<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}">${text}</span>`;
  const ENABLED = 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
  const DISABLED = 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800';

  const MODE_CLASSES = {
    fixed: ENABLED,
    base: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800',
    override: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
  };

  const boolPill = (on) => pill(on ? ENABLED : DISABLED, on ? 'Enabled' : 'Disabled');

  /** The legacy helpers' formatValue(), unchanged in behaviour. */
  function formatMode(feature) {
    const byMode = MODE_CLASSES[feature.value_mode];
    if (byMode) return pill(byMode, feature.value_mode.charAt(0).toUpperCase() + feature.value_mode.slice(1));
    if (feature.value_type === 'bool') return boolPill(feature.value_int === 1);
    if (feature.value_type === 'int') {
      if (feature.feature_key === 'ar_images_limit') {
        return html`<span class="font-mono font-bold text-gray-900 dark:text-white">${feature.value_int}${feature.unit ? ' ' + feature.unit : ''}</span>`;
      }
      return boolPill(feature.value_int === 1);
    }
    if (feature.value_type === 'string') {
      return html`<span class="text-sm text-gray-900 dark:text-white">${feature.value_text || ''}</span>`;
    }
    return html`<span class="text-gray-400 italic">N/A</span>`;
  }

  const columns = [
    {
      key: 'feature_key',
      label: 'Key',
      render: (v, row) => html`<div class="flex flex-col">
          <span class="font-bold text-gray-900 dark:text-white">${row.feature_key || ''}</span>
          <span class="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">${row.feature_category || 'General'}</span>
        </div>`,
    },
    {
      key: 'value_type',
      label: 'Type',
      render: (v) => html`<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">${v}</span>`,
    },
    {
      key: 'quota_scope',
      label: 'Scope',
      render: (v) => html`<span class="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">${v || 'Global'}</span>`,
    },
    {
      key: 'is_extendable',
      label: 'Extendable',
      render: (v) =>
        parseInt(v, 10) === 1
          ? html`<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">YES</span>`
          : html`<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-50 dark:bg-gray-800 text-gray-400 border border-gray-100 dark:border-gray-700">NO</span>`,
    },
    {
      key: 'feature_is_visible',
      label: 'Visible',
      render: (v) =>
        parseInt(v, 10) === 1
          ? html`<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">VISIBLE</span>`
          : html`<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800">HIDDEN</span>`,
    },
    {
      key: 'assigned_value',
      label: 'Assigned Value',
      render: (v, row) => {
        if (!row.is_assigned) return '-';
        if (row.value_type === 'int') {
          return html`<span class="font-mono font-bold text-gray-900 dark:text-white">${row.value_int}${row.unit ? ' ' + row.unit : ''}</span>`;
        }
        if (row.value_type === 'bool') return boolPill(row.value_int === 1);
        if (row.value_type === 'string') return html`<span class="text-sm text-gray-900 dark:text-white">${row.value_text || ''}</span>`;
        return html`<span class="text-gray-400 dark:text-gray-500 italic">${row.value_int ?? '-'}</span>`;
      },
    },
    { key: 'value_mode', label: 'Mode', render: (v, row) => (row.is_assigned ? formatMode(row) : '-') },
    {
      key: 'actions',
      label: 'Actions',
      render: (v, row) => {
        // Same capability gating as the legacy page, and the same button set.
        if (!row.is_assigned) {
          return caps.can_assign ? actionButton({ action: 'assign', id: row.feature_id, label: 'Assign', title: 'Assign Feature', className: 'text-xs px-3 py-1.5 border rounded-md text-green-700' }) : '';
        }
        const buttons = [];
        if (caps.can_update) buttons.push(actionButton({ action: 'edit', id: row.feature_id, label: 'Edit', title: 'Edit Assignment', className: 'text-xs px-3 py-1.5 border rounded-md text-blue-700' }));
        if (caps.can_unassign) buttons.push(actionButton({ action: 'unassign', id: row.feature_id, label: 'Unassign', title: 'Unassign Feature', className: 'text-xs px-3 py-1.5 border rounded-md text-red-700' }));
        return buttons.length ? html`<div class="flex items-center gap-1 justify-end">${buttons}</div>` : '';
      },
    },
  ];

  /** Legacy getPaginationInfo: count filtered rows, and say so when it differs. */
  function getPaginationInfo(pagination) {
    const { page = 1, per_page = 20, total = 0, filtered = 0 } = pagination || {};
    // The table hands back its own flat params, not the nested body the
    // endpoint received, so read the filter state from its one source instead.
    const hasFilter = !!currentSearch();
    const displayCount = hasFilter && filtered !== undefined ? filtered : total;
    const startItem = displayCount === 0 ? 0 : (page - 1) * per_page + 1;
    const endItem = Math.min(page * per_page, displayCount);
    let info = `<span>${startItem} to ${endItem}</span> of <span>${displayCount}</span>`;
    if (hasFilter && filtered < total) {
      info += ` <span class="text-gray-500 text-xs">(filtered from ${escapeHtml(total)} total)</span>`;
    }
    return { total: displayCount, info };
  }

  // ------------------------------------------------------------------ filters

  // The template's filter controls carry ids but no name attributes, so they
  // are read here rather than through bindFilters' FormData.
  const FILTER_IDS = {
    feature_key: 'filter-feature-key',
    quota_scope: 'filter-quota-scope',
    is_assigned: 'filter-is-assigned',
    is_extendable: 'filter-is-extendable',
    is_visible: 'filter-is-visible',
  };

  function filterColumns() {
    const columnsFilter = {};
    for (const [key, id] of Object.entries(FILTER_IDS)) {
      const value = $(id)?.value?.trim();
      if (value) columnsFilter[key] = value;
    }
    return columnsFilter;
  }

  /** The `search` body the endpoint expects, or null when nothing is filtered. */
  function currentSearch() {
    const search = {};
    const global = $('features-global-search')?.value?.trim();
    const cols = filterColumns();
    if (global) search.global = global;
    if (Object.keys(cols).length) search.columns = cols;
    return Object.keys(search).length ? search : null;
  }

  // ---------------------------------------------------------------- the page

  const page = createCrudPage({
    http: { baseUrl: '/api' },

    table: { container: '#table-container', primaryKey: 'feature_id', columns, getPaginationInfo },

    // The endpoint takes a JSON body with filters nested under `search`.
    list: {
      endpoint: `plans/${planId}/features/query`,
      method: 'POST',
      operation: 'Load Plan Features',
      params: (p) => {
        const payload = { page: p.page, per_page: p.per_page };
        const search = currentSearch();
        if (search) payload.search = search;
        return payload;
      },
    },

    filters: { form: '#features-filter-form', search: '#features-global-search' },

    actions: {
      assign: { endpoint: `plans/${planId}/features/assign`, operation: 'Assign Plan Feature', successMessage: 'Feature assigned successfully.' },
      update: { endpoint: `plans/${planId}/features/update`, operation: 'Update Plan Feature', successMessage: 'Feature updated successfully.' },
      unassign: {
        endpoint: `plans/${planId}/features/unassign`,
        operation: 'Unassign Plan Feature',
        successMessage: 'Feature unassigned successfully.',
        confirm: () => confirm({ title: 'Are you sure?', message: 'Are you sure you want to unassign this feature?', type: 'danger' }),
      },
    },

    // One delegated listener, on the table's own. `row` is the loaded record,
    // so there is no currentFeatures cache and no getFeatureById().
    onRowAction(action, { id, row }) {
      if (action === 'assign') openModal('assign', row);
      else if (action === 'edit') openModal('edit', row);
      else if (action === 'unassign') page.actions.unassign({ payload: { feature_id: parseInt(id, 10) } });
    },
  });

  // ------------------------------------------------------------------- modals

  /** Show or hide the int/text inputs for the feature's value type. */
  function toggleInputs(prefix, type) {
    const intContainer = $(`${prefix}-value_int-container`);
    const textContainer = $(`${prefix}-value_text-container`);
    const select = $(`${prefix}-value_int`);
    const input = $(`${prefix}-value_int-input`);

    if (intContainer) intContainer.style.display = 'none';
    if (textContainer) textContainer.style.display = 'none';

    if (type === 'int' || type === 'bool') {
      if (intContainer) intContainer.style.display = 'block';
      if (select) select.style.display = type === 'int' ? 'none' : '';
      if (input) input.style.display = type === 'int' ? '' : 'none';
    } else if (type === 'string') {
      if (textContainer) textContainer.style.display = 'block';
    }
  }

  function openModal(prefix, feature) {
    if (!feature) return;
    const isEdit = prefix === 'edit';

    $(`${prefix}-feature_id`).value = feature.feature_id;
    $(`${prefix}-feature_name`).value = feature.feature_key;
    $(`${prefix}-value_int-input`).value = isEdit && feature.value_int !== null ? feature.value_int : '';
    $(`${prefix}-value_int`).value = isEdit && feature.value_int !== null ? String(feature.value_int) : '1';
    $(`${prefix}-value_text`).value = isEdit && feature.value_text !== null ? feature.value_text : '';
    $(`${prefix}-value_mode`).value = (isEdit && feature.value_mode) || 'fixed';
    const resetPolicy = $(`${prefix}-reset_policy`);
    if (resetPolicy) resetPolicy.value = (isEdit && feature.reset_policy) || 'none';

    toggleInputs(prefix, feature.value_type);
    $(`plan-feature-modal-${prefix}`)?.classList.remove('hidden');
  }

  const closeModal = (id) => $(id)?.classList.add('hidden');

  /** Assign and edit post the same payload shape, built from the same fields. */
  function buildFeaturePayload(prefix) {
    const payload = {
      feature_id: parseInt($(`${prefix}-feature_id`).value, 10),
      value_mode: $(`${prefix}-value_mode`).value,
      reset_policy: prefix === 'edit' ? $(`${prefix}-reset_policy`).value : 'none',
    };
    const input = $(`${prefix}-value_int-input`);
    const valInt = input.style.display !== 'none' ? input.value : $(`${prefix}-value_int`).value;
    if (valInt !== '') payload.value_int = parseInt(valInt, 10);
    const valText = $(`${prefix}-value_text`).value;
    if (valText !== '') payload.value_text = valText;
    return payload;
  }

  bindFormAction('#assignFeatureForm', {
    buildPayload: () => buildFeaturePayload('assign'),
    action: (payload) => page.actions.assign({ payload }),
    onSuccess: () => closeModal('plan-feature-modal-assign'),
  });

  bindFormAction('#editFeatureForm', {
    buildPayload: () => buildFeaturePayload('edit'),
    action: (payload) => page.actions.update({ payload }),
    onSuccess: () => closeModal('plan-feature-modal-edit'),
  });

  document.querySelectorAll('[data-modal-close]').forEach((btn) => {
    btn.addEventListener('click', (e) => closeModal(e.currentTarget.getAttribute('data-modal-close')));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach((m) => closeModal(m.id));
  });

  // ------------------------------------------------- page chrome around filters

  const reload = () => page.table.load({ page: 1 });

  $('features-reset-filters')?.addEventListener('click', () => {
    $('features-filter-form')?.reset();
    reload();
  });
  $('features-search-btn')?.addEventListener('click', reload);
  $('features-clear-search')?.addEventListener('click', () => {
    const input = $('features-global-search');
    if (input) input.value = '';
    reload();
  });

  // Prefill a filter from the query string (?is_assigned=1 -> #filter-is-assigned).
  const urlParams = new URLSearchParams(window.location.search.replaceAll('_', '-'));
  const firstKey = urlParams.keys().next().value;
  if (firstKey) {
    const target = $(`filter-${firstKey}`);
    if (target) target.value = urlParams.get(firstKey) || '';
  }

  page.table.load().catch((err) => {
    console.error('❌ [Plan Features] initial load failed', err);
    showAlert('danger', err?.message || 'Failed to load plan features.');
  });

  window.PlanFeaturesPage = page; // for debugging only; nothing reads it
})();
