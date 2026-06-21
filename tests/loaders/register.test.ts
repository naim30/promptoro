import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { clearRegisterCache, register } from "../../src/loaders/register.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, "..", "fixtures");

describe("register", () => {
  beforeEach(() => clearRegisterCache());

  it("loads all *.yml files in a directory", () => {
    const dir = join(fixtures, "reg_prompt");
    const out = register(dir);
    expect(new Set(out.names())).toEqual(new Set(["foo", "bar", "baz"]));
  });

  it("loads from a relative path", () => {
    const dir = "./tests/fixtures/reg_prompt";
    const out = register(dir);
    expect(new Set(out.names())).toEqual(new Set(["foo", "bar", "baz"]));
  });

  it("loads nested *.yml files keyed by basename", () => {
    const dir = join(fixtures, "reg_prompt");
    interface YamlType {
      name: string;
      value: number;
    }
    const out = register<YamlType>(dir);
    expect(out.get("baz").name).toBe("baz");
    expect(out.get("baz").value).toBe(3);
  });

  it("parses arbitrary YAML shapes per file", () => {
    const dir = join(fixtures, "reg_prompt");
    interface YamlType {
      config: { theme: string; layers: string[] };
    }
    const out = register<YamlType>(dir);
    const foo = out.get("foo");
    expect(foo.config.theme).toBe("dark");
    expect(foo.config.layers).toEqual(["a", "b", "c"]);
  });

  it("accepts a function as schema", () => {
    const dir = join(fixtures, "reg_prompt");
    interface YamlType {
      name: string;
    }
    const schema = (raw: unknown): YamlType => {
      if (typeof raw !== "object" || raw === null || !("name" in raw)) {
        throw new Error("expected object with name");
      }
      return raw as YamlType;
    };
    const out = register<YamlType>(dir, { schema });
    expect(out.get("foo").name).toBe("foo");
    expect(out.get("bar").name).toBe("bar");
  });

  it("accepts a filenames allowlist", () => {
    const dir = join(fixtures, "reg_prompt");
    interface YamlType {
      name: string;
    }
    const out = register<YamlType>(dir, {
      filenames: ["foo", "bar"],
    });
    expect(out.get("foo").name).toBe("foo");
    expect(out.get("bar").name).toBe("bar");
  });

  it("returns the parsed entry by filename basename", () => {
    const dir = join(fixtures, "reg_prompt");
    interface YamlType {
      name: string;
    }
    const out = register<YamlType>(dir);
    expect(out.get("foo").name).toBe("foo");
  });

  it("returns whether an entry exists via has()", () => {
    const dir = join(fixtures, "reg_prompt");
    const out = register(dir);
    expect(out.has("foo")).toBe(true);
    expect(out.has("nope")).toBe(false);
  });

  it("exposes each entry as a direct property", () => {
    const dir = join(fixtures, "reg_prompt");
    interface YamlType {
      name: string;
    }
    const out = register<YamlType>(dir);
    const direct = out.foo;
    expect(direct?.name).toBe("foo");
  });

  it("returns equivalent data on repeated calls", () => {
    const dir = join(fixtures, "reg_prompt");
    const a = register(dir);
    const b = register(dir);
    expect(a.names()).toEqual(b.names());
    expect(a.get("foo")).toEqual(b.get("foo"));
  });

  it("throws on unknown name", () => {
    const dir = join(fixtures, "reg_prompt");
    const out = register(dir);
    expect(() => out.get("nope")).toThrowError(/Invalid filename/);
  });

  it("throws when an expected filename is missing", () => {
    const dir = join(fixtures, "reg_prompt");
    expect(() => register(dir, { filenames: ["foo", "nope"] })).toThrowError(
      /Invalid filename/,
    );
  });

  it("throws when a filename collides with a register method", () => {
    const dir = join(fixtures, "reg_reserved");
    expect(() => register(dir)).toThrowError(/Reserved filename/);
  });

  it("throws when a filename is a prototype hazard", () => {
    const dir = join(fixtures, "reg_proto");
    expect(() => register(dir)).toThrowError(/Reserved filename/);
  });

  it("throws when two files share a basename across folders", () => {
    const dir = join(fixtures, "reg_duplicate");
    expect(() => register(dir)).toThrowError(/Duplicate filename/);
  });

  it("throws when function schema rejects", () => {
    const dir = join(fixtures, "reg_prompt");
    const schema = (raw: unknown) => {
      if (typeof raw !== "object" || raw === null || !("missing" in raw)) {
        throw new Error("expected object with missing field");
      }
      return raw;
    };
    expect(() => register(dir, { schema })).toThrowError(
      /expected object with missing field/,
    );
  });
});
