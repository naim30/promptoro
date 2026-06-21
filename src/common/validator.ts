import { formatError } from "../utils/error.js";

export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => StandardSchemaResult<Output> | Promise<StandardSchemaResult<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output };
  };
}

export interface StandardSchemaResult<Output> {
  readonly value?: Output;
  readonly issues?: ReadonlyArray<{
    readonly message: string;
    readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }>;
  }>;
}

export function isStandardSchema(
  value: unknown,
): value is StandardSchemaV1<unknown, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    "~standard" in value &&
    typeof (value as { "~standard": unknown })["~standard"] === "object"
  );
}

export type Validator<T> =
  | StandardSchemaV1<unknown, T>
  | ((data: unknown) => T);

export function runValidator<T>(data: unknown, validator: Validator<T>): T {
  if (typeof validator === "function") {
    return validator(data);
  }

  if (!isStandardSchema(validator)) {
    throw new Error(
      formatError("Invalid schema", {
        value: typeof validator,
        expected: "function or standard schema object",
      }),
    );
  }

  const result = validator["~standard"].validate(data);

  if (result instanceof Promise) {
    throw new Error(
      formatError("Invalid schema", {
        error: "async standard schema are not supported",
      }),
    );
  }

  if (result.issues && result.issues.length > 0) {
    throw new Error(
      formatError("Invalid schema", {
        error: formatIssues(result.issues),
      }),
    );
  }

  return result.value as T;
}

function formatIssues(
  issues: NonNullable<StandardSchemaResult<unknown>["issues"]>,
): string {
  const lines: string[] = [];

  for (const issue of issues) {
    const path = issue.path?.map((p) => {
      if (typeof p === "object" && p !== null && "key" in p)
        return String(p.key);
      return String(p);
    });

    let prefix = "";
    if (path && path.length) {
      prefix = `[${path.join(".")}]` + " ";
    }

    lines.push(`${prefix}${issue.message}`);
  }

  return lines.join("; ");
}
