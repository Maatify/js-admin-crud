# Migration parity with the legacy admin-kernel

What the library has actually replaced from `legacy/kernel/`, what is still
planned, and what it deliberately will not do. Tracked by #25.

`legacy/kernel/` is 4,751 lines; `src/` is 1,044. That gap is mostly duplication,
console logging and vendored widgets — but not entirely, and the point of this
document is to say which is which rather than leave it to be discovered during a
migration.

**Usage counts** are files under `public/admin/assets/js/modules/` in
athar-platform (177 JS modules) that reference the global each kernel file
defines. They are what makes a gap urgent or theoretical.

## Summary

| Kernel file | Lines | Uses | Status | Replacement |
|---|---|---|---|---|
| `api_handler.js` | 493 | 67 | **Mostly covered** | `createHttpClient`, `showAlert`, `errorMessage` — see §1; list transport blocked by #31 |
| `admin-ui-components.js` | 624 | 45 | **Mostly covered** | `actionButton`/`statusBadge` (#14), `onRowAction` (#12) — see §2 |
| `admin-page-bridge.js` | 1,365 | 4 | **Covered** | `createCrudPage` + `bindFilters` + DOM helpers — see §3 |
| `data_table.js` | 515 | — | **Covered** | `createDataTable` — but see §1.2 on transport |
| `error_normalizer.js` | 164 | 0 | **Covered** | `normalizeError` / `isStepUpRequired` / `errorMessage` — see §4 |
| `filter-bindings.js` | 178 | — | **Covered** | `bindFilters` |
| `callback_handler.js` | 365 | — | **Covered** | `normalizeError`'s legacy branch + `setMessages` |
| `custom-confirm.js` | 52 | — | **Covered** | `confirm()` |
| `info-modal.js` | 21 | — | **Covered** | `createModal()` |
| `prograss.js` | 57 | — | **Covered** | `createLoadingOverlay()` |
| `select2.js` | 218 | 11 | **Out of scope** | host application — see §5 |
| `admin-wysiwyg.js` | 248 | 4 | **Out of scope** | host application — see §5 |
| `datetime-picker.js` | 295 | 0 | **Out of scope** | host application — see §5 |
| `Input_checker.js` | 156 | 0 | **Out of scope** | host application — see §5 |

Nothing is classified **Planned** with no replacement at all; the remaining gaps
are named inside §1 and §2 and each carries an issue.

## 1. `api_handler.js` → `createHttpClient`

The highest-impact mapping: 67 files call it, 164 call sites of `ApiHandler.call`
alone. Its public surface is `call`, `parseResponse`, `showAlert`,
`hasCapability`, `showFieldErrors`, `extractErrorMessage`.

| Legacy | Replacement | Note |
|---|---|---|
| `call(endpoint, payload, operation, method)` | `http.request(endpoint, { method, payload, operation })` | argument order differs; see §1.1 |
| `showAlert(type, message, duration)` | `showAlert(type, message)` | the `d`/`s`/`w`/`i` shorthands are not accepted |
| `extractErrorMessage(data)` | `errorMessage(data)` | equivalent |
| `parseResponse(response, operation)` | — | **not exported**; internal to `createHttpClient`. 9 call sites |
| `hasCapability(cap, caps)` | — | **not covered**; reads `window.languagesCapabilities` |
| `showFieldErrors(...)` | — | **not covered**; tracked as #20. 3 call sites |

### 1.1 Transport comparison — verified, not assumed

This is the part #25 insisted on checking, because any difference breaks every
call. Comparing `api_handler.js:344-354` against `src/core/http.js`:

| | `api_handler.js` | `createHttpClient` | Impact |
|---|---|---|---|
| `Content-Type` | `application/json` | `application/json` | none |
| `Accept` | *not sent* | `application/json` | **benign but real** — a content-negotiating endpoint could answer differently |
| `credentials` | *not set* → browser default `same-origin` | explicit `'same-origin'` | **none** — the explicit value matches the default |
| CSRF header | *none* | *none by default*, injectable via `headers()` | none; the library can do what the legacy could not |
| Base URL | hard-coded `const API_BASE = '/api'` | configurable `baseUrl` | **see below** |
| GET query params | **dropped** — no query string is built and the body is skipped for GET | serialized to a query string | **see §1.2** |

Two things to carry into any migration:

- **`api_handler` strips a leading `api/` from the endpoint** before prefixing
  `/api` (`endpoint.replace(/^api\//, '')`). `createHttpClient` does not. An
  endpoint written as `'api/plans/query'` becomes `/api/plans/query` on the
  legacy path and `/api/api/plans/query` on the new one. Drop the prefix from
  endpoint strings when migrating.
- **The `Accept` header is the only header difference** and the only one that
  could change a response. Worth one check against the backend before a bulk
  migration; it is not a per-page risk.

### 1.2 The GET-payload difference is real but inert

`api_handler.call` builds its URL with no query string and only attaches a body
for non-GET, so a payload passed with `method: 'GET'` is **silently dropped**.
`createHttpClient` serializes it into the query string instead.

This difference cannot bite in practice: every `GET` call site in athar-platform
passes `null` as the payload and carries its parameters in the path instead
(`API_ROUTES.PROTECTED.replace('{orderId}', orderId)`). So the new behaviour is
strictly a fix, not a regression.

### 1.3 The list request is a POST with a nested body — the one genuine blocker

`legacy/kernel/data_table.js:60-63` sends the table's list request as
**`POST` with a JSON body**, and pages nest their filters inside it:

```js
{ page, per_page, search: { global: '…', columns: { feature_key: '…' } } }
```

`createCrudPage` builds its `fetchPage` as `http.get(list.endpoint, params)`,
and `createHttpClient` serializes query params with `URLSearchParams.set`, which
renders a nested object as the literal `[object Object]`. So a page with this
shape cannot be expressed through `createCrudPage` today — in both the method
and the parameter shape.

This is the only parity gap that blocks a real page migration outright. Tracked
as #31.

## 2. `admin-ui-components.js` → `actionButton` / `statusBadge` / `onRowAction`

624 lines, 45 files. Ranked by actual call sites:

| Legacy | Uses | Status | Replacement |
|---|---|---|---|
| `buildActionButton(config)` | 53 | **Covered** | `actionButton()` (#14) |
| `SVGIcons` | 33 | **Not covered** | — see below |
| `renderStatusBadge(value, opts)` | 18 | **Covered** | `statusBadge()` (#14) |
| `setupButtonHandler(selector, fn)` | 11 | **Covered** | `onRowAction` (#12) |
| `escapeHtml(text)` | 4 | **Covered** | `escapeHtml()` |
| `renderSortBadge(value, opts)` | 3 | **Not covered** | — |
| `renderCodeBadge(value, opts)` | 2 | **Not covered** | — |
| `buildModalTemplate` / `buildModalFooter` | 2 | **Covered** | `createModal()` |
| `renderDirectionBadge`, `renderIcon`, `renderSvgIcon`, `hydrateIcons` | 0 | **Not covered** | — |

**What remains outside `#14`** is the icon set and the two niche badges:

- **`SVGIcons` / `CommonSvgPaths` / `renderSvgIcon` / `hydrateIcons`** — an inline
  SVG icon library (33 uses, almost all as `icon:` arguments to
  `buildActionButton`). This is an **asset**, not behaviour. Shipping an icon set
  inside a CRUD library would bind every consumer to one visual vocabulary, so
  it stays with the host application; `actionButton`'s `label` accepts text and
  the host can compose its own icon markup around it.
- **`renderSortBadge`, `renderCodeBadge`, `renderDirectionBadge`** — three
  single-purpose badges (5 uses between them). Each is a one-line `html` template
  in the consuming page. Not worth an API until a second consumer needs them.

Note that `buildActionButton` emits a **class**-based hook (`cssClass:
'edit-feature-btn'`) paired with `setupButtonHandler('.edit-feature-btn', fn)`,
whereas `actionButton` + `onRowAction` use the `data-action` convention. Both are
delegation on a container; the migration is mechanical, but it is a rename, not a
drop-in.

## 3. `admin-page-bridge.js` → `createCrudPage` and friends

The largest kernel file (1,365 lines) but only 4 consumers, all of which use it
as a presence check plus a handful of helpers. Its surface splits three ways:

- **DOM readers** (`el`, `value`, `setValue`, `checked`, `int`, `bool`, `float`) —
  a typed `getElementById` wrapper. Deliberately **not** reimplemented: with
  `bindFormAction`'s `buildPayload(form)` receiving the form element, these are
  `f.elements.x.value` and a cast.
- **Alerts and confirm** (`success`, `error`, `warning`, `info`, `confirm`) →
  `showAlert` and `confirm()`.
- **`normalizeError`** → `normalizeError()`; **`escapeHtml`** → `escapeHtml()`;
  **`open`/`close`** → `createModal()`.
- **`syncUrlParamsToFilters`** → **not covered**, tracked as #23 (URL/query-string
  deep-linking). The one plan-features behaviour that depends on it is a single
  `URLSearchParams` read, easily kept in the page.

## 4. Step-up authentication — confirmed against the legacy normalizer

#25 asked that this be confirmed rather than assumed. Comparing
`legacy/kernel/error_normalizer.js:111-122` with `src/core/errors.js:71-76`:

```js
// legacy                                  // src/core/errors.js
if (data.code === 'STEP_UP_REQUIRED')      if (data.code === 'STEP_UP_REQUIRED') return true;
    return true;                           if (data.error && data.error.code === 'STEP_UP_REQUIRED') return true;
if (data.error && data.error.code === 'STEP_UP_REQUIRED') return true;
```

**Identical**, for both the legacy flat shape and the unified
`{ error: { code } }` shape. `normalizeError` also lifts `scope` to the top level
from both shapes, matching the legacy `normalize()`.

The one legacy method without a direct export is **`getLegacyStepUpView(data)`**,
which returns `{ code, scope }`. Its data is fully reachable —
`normalizeError(data)` exposes `.code` and `.scope` — so this is a missing
convenience wrapper, not a missing capability. `ErrorNormalizer` has **0**
consumers in athar-platform, so nothing depends on the exact shape.

## 5. Widgets: select2, wysiwyg, datetime-picker, Input_checker

**Decision: all four stay the host application's responsibility.** They are not
part of the CRUD/table/filter problem this library solves, three of the four wrap
a third-party dependency (jQuery/Select2, an editor, a date library), and pulling
them in would force that dependency on every consumer of a library that currently
has **zero** runtime dependencies.

Correcting #25's own table, which listed all four as unused — two of them are
very much in use:

| File | Uses | Note |
|---|---|---|
| `select2.js` | **11** | real call sites, e.g. `Select2('#translation-filter-language-id', …)`; several are guarded by `typeof Select2 !== 'undefined'` |
| `admin-wysiwyg.js` | **4** | all guarded: `if (typeof window.initWysiwyg === 'function')` |
| `datetime-picker.js` | 0 | no reference to `datePickerAutoInit`, `datepicker` or `flatpickr` anywhere |
| `Input_checker.js` | 0 | no reference |

That usage does not change the decision — it changes the **migration plan**. A
page using Select2 or the WYSIWYG keeps loading those two kernel files by
`<script>` alongside the library; they do not conflict, because the library
claims no globals of its own. The two genuinely unused files can simply be
dropped.

## How to keep this current

Re-run the usage counts from the host application's module root:

```bash
cd public/admin/assets/js/modules
for g in ApiHandler AdminUIComponents AdminPageBridge Select2 initWysiwyg; do
  printf "%-20s %s\n" "$g" "$(grep -rl --include='*.js' "$g" . | wc -l)"
done
```

## 6. Acceptance proof: plan-features

`examples/plan-features.js` is athar-platform's plan-features page rewritten on
this library: **326 lines in one file**, replacing 597 lines across four
(`-helpers.js` + `-modals.js` + `-actions.js` + `-with-components.js`) that were
loaded in a fixed `<script>` order and communicated through `window.*`.

`test/plan-features-parity.test.js` runs that exact file — read off disk, not
reimplemented — against the DOM contract of its Twig template and a mocked API,
asserting 21 behaviours of the legacy page: the POST list body, every column
renderer, per-capability button visibility, the `can_list` permission notice,
filter/search/reset/clear, the "filtered from N total" note, query-string
prefill, both modals' prefill and input toggling, both form payload shapes,
confirm-then-unassign, modal close by button and by Escape, pagination, and that
only one click listener is attached to the table container.

What the rewrite required from the library, beyond #12/#14/#15: `list.method`
and `list.params` (#31). What it did **not** require: any change to the Twig
template.

Two legacy details worth recording, because they shaped the rewrite:

- **The filter controls carry `id` but no `name`**, so `bindFilters` cannot read
  them through `FormData`. It is still used for the *events* (submit, Enter,
  select-change), while the values are read by id in `list.params`. Adding
  `name` attributes to those five inputs would remove that indirection.
- **`getPaginationInfo` receives the table's own flat params**, not the nested
  body `list.params` produced, so a page that nests its filters must derive
  "is anything filtered?" from its own filter state rather than from the
  argument.
