import { createHttpClient } from '../core/http.js';
import { createDataTable } from '../table/data-table.js';
import { bindFilters } from '../filters/bind-filters.js';
import { setMessages } from '../core/i18n.js';
import { runMutation } from '../actions/run-mutation.js';

/**
 * Declarative admin list/CRUD page: one http client wired to a data table, an
 * optional filter form, and a set of named mutation actions. See
 * docs/DESIGN.md §5 for the config shape.
 *
 * config:
 *  - http: createHttpClient() options
 *  - table: createDataTable() options, minus `fetchPage` (built from `list`)
 *  - filters: bindFilters() options, minus `onApply` (reloads the table)
 *  - list: { endpoint, method, params, operation } — the endpoint the table fetches
 *    pages from. `method` defaults to 'GET' (params become a query string); set it
 *    to 'POST' for endpoints that expect a JSON body. `params(tableParams)` reshapes
 *    the table's flat params before they are sent, which is the only way to express
 *    a nested body such as { search: { global, columns } }.
 *  - actions: { name: runMutation() options } — call as page.actions.name(overrides)
 *  - onRowAction(action, { id, row, dataset, element }) — row-action handler, passed
 *    straight to the table (may also be given as `table.onRowAction`; this wins).
 *    It fires on the table's own delegated listener, so a page never adds its own.
 *  - messages: { [locale]: { ...i18n keys } }; `locale`/`http.locale()` selects which
 */
export function createCrudPage(config = {}) {
  const { http: httpConfig = {}, table: tableConfig = {}, filters: filtersConfig, list = {}, actions = {}, messages, locale, onRowAction } = config;

  if (messages) {
    const activeLocale = locale || (typeof httpConfig.locale === 'function' ? httpConfig.locale() : httpConfig.locale);
    setMessages(messages[activeLocale] || {});
  }

  const http = createHttpClient(httpConfig);

  const listMethod = String(list.method || 'GET').toUpperCase();

  const fetchPage = async (params) => {
    // `list.params` is the one place to reshape what the table produces into
    // what the endpoint expects — e.g. nesting flat filter keys under `search`.
    const payload = typeof list.params === 'function' ? list.params({ ...params }) : params;
    const result = await http.request(list.endpoint, { method: listMethod, payload, operation: list.operation || list.endpoint });
    if (!result.success) throw new Error(result.error);
    return result.data;
  };

  const table = createDataTable({ ...tableConfig, fetchPage, ...(onRowAction ? { onRowAction } : {}) });
  if (!table) return null;

  const unbindFilters = filtersConfig
    ? bindFilters({ ...filtersConfig, onApply: (params) => table.load({ ...params, page: 1 }) })
    : () => {};

  const boundActions = {};
  for (const [name, actionConfig] of Object.entries(actions)) {
    boundActions[name] = (overrides = {}) =>
      runMutation({ http, reload: () => table.reload(), ...actionConfig, ...overrides });
  }

  return {
    http,
    table,
    actions: boundActions,
    destroy() {
      unbindFilters();
      table.destroy();
    },
  };
}
