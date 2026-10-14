/**
 * Normalize an API error body, regardless of which shape the endpoint used:
 *  - Unified: { error: { code, message, category, meta, retryable } }
 *  - Legacy step-up: { code: 'STEP_UP_REQUIRED', scope }
 *  - Legacy simple: { error: '...' } or { message: '...' }
 *  - Callback-style: { data: { response: <int>, more_info } }
 *  - Validation: { errors: { field: message } }
 */
const DEFAULT_MESSAGE = 'An unknown error occurred.';

export function normalizeError(data) {
  const normalized = {
    message: DEFAULT_MESSAGE,
    code: 'UNKNOWN_ERROR',
    category: 'SYSTEM',
    meta: {},
    retryable: false,
    isStepUp: false,
    raw: data,
  };

  if (!data || typeof data !== 'object') return normalized;

  if (data.error && typeof data.error === 'object' && data.error.code) {
    const e = data.error;
    normalized.message = e.message || normalized.message;
    normalized.code = e.code || normalized.code;
    normalized.category = e.category || normalized.category;
    normalized.meta = e.meta || {};
    normalized.retryable = !!e.retryable;
    if (e.code === 'STEP_UP_REQUIRED') {
      normalized.isStepUp = true;
      if (e.meta && e.meta.scope) normalized.scope = e.meta.scope;
    }
    return normalized;
  }

  if (data.code === 'STEP_UP_REQUIRED') {
    normalized.message = 'Additional authentication required.';
    normalized.code = 'STEP_UP_REQUIRED';
    normalized.category = 'AUTHENTICATION';
    normalized.isStepUp = true;
    normalized.scope = data.scope;
    return normalized;
  }

  if (data.data && typeof data.data.response === 'number') {
    normalized.code = `LEGACY_${data.data.response}`;
    normalized.message = data.data.more_info || data.data.var || `Legacy Error ${data.data.response}`;
    return normalized;
  }

  if (typeof data.error === 'string') {
    normalized.message = data.error;
  } else if (typeof data.message === 'string') {
    normalized.message = data.message;
  }

  // Field-level validation errors can accompany either message source above,
  // so this merges in rather than being an exclusive branch.
  if (data.errors && typeof data.errors === 'object') {
    normalized.code = 'VALIDATION_FAILED';
    normalized.category = 'VALIDATION';
    normalized.meta = { ...normalized.meta, errors: data.errors };
    if (normalized.message === DEFAULT_MESSAGE) normalized.message = 'Validation failed';
  }

  return normalized;
}

export function isStepUpRequired(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.code === 'STEP_UP_REQUIRED') return true;
  if (data.error && data.error.code === 'STEP_UP_REQUIRED') return true;
  return false;
}

/** User-facing message, with field errors appended when present. */
export function errorMessage(data) {
  const normalized = normalizeError(data);
  const fields = (normalized.meta && normalized.meta.errors) || (data && data.error && data.error.fields);
  if (fields) {
    const fieldErrors = Object.entries(fields).map(([field, msg]) => `${field}: ${msg}`).join(', ');
    return `${normalized.message} (${fieldErrors})`;
  }
  return normalized.message;
}
