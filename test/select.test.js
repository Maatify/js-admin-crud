import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSelect, defaultSelectClasses } from '../src/index.js';

const DATA = [
  { value: 1, label: 'English', search: 'en' },
  { value: 2, label: 'Arabic', search: 'ar' },
  { value: 3, label: 'French', search: 'fr' },
];

/** The markup the kernel's templates already ship, for the enhance path. */
const KERNEL_MARKUP = `
  <div class="js-select-box"><input class="js-select-input"><span class="js-arrow"></span></div>
  <div class="js-dropdown hidden"><input class="js-search-input"><ul class="js-select-list"></ul></div>`;

let host;
beforeEach(() => {
  document.body.innerHTML = '<div id="s"></div>';
  host = document.getElementById('s');
});

const options = () => [...document.querySelectorAll('.js-select-list li')];
const labels = () => options().map((li) => li.querySelector('span')?.textContent ?? li.textContent);

describe('createSelect — building its own markup', () => {
  it('builds the widget into an empty container', () => {
    const select = createSelect('#s', { data: DATA });
    expect(select).not.toBe(null);
    expect(host.querySelector('.js-select-box')).not.toBe(null);
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(true);
    expect(labels()).toEqual(['English', 'Arabic', 'French']);
  });

  it('returns null for a container that does not exist', () => {
    expect(createSelect('#nope', { data: DATA })).toBe(null);
  });

  it('omits the search box when searchable is false', () => {
    createSelect('#s', { data: DATA, searchable: false });
    expect(host.querySelector('.js-search-input')).toBe(null);
  });

  it('marks up the combobox for assistive tech', () => {
    createSelect('#s', { data: DATA });
    const box = host.querySelector('.js-select-box');
    expect(box.getAttribute('role')).toBe('combobox');
    expect(box.getAttribute('aria-expanded')).toBe('false');
    expect(host.querySelector('.js-select-list').getAttribute('role')).toBe('listbox');
  });
});

describe('createSelect — enhancing existing markup', () => {
  beforeEach(() => { host.innerHTML = KERNEL_MARKUP; });

  it('reuses the kernel hooks instead of rebuilding them', () => {
    const box = host.querySelector('.js-select-box');
    createSelect('#s', { data: DATA });
    expect(host.querySelector('.js-select-box')).toBe(box);
    expect(labels()).toEqual(['English', 'Arabic', 'French']);
  });

  it('opens and closes on box clicks, toggling aria-expanded', () => {
    createSelect('#s', { data: DATA });
    const box = host.querySelector('.js-select-box');
    box.click();
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(false);
    expect(box.getAttribute('aria-expanded')).toBe('true');
    box.click();
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(true);
  });
});

describe('selection', () => {
  it('selects on click, fills the input and reports the value', () => {
    const onChange = vi.fn();
    const select = createSelect('#s', { data: DATA, onChange });
    host.querySelector('.js-select-box').click();
    options()[1].click();
    expect(select.getValue()).toBe(2);
    expect(select.getSelected().label).toBe('Arabic');
    expect(host.querySelector('.js-select-input').value).toBe('Arabic');
    expect(host.dataset.value).toBe('2');
    expect(onChange).toHaveBeenCalledWith(DATA[1]);
  });

  it('closes the dropdown after a selection', () => {
    const select = createSelect('#s', { data: DATA });
    select.open();
    options()[0].click();
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(true);
  });

  it('fires a change event on the hidden input, as the kernel did', () => {
    createSelect('#s', { data: DATA });
    const onInputChange = vi.fn();
    host.querySelector('.js-select-input').addEventListener('change', onInputChange);
    host.querySelector('.js-select-box').click();
    options()[0].click();
    expect(onInputChange).toHaveBeenCalled();
  });

  it('marks the selected option with aria-selected and a check', () => {
    const select = createSelect('#s', { data: DATA });
    select.setValue(3);
    select.open();
    const marked = options().filter((li) => li.getAttribute('aria-selected') === 'true');
    expect(marked).toHaveLength(1);
    expect(marked[0].textContent).toContain('French');
  });

  it('applies an initial value without calling onChange', () => {
    const onChange = vi.fn();
    const select = createSelect('#s', { data: DATA, value: 2, onChange });
    expect(select.getValue()).toBe(2);
    expect(host.querySelector('.js-select-input').value).toBe('Arabic');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('matches an initial value loosely, so "2" finds 2', () => {
    const select = createSelect('#s', { data: DATA, value: '2' });
    expect(select.getValue()).toBe(2);
  });

  it('clears the selection when setValue gets an unknown value', () => {
    const select = createSelect('#s', { data: DATA, value: 1 });
    select.setValue(999);
    expect(select.getValue()).toBe(null);
    expect(host.querySelector('.js-select-input').value).toBe('');
    expect(host.dataset.value).toBe('');
  });
});

describe('search', () => {
  it('filters by label', () => {
    createSelect('#s', { data: DATA });
    const search = host.querySelector('.js-search-input');
    search.value = 'ara';
    search.dispatchEvent(new window.Event('input'));
    expect(labels()).toEqual(['Arabic']);
  });

  it('also matches the extra search field, so a code finds its row', () => {
    createSelect('#s', { data: DATA });
    const search = host.querySelector('.js-search-input');
    search.value = 'fr';
    search.dispatchEvent(new window.Event('input'));
    expect(labels()).toEqual(['French']);
  });

  it('shows the empty message when nothing matches', () => {
    createSelect('#s', { data: DATA });
    const search = host.querySelector('.js-search-input');
    search.value = 'zzz';
    search.dispatchEvent(new window.Event('input'));
    expect(options()).toHaveLength(1);
    expect(options()[0].textContent).toBe('No results found');
  });
});

describe('escaping', () => {
  it('escapes a hostile label instead of rendering it', () => {
    createSelect('#s', { data: [{ value: 1, label: '<img src=x onerror=alert(1)>' }] });
    expect(host.querySelector('.js-select-list').innerHTML).not.toContain('<img');
    expect(host.querySelector('.js-select-list img')).toBe(null);
    expect(options()[0].textContent).toContain('<img src=x onerror=alert(1)>');
  });

  it('escapes a hostile value in the data attribute', () => {
    createSelect('#s', { data: [{ value: '" onmouseover="alert(1)', label: 'x' }] });
    expect(host.querySelector('.js-select-list li').dataset.value).toBe('" onmouseover="alert(1)');
  });
});

describe('setData', () => {
  it('replaces the options', () => {
    const select = createSelect('#s', { data: DATA });
    select.setData([{ value: 9, label: 'German' }]);
    expect(labels()).toEqual(['German']);
  });

  it('keeps a selection that still exists', () => {
    const select = createSelect('#s', { data: DATA, value: 2 });
    select.setData([{ value: 2, label: 'Arabic' }, { value: 4, label: 'Urdu' }]);
    expect(select.getValue()).toBe(2);
  });

  it('clears a selection that no longer exists', () => {
    const select = createSelect('#s', { data: DATA, value: 2 });
    select.setData([{ value: 4, label: 'Urdu' }]);
    expect(select.getValue()).toBe(null);
    expect(host.querySelector('.js-select-input').value).toBe('');
  });
});

describe('closing and teardown', () => {
  it('closes on a click outside', () => {
    const select = createSelect('#s', { data: DATA });
    select.open();
    document.body.click();
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(true);
  });

  it('stays open for a click inside', () => {
    const select = createSelect('#s', { data: DATA });
    select.open();
    host.querySelector('.js-search-input').click();
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(false);
  });

  it('closes on Escape', () => {
    const select = createSelect('#s', { data: DATA });
    select.open();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(true);
  });

  it('opens from the keyboard', () => {
    createSelect('#s', { data: DATA });
    host.querySelector('.js-select-box').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(false);
  });

  it('destroy() removes the document listeners too, unlike the original', () => {
    const select = createSelect('#s', { data: DATA });
    select.open();
    select.destroy();
    const box = host.querySelector('.js-select-box');
    box.click();
    expect(host.querySelector('.js-dropdown').classList.contains('hidden')).toBe(true);
  });
});

describe('classes', () => {
  it('uses the defaults when none are given', () => {
    createSelect('#s', { data: DATA });
    expect(host.querySelector('.js-select-box').className).toContain(defaultSelectClasses.boxClosed);
  });

  it('overrides only the slots it is given', () => {
    createSelect('#s', { data: DATA, classes: { option: 'my-option' } });
    expect(options()[0].className).toBe('my-option');
    expect(host.querySelector('.js-select-box').className).toContain(defaultSelectClasses.box);
  });

  it('swaps the open and closed box classes as it toggles', () => {
    const select = createSelect('#s', { data: DATA, classes: { boxOpen: 'is-open', boxClosed: 'is-closed' } });
    const box = host.querySelector('.js-select-box');
    expect(box.classList.contains('is-closed')).toBe(true);
    select.open();
    expect(box.classList.contains('is-open')).toBe(true);
    expect(box.classList.contains('is-closed')).toBe(false);
  });
});
