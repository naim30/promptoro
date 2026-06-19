import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { deepFreeze, pathFor, safeName } from '../core/utils.js';
import { runValidator, type Validator } from '../core/validator.js';
import { YAML_OPTIONS } from '../core/yaml.js';

export interface SpecOptions<T = unknown> {
  schema?: Validator<T>;
}

const rawCache = new Map<string, unknown>();

export function spec<T = unknown>(metaUrlOrDir: string, options?: SpecOptions<T>): T {
  const dir = resolveDir(metaUrlOrDir);
  const yamlPath = join(dir, 'tool.yml');
  const cacheKey = safeRealpath(yamlPath);

  let raw: unknown;
  if (rawCache.has(cacheKey)) {
    raw = rawCache.get(cacheKey);
  } else {
    let text: string;
    try {
      text = readFileSync(cacheKey, 'utf8');
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new Error(
          `[promptoro] Missing tool.yml in ${pathFor(dir)}\n` +
            `          Expected: ${pathFor(yamlPath)}`,
        );
      }
      throw err;
    }

    let parsed: unknown;
    try {
      parsed = parseYaml(text, YAML_OPTIONS);
    } catch (err) {
      throw new Error(`[promptoro] Invalid YAML in ${pathFor(yamlPath)}: ${(err as Error).message}`);
    }
    raw = deepFreeze(parsed);
    rawCache.set(cacheKey, raw);
  }

  if (options?.schema) {
    return deepFreeze(runValidator(raw, options.schema, yamlPath)) as T;
  }
  return raw as T;
}

export function clearSpecCache(): void {
  rawCache.clear();
}

function resolveDir(metaUrlOrDir: string): string {
  if (typeof metaUrlOrDir !== 'string' || metaUrlOrDir.length === 0) {
    throw new Error(
      `[promptoro] spec() expects an import.meta.url or absolute path. Got: ${safeName(metaUrlOrDir)}`,
    );
  }
  if (metaUrlOrDir.startsWith('file://')) {
    return dirname(fileURLToPath(metaUrlOrDir));
  }
  if (isAbsolute(metaUrlOrDir)) {
    return /\.[^/\\]+$/.test(metaUrlOrDir) ? dirname(metaUrlOrDir) : metaUrlOrDir;
  }
  throw new Error(
    `[promptoro] spec() expects an import.meta.url, __dirname, or absolute path. Got: ${safeName(metaUrlOrDir)}`,
  );
}

function safeRealpath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}
