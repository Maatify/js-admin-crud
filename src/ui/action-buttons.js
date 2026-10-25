import { escapeHtml, html, raw } from '../core/dom.js';

/**
 * Escaped-by-construction builders for the row-action markup that every list
 * page needs. They exist so `column.render()` — whose return value the table
 * treats as TRUSTED HTML — has a safe default that does not depend on the
 * caller remembering to reach for `html`/`escapeHtml` (see #2, #14).
 *
 * Both return a SafeHtml, so they can be returned straight from `render()`
 * and also composed inside an `html` template without being double-escaped.
 */

const BUTTON_CLASS = 'text-xs px-3 py-1.5 border rounded-md';
const BADGE_ON_CLASS = 'text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700';
const BADGE_OFF_CLASS = 'text-xs px-2.5 py-1 rounded-full bg-gray-200 text-gray-600';

const BUTTON_TYPES = new Set(['button', 'submit', 'reset']);

/**
 * Text + hover classes for `actionButton({ color })`. Every entry carries its
 * `dark:` variants, because a row-action button that only reads correctly in
 * one theme is the defect this exists to avoid.
 */
export const actionButtonColors = Object.freeze({
  blue: 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800',
  green: 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800',
  amber: 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-800',
  red: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800',
  purple: 'text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800',
  indigo: 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800',
  gray: 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-200 dark:hover:border-gray-600',
  cyan: 'text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-200 dark:hover:border-cyan-800',
  slate: 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/20 hover:border-slate-200 dark:hover:border-slate-800',
  orange: 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:border-orange-200 dark:hover:border-orange-800',
});
const DATA_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** camelCase -> kebab-case, matching how the DOM maps dataset keys to attributes. */
function dataAttrName(key) {
  const name = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
  if (!DATA_NAME.test(name)) {
    throw new TypeError(`actionButton: unusable data attribute name ${JSON.stringify(key)}`);
  }
  return name;
}

/**
 * Serialize `{ next: 0, sortOrder: 3 }` to `data-next="0" data-sort-order="3"`.
 * Values are escaped; names are validated rather than escaped, so a name that
 * could break out of the attribute is a programming error, not silent output.
 */
function dataAttrs(data) {
  return Object.entries(data || {})
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `data-${dataAttrName(key)}="${escapeHtml(value)}"`)
    .join(' ');
}

/**
 * A delegated row-action button: `<button data-action="..." data-id="...">`.
 * Pairs with createDataTable's `onRowAction` (#12), which reads exactly these
 * attributes off the clicked element.
 *
 * options:
 *  - action: the `data-action` value the handler switches on
 *  - id: convenience for `data: { id }`, the row's primary key
 *  - label: button text (escaped)
 *  - data: extra `data-*` attributes, camelCase keys become kebab-case
 *  - icon: markup placed before the label. A SafeHtml (from `raw`/`html`) is
 *    inserted as-is, which is what an inline <svg> needs; a plain string is
 *    escaped, so passing untrusted text can never inject markup.
 *  - color: a key of `actionButtonColors` — text + hover classes composed onto
 *    `className`, so a host gets the usual coloured icon button without
 *    restating the palette. Ignored when the key is unknown.
 *  - className, title, disabled, type ('button' | 'submit' | 'reset')
 */
export function actionButton({ action, id, label = '', data, icon, color, className = BUTTON_CLASS, title, disabled = false, type = 'button' } = {}) {
  if (!BUTTON_TYPES.has(type)) {
    throw new TypeError(`actionButton: unsupported type ${JSON.stringify(type)}`);
  }
  const attrs = [`type="${type}"`];
  if (action !== null && action !== undefined) attrs.push(`data-action="${escapeHtml(action)}"`);
  const serialized = dataAttrs({ ...(id === null || id === undefined ? {} : { id }), ...data });
  if (serialized) attrs.push(serialized);
  if (title !== null && title !== undefined) attrs.push(`title="${escapeHtml(title)}"`);
  const palette = color ? actionButtonColors[color] : '';
  const classes = [className, palette].filter(Boolean).join(' ');
  attrs.push(`class="${escapeHtml(classes)}"`);
  if (disabled) attrs.push('disabled');
  // `html` passes a SafeHtml through and escapes anything else, which is
  // exactly the icon contract: markup only when the caller marked it as such.
  const body = icon ? html`${icon}${label}` : html`${label}`;
  return html`<button ${raw(attrs.join(' '))}>${body}</button>`;
}

/**
 * The active/inactive cell every list page has. By default it is a toggle
 * button carrying `data-next` (the value the row should flip to), which is
 * what the handler posts back.
 *
 * Pass `action: null` for a non-interactive status cell — it renders a
 * `<span>` with the same styling and no action wiring.
 */
export function statusBadge({
  active,
  onLabel = 'Active',
  offLabel = 'Inactive',
  action = 'toggle',
  id,
  data,
  icon,
  color,
  className,
  onClassName = BADGE_ON_CLASS,
  offClassName = BADGE_OFF_CLASS,
} = {}) {
  const on = !!active;
  const label = on ? onLabel : offLabel;
  const cls = className ?? (on ? onClassName : offClassName);
  if (action === null || action === undefined) {
    return html`<span class="${cls}">${label}</span>`;
  }
  return actionButton({ action, id, label, className: cls, icon, color, data: { next: on ? 0 : 1, ...data } });
}
