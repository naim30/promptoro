import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { clearSpecCache, spec } from "../../src/loaders/spec.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "..", "fixtures");

describe("spec", () => {
  beforeEach(() => clearSpecCache());

  it("loads tool.yml from an absolute path", () => {
    const dir = join(fixtures, "spec_prompt", "foo");
    interface YamlType {
      name: string;
    }
    const out = spec<YamlType>(dir);
    expect(out.name).toBe("foo");
  });

  it("loads tool.yml from a relative path", () => {
    const dir = "./tests/fixtures/spec_prompt/foo";
    interface YamlType {
      name: string;
    }
    const out = spec<YamlType>(dir);
    expect(out.name).toBe("foo");
  });

  it("loads tool.yml from a file:// URL", () => {
    const dir = join(fixtures, "spec_prompt", "foo");
    const url = `file://${dir}/tool.ts`;
    interface YamlType {
      name: string;
    }
    const out = spec<YamlType>(url);
    expect(out.name).toBe("foo");
  });

  it("loads a custom filename when provided", () => {
    const dir = join(fixtures, "spec_prompt", "custom_name");
    interface YamlType {
      name: string;
    }
    const out = spec<YamlType>(dir, { filename: "prompt.yml" });
    expect(out.name).toBe("custom_named");
  });

  it("parses arbitrary YAML shapes", () => {
    const dir = join(fixtures, "spec_prompt", "foo");
    interface YamlType {
      config: { theme: string; layers: string[] };
    }
    const out = spec<YamlType>(dir);
    expect(out.config.theme).toBe("dark");
    expect(out.config.layers).toEqual(["a", "b", "c"]);
  });

  it("accepts a function as schema", () => {
    const dir = join(fixtures, "spec_prompt", "foo");
    interface YamlType {
      name: string;
      value: number;
    }
    const schema = (raw: unknown): YamlType => {
      const r = raw as YamlType;
      return { name: r.name, value: r.value } as YamlType;
    };
    const out = spec<YamlType>(dir, { schema });
    expect(out.name).toBe("foo");
    expect(out.value).toBe(1);
  });

  it("accepts a transforming schema", () => {
    const dir = join(fixtures, "spec_prompt", "foo");
    interface YamlType {
      uppercaseName: string;
    }
    const schema = (raw: unknown): YamlType => ({
      uppercaseName: (raw as { name: string }).name.toUpperCase(),
    });
    const out = spec<YamlType>(dir, { schema });
    expect(out.uppercaseName).toBe("FOO");
  });

  it("returns a deep-frozen object", () => {
    const dir = join(fixtures, "spec_prompt", "foo");
    interface YamlType {
      config: Record<string, unknown>;
    }
    const out = spec<YamlType>(dir);
    expect(Object.isFrozen(out)).toBe(true);
    expect(Object.isFrozen(out.config)).toBe(true);
  });

  it("returns the same instance on repeated calls", () => {
    const dir = join(fixtures, "spec_prompt", "foo");
    const a = spec(dir);
    const b = spec(dir);
    expect(a).toBe(b);
  });

  it("throws when tool.yml is missing", () => {
    const dir = join(fixtures, "spec_prompt", "missing_yaml");
    expect(() => spec(dir)).toThrowError(/Invalid file path/);
  });

  it("throws when custom filename is missing", () => {
    const dir = join(fixtures, "spec_prompt", "custom_name");
    expect(() => spec(dir, { filename: "does-not-exist.yml" })).toThrowError(
      /Invalid file path/,
    );
  });
});
