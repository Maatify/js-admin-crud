# How to use @maatify/admin-crud

This is the practical guide: what to put in your HTML, and what the one JS file
for a given admin page looks like. For the API rationale and the modules behind
it, see `docs/DESIGN.md`. For the bare function signatures, see the per-module
source under `src/` — this doc is about wiring a real page end to end.

Every admin list page in this library is **one HTML skeleton + one JS module**.
The JS module is usually built with `createCrudPage()`, which wires one HTTP
client to the table, an optional filter form, and your named mutation actions.

## 1. Loading the library

Two ways, pick whichever matches how the host app serves JS:

**Bundled (Vite/esbuild/webpack, etc.) — import it like any package:**

```js
import { createCrudPage } from '@maatify/admin-crud';
```

**Plain `<script>`, no bundler on the page** — use the IIFE build and the
`window.MaatifyAdminCrud` global it exposes:

```html
<script src="/assets/maatify-admin-crud.iife.min.js"></script>
<script>
  const { createCrudPage } = window.MaatifyAdminCrud;
  // ...
</script>
```

Both builds come from `npm run build` (`dist/maatify-admin-crud.esm.js` and
`dist/maatify-admin-crud.iife.min.js`).

## 2. The HTML a page needs

Just an empty container for the table, plus — if the page has filters — a form
and/or a standalone search box. The library renders the table, pagination, and
export buttons into the container itself; you don't write any of that markup.

```html
<form id="languages-filters">
  <select name="active">
    <option value="">All statuses</option>
    <option value="1">Active</option>
    <option value="0">Inactive</option>
  </select>
</form>
<input id="languages-search" placeholder="Search…">

<button id="create-language">+ New language</button>

<div id="languages-table"></div>
```

That's it — no `#confirm-overlay`, no `#progress-overlay`, no modal markup baked
into the page. `confirm()`, `createModal()`, and `createLoadingOverlay()` all
build their own DOM when called, which is the main thing that changed from the
legacy kernel (`custom-confirm.js`, `info-modal.js`, `prograss.js`), where you
had to paste a specific block of HTML into every page's Twig template first.

## 3. The JS module

A full worked example for a "Languages" list page — table with a status badge
and an image column, a status filter, a global search box, and three actions
(toggle active, change sort order, delete):

```js
import { createCrudPage, actionButton, statusBadge, html, openSortModal } from '@maatify/admin-crud';

const page = createCrudPage({
  // One shared HTTP client for every call this page makes.
  http: {
    baseUrl: '/api',
    headers: () => ({ 'X-CSRF-Token': document.querySelector('meta[name=csrf]').content }),
    locale: () => document.documentElement.lang,
  },

  // The table itself — same options as createDataTable(), minus fetchPage.
  table: {
    container: '#languages-table',
    primaryKey: 'id',
    columns: [
      { key: 'icon', label: '' },                 // built-in image renderer (safe URLs only)
      { key: 'name', label: 'Name' },
      {
        key: 'active',
        label: 'Status',
        // column.render() output is TRUSTED HTML. statusBadge/actionButton
        // escape everything they emit, so there is nothing to get wrong here.
        render: (active, row) => statusBadge({ active, id: row.id }),
      },
      {
        key: 'id',
        label: 'Actions',
        render: (id, row) => html`
          ${actionButton({ action: 'sort', id, label: 'Sort', data: { value: row.sort_order ?? 0 } })}
          ${actionButton({ action: 'delete', id, label: 'Delete', className: 'text-xs px-3 py-1.5 border rounded-md text-red-600' })}
        `,
      },
    ],
  },

  // Binds the filter form + search box; applying them reloads the table at page 1.
  filters: {
    form: '#languages-filters',
    search: '#languages-search',
  },

  // GET endpoint the table loads pages from, with the current filter params as a query string.
  list: { endpoint: 'languages/query' },

  // Named mutations, called as page.actions.<name>(overrides). Each one is a
  // runMutation() call: http request -> alert -> table reload.
  actions: {
    toggle: { endpoint: 'languages/set-active', successMessage: 'Status updated' },
    delete: { endpoint: 'languages/delete', confirmMessage: 'Delete this language?', successMessage: 'Deleted' },
  },
});

await page.table.load();

// The table doesn't know what your action buttons mean — wire them yourself,
// delegated on the same container you gave the table. `row` already carried
// every attribute you need onto the button in the render() above.
document.querySelector('#languages-table').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const id = Number(btn.dataset.id);

  if (btn.dataset.action === 'toggle') {
    // statusBadge put the value to flip to in data-next
    page.actions.toggle({ payload: { id, active: Number(btn.dataset.next) } });
  } else if (btn.dataset.action === 'delete') {
    page.actions.delete({ payload: { id } });
  } else if (btn.dataset.action === 'sort') {
    openSortModal({
      http: page.http,
      endpoint: 'languages/set-sort-order',
      id,
      currentValue: Number(btn.dataset.value),
      reload: () => page.table.reload(),
    });
  }
});

document.querySelector('#create-language').addEventListener('click', () => {
  openCreateModal();
});
```

Walking through the config:

- **`http`** — `baseUrl`, `headers()`, and `locale()` are all optional; every
  request this page makes (the table's list load and every action) goes
  through this one client. No per-page `fetch` call, no hard-coded `/api`
  prefix.
- **`table`** — identical to `createDataTable()`'s options (see its doc
  comment in `src/table/data-table.js`), minus `fetchPage`, which
  `createCrudPage` builds for you from `list.endpoint`.
- **`table.columns[].render`** — its return value is inserted as **trusted
  HTML**, so never build it by hand with a plain template literal. Use
  `actionButton()` / `statusBadge()`, which escape by construction, or the
  `` html`…` `` tag, which escapes every interpolation:

  | Helper | Emits | For |
  |---|---|---|
  | `actionButton({ action, id, label, data, className, title, disabled })` | `<button type="button" data-action="…" data-id="…" …>` | any row action (edit, delete, sort, …) |
  | `statusBadge({ active, id, onLabel, offLabel, action, data })` | the same button, labelled Active/Inactive and carrying `data-next` (the value to flip to) | the active/inactive column |

  Keys in `data` are camelCase and become kebab-case attributes, matching how
  the DOM maps `dataset` (`{ sortOrder: 3 }` → `data-sort-order="3"`, read back
  as `btn.dataset.sortOrder`). Values are escaped; an attribute *name* that
  could break out of the markup throws instead of being emitted. Both return a
  `SafeHtml`, so they can be returned straight from `render()` and also nested
  inside an `` html`…` `` template without being escaped twice. Pass
  `action: null` to `statusBadge` for a read-only status cell (a `<span>`, no
  action wiring).
- **`filters`** — optional. Omit it entirely for a page with no filter form.
  `search` can point at an input that lives outside the form (most admin
  pages render the global search box separately); it still gets merged into
  the same params object.
- **`list.endpoint`** — a GET endpoint. Whatever the filters/pagination
  produce is sent as the query string; the endpoint must return
  `{ data: [...], pagination: { page, per_page, total, filtered? } }`.
- **`actions`** — each key becomes `page.actions.<key>(overrides)`. The
  object under each key is `runMutation()`'s config (endpoint, method,
  confirmMessage, successMessage, onSuccess, …); `overrides` is merged over
  it per call, which is where you pass the actual `payload`.

## 4. Confirm-before-destructive-action

Any action can ask for confirmation before it runs — just add
`confirmMessage` to its config, like `delete` above. No confirm markup to
add to the page; `confirm()` builds its own dialog. To ask outside of an
action (e.g. before navigating away), call it directly:

```js
import { confirm } from '@maatify/admin-crud';

const ok = await confirm({ title: 'Discard changes?', message: 'Unsaved edits will be lost.' });
if (ok) { /* ... */ }
```

## 5. Create/edit modal

`createCrudPage` doesn't assume anything about your create/edit form — build
it with `createModal()` and save it through the same `http` client the page
already has:

```js
import { createModal } from '@maatify/admin-crud';

function openCreateModal() {
  const modal = createModal({
    title: 'New language',
    content: `
      <form data-create-form class="p-6 space-y-4">
        <input name="name" placeholder="Name" class="w-full border rounded-lg px-3 py-2" required>
        <div class="flex justify-end gap-3">
          <button type="button" data-modal-close class="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
          <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button>
        </div>
      </form>`,
  });

  modal.body.querySelector('[data-create-form]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = new FormData(e.target).get('name');
    const result = await page.http.post('languages/create', { name });
    if (result.success) {
      modal.close();
      await page.table.reload();
    }
  });

  modal.open();
}
```

## 6. Loading overlay

For anything slower than the table's own load (a bulk import, a report
export), show the generic overlay rather than blocking silently:

```js
import { createLoadingOverlay } from '@maatify/admin-crud';

const overlay = createLoadingOverlay();
overlay.show('Exporting…');
await doSomethingSlow();
overlay.hide();
// overlay.destroy() once the page no longer needs it (e.g. on navigation away)
```

## 7. Arabic / RTL

Two independent switches:

- **Messages**: pass `locale` + `messages` to `createCrudPage` (or call
  `setMessages({...})` yourself before the table loads) — see
  `src/core/i18n.js` for every key you can override.
- **Layout direction**: the library only ever emits logical Tailwind classes
  (`ps-*`, `pe-*`, `text-start`, …), so setting `dir="rtl"` on `<html>` (or any
  ancestor) is the only extra step — there's nothing in this library to
  configure for RTL beyond that.

```js
createCrudPage({
  locale: 'ar',
  messages: { ar: { 'table.rows': 'صفوف', 'table.empty_title': 'لا توجد بيانات' } },
  // ...
});
```

## 8. Translations pages

For the admin's `*_translations` pages, `createTranslationsPage` is the same
config as `createCrudPage` plus a required `update` action:

```js
import { createTranslationsPage } from '@maatify/admin-crud';

const page = createTranslationsPage({
  http: { baseUrl: '/api' },
  table: { container: '#translations-table', columns: [...] },
  list: { endpoint: 'languages_translations/query' },
  update: { endpoint: 'languages_translations/update' },
});

await page.table.load();
// in your inline-edit handler:
await page.saveTranslation(rowId, newValue);
```

## 9. Just the table, nothing else

If a page only needs the table (no filters, no actions, you already have your
own `fetch` wrapper), skip `createCrudPage` and call `createDataTable`
directly — see the example in the main `README.md`.
