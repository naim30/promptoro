import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { buildSpec } from './parse.js';
import { validateRaw, suggestKey } from './validate.js';
import type { ToolRegistry, ToolSpec } from './types.js';

const RESERVED = new Set<string>(['get', 'has', 'names']);
const registryCache = new Map<string, ToolRegistry>();

export function registry(dir: string): ToolRegistry;
export function registry<const T extends readonly string[]>(
  dir: string,
  names: T,
): ToolRegistry & Readonly<Record<T[number], ToolSpec>>;
export function registry(dir: string, names?: readonly string[]): ToolRegistry {
  const abs = resolve(dir);
  const cached = registryCache.get(abs);
  if (cached) {
    if (names) assertNames(cached, names, abs);
    return cached;
  }

  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch (err) {
    throw new Error(
      `[promptoro] Cannot read registry directory: ${abs}\n` +
        `          ${(err as Error).message}`,
    );
  }

  const specs = new Map<string, ToolSpec>();

  for (const entry of entries) {
    const ext = extname(entry);
    if (ext !== '.yml' && ext !== '.yaml') continue;
    const base = basename(entry, ext);

    if (RESERVED.has(base)) {
      throw new Error(
        `[promptoro] Tool name '${base}' collides with a registry method (get/has/names). Rename ${join(abs, entry)}.`,
      );
    }

    const filePath = join(abs, entry);
    const text = readFileSync(filePath, 'utf8');

    let raw: unknown;
    try {
      raw = parseYaml(text);
    } catch (err) {
      throw new Error(`[promptoro] Invalid YAML in ${filePath}: ${(err as Error).message}`);
    }

    const validated = validateRaw(raw, filePath);
    if (validated.name !== base) {
      throw new Error(
        `[promptoro] Name mismatch in ${filePath}\n` +
          `          File basename: '${base}' — name: '${validated.name}' — fix one of them.`,
      );
    }
    specs.set(base, buildSpec(validated, text));
  }

  const methods: ToolRegistry = {
    get(name: string): ToolSpec {
      const s = specs.get(name);
      if (!s) {
        const available = [...specs.keys()];
        const suggestion = suggestKey(name, available);
        const did = suggestion ? ` Did you mean '${suggestion}'?` : '';
        const list = available.length ? available.join(', ') : '(none)';
        throw new Error(`[promptoro] No tool '${name}' in registry ${abs}.${did} Available: ${list}.`);
      }
      return s;
    },
    has(name: string): boolean {
      return specs.has(name);
    },
    names(): readonly string[] {
      return [...specs.keys()];
    },
  };

  const obj = Object.assign({}, methods, Object.fromEntries(specs)) as ToolRegistry;
  Object.freeze(obj);

  if (names) assertNames(obj, names, abs);

  registryCache.set(abs, obj);
  return obj;
}

export function clearRegistryCache(): void {
  registryCache.clear();
}

function assertNames(reg: ToolRegistry, names: readonly string[], abs: string): void {
  for (const expected of names) {
    if (!reg.has(expected)) {
      const available = reg.names();
      const list = available.length ? available.join(', ') : '(none)';
      throw new Error(
        `[promptoro] Expected tool '${expected}' in ${abs}, but no matching YAML found. Available: ${list}.`,
      );
    }
  }
}
