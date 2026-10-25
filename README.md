# @maatify/admin-crud

Admin CRUD/page library (data table, pagination, export, alerts, safe HTML helpers).
Extracted from the Athar admin kernel; the original copy is kept in `legacy/kernel/` as a baseline.

## Installing

The package is published to **GitHub Packages** under the `@maatify` scope. Point the
scope at that registry once, then install as usual:

```
# .npmrc
@maatify:registry=https://npm.pkg.github.com
```

```bash
npm install @maatify/admin-crud
```

Installing straight from Git also works — `prepare` builds `dist/` during install:

```bash
npm install github:Maatify/js-admin-crud
```

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
- Licensed MIT, published to GitHub Packages (`@maatify` scope) — see "Installing" below.

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
  // Runs on the table's own delegated listener — no second click handler per page.
  onRowAction: (action, { id, row }) => {
    if (action === 'toggle') page.actions.setActive({ payload: { id, active: row.active ? 0 : 1 } });
  },
});
await page.table.load();
await page.actions.setActive({ payload: { id: 5, active: true } });
```

`onRowAction(action, { id, row, dataset, element })` fires for any `[data-action]`
element clicked inside the table; `id` arrives already typed from the row, so there
is no `Number(btn.dataset.id)` and no `container.addEventListener` to write.

`createTranslationsPage` is the same shape plus a required `update` action, exposed
as the convenience `saveTranslation(id, value)`.

## Other building blocks

`createHttpClient`, `runMutation`/`toggleStatus`, `confirm`/`createModal`/`createLoadingOverlay`,
`bindFilters`/`buildParams`, `normalizeError`, and `createLogger` are all exported individually
for pages that don't need the full `createCrudPage` composition.

`bindFormAction(form, { action, onSuccess })` handles a create/edit form's whole submit
cycle — preventDefault, disable the submit button, build the payload, run the action,
re-enable — and ignores a repeat submit while one is in flight:

```js
import { bindFormAction } from '@maatify/admin-crud';

bindFormAction(form, {
  action: (payload) => page.actions.create({ payload }),
  onSuccess: () => modal.close(),
});
```

`actionButton()` and `statusBadge()` build row-action markup that is escaped by construction —
use them (or `` html`…` ``) inside `column.render`, whose return value the table trusts as raw HTML:

```js
import { actionButton, statusBadge } from '@maatify/admin-crud';

{ key: 'active', label: 'Status', render: (active, row) => statusBadge({ active, id: row.id }) }
{ key: 'id', label: '', render: (id) => actionButton({ action: 'edit', id, label: 'Edit' }) }
```

`npm test` (vitest + jsdom) · `npm run build` (ESM + browser IIFE `window.MaatifyAdminCrud`).
Design and roadmap: `docs/DESIGN.md`.

## Licence

MIT — see [LICENSE](LICENSE).
