import { describe, it, expect } from 'vitest';
import { createSelection } from '../src/index.js';

describe('createSelection', () => {
  it('adds, removes, toggles, and clears, normalizing ids to strings', () => {
    const s = createSelection();
    s.add(1);
    s.add('2');
    expect(s.toArray().sort()).toEqual(['1', '2']);
    expect(s.has(1)).toBe(true);
    s.remove(1);
    expect(s.has(1)).toBe(false);
    s.toggle(3, true);
    expect(s.has(3)).toBe(true);
    s.toggle(3, false);
    expect(s.has(3)).toBe(false);
    s.clear();
    expect(s.toArray()).toEqual([]);
  });

  it('restricts add() to the selectable set when given one', () => {
    const s = createSelection({ selectableIds: [1, 2] });
    expect(s.canSelect(1)).toBe(true);
    expect(s.canSelect(3)).toBe(false);
    s.add(3);
    expect(s.has(3)).toBe(false);
    s.add(1);
    expect(s.has(1)).toBe(true);
  });

  it('toSet() returns a snapshot, not a live reference', () => {
    const s = createSelection();
    s.add(1);
    const snapshot = s.toSet();
    s.add(2);
    expect(snapshot.has('2')).toBe(false);
  });
});
