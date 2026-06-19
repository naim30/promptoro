import { readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { deepFreeze } from "../utils/deep-freeze.js";
import { formatError } from "../utils/error.js";
import { safePath, getDirPath } from "../utils/path.js";
import { safeString } from "../utils/safe-string.js";
import { runValidator, type Validator } from "../common/validator.js";
import { YAML_OPTIONS } from "../common/constants.js";

const DEFAULT_FILENAME = "tool.yml";
const cache = new Map<string, unknown>();

export interface SpecOptions<T = unknown> {
  schema?: Validator<T>;
  filename?: string;
}

export function spec<T = unknown>(
  dirpath: string,
  options?: SpecOptions<T>,
): T {
  if (typeof dirpath !== "string" || dirpath.length === 0) {
    throw new Error(
      formatError("Invalid path argument", {
        value: safeString(dirpath),
        expected: "string path or import.meta.url",
      }),
    );
  }

  const dir = getDirPath(dirpath);
  const filename = options?.filename || DEFAULT_FILENAME;

  const ext = extname(filename);
  const base = basename(filename, ext);

  const filepath = join(dir, filename);
  const safeFilepath = safePath(filepath);

  let data = cache.get(safeFilepath);
  if (!data) {
    let content: string;
    try {
      content = readFileSync(safeFilepath, "utf8");
    } catch (err) {
      throw new Error(
        formatError(`Invalid file path`, {
          name: base,
          error: (err as Error).message,
        }),
      );
    }

    try {
      data = parseYaml(content, YAML_OPTIONS);
    } catch (err) {
      throw new Error(
        formatError("Invalid YAML syntax", {
          name: base,
          error: (err as Error).message,
        }),
      );
    }
    cache.set(safeFilepath, data);
  }

  if (options?.schema) {
    return deepFreeze(runValidator(data, options.schema)) as T;
  }

  return deepFreeze(data) as T;
}

export function clearSpecCache(): void {
  cache.clear();
}
