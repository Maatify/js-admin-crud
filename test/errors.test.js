import { describe, it, expect } from 'vitest';
import { normalizeError, isStepUpRequired, errorMessage } from '../src/index.js';

describe('normalizeError', () => {
  it('handles the unified shape', () => {
    const n = normalizeError({ error: { code: 'NOT_FOUND', message: 'Missing', category: 'CLIENT', retryable: true } });
    expect(n).toMatchObject({ code: 'NOT_FOUND', message: 'Missing', category: 'CLIENT', retryable: true });
  });

  it('flags STEP_UP_REQUIRED in both unified and legacy shapes', () => {
    expect(normalizeError({ error: { code: 'STEP_UP_REQUIRED', meta: { scope: 'otp' } } })).toMatchObject({ isStepUp: true, scope: 'otp' });
    expect(normalizeError({ code: 'STEP_UP_REQUIRED', scope: 'otp' })).toMatchObject({ isStepUp: true, scope: 'otp' });
    expect(isStepUpRequired({ code: 'STEP_UP_REQUIRED' })).toBe(true);
    expect(isStepUpRequired({ error: { code: 'STEP_UP_REQUIRED' } })).toBe(true);
    expect(isStepUpRequired({ code: 'OTHER' })).toBe(false);
  });

  it('handles legacy simple and message shapes', () => {
    expect(normalizeError({ error: 'boom' }).message).toBe('boom');
    expect(normalizeError({ message: 'boom2' }).message).toBe('boom2');
  });

  it('handles the callback-style shape', () => {
    expect(normalizeError({ data: { response: 403, more_info: 'nope' } })).toMatchObject({ code: 'LEGACY_403', message: 'nope' });
  });

  it('handles validation errors and falls back for junk input', () => {
    expect(normalizeError({ errors: { name: 'required' } })).toMatchObject({ code: 'VALIDATION_FAILED', meta: { errors: { name: 'required' } } });
    expect(normalizeError(null).code).toBe('UNKNOWN_ERROR');
    expect(normalizeError('not an object').code).toBe('UNKNOWN_ERROR');
  });
});

describe('errorMessage', () => {
  it('appends field errors when present', () => {
    expect(errorMessage({ errors: { name: 'required' }, message: 'Validation failed' })).toBe('Validation failed (name: required)');
    expect(errorMessage({ error: { code: 'X', message: 'Bad', fields: { email: 'invalid' } } })).toBe('Bad (email: invalid)');
  });

  it('falls back to the default message', () => {
    expect(errorMessage(null)).toBe('An unknown error occurred.');
  });
});
