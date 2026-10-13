import { t } from '../core/i18n.js';

/** Default "from to to of total" text, from API pagination ({page, per_page, total, filtered?}). */
export function pageInfo(pagination = {}, perPageFallback = 10) {
  const page = Number(pagination.page) || 1;
  const perPage = Number(pagination.per_page) || perPageFallback;
  const overall = Number(pagination.total) || 0;
  const filtered = pagination.filtered === undefined || pagination.filtered === null ? overall : Number(pagination.filtered);
  const from = filtered === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, filtered);
  const key = filtered !== overall ? 'table.page_info_filtered' : 'table.page_info';
  return { total: filtered, page, perPage, text: t(key, { from, to, total: filtered, overall }) };
}

/** Sliding window of page numbers around `page`. */
export function pageWindow(page, totalPages, maxVisible = 7) {
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  const end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);
  return pages;
}
