const LEVELS = { silent: 0, error: 1, warn: 2, info: 3, debug: 4 };

/** Logger with levels, silent by default (defect: debug logging left on in the legacy kernel). */
export function createLogger({ level = 'silent', prefix = '', console: con = console } = {}) {
  let current = LEVELS[level] ?? LEVELS.silent;
  const emit = (lvl, args) => {
    if (LEVELS[lvl] > current) return;
    const method = lvl === 'debug' ? 'log' : lvl;
    con[method](...(prefix ? [prefix, ...args] : args));
  };
  return {
    setLevel: (next) => { current = LEVELS[next] ?? current; },
    error: (...args) => emit('error', args),
    warn: (...args) => emit('warn', args),
    info: (...args) => emit('info', args),
    debug: (...args) => emit('debug', args),
  };
}

/** Shared default instance; stays silent until a caller opts in with setLevel(). */
export const logger = createLogger();
