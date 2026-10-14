import { runMutation } from './run-mutation.js';

/**
 * Common "set active/inactive" mutation, seen across most admin list pages.
 * `active` is the NEW desired state to send.
 */
export function toggleStatus({ http, endpoint, id, active, idField = 'id', activeField = 'active', operation = 'Toggle status', ...rest } = {}) {
  return runMutation({
    http,
    endpoint,
    operation,
    payload: { [idField]: id, [activeField]: active },
    ...rest,
  });
}
