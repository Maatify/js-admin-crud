import { describe, it, expect } from 'vitest';
import { toCsv, toHtmlTable, neutralizeFormula } from '../src/index.js';

describe('export', () => {
  it('neutralizes spreadsheet formulas', () => {
    for (const s of ['=1+1', '+SUM(A1)', '-2+3', '@cmd', '\tx']) expect(neutralizeFormula(s)).toBe(`'${s}`);
    expect(neutralizeFormula('hello')).toBe('hello');
  });
  it('csv quotes, doubles quotes and guards formulas; keeps numbers', () => {
    const csv = toCsv(['Name', 'N'], ['name', 'n'], [{ name: '=HYPERLINK("x")', n: -5 }, { name: 'a"b', n: null }]);
    expect(csv).toBe('"Name","N"\n"\'=HYPERLINK(""x"")",-5\n"a""b",');
  });
  it('html export escapes cells and headers', () => {
    const out = toHtmlTable(['<h>'], ['v'], [{ v: '<script>x</script>' }]);
    expect(out).not.toContain('<script>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('&lt;h&gt;');
  });
});
