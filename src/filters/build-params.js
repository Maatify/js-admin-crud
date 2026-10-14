/** Read a form's fields into a plain params object, dropping empty values. */
export function buildParams(form, { cleanEmpty = true } = {}) {
  const data = new FormData(form);
  const params = {};
  for (const [key, value] of data.entries()) {
    if (cleanEmpty && value === '') continue;
    params[key] = value;
  }
  return params;
}
