import { escapeHtml } from '../core/dom.js';
import { t } from '../core/i18n.js';

/**
 * A searchable single-select, ported from the admin kernel's `select2.js`
 * (which, despite the name, never used the jQuery plugin — it is
 * dependency-free vanilla JS, which is why it can live here at all).
 *
 * Two defects of the original are fixed rather than carried over:
 *  - option labels were interpolated into innerHTML unescaped, so any label
 *    coming from an API was a stored-XSS hole; every label is escaped here;
 *  - a stray console.log fired on every selection.
 *
 * It works in either direction:
 *  - **enhance**: the container already holds the kernel's markup hooks
 *    (.js-select-box, .js-select-input, .js-dropdown, .js-search-input,
 *    .js-select-list, .js-arrow) and they are used as they are, so existing
 *    templates need no change;
 *  - **build**: an empty container gets the whole widget built into it, the
 *    way createModal and confirm build their own DOM.
 */

export const defaultSelectClasses = Object.freeze({
  box: 'flex items-center justify-between gap-2 w-full px-3 py-2 border rounded-lg cursor-pointer bg-white dark:bg-gray-700 dark:border-gray-600',
  boxOpen: 'border-blue-500 ring-1 ring-blue-500',
  boxClosed: 'border-gray-300 hover:border-gray-400',
  input: 'flex-1 bg-transparent outline-none cursor-pointer text-sm text-gray-900 dark:text-gray-100',
  arrow: 'w-4 h-4 transition-transform',
  arrowOpen: 'rotate-180',
  dropdown: 'absolute z-20 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700',
  search: 'w-full px-3 py-2 border-b border-gray-200 outline-none text-sm bg-transparent dark:border-gray-700 dark:text-gray-100',
  list: 'max-h-60 overflow-y-auto p-1',
  option: 'p-2 cursor-pointer text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between transition-colors duration-150 rounded-sm',
  optionSelected: 'bg-blue-50 text-blue-600 font-medium dark:bg-blue-900/30 dark:text-blue-400',
  check: 'text-blue-600 dark:text-blue-400 font-bold',
  empty: 'p-2 text-gray-400 cursor-default text-center text-sm dark:text-gray-400',
});

const ARROW_SVG =
  '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/></svg>';

const CHECK_ENTITY = '&#10003;';

/**
 * options:
 *  - data: [{ value, label, search? }] — `search` is an extra haystack (a code, say)
 *  - value: initial selection, compared loosely against each `value`
 *  - onChange(item): after a selection the user made or setValue() resolved;
 *    not fired for the initial `value`, which is state, not a change
 *  - classes: per-slot overrides, see defaultSelectClasses
 *  - searchable (true), placeholder, document (injectable for tests)
 */
export function createSelect(target, options = {}) {
  const doc = options.document || document;
  const container = typeof target === 'string' ? doc.querySelector(target) : target;
  if (!container) return null;

  const c = { ...defaultSelectClasses, ...(options.classes || {}) };
  const searchable = options.searchable !== false;
  let data = Array.isArray(options.data) ? options.data : [];
  let selected = null;
  let isOpen = false;

  // Enhance the kernel's markup when it is already there, otherwise build it.
  if (!container.querySelector('.js-select-box')) build();

  const box = container.querySelector('.js-select-box');
  const input = container.querySelector('.js-select-input');
  const dropdown = container.querySelector('.js-dropdown');
  const searchInput = container.querySelector('.js-search-input');
  const list = container.querySelector('.js-select-list');
  const arrow = container.querySelector('.js-arrow');
  if (!box || !dropdown || !list) return null;

  function build() {
    container.classList.add('relative');
    const placeholder = escapeHtml(options.placeholder ?? t('select.placeholder'));
    const search = searchable
      ? `<input class="js-search-input ${escapeHtml(c.search)}" type="text" placeholder="${escapeHtml(t('select.search'))}">`
      : '';
    container.innerHTML =
      `<div class="js-select-box ${escapeHtml(c.box)} ${escapeHtml(c.boxClosed)}" role="combobox" aria-haspopup="listbox" aria-expanded="false" tabindex="0">` +
      `<input class="js-select-input ${escapeHtml(c.input)}" type="text" readonly placeholder="${placeholder}">` +
      `<span class="js-arrow ${escapeHtml(c.arrow)}">${ARROW_SVG}</span>` +
      `</div>` +
      `<div class="js-dropdown ${escapeHtml(c.dropdown)} hidden">${search}` +
      `<ul class="js-select-list ${escapeHtml(c.list)}" role="listbox"></ul></div>`;
  }

  const classList = (value) => String(value).split(/\s+/).filter(Boolean);

  function open() {
    isOpen = true;
    dropdown.classList.remove('hidden');
    box.classList.add(...classList(c.boxOpen));
    box.classList.remove(...classList(c.boxClosed));
    box.setAttribute('aria-expanded', 'true');
    if (arrow) arrow.classList.add(...classList(c.arrowOpen));
    if (searchInput) {
      searchInput.value = '';
      searchInput.focus();
      renderList();
    }
  }

  function close() {
    isOpen = false;
    dropdown.classList.add('hidden');
    box.classList.remove(...classList(c.boxOpen));
    box.classList.add(...classList(c.boxClosed));
    box.setAttribute('aria-expanded', 'false');
    if (arrow) arrow.classList.remove(...classList(c.arrowOpen));
  }

  const toggle = () => (isOpen ? close() : open());

  function matches(item, needle) {
    if (!needle) return true;
    return `${item.label ?? ''} ${item.search ?? ''}`.toLowerCase().includes(needle);
  }

  function renderList(filter = '') {
    const needle = String(filter).toLowerCase();
    const filtered = data.filter((item) => matches(item, needle));
    if (!filtered.length) {
      list.innerHTML = `<li class="${escapeHtml(c.empty)}">${escapeHtml(t('select.no_results'))}</li>`;
      return;
    }
    list.innerHTML = filtered
      .map((item) => {
        const on = !!selected && String(selected.value) === String(item.value);
        const cls = on ? `${c.option} ${c.optionSelected}` : c.option;
        const check = on ? `<span class="${escapeHtml(c.check)}">${CHECK_ENTITY}</span>` : '';
        // Labels are escaped here; in the original they were not, and they
        // come from APIs.
        return (
          `<li class="${escapeHtml(cls)}" role="option" aria-selected="${on}" data-value="${escapeHtml(item.value)}">` +
          `<span>${escapeHtml(item.label)}</span>${check}</li>`
        );
      })
      .join('');
  }

  function select(item, { notify = true } = {}) {
    selected = item;
    if (input) {
      input.value = item.label ?? '';
      input.dispatchEvent(new Event('change'));
    }
    container.dataset.value = item.value;
    if (notify && typeof options.onChange === 'function') options.onChange(item);
    close();
  }

  function clear() {
    selected = null;
    if (input) input.value = '';
    container.dataset.value = '';
  }

  const controller = new AbortController();
  const listen = { signal: controller.signal };

  box.addEventListener('click', (e) => { e.stopPropagation(); toggle(); }, listen);
  box.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggle();
  }, listen);
  if (searchInput) {
    searchInput.addEventListener('input', (e) => renderList(e.target.value), listen);
    searchInput.addEventListener('click', (e) => e.stopPropagation(), listen);
  }
  list.addEventListener('click', (e) => {
    const option = e.target.closest('li[data-value]');
    if (!option) return;
    e.stopPropagation();
    const item = data.find((i) => String(i.value) === option.dataset.value);
    if (item) select(item);
  }, listen);
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) close(); }, listen);
  doc.addEventListener('click', (e) => { if (isOpen && !container.contains(e.target)) close(); }, listen);

  renderList();

  if (options.value !== undefined && options.value !== null) {
    const initial = data.find((i) => String(i.value) === String(options.value));
    if (initial) select(initial, { notify: false });
  }

  return {
    open,
    close,
    getValue: () => (selected ? selected.value : null),
    getSelected: () => selected,
    /** Select by value; an unknown value clears the selection instead. */
    setValue(value) {
      const item = data.find((i) => String(i.value) === String(value));
      if (item) return select(item);
      clear();
      renderList();
    },
    /** Replace the options, keeping the selection only if it still exists. */
    setData(next) {
      data = Array.isArray(next) ? next : [];
      if (selected && !data.some((i) => String(i.value) === String(selected.value))) clear();
      renderList(searchInput ? searchInput.value : '');
    },
    /** Removes every listener this instance added, including the document ones. */
    destroy() {
      controller.abort();
      close();
    },
    element: container,
  };
}
