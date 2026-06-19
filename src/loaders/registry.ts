import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname, isAbsolute, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { deepFreeze, pathFor, safeName, suggestKey } from '../core/utils.js';
import { runValidator, type Validator } from '../core/validator.js';
import { YAML_OPTIONS } from '../core/yaml.js';
import type { Registry } from '../core/types.js';

export interface RegistryOptions<T = unknown> {
  schema?: Validator<T>;
  names?: readonly string[];
}

const RESERVED = new Set<string>([
  'get', 'has', 'names',
  '__proto__', 'constructor', 'prototype',
  'toString', 'hasOwnProperty', 'isPrototypeOf',
  'propertyIsEnumerable', 'valueOf', 'toLocaleString',
]);

interface RawInternals {
  abs: string;
  rawSpecs: Map<string, unknown>;
}

const rawInternalsCache = new Map<string, RawInternals>();
const plainRegistryCache = new Map<string, Registry<unknown>>();

export function registry<T = unknown>(
  dir: string,
  options?: RegistryOptions<T>,
): Registry<T> {
  if (typeof dir !== 'string' || dir.length === 0 || !isAbsolute(dir)) {
    throw new Error(`[promptoro] registry() expects an absolute path. Got: ${safeName(dir)}`);
  }
  const abs = resolve(dir);
  const internals = getOrLoadInternals(abs);

  if (options?.names) {
    assertNames(internals.rawSpecs, options.names, abs);
  }

  // No schema and no names → return cached registry instance for identity stability.
  if (!options?.schema && !options?.names) {
    const cached = plainRegistryCache.get(abs);
    if (cached) return cached as Registry<T>;
  }

  const schema = options?.schema;
  const entries = new Map<string, T>();
  for (const [name, raw] of internals.rawSpecs) {
    entries.set(name, schema ? (deepFreeze(runValidator(raw, schema, join(abs, `${name}.yml`))) as T) : (raw as T));
  }

  const methods: Registry<T> = {
    get(name: string): T {
      if (!entries.has(name)) {
        const available = [...entries.keys()];
        const suggestion = suggestKey(name, available);
        const did = suggestion ? ` Did you mean ${safeName(suggestion)}?` : '';
        const list = available.length ? available.map((k) => safeName(k)).join(', ') : '(none)';
        throw new Error(
          `[promptoro] No entry ${safeName(name)} in registry ${pathFor(abs)}.${did} Available: ${list}.`,
        );
      }
      return entries.get(name) as T;
    },
    has(name: string): boolean {
      return entries.has(name);
    },
    names(): readonly string[] {
      return [...entries.keys()];
    },
  };

  const obj = Object.assign({}, methods, Object.fromEntries(entries)) as Registry<T>;
  Object.freeze(obj);

  if (!options?.schema && !options?.names) {
    plainRegistryCache.set(abs, obj as Registry<unknown>);
  }

  return obj;
}

export function clearRegistryCache(): void {
  rawInternalsCache.clear();
  plainRegistryCache.clear();
}

function getOrLoadInternals(abs: string): RawInternals {
  const cached = rawInternalsCache.get(abs);
  if (cached) return cached;

  let entries: string[];
  try {
    entries = readdirSync(abs);
  } catch (err) {
    throw new Error(
      `[promptoro] Cannot read registry directory: ${pathFor(abs)}\n` +
        `          ${(err as Error).message}`,
    );
  }

  const rawSpecs = new Map<string, unknown>();

  for (const entry of entries) {
    const ext = extname(entry);
    if (ext !== '.yml' && ext !== '.yaml') continue;
    const base = basename(entry, ext);

    if (RESERVED.has(base)) {
      throw new Error(
        `[promptoro] Tool name ${safeName(base)} is reserved (prototype hazard or registry method). Rename ${pathFor(join(abs, entry))}.`,
      );
    }

    const filePath = join(abs, entry);
    let text: string;
    try {
      text = readFileSync(filePath, 'utf8');
    } catch (err) {
      throw new Error(`[promptoro] Cannot read ${pathFor(filePath)}: ${(err as Error).message}`);
    }

    let raw: unknown;
    try {
      raw = parseYaml(text, YAML_OPTIONS);
    } catch (err) {
      throw new Error(`[promptoro] Invalid YAML in ${pathFor(filePath)}: ${(err as Error).message}`);
    }

    rawSpecs.set(base, deepFreeze(raw));
  }

  const internals: RawInternals = { abs, rawSpecs };
  rawInternalsCache.set(abs, internals);
  return internals;
}

function assertNames(
  rawSpecs: Map<string, unknown>,
  names: readonly string[],
  abs: string,
): void {
  for (const expected of names) {
    if (!rawSpecs.has(expected)) {
      const available = [...rawSpecs.keys()];
      const list = available.length ? available.map((k) => safeName(k)).join(', ') : '(none)';
      throw new Error(
        `[promptoro] Expected entry ${safeName(expected)} in ${pathFor(abs)}, but no matching YAML found. Available: ${list}.`,
      );
    }
  }
}
