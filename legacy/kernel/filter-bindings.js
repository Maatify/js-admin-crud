/**
 * @fileoverview Centralized filter-form bindings for every admin list page.
 *
 * Loaded from `layouts/base.twig` so it runs on all admin pages regardless of
 * which per-page scripts they include. Every binding is delegated from
 * `document`, so it never races the per-page `DOMContentLoaded` handlers.
 *
 * Behaviour provided:
 *   1. Changing any `<select>` inside a filter form applies the filter at once.
 *   2. Pressing Enter applies the filter, including from the global search box
 *      which on most pages sits OUTSIDE the filter form (so the browser's
 *      implicit submission never fires).
 *
 * Both paths go through the form's own `submit` handler rather than calling a
 * page's `loadData()` directly, so there is exactly one reload path per page.
 *
 * Opt-out: add `data-auto-filter="off"` to a form, or to a single control.
 */

(function () {
	'use strict';

	// Every list-page filter form in the admin carries one of these ids, which
	// is why an id-based match is used instead of a structural one: a
	// `form:has(button[type="submit"])` match would also catch the create/edit
	// modals, and a `<select>` inside those must never re-run a list filter.
	var FILTER_FORM_SELECTOR = [
		'form#filter-form',
		'form[id$="-filter-form"]',
		'form[id$="-search-form"]'
	].join(',');

	var AUTO_APPLY_ATTR = 'data-auto-filter';
	var PENDING_ATTR = 'data-auto-filter-pending';

	// Standalone search boxes that render outside their filter form. The admin
	// spells the same control several ways, so every convention is matched:
	// `*-global-search`, `*-search`, `*-search-global`, the per-panel
	// `*-filter-id` / `*-filter-name` / `*-filter-group` inputs, and the legacy
	// one-offs `filter-global`, `global-search`, `filter-id`.
	var GLOBAL_SEARCH_SELECTOR = [
		'input[id$="-global-search"]',
		'input[id$="-search-global"]',
		'input[id$="-search"]',
		'input[id$="-filter-id"]',
		'input[id$="-filter-name"]',
		'input[id$="-filter-group"]',
		'input[id="filter-global"]',
		'input[id="global-search"]',
		'input[id="filter-id"]'
	].join(',');

	function isFilterForm(form) {
		return !!form.matches(FILTER_FORM_SELECTOR);
	}

	function autoApplyEnabled(el) {
		if (el.closest('[' + AUTO_APPLY_ATTR + '="off"]')) {
			return false;
		}
		return el.getAttribute(AUTO_APPLY_ATTR) !== 'off';
	}

	/**
	 * Resolve which filter form an out-of-form control belongs to.
	 *
	 * Returns null when the answer is ambiguous. A few admin pages host more
	 * than one independent filter panel (the permissions screens run three),
	 * and their control ids do not share a derivable prefix with their form
	 * ids. Guessing there would submit the wrong panel, so those pages keep
	 * relying on their own explicit handlers.
	 */
	function resolveFilterForm() {
		var forms = document.querySelectorAll(FILTER_FORM_SELECTOR);
		if (forms.length === 0) return null;
		return forms.length === 1 ? forms[0] : null;
	}

	/**
	 * Ask the form to apply its filters through its own submit handler.
	 *
	 * `requestSubmit()` is used rather than a synthetic `submit` event so pages
	 * that bind `click` on their Search button keep working too. Coalescing via
	 * a microtask keeps multi-select pages (target + channel + version) down to
	 * a single request.
	 */
	function applyFilters(form) {
		if (!form) return;

		if (form.hasAttribute(PENDING_ATTR)) return;
		form.setAttribute(PENDING_ATTR, '1');

		Promise.resolve().then(function () {
			try {
				if (typeof form.requestSubmit === 'function') {
					var submitter = form.querySelector('button[type="submit"], input[type="submit"]');
					form.requestSubmit(submitter || undefined);
					return;
				}

				// Legacy fallback: fire submit without the requestSubmit() API.
				form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
			} finally {
				// Removed only after the synchronous dispatch has unwound, so the
				// safety-net listener below can still see the marker.
				form.removeAttribute(PENDING_ATTR);
			}
		});
	}

	function closestFilterForm(el) {
		var form = el.closest('form');
		return form && isFilterForm(form) ? form : null;
	}

	// Safety net: if an auto-applied submit reaches the browser without any page
	// handler calling preventDefault(), swallow it instead of letting the page
	// navigate. Every list filter form in the admin is JS-driven, so an
	// unconsumed submit means no handler is wired, and a bare GET navigation
	// would silently discard the filters.
	//
	// Registered on the bubble phase on purpose: page handlers sit on the form
	// element, so they run first and this listener can read `defaultPrevented`.
	document.addEventListener('submit', function (e) {
		var target = e.target;
		if (!target || typeof target.hasAttribute !== 'function') return;

		if (!e.defaultPrevented && target.hasAttribute(PENDING_ATTR)) {
			e.preventDefault();
		}
	});

	// 1. Select change applies the filter immediately.
	document.addEventListener('change', function (e) {
		var select = e.target;
		if (!select || select.tagName !== 'SELECT') return;
		if (!autoApplyEnabled(select)) return;

		var form = closestFilterForm(select);
		if (!form) return;

		applyFilters(form);
	});

	// 2. Enter applies the filter.
	document.addEventListener('keydown', function (e) {
		if (e.key !== 'Enter') return;

		var el = e.target;
		if (!el || !el.tagName) return;

		// Enter on a `<select>` never submits natively.
		if (el.tagName === 'SELECT') {
			if (!autoApplyEnabled(el)) return;
			var selectForm = closestFilterForm(el);
			if (!selectForm) return;
			e.preventDefault();
			applyFilters(selectForm);
			return;
		}

		if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
		if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'button') return;
		if (!autoApplyEnabled(el)) return;

		// Inside a filter form the browser already submits implicitly.
		if (closestFilterForm(el)) return;

		// Otherwise only the standalone search boxes need help, since they render
		// outside the form on most pages.
		if (!el.matches(GLOBAL_SEARCH_SELECTOR)) return;

		var form = resolveFilterForm();
		if (!form) return;

		e.preventDefault();
		applyFilters(form);
	});
})();