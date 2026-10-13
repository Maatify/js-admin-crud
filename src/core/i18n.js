const DEFAULTS = {
  'table.rows': 'Rows',
  'table.empty_title': 'No data found',
  'table.empty_hint': 'Try adjusting your filters or search criteria',
  'table.empty_value': 'empty',
  'table.not_available': 'N/A',
  'table.config_error': 'Table configuration error',
  'table.load_error_title': 'Error Loading Data',
  'table.load_error_default': 'Failed to load',
  'table.retry': 'Retry',
  'table.page_info': '{from} to {to} of {total}',
  'table.page_info_filtered': '{from} to {to} of {total} (filtered from {overall} total)',
  'table.export_csv': 'CSV',
  'table.export_excel': 'Excel',
  'table.export_print': 'PDF',
};

let messages = { ...DEFAULTS };

/** Merge translated messages over the defaults. Unknown keys are kept. */
export function setMessages(next) {
  messages = { ...messages, ...(next || {}) };
}

export function resetMessages() {
  messages = { ...DEFAULTS };
}

/** Translate a key; `{name}` placeholders are replaced from `vars`. Falls back to the key. */
export function t(key, vars = {}) {
  const template = Object.prototype.hasOwnProperty.call(messages, key) ? messages[key] : key;
  return String(template).replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
