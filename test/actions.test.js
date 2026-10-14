import { describe, it, expect, vi } from 'vitest';
import { runMutation, toggleStatus } from '../src/index.js';

const okHttp = (data = { id: 1 }) => ({ request: vi.fn(async () => ({ success: true, data, status: 200 })) });
const failHttp = (error = 'nope') => ({ request: vi.fn(async () => ({ success: false, error, status: 400 })) });

describe('runMutation', () => {
  it('calls http, notifies success, reloads, and calls onSuccess', async () => {
    const http = okHttp();
    const notify = vi.fn();
    const reload = vi.fn(async () => {});
    const onSuccess = vi.fn();
    const result = await runMutation({ http, endpoint: 'x', successMessage: 'Saved', notify, reload, onSuccess });
    expect(result.success).toBe(true);
    expect(notify).toHaveBeenCalledWith('success', 'Saved');
    expect(reload).toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalled();
  });

  it('notifies failure and calls onFailure when the http call fails', async () => {
    const http = failHttp('Invalid');
    const notify = vi.fn();
    const onFailure = vi.fn();
    const result = await runMutation({ http, endpoint: 'x', notify, onFailure });
    expect(result).toEqual({ success: false, error: 'Invalid', data: undefined, raw: expect.any(Object) });
    expect(notify).toHaveBeenCalledWith('danger', 'Invalid');
    expect(onFailure).toHaveBeenCalled();
  });

  it('skips the http call when confirm resolves false', async () => {
    const http = okHttp();
    const result = await runMutation({ http, endpoint: 'x', confirmMessage: 'Sure?', confirm: async () => false });
    expect(result).toEqual({ success: false, cancelled: true, operation: 'Mutation' });
    expect(http.request).not.toHaveBeenCalled();
  });

  it('proceeds when confirm resolves true', async () => {
    const http = okHttp();
    const result = await runMutation({ http, endpoint: 'x', confirmMessage: 'Sure?', confirm: async () => true });
    expect(result.success).toBe(true);
    expect(http.request).toHaveBeenCalled();
  });

  it('always calls afterFinally, even when cancelled', async () => {
    const afterFinally = vi.fn();
    await runMutation({ http: okHttp(), endpoint: 'x', confirm: async () => false, afterFinally });
    expect(afterFinally).toHaveBeenCalledWith(expect.objectContaining({ cancelled: true }));
    afterFinally.mockClear();
    await runMutation({ http: okHttp(), endpoint: 'x', afterFinally });
    expect(afterFinally).toHaveBeenCalled();
  });
});

describe('toggleStatus', () => {
  it('builds the id/active payload and delegates to runMutation', async () => {
    const http = okHttp();
    await toggleStatus({ http, endpoint: 'languages/set-active', id: 5, active: false });
    expect(http.request).toHaveBeenCalledWith('languages/set-active', expect.objectContaining({ payload: { id: 5, active: false } }));
  });

  it('supports custom id/active field names', async () => {
    const http = okHttp();
    await toggleStatus({ http, endpoint: 'x', id: 7, active: true, idField: 'language_id', activeField: 'is_active' });
    expect(http.request).toHaveBeenCalledWith('x', expect.objectContaining({ payload: { language_id: 7, is_active: true } }));
  });
});
