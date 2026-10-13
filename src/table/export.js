import { escapeHtml } from '../core/dom.js';

/** Prefix cells that spreadsheets would execute as formulas (OWASP CSV injection). */
export function neutralizeFormula(value) {
  const s = String(value);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

function csvCell(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return `"${neutralizeFormula(value).replace(/"/g, '""')}"`;
}

export function toCsv(labels, keys, data) {
  const lines = [labels.map(csvCell).join(',')];
  for (const row of data) lines.push(keys.map((k) => csvCell(row[k])).join(','));
  return lines.join('\n');
}

export function toHtmlTable(labels, keys, data, attrs = '') {
  const head = labels.map((l) => `<th>${escapeHtml(l)}</th>`).join('');
  const body = data
    .map((row) => `<tr>${keys.map((k) => `<td>${escapeHtml(neutralizeFormula(row[k] ?? ''))}</td>`).join('')}</tr>`)
    .join('');
  return `<table${attrs}><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function download(doc, filename, mime, content) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = doc.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportCsv(doc, labels, keys, data, filename = 'table.csv') {
  download(doc, filename, 'text/csv;charset=utf-8', toCsv(labels, keys, data));
}

export function exportExcel(doc, labels, keys, data, filename = 'table.xls') {
  download(doc, filename, 'application/vnd.ms-excel', toHtmlTable(labels, keys, data));
}

export function exportPrint(win, labels, keys, data, title = 'Table') {
  const w = win.open('', '_blank');
  if (!w) return false;
  const style = 'body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #333;padding:6px}th{background:#f4f4f4}';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${style}</style></head><body><h2>${escapeHtml(title)}</h2>${toHtmlTable(labels, keys, data, ' border="1"')}</body></html>`);
  w.document.close();
  w.print();
  return true;
}
