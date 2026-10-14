import { confirm as defaultConfirm } from '../ui/confirm.js';
import { showAlert } from '../ui/alerts.js';

/**
 * Orchestrates: optional confirm -> http call -> alert -> reload/callbacks.
 * Takes an injected `http` client instead of assuming a global API singleton.
 */
export async function runMutation({
  http,
  endpoint,
  method = 'POST',
  payload = {},
  operation = 'Mutation',
  confirmMessage,
  confirmOptions = {},
  confirm,
  successMessage,
  showErrorMessage = true,
  notify = (type, msg) => showAlert(type, msg),
  reload,
  onSuccess,
  onFailure,
  afterFinally,
} = {}) {
  if (confirmMessage || confirm) {
    const proceed = typeof confirm === 'function' ? await confirm() : await defaultConfirm({ message: confirmMessage, ...confirmOptions });
    if (!proceed) {
      const cancelled = { success: false, cancelled: true, operation };
      if (afterFinally) await afterFinally(cancelled);
      return cancelled;
    }
  }

  try {
    const result = await http.request(endpoint, { method, payload, operation });

    if (result.success) {
      if (successMessage) notify('success', successMessage);
      if (reload) await reload();
      if (onSuccess) onSuccess(result);
      return { success: true, data: result.data, raw: result };
    }

    if (showErrorMessage) notify('danger', result.error);
    if (onFailure) onFailure(result);
    return { success: false, error: result.error, data: result.data, raw: result };
  } finally {
    if (afterFinally) await afterFinally();
  }
}
