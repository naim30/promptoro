import { createHash } from 'node:crypto';
import { parse as parseYaml } from 'yaml';
import { validateRaw, suggestKey, type RawToolSpec } from './validate.js';
import type { ToolSpec } from './types.js';

export function parse(yamlText: string): ToolSpec {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText);
  } catch (err) {
    throw new Error(`[promptoro] Invalid YAML: ${(err as Error).message}`);
  }
  const validated = validateRaw(raw);
  return buildSpec(validated, yamlText);
}

export function buildSpec(validated: RawToolSpec, source: string): ToolSpec {
  const hash = createHash('sha256').update(source).digest('hex');
  const fields = Object.freeze(
    Object.fromEntries(
      Object.entries(validated.fields).map(([k, v]) => [k, Object.freeze({ description: v.description })]),
    ),
  );

  const spec: ToolSpec = Object.freeze({
    name: validated.name,
    description: validated.description,
    fields,
    hash,
    field(name: string): string {
      const f = fields[name];
      if (!f) {
        const available = Object.keys(fields);
        const suggestion = suggestKey(name, available);
        const did = suggestion ? ` Did you mean '${suggestion}'?` : '';
        const list = available.length ? available.join(', ') : '(none)';
        throw new Error(
          `[promptoro] No field '${name}' on tool '${validated.name}'.${did} Available: ${list}.`,
        );
      }
      return f.description;
    },
  });

  return spec;
}
