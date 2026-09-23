type LogFields = Record<string, string | number | boolean | undefined>;

const SENSITIVE_KEYS = /authorization|cookie|set-cookie|access_token|refresh_token|session_token|password|secret/i;

function sanitizeFields(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (SENSITIVE_KEYS.test(key)) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function logInfo(message: string, fields: LogFields = {}): void {
  const line = Object.entries(sanitizeFields({ message, ...fields }))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(" ");
  console.error(line);
}

export function logError(message: string, fields: LogFields = {}): void {
  logInfo(message, { ...fields, level: "error" });
}
