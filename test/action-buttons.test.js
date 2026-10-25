import { describe, it, expect } from 'vitest';
import { actionButton, statusBadge, html, SafeHtml } from '../src/index.js';

describe('actionButton', () => {
  it('builds a delegated row-action button', () => {
    expect(String(actionButton({ action: 'edit', id: 7, label: 'Edit' }))).toBe(
      '<button type="button" data-action="edit" data-id="7" class="text-xs px-3 py-1.5 border rounded-md">Edit</button>',
    );
  });

  it('escapes the label and every attribute value', () => {
    const out = String(actionButton({ action: 'del', id: '1" onmouseover="alert(1)', label: '<img src=x onerror=alert(1)>' }));
    expect(out).toContain('data-id="1&quot; onmouseover=&quot;alert(1)"');
    expect(out).toContain('>&lt;img src=x onerror=alert(1)&gt;<');
    expect(out).not.toContain('onmouseover="alert');
    expect(out).not.toContain('<img');
  });

  it('maps camelCase data keys to kebab-case attributes and drops empty ones', () => {
    const out = String(actionButton({ action: 'sort', id: 1, label: 'Sort', data: { sortOrder: 3, missing: null, absent: undefined } }));
    expect(out).toContain('data-sort-order="3"');
    expect(out).not.toContain('missing');
    expect(out).not.toContain('absent');
  });

  it('rejects data names and types that could break out of the markup', () => {
    expect(() => actionButton({ action: 'x', data: { 'a"onclick="b': 1 } })).toThrow(TypeError);
    expect(() => actionButton({ action: 'x', type: 'button" onfocus="alert(1)' })).toThrow(TypeError);
  });

  it('supports title, disabled and a custom class', () => {
    const out = String(actionButton({ action: 'del', id: 2, label: 'Delete', className: 'text-red-600', title: 'Remove', disabled: true }));
    expect(out).toContain('title="Remove"');
    expect(out).toContain('class="text-red-600"');
    expect(out).toMatch(/ disabled>/);
  });

  it('omits data-action and data-id when not given', () => {
    expect(String(actionButton({ label: 'Plain' }))).toBe('<button type="button" class="text-xs px-3 py-1.5 border rounded-md">Plain</button>');
  });

  it('returns SafeHtml so it composes in html`` without double-escaping', () => {
    const btn = actionButton({ action: 'edit', id: 1, label: 'Edit' });
    expect(btn).toBeInstanceOf(SafeHtml);
    expect(String(html`<div>${btn}</div>`)).toBe(`<div>${String(btn)}</div>`);
  });
});

describe('statusBadge', () => {
  it('renders an active toggle carrying the value to flip to', () => {
    const out = String(statusBadge({ active: true, id: 3 }));
    expect(out).toContain('data-action="toggle"');
    expect(out).toContain('data-id="3"');
    expect(out).toContain('data-next="0"');
    expect(out).toContain('>Active<');
  });

  it('flips label and next value when inactive', () => {
    const out = String(statusBadge({ active: 0, id: 3 }));
    expect(out).toContain('data-next="1"');
    expect(out).toContain('>Inactive<');
  });

  it('renders a non-interactive span when action is null', () => {
    const out = String(statusBadge({ active: true, id: 3, action: null }));
    expect(out).toMatch(/^<span /);
    expect(out).not.toContain('data-action');
    expect(out).not.toContain('data-next');
  });

  it('escapes custom labels', () => {
    expect(String(statusBadge({ active: true, id: 1, onLabel: '<b>on</b>' }))).toContain('&lt;b&gt;on&lt;/b&gt;');
  });

  it('honours custom labels, action and extra data', () => {
    const out = String(statusBadge({ active: false, id: 9, offLabel: 'Off', action: 'set-active', data: { scope: 'row' } }));
    expect(out).toContain('data-action="set-active"');
    expect(out).toContain('data-scope="row"');
    expect(out).toContain('>Off<');
  });
});
