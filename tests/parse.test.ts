import { describe, expect, it } from 'vitest';
import { parse } from '../src/loaders/parse.js';
import type { StandardSchemaV1 } from '../src/core/validator.js';

describe('parse', () => {
  it('parses a flat object', () => {
    const out = parse(`name: foo\nversion: 1.0`);
    expect(out).toEqual({ name: 'foo', version: 1.0 });
  });

  it('parses nested objects', () => {
    const out = parse(`a:\n  b:\n    c: 1`);
    expect(out).toEqual({ a: { b: { c: 1 } } });
  });

  it('parses arrays', () => {
    const out = parse(`items:\n  - 1\n  - 2\n  - 3`);
    expect(out).toEqual({ items: [1, 2, 3] });
  });

  it('parses scalars at the root', () => {
    expect(parse('hello')).toBe('hello');
    expect(parse('42')).toBe(42);
    expect(parse('null')).toBe(null);
    expect(parse('true')).toBe(true);
  });

  it('does not enforce any required keys without a schema', () => {
    expect(() => parse(`anything: goes`)).not.toThrow();
    expect(() => parse(``)).not.toThrow();
  });

  it('allows long keys and values (no cap from promptoro)', () => {
    const longKey = 'a'.repeat(1000);
    const longValue = 'b'.repeat(2000);
    const out = parse<Record<string, string>>(`${longKey}: ${longValue}`);
    expect(out[longKey]).toBe(longValue);
  });

  it('returns a deep-frozen object', () => {
    const out = parse<{ a: { b: number } }>(`a:\n  b: 1`);
    expect(Object.isFrozen(out)).toBe(true);
    expect(Object.isFrozen(out.a)).toBe(true);
  });

  it('supports typed access via generic when no schema is given', () => {
    interface MyTool {
      name: string;
      fields: { data: string };
    }
    const out = parse<MyTool>(`name: foo\nfields:\n  data: bar`);
    expect(out.name).toBe('foo');
    expect(out.fields.data).toBe('bar');
  });

  it('throws on invalid YAML', () => {
    expect(() => parse(':\n: bad')).toThrowError(/Invalid YAML/);
  });

  // Schema option — function validator
  it('runs a function validator and returns its result', () => {
    interface MyType { name: string }
    const out = parse(`name: foo`, {
      schema: (raw): MyType => {
        if (typeof raw !== 'object' || raw === null || !('name' in raw)) {
          throw new Error('expected object with name');
        }
        return raw as MyType;
      },
    });
    expect(out.name).toBe('foo');
  });

  it('function validator can throw to reject input', () => {
    expect(() =>
      parse(`hello`, {
        schema: (raw) => {
          if (typeof raw !== 'object') throw new Error('not an object');
          return raw;
        },
      }),
    ).toThrowError(/not an object/);
  });

  // Schema option — Standard Schema
  it('accepts a Standard Schema object and returns its validated value', () => {
    interface MyType { name: string }
    const schema: StandardSchemaV1<unknown, MyType> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: (value) => {
          if (typeof value === 'object' && value !== null && 'name' in value) {
            return { value: value as MyType };
          }
          return { issues: [{ message: 'expected object with name' }] };
        },
      },
    };
    const out = parse(`name: foo`, { schema });
    expect(out.name).toBe('foo');
  });

  it('Standard Schema with issues throws a clear error', () => {
    const schema: StandardSchemaV1<unknown, { name: string }> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: () => ({ issues: [{ message: 'missing name', path: ['name'] }] }),
      },
    };
    expect(() => parse(`other: thing`, { schema })).toThrowError(/Schema validation failed/);
  });

  it('rejects async Standard Schema with a clear error', () => {
    const schema: StandardSchemaV1<unknown, { name: string }> = {
      '~standard': {
        version: 1,
        vendor: 'test',
        validate: async () => ({ value: { name: 'foo' } }),
      },
    };
    expect(() => parse(`name: foo`, { schema })).toThrowError(/Async schemas are not supported/);
  });
});
