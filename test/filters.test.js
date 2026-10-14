import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildParams, bindFilters } from '../src/index.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('buildParams', () => {
  it('reads form fields and drops empty values by default', () => {
    document.body.innerHTML = `<form id="f"><input name="q" value="hi"><input name="empty" value=""><select name="status"><option value="active" selected>Active</option></select></form>`;
    const params = buildParams(document.getElementById('f'));
    expect(params).toEqual({ q: 'hi', status: 'active' });
  });

  it('keeps empty values when cleanEmpty is false', () => {
    document.body.innerHTML = `<form id="f"><input name="q" value=""></form>`;
    expect(buildParams(document.getElementById('f'), { cleanEmpty: false })).toEqual({ q: '' });
  });
});

describe('bindFilters', () => {
  function setup() {
    document.body.innerHTML = `
      <form id="filters"><select name="status"><option value="active">Active</option><option value="inactive">Inactive</option></select></form>
      <input id="search" name="q">`;
    return { form: document.getElementById('filters'), search: document.getElementById('search') };
  }

  it('applies immediately when a select inside the form changes', () => {
    const { form } = setup();
    const onApply = vi.fn();
    bindFilters({ form, onApply });
    form.querySelector('select').value = 'inactive';
    form.querySelector('select').dispatchEvent(new Event('change', { bubbles: true }));
    expect(onApply).toHaveBeenCalledWith({ status: 'inactive' });
  });

  it('applies on Enter from a standalone search box outside the form', () => {
    const { form, search } = setup();
    const onApply = vi.fn();
    bindFilters({ form, search, onApply });
    search.value = 'hello';
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(onApply).toHaveBeenCalledWith({ status: 'active', q: 'hello' });
  });

  it('respects data-auto-filter="off"', () => {
    const { form } = setup();
    form.querySelector('select').setAttribute('data-auto-filter', 'off');
    const onApply = vi.fn();
    bindFilters({ form, onApply });
    form.querySelector('select').dispatchEvent(new Event('change', { bubbles: true }));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('unbind() removes the listeners', () => {
    const { form } = setup();
    const onApply = vi.fn();
    const unbind = bindFilters({ form, onApply });
    unbind();
    form.querySelector('select').dispatchEvent(new Event('change', { bubbles: true }));
    expect(onApply).not.toHaveBeenCalled();
  });
});
