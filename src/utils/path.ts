import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, resolve } from "node:path";

export function safePath(path: string): string {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}

export function getDirPath(path: string): string {
  if (path.startsWith("file://")) {
    return dirname(fileURLToPath(path));
  }
  const resolved = isAbsolute(path) ? path : resolve(path);
  return /\.[^/\\]+$/.test(path) ? dirname(resolved) : resolved;
}
