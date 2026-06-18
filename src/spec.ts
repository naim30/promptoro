import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { buildSpec } from './parse.js';
import { validateRaw } from './validate.js';
import type { ToolSpec } from './types.js';

const cache = new Map<string, ToolSpec>();

export function spec(metaUrlOrDir: string): ToolSpec {
  const dir = resolveDir(metaUrlOrDir);
  const yamlPath = join(dir, 'tool.yml');
  const cacheKey = safeRealpath(yamlPath);

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  let text: string;
  try {
    text = readFileSync(cacheKey, 'utf8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(
        `[promptoro] Missing tool.yml in ${dir}\n` +
          `          Expected: ${yamlPath} — did you create the YAML?`,
      );
    }
    throw err;
  }

  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (err) {
    throw new Error(`[promptoro] Invalid YAML in ${yamlPath}: ${(err as Error).message}`);
  }

  const validated = validateRaw(raw, yamlPath);
  const folderName = basename(dir);
  if (validated.name !== folderName) {
    throw new Error(
      `[promptoro] Name mismatch in ${yamlPath}\n` +
        `          Folder: '${folderName}' — name: '${validated.name}' — fix one of them.`,
    );
  }

  const result = buildSpec(validated, text);
  cache.set(cacheKey, result);
  return result;
}

export function clearSpecCache(): void {
  cache.clear();
}

function resolveDir(metaUrlOrDir: string): string {
  if (typeof metaUrlOrDir !== 'string' || metaUrlOrDir.length === 0) {
    throw new Error(
      `[promptoro] spec() expects an import.meta.url or absolute path. Got: ${String(metaUrlOrDir)}`,
    );
  }
  if (metaUrlOrDir.startsWith('file://')) {
    return dirname(fileURLToPath(metaUrlOrDir));
  }
  if (isAbsolute(metaUrlOrDir)) {
    return /\.[^/\\]+$/.test(metaUrlOrDir) ? dirname(metaUrlOrDir) : metaUrlOrDir;
  }
  throw new Error(
    `[promptoro] spec() expects an import.meta.url, __dirname, or absolute path. Got: ${metaUrlOrDir}`,
  );
}

function safeRealpath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}
