import { readFileSync, readdirSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { RESERVED_FILENAMES, YAML_OPTIONS } from "../common/constants.js";
import { deepFreeze } from "../utils/deep-freeze.js";
import { formatError } from "../utils/error.js";
import { safeString } from "../utils/safe-string.js";
import { runValidator, type Validator } from "../common/validator.js";
import { safePath } from "../utils/path.js";

const cache = new Map<string, Map<string, unknown>>();

export interface Register<T = unknown> {
  get(name: string): T;
  has(name: string): boolean;
  names(): readonly string[];
}

export interface RegisterOptions<T = unknown> {
  schema?: Validator<T>;
  filenames?: readonly string[];
}

export function register<T = unknown>(
  dirpath: string,
  options?: RegisterOptions<T>,
): Register<T> {
  if (typeof dirpath !== "string" || dirpath.length === 0) {
    throw new Error(
      formatError("Invalid path argument", {
        value: safeString(dirpath),
        expected: "string path",
      }),
    );
  }

  const safeDirpath = resolve(dirpath);

  let specs = cache.get(safeDirpath);
  if (!specs) {
    specs = parseFiles(safeDirpath);
    cache.set(safeDirpath, specs);
  }

  if (options?.filenames) {
    assertFilenames(specs, options.filenames);
  }

  const frozen = new Map<string, T>();
  for (const [name, data] of specs) {
    const value = options?.schema
      ? (deepFreeze(runValidator(data, options.schema)) as T)
      : (deepFreeze(data) as T);
    frozen.set(name, value);
  }

  const methods: Register<T> = {
    names(): readonly string[] {
      return [...frozen.keys()];
    },
    get(name: string): T {
      if (!frozen.has(name)) {
        throw Error(
          formatError("Invalid name", {
            name: name,
          }),
        );
      }
      return frozen.get(name) as T;
    },
    has(name: string): boolean {
      return frozen.has(name);
    },
  };

  const frozenObj = Object.assign(
    {},
    Object.fromEntries(frozen),
    methods,
  ) as Register<T>;
  Object.freeze(frozenObj);

  return frozenObj;
}

export function clearRegisterCache(): void {
  cache.clear();
}

function parseFiles(dirpath: string): Map<string, unknown> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dirpath, { recursive: true, withFileTypes: true });
  } catch (err) {
    throw new Error(
      formatError("Invalid dir path", {
        path: dirpath,
        error: (err as Error).message,
      }),
    );
  }

  const specs = new Map<string, unknown>();
  const visitedPaths = new Map<string, string>();

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }

    const ext = extname(entry.name);
    const base = basename(entry.name, ext);

    if (ext !== ".yml" && ext !== ".yaml") {
      continue;
    }

    if (RESERVED_FILENAMES.has(base)) {
      throw new Error(
        formatError(`Reserved filename`, {
          name: base,
          error: "conflicts with a register method or built-in property",
          hint: "rename the file",
        }),
      );
    }

    const filepath = join(entry.parentPath, entry.name);
    const safeFilepath = safePath(filepath);

    if (visitedPaths.has(base)) {
      const prevPath = visitedPaths.get(base);
      throw new Error(
        formatError(`Duplicate filename`, {
          name: base,
          error: `found at ${relative(dirpath, prevPath || "")} and ${relative(
            dirpath,
            filepath,
          )}`,
          hint: "rename one of the files",
        }),
      );
    }
    visitedPaths.set(base, filepath);

    let content: string;
    try {
      content = readFileSync(safeFilepath, "utf8");
    } catch (err) {
      throw new Error(
        formatError("Invalid file path", {
          name: base,
          error: (err as Error).message,
        }),
      );
    }

    let data: unknown;
    try {
      data = parseYaml(content, YAML_OPTIONS);
    } catch (err) {
      throw new Error(
        formatError("Invalid YAML syntax", {
          path: safeFilepath,
          error: (err as Error).message,
        }),
      );
    }

    specs.set(base, data);
  }

  return specs;
}

function assertFilenames(
  specs: Map<string, unknown>,
  filenames: readonly string[],
): void {
  for (const filename of filenames) {
    if (!specs.has(filename)) {
      throw new Error(
        formatError(`Invalid file`, {
          name: filename,
        }),
      );
    }
  }
}
