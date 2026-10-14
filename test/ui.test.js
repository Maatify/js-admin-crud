import { describe, it, expect, beforeEach } from 'vitest';
import { createModal, confirm, createLoadingOverlay } from '../src/index.js';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('createModal', () => {
  it('escapes the title but trusts content, and opens/closes into the document', () => {
    const modal = createModal({ title: '<b>x</b>', content: '<p data-mark>hi</p>' });
    modal.open();
    expect(document.body.contains(modal.element)).toBe(true);
    expect(modal.element.querySelector('h3').innerHTML).not.toContain('<b>');
    expect(modal.element.querySelector('[data-mark]')).not.toBeNull();
    modal.close();
    expect(document.body.contains(modal.element)).toBe(false);
  });

  it('closes on backdrop click and on the close button', () => {
    const modal = createModal({ title: 't' });
    modal.open();
    modal.element.querySelector('[data-modal-close]').click();
    expect(document.body.contains(modal.element)).toBe(false);
  });
});

describe('confirm', () => {
  it('escapes title/message and resolves true on OK, false on Cancel', async () => {
    const okPromise = confirm({ title: '<i>t</i>', message: '<i>m</i>' });
    const el = document.body.querySelector('[data-confirm-ok]').closest('div.fixed');
    expect(el.innerHTML).not.toContain('<i>');
    el.querySelector('[data-confirm-ok]').click();
    expect(await okPromise).toBe(true);

    const cancelPromise = confirm({ message: 'x' });
    document.body.querySelector('[data-confirm-cancel]').click();
    expect(await cancelPromise).toBe(false);
  });
});

describe('createLoadingOverlay', () => {
  it('starts hidden, toggles with show/hide, and destroy() removes it', () => {
    const overlay = createLoadingOverlay();
    expect(overlay.element.classList.contains('hidden')).toBe(true);
    overlay.show('Loading…');
    expect(overlay.element.classList.contains('hidden')).toBe(false);
    expect(overlay.element.textContent).toContain('Loading…');
    overlay.hide();
    expect(overlay.element.classList.contains('hidden')).toBe(true);
    overlay.destroy();
    expect(document.body.contains(overlay.element)).toBe(false);
  });
});
