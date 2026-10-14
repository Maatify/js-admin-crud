import { describe, it, expect, vi } from 'vitest';
import { createLogger } from '../src/index.js';

describe('createLogger', () => {
  it('is silent by default (no console calls at any level)', () => {
    const con = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() };
    const log = createLogger({ console: con });
    log.error('e');
    log.warn('w');
    log.info('i');
    log.debug('d');
    expect(con.error).not.toHaveBeenCalled();
    expect(con.warn).not.toHaveBeenCalled();
    expect(con.info).not.toHaveBeenCalled();
    expect(con.log).not.toHaveBeenCalled();
  });

  it('setLevel reveals only levels at or above it', () => {
    const con = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), log: vi.fn() };
    const log = createLogger({ console: con });
    log.setLevel('warn');
    log.error('e');
    log.warn('w');
    log.info('i');
    log.debug('d');
    expect(con.error).toHaveBeenCalledWith('e');
    expect(con.warn).toHaveBeenCalledWith('w');
    expect(con.info).not.toHaveBeenCalled();
    expect(con.log).not.toHaveBeenCalled();
  });

  it('prefixes messages when configured', () => {
    const con = { error: vi.fn() };
    const log = createLogger({ level: 'error', prefix: '[x]', console: con });
    log.error('boom');
    expect(con.error).toHaveBeenCalledWith('[x]', 'boom');
  });
});
