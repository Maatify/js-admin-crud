/**
 * Every class the table emits, in one place.
 *
 * `createDataTable({ classes })` replaces these per key, so a host application
 * can match its own table skin — including the `dark:` variants this default
 * set deliberately keeps minimal (see #37). Keys map to one slot each; a value
 * of '' means the element carries no class attribute at all.
 *
 * To extend rather than replace a default, compose it:
 *   import { defaultTableClasses } from '@maatify/admin-crud';
 *   classes: { th: `${defaultTableClasses.th} dark:text-gray-500` }
 */
export const defaultTableClasses = Object.freeze({
  // shell
  container: 'table-container bg-white dark:bg-gray-800 rounded-lg py-4 shadow-lg border border-gray-100 dark:border-gray-700',
  header: 'tableHeader flex flex-wrap justify-between items-center mb-4 gap-4 px-3',
  customFilters: 'flex-1 flex justify-start',
  tableWrap: 'overflow-x-auto',
  table: 'min-w-full',

  // export controls
  exportGroup: 'flex items-center gap-1.5',
  exportButton: 'text-xs px-3 py-1.5 border rounded-md',

  // head
  theadRow: 'border-b-2 border-gray-200',
  th: 'pe-6 ps-3 py-3 text-xs font-semibold uppercase tracking-wider text-gray-400',
  selectAllCell: 'w-10 ps-4 py-3',
  selectAllCheckbox: 'w-4 h-4',

  // body
  tr: 'transition-colors duration-150 hover:bg-blue-200/50 dark:hover:bg-blue-900/20',
  trSelected: 'bg-blue-100 dark:bg-blue-900/20',
  trStriped: 'bg-gray-100 dark:bg-gray-700/20',
  td: 'ps-3 text-sm',
  tdRendered: 'ps-3',
  tdEmptyValue: '',
  emptyValue: 'text-gray-400 italic text-sm',
  tdImage: '',
  image: 'w-12 h-12 object-cover rounded',
  checkboxCell: 'ps-4',
  rowCheckbox: 'row-checkbox w-4 h-4',
  notSelectable: 'text-gray-300 text-xs',

  // empty state
  emptyCell: 'py-16 text-center',
  emptyTitle: 'text-sm font-medium text-gray-400',
  emptyHint: 'text-xs text-gray-300',

  // footer
  footer: 'pt-4 p-5 flex flex-wrap justify-between items-center gap-4 border-t border-gray-100',
  footerStart: 'flex items-center gap-3',
  pageInfo: 'text-sm text-gray-600',
  perPageLabel: 'text-xs text-gray-400',
  perPageSelect: 'h-7 border rounded-md text-sm',
  pagination: 'pagination flex flex-wrap items-center gap-1',
  pageButton: 'min-w-[36px] h-9 px-2 rounded-lg text-sm',
  pageButtonActive: 'bg-blue-500 text-white font-semibold',
  pageButtonInactive: 'text-gray-500 hover:bg-gray-100',
  navButton: 'w-9 h-9 rounded-lg border border-gray-300',
  navButtonDisabled: 'opacity-50 cursor-not-allowed',

  // error state
  errorBox: 'rounded-lg p-8 text-center',
  errorTitle: 'text-lg font-medium text-red-600',
  errorText: 'text-sm text-gray-600',
  retryButton: 'mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg',
});
