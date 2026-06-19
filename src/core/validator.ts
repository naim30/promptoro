/**
 * A minimal subset of the Standard Schema spec.
 * Lets promptoro work with Zod, Valibot, ArkType, and any other Standard-Schema-compliant validator
 * without taking a direct dependency.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly '~standard': {
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

/**
 * Accept either:
 *   - a plain function `(raw) => T` that throws or returns the typed value
 *   - a Standard Schema object (Zod, Valibot, ArkType, etc.)
 */
export type Validator<T> = StandardSchemaV1<unknown, T> | ((raw: unknown) => T);

export function isStandardSchema(value: unknown): value is StandardSchemaV1<unknown, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    '~standard' in value &&
    typeof (value as { '~standard': unknown })['~standard'] === 'object'
  );
}

export function runValidator<T>(raw: unknown, validator: Validator<T>, source?: string): T {
  if (typeof validator === 'function') {
    return validator(raw);
  }
  if (!isStandardSchema(validator)) {
    throw new Error(
      `[promptoro] schema must be a function or Standard Schema object${source ? ` (loaded ${source})` : ''}.`,
    );
  }
  const result = validator['~standard'].validate(raw);
  if (result instanceof Promise) {
    throw new Error(
      `[promptoro] Async schemas are not supported${source ? ` (loaded ${source})` : ''}. Use a sync schema.`,
    );
  }
  if (result.issues && result.issues.length > 0) {
    const where = source ? ` in ${source}` : '';
    const messages = result.issues
      .map((i) => {
        const pathSegs = i.path?.map((p) =>
          typeof p === 'object' && p !== null && 'key' in p ? String(p.key) : String(p),
        );
        const path = pathSegs && pathSegs.length > 0 ? `[${pathSegs.join('.')}] ` : '';
        return `${path}${i.message}`;
      })
      .join('; ');
    throw new Error(`[promptoro] Schema validation failed${where}: ${messages}`);
  }
  return result.value as T;
}
