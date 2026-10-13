# @maatify/admin-crud

Admin CRUD/page library (data table, pagination, export, alerts, safe HTML helpers).
Extracted from the Athar admin kernel; the original copy is kept in `legacy/kernel/` as a baseline.

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
- Messages are overridable with `setMessages({...})` (see `src/core/i18n.js` for keys).
- The package is `private` for now; remove `"private": true` (or publish to GitHub Packages) before `npm publish`.

`npm test` (vitest + jsdom) · `npm run build` (ESM + browser IIFE `window.MaatifyAdminCrud`).
Design and roadmap: `docs/DESIGN.md`.
