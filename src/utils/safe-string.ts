export function safeString(value: unknown, maxLen = 200): string {
  return JSON.stringify(String(value).slice(0, maxLen));
}
