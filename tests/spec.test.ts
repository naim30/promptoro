import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSpecCache, spec } from '../src/loaders/spec.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');

describe('spec', () => {
  beforeEach(() => clearSpecCache());

  it('loads tool.yml from a sibling directory via absolute path', () => {
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const out = spec<{ name: string }>(folder);
    expect(out.name).toBe('episodic_create');
  });

  it('accepts a file:// URL like import.meta.url', () => {
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const url = `file://${folder}/tool.ts`;
    const out = spec<{ name: string }>(url);
    expect(out.name).toBe('episodic_create');
  });

  it('caches repeated calls when no schema is provided', () => {
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const a = spec(folder);
    const b = spec(folder);
    expect(a).toBe(b);
  });

  it('throws with the expected path when tool.yml is missing', () => {
    const folder = join(fixtures, 'sibling', 'missing_yaml');
    expect(() => spec(folder)).toThrowError(/Missing tool\.yml/);
  });

  it('rejects relative paths', () => {
    expect(() => spec('./relative')).toThrowError(/absolute path/);
  });

  it('parses arbitrary YAML shapes when no schema is provided', () => {
    const folder = join(fixtures, 'sibling', 'arbitrary');
    const out = spec<{ config: { theme: string; layers: string[] } }>(folder);
    expect(out.config.theme).toBe('dark');
    expect(out.config.layers).toEqual(['a', 'b', 'c']);
  });

  it('returns a deep-frozen object', () => {
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const out = spec<{ fields: Record<string, unknown> }>(folder);
    expect(Object.isFrozen(out)).toBe(true);
    expect(Object.isFrozen(out.fields)).toBe(true);
  });

  it('runs an opt-in function schema', () => {
    interface Tool { name: string; description: string }
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const out = spec(folder, {
      schema: (raw): Tool => {
        if (typeof raw !== 'object' || raw === null) throw new Error('not an object');
        const r = raw as Record<string, unknown>;
        if (typeof r.name !== 'string' || typeof r.description !== 'string') {
          throw new Error('missing name or description');
        }
        return { name: r.name, description: r.description };
      },
    });
    expect(out.name).toBe('episodic_create');
    expect(out.description).toBe('Store an episodic memory.\n');
  });

  it('schema can transform the raw value', () => {
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const out = spec(folder, {
      schema: (raw) => ({ uppercaseName: (raw as { name: string }).name.toUpperCase() }),
    });
    expect(out.uppercaseName).toBe('EPISODIC_CREATE');
  });
});
