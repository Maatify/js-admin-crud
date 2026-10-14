import { escapeHtml } from '../core/dom.js';
import { t } from '../core/i18n.js';

const OK_COLORS = { danger: 'bg-red-600 hover:bg-red-700', primary: 'bg-blue-600 hover:bg-blue-700' };

/** Promise-based confirm dialog; resolves true/false. Replaces the ids-based `appConfirm`. */
export function confirm({ title, message = '', type = 'danger', confirmText, cancelText, document: doc = document } = {}) {
  return new Promise((resolve) => {
    const el = doc.createElement('div');
    el.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
    el.innerHTML = `
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full mx-4 border border-transparent dark:border-gray-700">
  <div class="px-6 py-4">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${escapeHtml(title ?? t('confirm.title'))}</h3>
    <p class="mt-2 text-sm text-gray-600 dark:text-gray-300">${escapeHtml(message)}</p>
  </div>
  <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
    <button type="button" data-confirm-cancel class="px-4 py-2 text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">${escapeHtml(cancelText ?? t('confirm.cancel'))}</button>
    <button type="button" data-confirm-ok class="px-4 py-2 text-white ${OK_COLORS[type] || OK_COLORS.danger} rounded-lg">${escapeHtml(confirmText ?? t('confirm.ok'))}</button>
  </div>
</div>`;

    function finish(result) {
      el.remove();
      resolve(result);
    }

    el.addEventListener('click', (e) => {
      if (e.target === el) finish(false);
    });
    el.querySelector('[data-confirm-cancel]').addEventListener('click', () => finish(false));
    el.querySelector('[data-confirm-ok]').addEventListener('click', () => finish(true));
    doc.body.appendChild(el);
  });
}
