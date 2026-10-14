# @maatify/admin-crud

Admin CRUD/page library (data table, pagination, export, alerts, safe HTML helpers).
Extracted from the Athar admin kernel; the original copy is kept in `legacy/kernel/` as a baseline.

## Just the table

```js
import { createDataTable, setMessages } from '@maatify/admin-crud';

const table = createDataTable({
  container: '#table-container',
  columns: [{ key: 'id', label: 'ID' }, { key: 'name', label: 'Name' }],
  fetchPage: (params) => myApi.list(params),   // -> { data: [...], pagination: { page, per_page, total, filtered? } }
});
await table.load();
```

- Cell values are HTML-escaped. `column.render(value, row)` output is trusted HTML (use `html```/`escapeHtml`).
- One instance per container, no globals; call `destroy()` to remove listeners.
- Selection is scoped to the currently rendered page — it does not persist across pages.
- Messages are overridable with `setMessages({...})` (see `src/core/i18n.js` for keys).
- The package is `private` for now; remove `"private": true` (or publish to GitHub Packages) before `npm publish`.

## A full list/CRUD page

`createCrudPage` wires one HTTP client to the table, an optional filter form, and
named mutation actions (see `docs/DESIGN.md` §5):

```js
import { createCrudPage } from '@maatify/admin-crud';

const page = createCrudPage({
  http: { baseUrl: '/api', headers: () => ({ 'X-CSRF-Token': token() }), locale: () => lang },
  table: { container: '#table-container', columns: [...], primaryKey: 'id' },
  filters: { form: '#filters', search: '#global-search' },
  list: { endpoint: 'languages/query' },
  actions: { setActive: { endpoint: 'languages/set-active', successMessage: 'Updated' } },
});
await page.table.load();
await page.actions.setActive({ payload: { id: 5, active: true } });
```

`createTranslationsPage` is the same shape plus a required `update` action, exposed
as the convenience `saveTranslation(id, value)`.

## Other building blocks

`createHttpClient`, `runMutation`/`toggleStatus`, `confirm`/`createModal`/`createLoadingOverlay`,
`bindFilters`/`buildParams`, `normalizeError`, and `createLogger` are all exported individually
for pages that don't need the full `createCrudPage` composition.

`npm test` (vitest + jsdom) · `npm run build` (ESM + browser IIFE `window.MaatifyAdminCrud`).
Design and roadmap: `docs/DESIGN.md`.
