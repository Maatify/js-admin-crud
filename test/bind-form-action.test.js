import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bindFormAction } from '../src/index.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
let form;

beforeEach(() => {
  document.body.innerHTML = `
    <form id="f">
      <input name="name" value="Arabic">
      <input name="note" value="">
      <button type="submit">Save</button>
    </form>`;
  form = document.getElementById('f');
});

const submit = async () => {
  form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  await flush();
};

describe('bindFormAction', () => {
  it('builds the payload from the form and calls the action', async () => {
    const action = vi.fn(async () => ({ success: true }));
    bindFormAction(form, { action });
    await submit();
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0][0]).toEqual({ name: 'Arabic', note: '' });
  });

  it('keeps empty fields, so clearing a value in an edit form is sent', async () => {
    const action = vi.fn(async () => ({ success: true }));
    bindFormAction(form, { action });
    await submit();
    expect(action.mock.calls[0][0]).toHaveProperty('note', '');
  });

  it('prevents the browser default submit', async () => {
    const event = new Event('submit', { cancelable: true, bubbles: true });
    bindFormAction(form, { action: async () => ({ success: true }) });
    form.dispatchEvent(event);
    await flush();
    expect(event.defaultPrevented).toBe(true);
  });

  it('disables the submit button while in flight and re-enables it after', async () => {
    let seen = null;
    const btn = form.querySelector('button');
    bindFormAction(form, {
      action: async () => {
        seen = btn.disabled;
        return { success: true };
      },
    });
    await submit();
    expect(seen).toBe(true);
    expect(btn.disabled).toBe(false);
  });

  it('re-enables the button after a thrown error too', async () => {
    const btn = form.querySelector('button');
    bindFormAction(form, { action: async () => { throw new Error('boom'); }, notify: vi.fn() });
    await submit();
    expect(btn.disabled).toBe(false);
  });

  it('ignores a second submit while the first is still running', async () => {
    let resolve;
    const action = vi.fn(() => new Promise((r) => { resolve = r; }));
    bindFormAction(form, { action });
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    expect(action).toHaveBeenCalledTimes(1);
    resolve({ success: true });
  });

  it('calls onSuccess for a successful result', async () => {
    const onSuccess = vi.fn();
    bindFormAction(form, { action: async () => ({ success: true, data: { id: 1 } }), onSuccess });
    await submit();
    expect(onSuccess).toHaveBeenCalledWith({ success: true, data: { id: 1 } }, form);
  });

  it('treats an action that returns nothing as a success', async () => {
    const onSuccess = vi.fn();
    bindFormAction(form, { action: async () => {}, onSuccess });
    await submit();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('calls onFailure, and does not alert, for a returned failure', async () => {
    const onFailure = vi.fn();
    const notify = vi.fn();
    const onSuccess = vi.fn();
    bindFormAction(form, { action: async () => ({ success: false, error: 'nope' }), onFailure, onSuccess, notify });
    await submit();
    expect(onFailure).toHaveBeenCalledWith({ success: false, error: 'nope' }, form);
    expect(onSuccess).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled(); // runMutation already alerted
  });

  it('alerts for a thrown error and does not call onSuccess', async () => {
    const notify = vi.fn();
    const onSuccess = vi.fn();
    bindFormAction(form, { action: async () => { throw new Error('network down'); }, notify, onSuccess });
    await submit();
    expect(notify).toHaveBeenCalledWith('danger', 'network down');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('lets onError replace the default alert', async () => {
    const notify = vi.fn();
    const onError = vi.fn();
    bindFormAction(form, { action: async () => { throw new Error('x'); }, notify, onError });
    await submit();
    expect(onError).toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('uses a custom buildPayload, awaiting an async one', async () => {
    const action = vi.fn(async () => ({ success: true }));
    // f.elements.name, not f.name — the latter is the form's own name property.
    bindFormAction(form, { action, buildPayload: async (f) => ({ name: f.elements.name.value, extra: 1 }) });
    await submit();
    expect(action.mock.calls[0][0]).toEqual({ name: 'Arabic', extra: 1 });
  });

  it('accepts a selector and honours a custom submitSelector', async () => {
    document.body.innerHTML = '<form id="g"><button type="submit" data-save>S</button></form>';
    const g = document.getElementById('g');
    let seen = null;
    bindFormAction('#g', {
      submitSelector: '[data-save]',
      action: async () => { seen = g.querySelector('[data-save]').disabled; return { success: true }; },
    });
    g.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    expect(seen).toBe(true);
  });

  it('unbind() stops the handler', async () => {
    const action = vi.fn(async () => ({ success: true }));
    const unbind = bindFormAction(form, { action });
    unbind();
    await submit();
    expect(action).not.toHaveBeenCalled();
  });

  it('reports a misconfiguration instead of throwing', async () => {
    const notify = vi.fn();
    expect(bindFormAction(null, { action: vi.fn(), notify })).toBeInstanceOf(Function);
    expect(bindFormAction(form, { notify })).toBeInstanceOf(Function);
    expect(notify).toHaveBeenCalledTimes(2);
  });
});
