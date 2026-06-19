export function formatError(
  message: string,
  options?: Record<string, unknown>,
): string {
  const lines = [`[promptoro] ${message}`];
  if (options) {
    for (const [key, value] of Object.entries(options)) {
      if (value) {
        lines.push(`  ${key}: ${value}`);
      }
    }
  }
  return lines.join("\n");
}
