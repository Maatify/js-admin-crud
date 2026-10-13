const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape a value for safe use in HTML text and quoted attribute values. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** Marks a string as trusted HTML so `html` and renderers do not escape it. */
export class SafeHtml {
  constructor(value) {
    this.value = String(value);
  }
  toString() {
    return this.value;
  }
}

export function raw(value) {
  return new SafeHtml(value);
}

/**
 * Tagged template that escapes every interpolation unless it is a SafeHtml
 * (or an array of them). Usage: html`<td>${row.name}</td>`
 */
export function html(strings, ...values) {
  const part = (v) => {
    if (v instanceof SafeHtml) return v.value;
    if (Array.isArray(v)) return v.map(part).join('');
    return escapeHtml(v);
  };
  return new SafeHtml(strings.reduce((out, s, i) => out + s + (i < values.length ? part(values[i]) : ''), ''));
}

/** Only allow http(s), root-relative and data:image URLs in src/href attributes. */
export function safeUrl(value) {
  const url = String(value ?? '').trim();
  if (/^(https?:)?\/\//i.test(url) || /^\/(?!\/)/.test(url) || /^data:image\/(png|jpe?g|gif|webp|svg\+xml);/i.test(url)) {
    return url;
  }
  return '';
}
