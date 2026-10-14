/**
 * Row selection, scoped to whatever page is currently rendered.
 *
 * Selection does NOT persist or reach across pages: "select all" only selects
 * the rows on screen, and navigating to another page starts from whatever the
 * caller re-renders. This is a deliberate simplification of the legacy kernel,
 * where "select all" silently acted on the current page while looking global
 * (defect: client-side select-all vs. server-side pagination).
 */
export function createSelection({ selectableIds } = {}) {
  const selected = new Set();
  const selectable = selectableIds ? new Set([...selectableIds].map(String)) : null;

  const api = {
    canSelect(id) {
      return !selectable || selectable.has(String(id));
    },
    has(id) {
      return selected.has(String(id));
    },
    add(id) {
      if (api.canSelect(id)) selected.add(String(id));
    },
    remove(id) {
      selected.delete(String(id));
    },
    toggle(id, on) {
      on ? api.add(id) : api.remove(id);
    },
    clear() {
      selected.clear();
    },
    toArray() {
      return [...selected];
    },
    toSet() {
      return new Set(selected);
    },
  };

  return api;
}
