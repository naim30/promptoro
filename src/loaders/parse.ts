import { parse as parseYaml } from "yaml";
import { YAML_OPTIONS } from "../common/constants.js";
import { runValidator, type Validator } from "../common/validator.js";
import { deepFreeze } from "../utils/deep-freeze.js";
import { formatError } from "../utils/error.js";

export interface ParseOptions<T = unknown> {
  schema?: Validator<T>;
}

export function parse<T = unknown>(
  content: string,
  options?: ParseOptions<T>,
): T {
  let data: unknown;
  try {
    data = parseYaml(content, YAML_OPTIONS);
  } catch (err) {
    throw new Error(
      formatError("Invalid YAML syntax", {
        error: (err as Error).message,
      }),
    );
  }

  if (options?.schema) {
    return deepFreeze(runValidator(data, options.schema)) as T;
  }

  return deepFreeze(data) as T;
}
