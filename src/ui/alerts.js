import { escapeHtml } from '../core/dom.js';

const COLORS = {
  success: 'bg-green-100 dark:bg-green-900/80 border-green-400 dark:border-green-800 text-green-700 dark:text-green-200',
  danger: 'bg-red-100 dark:bg-red-900/80 border-red-400 dark:border-red-800 text-red-700 dark:text-red-100',
  warning: 'bg-yellow-100 dark:bg-yellow-900/80 border-yellow-400 dark:border-yellow-800 text-yellow-700 dark:text-yellow-200',
  info: 'bg-blue-100 dark:bg-blue-900/80 border-blue-400 dark:border-blue-800 text-blue-700 dark:text-blue-200',
};
const ALIASES = { d: 'danger', s: 'success', w: 'warning', i: 'info', error: 'danger' };

/**
 * The single alert implementation. The message is always escaped.
 * Returns the element so callers/tests can inspect or remove it.
 */
export function showAlert(type, message, duration = 5000, doc = document) {
  const kind = COLORS[type] ? type : ALIASES[type] || 'info';
  const el = doc.createElement('div');
  el.className = `fixed top-6 start-10 min-w-[300px] z-[99999] ${COLORS[kind]} border px-4 py-3 rounded-lg shadow-lg max-w-md`;
  el.setAttribute('role', kind === 'danger' ? 'alert' : 'status');
  el.innerHTML = `<div class="flex items-center justify-between"><span>${escapeHtml(message)}</span><button type="button" data-alert-close class="ms-4 text-lg" aria-label="Close">&times;</button></div>`;
  el.querySelector('[data-alert-close]').addEventListener('click', () => el.remove());
  doc.body.appendChild(el);
  if (duration > 0) setTimeout(() => el.remove(), duration);
  return el;
}
