import { relative } from 'node:path';

export function safeName(s: unknown, maxLen = 200): string {
  return JSON.stringify(String(s).slice(0, maxLen));
}

export function pathFor(p: string): string {
  if (process.env.PROMPTORO_REDACT_PATHS) {
    try {
      const rel = relative(process.cwd(), p);
      return rel || p;
    } catch {
      return p;
    }
  }
  return p;
}

export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Object.isFrozen(obj)) return obj;
  Object.freeze(obj);
  for (const v of Object.values(obj as Record<string, unknown>)) {
    deepFreeze(v);
  }
  return obj;
}

export function suggestKey(input: string, candidates: string[]): string | undefined {
  if (candidates.length === 0) return undefined;
  let best: string | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
    const lenDiff = Math.abs(input.length - c.length);
    if (lenDiff >= bestDist) continue;
    const d = levenshtein(input, c);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  const longest = Math.max(input.length, best?.length ?? 0);
  if (best && bestDist <= Math.max(2, Math.floor(longest / 2))) {
    return best;
  }
  return undefined;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr: number[] = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j] ?? 0;
  }
  return curr[b.length] ?? 0;
}
