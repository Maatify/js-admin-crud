import { describe, it, expect } from 'vitest';
import { escapeHtml, html, raw, safeUrl } from '../src/index.js';

describe('dom', () => {
  it('escapes markup and quotes', () => {
    expect(escapeHtml(`<img src=x onerror="a('b')">&`)).toBe('&lt;img src=x onerror=&quot;a(&#39;b&#39;)&quot;&gt;&amp;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });
  it('html`` escapes interpolations but not raw()', () => {
    expect(String(html`<b>${'<i>'}</b>${raw('<u>x</u>')}`)).toBe('<b>&lt;i&gt;</b><u>x</u>');
    expect(String(html`${[html`<a>${'<'}</a>`, 'x<']}`)).toBe('<a>&lt;</a>x&lt;');
  });
  it('safeUrl rejects javascript: and protocol tricks', () => {
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl(' JaVaScRiPt:alert(1)')).toBe('');
    expect(safeUrl('data:text/html;base64,AAA')).toBe('');
    expect(safeUrl('https://x.test/a.png')).toBe('https://x.test/a.png');
    expect(safeUrl('/img/a.png')).toBe('/img/a.png');
  });
});
