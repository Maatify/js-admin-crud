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
 *  - className, title, disabled, type ('button' | 'submit' | 'reset')
 */
export function actionButton({ action, id, label = '', data, className = BUTTON_CLASS, title, disabled = false, type = 'button' } = {}) {
  if (!BUTTON_TYPES.has(type)) {
    throw new TypeError(`actionButton: unsupported type ${JSON.stringify(type)}`);
  }
  const attrs = [`type="${type}"`];
  if (action !== null && action !== undefined) attrs.push(`data-action="${escapeHtml(action)}"`);
  const serialized = dataAttrs({ ...(id === null || id === undefined ? {} : { id }), ...data });
  if (serialized) attrs.push(serialized);
  if (title !== null && title !== undefined) attrs.push(`title="${escapeHtml(title)}"`);
  attrs.push(`class="${escapeHtml(className)}"`);
  if (disabled) attrs.push('disabled');
  return html`<button ${raw(attrs.join(' '))}>${label}</button>`;
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
  return actionButton({ action, id, label, className: cls, data: { next: on ? 0 : 1, ...data } });
}
