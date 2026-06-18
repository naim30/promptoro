export interface RawToolSpec {
  name: string;
  description: string;
  fields: Record<string, { description: string }>;
}

export function validateRaw(raw: unknown, source?: string): RawToolSpec {
  const where = source ? ` in ${source}` : '';

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error(`[promptoro] YAML must be an object at the root${where}.`);
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.name !== 'string' || !obj.name.trim()) {
    throw new Error(
      `[promptoro] Missing or invalid 'name' (string)${where}. Required: name, description, fields.`,
    );
  }
  if (typeof obj.description !== 'string') {
    throw new Error(
      `[promptoro] Missing or invalid 'description' (string)${where}. Required: name, description, fields.`,
    );
  }
  if (!obj.fields || typeof obj.fields !== 'object' || Array.isArray(obj.fields)) {
    throw new Error(
      `[promptoro] Missing or invalid 'fields' (object)${where}. Required: name, description, fields.`,
    );
  }

  const fieldsIn = obj.fields as Record<string, unknown>;
  const fieldsOut: Record<string, { description: string }> = {};

  for (const [key, value] of Object.entries(fieldsIn)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(
        `[promptoro] Field '${key}'${where} must be an object with a 'description' string.`,
      );
    }
    const v = value as Record<string, unknown>;
    if (typeof v.description !== 'string') {
      throw new Error(
        `[promptoro] Field '${key}'${where} is missing 'description' (string).`,
      );
    }
    fieldsOut[key] = { description: v.description };
  }

  return {
    name: obj.name.trim(),
    description: obj.description,
    fields: fieldsOut,
  };
}

export function suggestKey(input: string, candidates: string[]): string | undefined {
  if (candidates.length === 0) return undefined;
  let best: string | undefined;
  let bestDist = Infinity;
  for (const c of candidates) {
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
