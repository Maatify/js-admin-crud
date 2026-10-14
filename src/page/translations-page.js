import { createCrudPage } from './create-crud-page.js';

/**
 * Specialization of createCrudPage for the admin's `*_translations` list
 * pages: identical config shape, plus a required `update` action (saves one
 * row's translated value) exposed as the convenience `saveTranslation()`.
 */
export function createTranslationsPage({ update, actions = {}, ...rest } = {}) {
  const page = createCrudPage({ ...rest, actions: { ...actions, update } });
  if (!page) return null;

  return {
    ...page,
    saveTranslation(id, value, overrides = {}) {
      return page.actions.update({ payload: { id, value }, ...overrides });
    },
  };
}
