# maatify-admin-crud — design (draft for approval)

Status: proposal. `athar-platform` is finished and not being touched further;
`legacy/kernel/` (imported from `athar-platform/public/admin/assets/maatify/admin-kernel/js/`
@ 2026-10-13) stays only as the baseline reference for the extraction. This library is
now developed forward for future admin projects, not as a migration target for athar-platform.

## 1. Goal

One library for admin list/CRUD pages: **table + filters + pagination + modals +
row actions + API client + alerts**. The data table is *not* a separate package
(it depends on the alert, pagination, API and filter code around it).

## 2. What the current kernel does (read in full: `data_table.js`; skimmed: `api_handler.js`, `admin-page-bridge.js`)

| File | Role | Lines |
|---|---|---|
| `data_table.js` | table render, pagination, selection, sort, export, own `fetch` | 515 |
| `admin-page-bridge.js` | facade `AdminPageBridge` (DOM/API/UI/Modal/Table/Form/Events/Text) | 1365 |
| `api_handler.js` | `ApiHandler.call`, response parsing, own `showAlert` | 493 |
| `callback_handler.js` | another API/alert path (own `showAlert`, auth token) | 365 |
| `admin-ui-components.js`, `filter-bindings.js`, `error_normalizer.js`, `custom-confirm.js`, `info-modal.js`, `prograss.js`, `select2.js`, `datetime-picker.js`, `admin-wysiwyg.js`, `Input_checker.js` | UI pieces | ~1.5k |

## 3. Defects to fix while extracting (found in `data_table.js`)

1. **Unescaped HTML (stored-XSS risk).** Default cell rendering interpolates
   `${v}` raw (also `title="${v}"`, `<img src="${v}">`, the error box `${error.message}`,
   alerts via `innerHTML`, and the Excel/PDF exports). Any API string containing
   markup runs in the admin's browser. → default renderer escapes; HTML only via
   an explicit `html` renderer helper.
2. **CSV/Excel formula injection.** Cells starting with `= + - @` are exported as-is.
3. **Global mutable state.** Top-level `let tableData, headers, rows, pagination,
   per_page, selectedItems…` → one table per page, name collisions with page scripts.
   → instance-based `createDataTable({...})`.
4. **Listener leak.** `document.addEventListener('click', …)` is added on every render.
5. **Own `fetch`** with hard-coded `/api/` prefix, no CSRF/locale/credentials,
   while `api_handler.js` and `callback_handler.js` have their own different clients.
   → one HTTP client with injected config.
6. **Three or more `showAlert` copies** (`data_table`, `api_handler`, `callback_handler`,
   `admin-page-bridge`, plus 21 page files). → one alert module.
7. **Client-side sort + select-all only act on the current page** while pagination is
   server-side (misleading). → sort via server params (opt-in), selection scoped and documented.
8. **Debug logging** (`console.log` of every request/response, `console.group` tables
   in `api_handler.js`). → `logger` with levels, off by default.
9. **Hard-coded English** ("Rows", "No data found", "empty", "to … of … filtered from …",
   "Error Loading Data", "Retry", "Table configuration error"). → message catalog.
10. Physical Tailwind classes (`text-left`, `ml-*`, `left-10`) assume LTR. RTL is
    required (see §7), so these must become logical properties (`text-start`,
    `ms-*`/`me-*`, `start-*`/`end-*`) throughout.

## 4. Proposed layout

```
src/
  core/       http.js (single client)  errors.js (ErrorNormalizer)  logger.js
              dom.js (escapeHtml, html``)  i18n.js (messages + setMessages)  events.js
  ui/         alerts.js  modal.js  confirm.js  loading.js
  table/      data-table.js (instance)  pagination.js  selection.js  export.js
  filters/    bind-filters.js  build-params.js
  actions/    run-mutation.js  toggle-status.js  sort-modal.js
  page/       create-crud-page.js   // declarative: endpoint, columns, filters, actions
              translations-page.js  // config-driven translations pages
dist/         maatify-admin-crud.esm.js  maatify-admin-crud.iife.js
test/         vitest + jsdom
```

Out of scope for v1 (kept in the host app): `select2`, `datetime-picker`, `admin-wysiwyg`
(third-party wrappers) — revisit later.

## 5. Public API sketch

```js
import { createCrudPage } from '@maatify/admin-crud';

createCrudPage({
  http:   { baseUrl: '/api', headers: () => ({ 'X-CSRF-Token': token() }), locale: () => lang },
  table:  { container: '#table-container', columns: [...], primaryKey: 'id', selection: false },
  filters:{ form: '#filters', search: '#global-search' },
  list:   { endpoint: 'languages/query' },
  actions:{ toggleStatus: { endpoint: 'languages/set-active' } },
  messages: { en: {...}, ar: {...} },
});
```

## 6. Decisions

- **Ownership/licence:** repo stays under the personal account; Maatify has the right
  to use the library in its projects.
- **RTL:** required. The admin must support RTL, not just LTR — see defect #10 in §3.
- **Delivery:** npm package (e.g. GitHub Packages), not vendored `dist/`. There is no
  single host to vendor into anymore — future admin projects each run
  `npm install @maatify/admin-crud`. Remove `"private": true` from `package.json`
  (or configure the GitHub Packages registry) before the first publish.
- **No compat layer.** `compat/globals.js` (legacy `window.AdminPageBridge`/`ApiHandler`
  globals) is dropped from the proposed layout — there is no athar-platform migration
  to support it for.

## 7. Open questions

- Tailwind: the library emits Tailwind utility classes; each consuming project must scan
  `dist/`/`src/` in its `tailwind.config.js`, or we ship a CSS file.
- Does `AGENTS-ADMIN.md` (not read yet) constrain the admin JS?
