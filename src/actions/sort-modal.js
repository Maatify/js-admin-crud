import { createModal } from '../ui/modal.js';
import { escapeHtml } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { runMutation } from './run-mutation.js';

/**
 * Open a small modal to edit a row's sort-order number, then save it.
 * Resolves with the mutation result once the modal closes (submit or cancel).
 */
export function openSortModal({
  http,
  endpoint,
  id,
  currentValue = 0,
  idField = 'id',
  sortField = 'sort_order',
  document: doc = document,
  title,
  reload,
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const modal = createModal({
      title: title ?? t('sort_modal.title'),
      size: 'sm',
      document: doc,
      content: `
<form data-sort-form class="p-6">
  <label class="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">${escapeHtml(t('sort_modal.label'))}</label>
  <input type="number" name="sort_order" value="${escapeHtml(currentValue)}" class="w-full border rounded-lg px-3 py-2" />
  <div class="mt-4 flex justify-end gap-3">
    <button type="button" data-cancel class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg">${escapeHtml(t('confirm.cancel'))}</button>
    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg">${escapeHtml(t('sort_modal.save'))}</button>
  </div>
</form>`,
      onClose: () => finish({ success: false, cancelled: true }),
    });

    modal.body.querySelector('[data-cancel]').addEventListener('click', () => modal.close());
    modal.body.querySelector('[data-sort-form]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const value = Number(new FormData(e.target).get('sort_order'));
      const result = await runMutation({
        http,
        endpoint,
        payload: { [idField]: id, [sortField]: value },
        operation: 'Update sort order',
        reload,
      });
      finish(result);
      modal.close();
    });

    modal.open();
  });
}
