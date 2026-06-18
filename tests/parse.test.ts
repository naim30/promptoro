import { describe, expect, it } from 'vitest';
import { parse } from '../src/parse.js';

const valid = `
name: episodic_create
description: Store an episodic memory.
fields:
  name:
    description: Short identifier.
  data:
    description: Natural language event description.
  metadata:
    description: Optional metadata.
`;

describe('parse', () => {
  it('parses valid YAML into a ToolSpec', () => {
    const spec = parse(valid);
    expect(spec.name).toBe('episodic_create');
    expect(spec.description).toBe('Store an episodic memory.');
    expect(spec.fields.name?.description).toBe('Short identifier.');
    expect(spec.fields.data?.description).toBe('Natural language event description.');
    expect(spec.fields.metadata?.description).toBe('Optional metadata.');
  });

  it('produces a deterministic sha256 hash of the source', () => {
    const a = parse(valid);
    const b = parse(valid);
    expect(a.hash).toBe(b.hash);
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('field() returns the description for a known field', () => {
    const spec = parse(valid);
    expect(spec.field('data')).toBe('Natural language event description.');
  });

  it('field() throws with did-you-mean for a typo', () => {
    const spec = parse(valid);
    expect(() => spec.field('naem')).toThrowError(/Did you mean 'name'/);
  });

  it('field() throws with available list when no close match', () => {
    const spec = parse(valid);
    expect(() => spec.field('zzz')).toThrowError(/Available: name, data, metadata/);
  });

  it('throws on invalid YAML', () => {
    expect(() => parse(':\n: bad')).toThrowError(/Invalid YAML/);
  });

  it('throws when name is missing', () => {
    expect(() => parse(`description: x\nfields: {}`)).toThrowError(/'name'/);
  });

  it('throws when description is missing', () => {
    expect(() => parse(`name: x\nfields: {}`)).toThrowError(/'description'/);
  });

  it('throws when fields is missing', () => {
    expect(() => parse(`name: x\ndescription: y`)).toThrowError(/'fields'/);
  });

  it('throws when a field lacks a description', () => {
    expect(() =>
      parse(`name: x\ndescription: y\nfields:\n  foo: {}`),
    ).toThrowError(/Field 'foo'.*missing 'description'/s);
  });

  it('returns frozen objects', () => {
    const spec = parse(valid);
    expect(Object.isFrozen(spec)).toBe(true);
    expect(Object.isFrozen(spec.fields)).toBe(true);
  });
});
