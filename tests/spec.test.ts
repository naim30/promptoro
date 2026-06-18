import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearSpecCache, spec } from '../src/spec.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');

describe('spec', () => {
  beforeEach(() => clearSpecCache());

  it('loads tool.yml from a sibling directory via absolute path', () => {
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const tool = spec(folder);
    expect(tool.name).toBe('episodic_create');
    expect(tool.field('data')).toBe('Natural language event description.');
  });

  it('loads tool.yml when given a fake tool.ts file path inside the folder', () => {
    const fakeFile = join(fixtures, 'sibling', 'episodic_create', 'tool.ts');
    const tool = spec(fakeFile);
    expect(tool.name).toBe('episodic_create');
  });

  it('accepts a file:// URL like import.meta.url', () => {
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const url = `file://${folder}/tool.ts`;
    const tool = spec(url);
    expect(tool.name).toBe('episodic_create');
  });

  it('caches repeated calls (returns identical reference)', () => {
    const folder = join(fixtures, 'sibling', 'episodic_create');
    const a = spec(folder);
    const b = spec(folder);
    expect(a).toBe(b);
  });

  it('throws with the expected path when tool.yml is missing', () => {
    const folder = join(fixtures, 'sibling', 'missing_yaml');
    expect(() => spec(folder)).toThrowError(/Missing tool\.yml/);
  });

  it('throws on folder/name mismatch', () => {
    const folder = join(fixtures, 'sibling', 'name_mismatch');
    expect(() => spec(folder)).toThrowError(/Name mismatch/);
  });

  it('rejects relative paths', () => {
    expect(() => spec('./relative')).toThrowError(/absolute path/);
  });
});
