import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearRegistryCache, registry } from '../src/loaders/registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');

describe('registry', () => {
  beforeEach(() => clearRegistryCache());

  it('loads all *.yml files in the directory', () => {
    const reg = registry(join(fixtures, 'prompts'));
    expect(new Set(reg.names())).toEqual(new Set(['episodic_create', 'episodic_search']));
  });

  it('get() returns the parsed object keyed by filename basename', () => {
    const reg = registry<{ name: string }>(join(fixtures, 'prompts'));
    expect(reg.get('episodic_create').name).toBe('episodic_create');
  });

  it('get() throws with did-you-mean for unknown name', () => {
    const reg = registry(join(fixtures, 'prompts'));
    expect(() => reg.get('episodic_creat')).toThrowError(/Did you mean "episodic_create"/);
  });

  it('has() reports presence', () => {
    const reg = registry(join(fixtures, 'prompts'));
    expect(reg.has('episodic_create')).toBe(true);
    expect(reg.has('nope')).toBe(false);
  });

  it('supports direct property access on filename basenames', () => {
    const reg = registry(join(fixtures, 'prompts'));
    expect((reg as unknown as Record<string, { name: string }>).episodic_create?.name).toBe(
      'episodic_create',
    );
  });

  it('phrasebook mode validates expected names exist (runtime check)', () => {
    const reg = registry<{ name: string }>(join(fixtures, 'prompts'), {
      names: ['episodic_create', 'episodic_search'],
    });
    expect(reg.get('episodic_create').name).toBe('episodic_create');
    expect(reg.get('episodic_search').name).toBe('episodic_search');
  });

  it('phrasebook mode throws when an expected name is missing', () => {
    expect(() =>
      registry(join(fixtures, 'prompts'), { names: ['episodic_create', 'nope'] }),
    ).toThrowError(/Expected entry "nope"/);
  });

  it('throws when a filename collides with a registry method (get/has/names)', () => {
    expect(() => registry(join(fixtures, 'prompts_reserved'))).toThrowError(/is reserved/);
  });

  it('throws when a filename is a prototype hazard (__proto__)', () => {
    expect(() => registry(join(fixtures, 'prompts_proto'))).toThrowError(/__proto__.*reserved/);
  });

  it('rejects relative paths', () => {
    expect(() => registry('./prompts')).toThrowError(/absolute path/);
  });

  it('parses arbitrary YAML shapes per file', () => {
    const reg = registry(join(fixtures, 'arbitrary_set'));
    const config = reg.get('config') as { theme: string; layers: string[] };
    expect(config.theme).toBe('dark');
    expect(config.layers).toEqual(['a', 'b', 'c']);
  });

  it('caches the registry instance when no options are passed', () => {
    const a = registry(join(fixtures, 'prompts'));
    const b = registry(join(fixtures, 'prompts'));
    expect(a).toBe(b);
  });

  // Schema option
  it('runs an opt-in function schema for every entry on get()', () => {
    interface Tool { name: string }
    const reg = registry(join(fixtures, 'prompts'), {
      schema: (raw): Tool => {
        if (typeof raw !== 'object' || raw === null) throw new Error('not an object');
        const r = raw as Record<string, unknown>;
        if (typeof r.name !== 'string') throw new Error('missing name');
        return { name: r.name };
      },
    });
    expect(reg.get('episodic_create').name).toBe('episodic_create');
    expect(reg.get('episodic_search').name).toBe('episodic_search');
  });

  it('schema failure throws with a clear error', () => {
    expect(() =>
      registry(join(fixtures, 'prompts'), {
        schema: () => { throw new Error('always rejects'); },
      }),
    ).toThrowError(/always rejects/);
  });
});
