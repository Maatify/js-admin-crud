import { describe, it, expect, vi, beforeEach } from 'vitest';
import { openSortModal } from '../src/index.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('openSortModal', () => {
  it('saves the new value through http and resolves with the mutation result', async () => {
    const http = { request: vi.fn(async () => ({ success: true, data: null, status: 200 })) };
    const reload = vi.fn(async () => {});
    const promise = openSortModal({ http, endpoint: 'languages/sort', id: 4, currentValue: 2, reload });

    const input = document.body.querySelector('input[name="sort_order"]');
    expect(input.value).toBe('2');
    input.value = '9';
    document.body.querySelector('[data-sort-form]').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    const result = await promise;
    expect(result.success).toBe(true);
    expect(http.request).toHaveBeenCalledWith('languages/sort', expect.objectContaining({ payload: { id: 4, sort_order: 9 } }));
    expect(reload).toHaveBeenCalled();
    expect(document.body.querySelector('[data-sort-form]')).toBeNull();
  });

  it('resolves cancelled when dismissed without saving', async () => {
    const http = { request: vi.fn() };
    const promise = openSortModal({ http, endpoint: 'x', id: 1 });
    document.body.querySelector('[data-cancel]').click();
    expect(await promise).toEqual({ success: false, cancelled: true });
    expect(http.request).not.toHaveBeenCalled();
  });
});
