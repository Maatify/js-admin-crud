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
          ${actionButton({ action: 'sort', id, label: 'Sort' })}
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
    create: { endpoint: 'languages/create', successMessage: 'Language created' },
  },

  // Row actions run on the table's own delegated listener — you never add one.
  // `action` is the clicked element's data-action; `id` is already the row's
  // primary key, correctly typed, and `row` is the whole loaded record.
  onRowAction(action, { id, row, dataset }) {
    if (action === 'toggle') {
      page.actions.toggle({ payload: { id, active: Number(dataset.next) } });
    } else if (action === 'delete') {
      page.actions.delete({ payload: { id } });
    } else if (action === 'sort') {
      openSortModal({
        http: page.http,
        endpoint: 'languages/set-sort-order',
        id,
        currentValue: row.sort_order ?? 0,
        reload: () => page.table.reload(),
      });
    }
  },
});

await page.table.load();

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
- **`list`** — `{ endpoint, method, params }`. By default the endpoint is
  called with `GET` and whatever the filters/pagination produce is sent as the
  query string. It must return
  `{ data: [...], pagination: { page, per_page, total, filtered? } }`.

  Set `method: 'POST'` for endpoints that expect a JSON body instead, and use
  `params(tableParams)` to reshape the table's flat params into whatever the
  endpoint actually wants — the only way to express a nested body:

  ```js
  list: {
    endpoint: `plans/${planId}/features/query`,
    method: 'POST',
    params: (p) => ({
      page: p.page,
      per_page: p.per_page,
      search: { global: p.global, columns: { feature_key: p.feature_key } },
    }),
  }
  ```

  `params` works for `GET` too, where it is the place to rename or drop a
  parameter before it reaches the query string.
- **`actions`** — each key becomes `page.actions.<key>(overrides)`. The
  object under each key is `runMutation()`'s config (endpoint, method,
  confirmMessage, successMessage, onSuccess, …); `overrides` is merged over
  it per call, which is where you pass the actual `payload`.
- **`onRowAction(action, { id, row, dataset, element })`** — fires when
  anything matching `[data-action]` is clicked inside the table. It runs on
  the **table's own** delegated listener, so a page never calls
  `container.addEventListener('click', …)` itself; one listener handles
  pagination, export, retry *and* row actions. `id` is the matching row's
  primary key as it came from the API (a number stays a number — no
  `Number(btn.dataset.id)`), `row` is the whole loaded record, `dataset` is a
  copy of the element's `data-*`, and `element` is the clicked element.
  `row` is `null` (and `id` the raw string) when no loaded row matches the
  `data-id`. Referring to `page` inside the handler is fine — the body only
  runs after `createCrudPage` has returned. Override the `[data-action]`
  convention with `table.rowActionSelector` if a page needs a different one.

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
import { createModal, bindFormAction } from '@maatify/admin-crud';

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

  bindFormAction(modal.body.querySelector('[data-create-form]'), {
    action: (payload) => page.actions.create({ payload }),
    onSuccess: () => modal.close(),
  });

  modal.open();
}
```

`bindFormAction` does the whole submit dance for you: `preventDefault`, disable
the submit button, build the payload from the form's fields, run the action,
call `onSuccess` only if it succeeded, then re-enable the button — and it
ignores a second submit while the first is still in flight, so a double-click
can't create two records.

The same helper covers edit, because `action` is just a function:

```js
bindFormAction(form, {
  // Everything the form holds, plus whatever isn't a plain field.
  buildPayload: async (f) => ({
    name: f.elements.name.value,
    image: await uploadPendingImage(),
    active: f.elements.active.checked ? 1 : 0,
  }),
  action: (payload) => (product ? page.actions.update({ payload: { ...payload, id: product.id } }) : page.actions.create({ payload })),
  onSuccess: () => modal.close(),
});
```

Worth knowing:

- **Empty fields are kept.** The default payload is every field of the form
  including the empty ones, because clearing a field in an edit form has to
  send `''` rather than omit the key. (This is the opposite of `buildParams`'s
  own default, which drops empties — right for filters, wrong for edits.)
- **`f.elements.name`, not `f.name`.** On a form element, `.name` is the
  form's own name property, not the field called `name`.
- **It does not alert when the action *returns* a failure** — `runMutation`
  (and so every `page.actions.*`) already shows the error alert, and alerting
  again here would show the same message twice. It alerts only for a *thrown*
  error, which is the case nothing else covers. Pass `onFailure` to react to a
  returned failure, or `onError` to replace the default alert.
- **An action that returns nothing counts as success** — only an explicit
  `{ success: false }` is treated as a failure.
- It returns an `unbind()` function, like `bindFilters`.

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

## 10. Matching your existing table skin

The table ships one default look. If your admin panel already has a table
style, you will not match it with CSS alone — colour you can override from a
stylesheet, but icons and a sort affordance are *structure*, and structure the
markup never emits cannot be added from outside. So there are two knobs, and
most hosts need both.

### `classes` — every slot, replaceable

`defaultTableClasses` names all 41 slots the table emits. Pass `classes` to
replace them per slot:

```js
import { createCrudPage, defaultTableClasses } from '@maatify/admin-crud';

createCrudPage({
  table: {
    container: '#table',
    columns: [...],
    classes: {
      // replace outright
      container: 'rounded-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200 dark:ring-slate-700',
      // or compose onto the default
      th: `${defaultTableClasses.th} dark:text-slate-500`,
      td: `${defaultTableClasses.td} dark:text-slate-200`,
    },
  },
});
```

A slot you don't mention keeps its default, and a slot set to `''` renders with
no `class` attribute at all.

The default set is deliberately light on `dark:` variants — `tbody`, borders and
most text colours have none — which is exactly what makes a table look broken
in a dark theme next to tables that do. `classes` is how you fill that in.

The slot names, grouped: `container`, `header`, `customFilters`, `tableWrap`,
`table` · `exportGroup`, `exportButton` · `theadRow`, `th`, `selectAllCell`,
`selectAllCheckbox` · `tr`, `trSelected`, `trStriped`, `td`, `tdRendered`,
`tdEmptyValue`, `emptyValue`, `tdImage`, `image`, `checkboxCell`, `rowCheckbox`,
`notSelectable` · `emptyCell`, `emptyTitle`, `emptyHint` · `footer`,
`footerStart`, `pageInfo`, `perPageLabel`, `perPageSelect`, `pagination`,
`pageButton`, `pageButtonActive`, `pageButtonInactive`, `navButton`,
`navButtonDisabled` · `errorBox`, `errorTitle`, `errorText`, `retryButton`.

### Renderers — for the parts whose structure differs

Three optional renderers replace a part's markup wholesale. Each returns
**trusted HTML**, the same contract as `column.render`:

| Option | Replaces | Gets |
|---|---|---|
| `renderHeaderCell(column, ctx)` | one `<th>` | `ctx.classes`, `ctx.index`, `ctx.label` |
| `renderExportButtons(ctx)` | the export group's contents | `ctx.classes`, `ctx.kinds` (`['csv','excel','print']`) |
| `renderPaginationButton(ctx)` | one pagination `<li>` | `ctx.classes`, `ctx.page`, `ctx.text`, `ctx.label`, `ctx.active`, `ctx.disabled`, `ctx.kind` (`'page'｜'first'｜'prev'｜'next'｜'last'`) |

```js
table: {
  // a sortable header with your own chevron
  renderHeaderCell: (column, { classes, label }) => html`
    <th data-key="${column.key}" class="${classes.th} dark:text-slate-500 hover:text-slate-700">
      ${label}${raw(CHEVRON_SVG)}
    </th>`,

  // the grouped pill of icon buttons your panel uses elsewhere
  renderExportButtons: ({ kinds }) =>
    kinds.map((kind) => html`<button type="button" data-export="${kind}" class="pill">${raw(ICONS[kind])}${LABELS[kind]}</button>`).join(''),
}
```

> **Keep the `data-*` attributes.** The table drives itself by delegation on
> `[data-page]` and `[data-export]`. A renderer that drops them produces markup
> that looks right and does nothing — paging and export silently stop working.
> There is a test for exactly that failure mode.

### Nothing changes if you pass neither

Default output is byte-for-byte what it was before theming existed, across the
populated, empty, selection and error states — asserted in
`test/table-theming.test.js`.

### What `classes` alone cannot do

Four things in a host's table skin are behaviour or structure, not colour, so
`classes` cannot reach them. Each has its own opt-in:

```js
table: {
  clientSort: true,   // click a header to sort the loaded page, as the legacy kernel did
  pageJump: true,     // a "go to page N" box at the end of the pagination list
  classes: { tbody: 'bg-white dark:bg-gray-800' },
  renderPerPage: ({ classes, sizes, perPage, label }) => html`
    <label class="${classes.perPageLabel}">${raw(ROWS_ICON)}${label}
      <select data-per-page class="${classes.perPageSelect}">${raw(sizes)}</select>
    </label>`,
}
```

- **`clientSort`** sorts the **current page** in the browser and never sends a
  sort parameter — the same scope, and the same caveat, as the table it
  replaces (server-side sorting is #17). Sortable headers carry
  `data-sort-index` and a live `aria-sort`; opt a column out with
  `sortable: false`. A custom `renderHeaderCell` receives `sortable` and
  `sortDirection` so it can draw its own affordance and still be clickable —
  keep `data-sort-index` on the `<th>` or clicking does nothing.
- **`pageJump`** appears only when there is more than one page, and clamps what
  the user types to the page count.
- **`renderPerPage`** must keep `data-per-page` on the select.
- **`classes.tbody`** defaults to no class at all.

### Row-action buttons with an icon and a colour

```js
import { actionButton, actionButtonColors, raw } from '@maatify/admin-crud';

actionButton({ action: 'edit', id: row.id, label: 'Edit', color: 'blue', icon: raw(EDIT_SVG) });
```

`color` composes a text + hover palette (with `dark:` variants) onto
`className`; an unknown key is ignored. `icon` is markup **only** when it is a
`SafeHtml` from `raw`/`html` — a plain string is escaped, so interpolating
untrusted text cannot inject markup. `statusBadge` takes both too.

## 11. Searchable select

`createSelect` is the admin kernel's `select2.js` ported in — dependency-free,
despite the name it never used the jQuery plugin.

```js
import { createSelect } from '@maatify/admin-crud';

const languages = createSelect('#language-filter', {
  data: [{ value: 1, label: 'English', search: 'en' }, { value: 2, label: 'Arabic', search: 'ar' }],
  value: 1,                       // initial selection; does not fire onChange
  onChange: (item) => page.table.load({ page: 1, language_id: item.value }),
});

languages.getValue();             // 1
languages.setValue(2);            // selects, or clears when the value is unknown
languages.setData(nextOptions);   // keeps the selection only if it still exists
languages.destroy();              // removes every listener, document ones included
```

**It works on an empty container or on markup you already have.** Given an empty
element it builds the whole widget; given an element that already contains the
kernel's hooks — `.js-select-box`, `.js-select-input`, `.js-dropdown`,
`.js-search-input`, `.js-select-list`, `.js-arrow` — it enhances those instead,
so an existing Twig template migrates without being touched.

`search` on an option is an extra haystack beside the label, which is how a code
like `en` finds `English`. Styling goes through `classes`, same contract as the
table: `defaultSelectClasses` names every slot (`box`, `boxOpen`, `boxClosed`,
`input`, `arrow`, `arrowOpen`, `dropdown`, `search`, `list`, `option`,
`optionSelected`, `check`, `empty`).

Two things the original did that this does not: it interpolated option labels
into `innerHTML` **unescaped** — a stored-XSS hole for any label coming from an
API — and its `destroy()` left the box, search and list listeners attached. Both
are fixed; labels are escaped and teardown is complete.
