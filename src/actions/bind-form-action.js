import { buildParams } from '../filters/build-params.js';
import { showAlert } from '../ui/alerts.js';

/**
 * Binds a create/edit form's submit to a single action call, collapsing the
 * block every modal repeated: preventDefault, disable the submit button, build
 * the payload, call create-or-update, close on success, re-enable and alert on
 * failure.
 *
 * It deliberately does NOT alert when the action *returns* a failure —
 * runMutation()/page.actions.* already notify in that case, and alerting here
 * too would show the same error twice. It only alerts for a thrown error,
 * which is the case nothing else covers.
 *
 * options:
 *  - action(payload, form) => result — required; the mutation to run
 *  - buildPayload(form) => payload — defaults to every field of the form,
 *    including empty ones (an edit form clearing a field must send '')
 *  - onSuccess(result, form) — e.g. () => modal.close()
 *  - onFailure(result, form) — only for a returned failure, not a throw
 *  - onError(error, form) — a thrown error; suppresses the default alert
 *  - submitSelector ('button[type="submit"]'), notify, document
 *
 * Returns an unbind function, like bindFilters().
 */
export function bindFormAction(form, options = {}) {
  const doc = options.document || document;
  const formEl = typeof form === 'string' ? doc.querySelector(form) : form;
  const {
    action,
    buildPayload,
    onSuccess,
    onFailure,
    onError,
    submitSelector = 'button[type="submit"]',
    notify = (type, msg) => showAlert(type, msg),
  } = options;

  if (!formEl || typeof action !== 'function') {
    notify('danger', 'bindFormAction: a form element and an action function are required.');
    return () => {};
  }

  let busy = false;

  async function onSubmit(event) {
    event.preventDefault();
    if (busy) return; // a double-click must not fire the mutation twice
    busy = true;
    const button = submitSelector ? formEl.querySelector(submitSelector) : null;
    if (button) button.disabled = true;
    try {
      const payload = typeof buildPayload === 'function' ? await buildPayload(formEl) : buildParams(formEl, { cleanEmpty: false });
      const result = await action(payload, formEl);
      // An action that reports nothing has succeeded by not throwing; only an
      // explicit { success: false } (runMutation's shape) counts as a failure.
      if (result && result.success === false) {
        if (onFailure) await onFailure(result, formEl);
        return result;
      }
      if (onSuccess) await onSuccess(result, formEl);
      return result;
    } catch (error) {
      if (onError) await onError(error, formEl);
      else notify('danger', error?.message || 'Something went wrong.');
      return { success: false, error: error?.message || String(error) };
    } finally {
      busy = false;
      if (button) button.disabled = false;
    }
  }

  formEl.addEventListener('submit', onSubmit);
  return function unbind() {
    formEl.removeEventListener('submit', onSubmit);
  };
}
