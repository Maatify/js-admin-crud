import { buildParams } from './build-params.js';

/**
 * Bind a filter form so selects apply immediately and Enter applies, plus an
 * optional standalone search box that can render outside the form (on most
 * admin pages it does). Opt out per-control with `data-auto-filter="off"`.
 *
 * Returns an `unbind()` function.
 */
export function bindFilters({ form, search, document: doc = document, onApply, cleanEmpty = true } = {}) {
  const formEl = typeof form === 'string' ? doc.querySelector(form) : form;
  const searchEl = typeof search === 'string' ? doc.querySelector(search) : search;
  if (!formEl || typeof onApply !== 'function') return () => {};

  const autoApplyEnabled = (el) => !el.closest('[data-auto-filter="off"]') && el.getAttribute('data-auto-filter') !== 'off';

  function apply() {
    const params = buildParams(formEl, { cleanEmpty });
    if (searchEl && !formEl.contains(searchEl)) {
      const key = searchEl.name || 'search';
      if (searchEl.value || !cleanEmpty) params[key] = searchEl.value;
    }
    onApply(params);
  }

  function onChange(e) {
    if (e.target.tagName === 'SELECT' && autoApplyEnabled(e.target)) apply();
  }

  function onKeydown(e) {
    if (e.key !== 'Enter') return;
    const el = e.target;
    if (!el.matches('input, textarea') || el.type === 'checkbox' || el.type === 'radio') return;
    if (!autoApplyEnabled(el)) return;
    e.preventDefault();
    apply();
  }

  function onSubmit(e) {
    e.preventDefault();
    apply();
  }

  function onSearchKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      apply();
    }
  }

  formEl.addEventListener('change', onChange);
  formEl.addEventListener('keydown', onKeydown);
  formEl.addEventListener('submit', onSubmit);
  if (searchEl && !formEl.contains(searchEl)) searchEl.addEventListener('keydown', onSearchKeydown);

  return function unbind() {
    formEl.removeEventListener('change', onChange);
    formEl.removeEventListener('keydown', onKeydown);
    formEl.removeEventListener('submit', onSubmit);
    if (searchEl && !formEl.contains(searchEl)) searchEl.removeEventListener('keydown', onSearchKeydown);
  };
}
