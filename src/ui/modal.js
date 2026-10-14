import { escapeHtml } from '../core/dom.js';

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' };

/**
 * Self-contained modal (no dependency on pre-existing page markup/ids).
 * `content` is trusted HTML, same contract as `column.render` in the data table.
 */
export function createModal({ title = '', content = '', size = 'md', document: doc = document, onClose } = {}) {
  const el = doc.createElement('div');
  el.className = 'fixed inset-0 bg-black/50 z-50 flex items-center justify-center';
  el.innerHTML = `
<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl ${SIZES[size] || SIZES.md} w-full mx-4 border border-transparent dark:border-gray-700">
  <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
    <h3 class="text-lg font-semibold text-gray-800 dark:text-gray-100">${escapeHtml(title)}</h3>
    <button type="button" data-modal-close class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" aria-label="Close">&times;</button>
  </div>
  <div class="modal-body" data-modal-body>${content}</div>
</div>`;

  function close() {
    el.remove();
    doc.body.style.overflow = '';
    onClose?.();
  }

  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });
  el.querySelector('[data-modal-close]').addEventListener('click', close);

  return {
    element: el,
    body: el.querySelector('[data-modal-body]'),
    open() {
      doc.body.appendChild(el);
      doc.body.style.overflow = 'hidden';
    },
    close,
  };
}
