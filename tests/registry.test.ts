import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearRegistryCache, registry } from '../src/registry.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');

describe('registry', () => {
  beforeEach(() => clearRegistryCache());

  it('loads all *.yml files in the directory', () => {
    const tools = registry(join(fixtures, 'prompts'));
    expect(new Set(tools.names())).toEqual(new Set(['episodic_create', 'episodic_search']));
  });

  it('get() returns the spec by name', () => {
    const tools = registry(join(fixtures, 'prompts'));
    expect(tools.get('episodic_create').name).toBe('episodic_create');
  });

  it('get() throws with did-you-mean for unknown name', () => {
    const tools = registry(join(fixtures, 'prompts'));
    expect(() => tools.get('episodic_creat')).toThrowError(/Did you mean 'episodic_create'/);
  });

  it('has() reports presence', () => {
    const tools = registry(join(fixtures, 'prompts'));
    expect(tools.has('episodic_create')).toBe(true);
    expect(tools.has('nope')).toBe(false);
  });

  it('supports direct property access on tool names', () => {
    const tools = registry(join(fixtures, 'prompts'));
    expect((tools as unknown as Record<string, { name: string }>).episodic_create?.name).toBe(
      'episodic_create',
    );
  });

  it('typed phrasebook mode validates expected names', () => {
    const tools = registry(join(fixtures, 'prompts'), ['episodic_create', 'episodic_search'] as const);
    expect(tools.episodic_create.name).toBe('episodic_create');
    expect(tools.episodic_search.name).toBe('episodic_search');
  });

  it('typed phrasebook mode throws when an expected name is missing', () => {
    expect(() =>
      registry(join(fixtures, 'prompts'), ['episodic_create', 'nope'] as const),
    ).toThrowError(/Expected tool 'nope'/);
  });

  it('throws when filename basename mismatches name: field', () => {
    expect(() => registry(join(fixtures, 'prompts_mismatch'))).toThrowError(/Name mismatch/);
  });

  it('throws when a tool name collides with a reserved method', () => {
    expect(() => registry(join(fixtures, 'prompts_reserved'))).toThrowError(/collides with a registry method/);
  });

  it('caches the registry per directory', () => {
    const a = registry(join(fixtures, 'prompts'));
    const b = registry(join(fixtures, 'prompts'));
    expect(a).toBe(b);
  });
});
