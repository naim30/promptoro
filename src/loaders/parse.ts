import { parse as parseYaml } from 'yaml';
import { deepFreeze } from '../core/utils.js';
import { runValidator, type Validator } from '../core/validator.js';
import { YAML_OPTIONS } from '../core/yaml.js';

export interface ParseOptions<T = unknown> {
  schema?: Validator<T>;
}

/**
 * Parse a YAML string into a deep-frozen JavaScript value.
 *
 * With no options, returns whatever the YAML represents — object, array,
 * scalar, null. No shape is enforced.
 *
 * Pass `{ schema }` to validate. The schema can be a function
 * `(raw) => MyType` or any Standard Schema object (Zod, Valibot, ArkType).
 */
export function parse<T = unknown>(yamlText: string, options?: ParseOptions<T>): T {
  let raw: unknown;
  try {
    raw = parseYaml(yamlText, YAML_OPTIONS);
  } catch (err) {
    throw new Error(`[promptoro] Invalid YAML: ${(err as Error).message}`);
  }
  const frozen = deepFreeze(raw);
  if (options?.schema) {
    return deepFreeze(runValidator(frozen, options.schema)) as T;
  }
  return frozen as T;
}
