import { describe, expect, it } from "vitest";
import { parse } from "../../src/loaders/parse.js";
import type { StandardSchemaV1 } from "../../src/common/types.js";

describe("parse", () => {
  it("parses flat object", () => {
    const yaml = `name: foo\nversion: 1.0`;
    const out = parse(yaml);
    expect(out).toEqual({ name: "foo", version: 1.0 });
  });

  it("parses nested objects", () => {
    const yaml = `a:\n  b:\n    c: 1`;
    const out = parse(yaml);
    expect(out).toEqual({ a: { b: { c: 1 } } });
  });

  it("parses arrays", () => {
    const yaml = `items:\n  - 1\n  - 2\n  - 3`;
    const out = parse(yaml);
    expect(out).toEqual({ items: [1, 2, 3] });
  });

  it("parses scalars at the root", () => {
    expect(parse("hello")).toBe("hello");
    expect(parse("42")).toBe(42);
    expect(parse("null")).toBe(null);
    expect(parse("true")).toBe(true);
  });

  it("accepts any YAML without a schema", () => {
    expect(() => parse(`anything: goes`)).not.toThrow();
    expect(() => parse(``)).not.toThrow();
  });

  it("accepts long keys and values", () => {
    const key = "a".repeat(1000);
    const value = "b".repeat(2000);
    const yaml = `${key}: ${value}`;
    const out = parse<Record<string, string>>(yaml);
    expect(out[key]).toBe(value);
  });

  it("accepts a function as schema", () => {
    interface YamlType {
      name: string;
    }
    const schema = (raw: unknown): YamlType => {
      if (typeof raw !== "object" || raw === null || !("name" in raw)) {
        throw new Error("expected object with name");
      }
      return raw as YamlType;
    };
    const yaml = `name: foo`;
    const out = parse(yaml, { schema });
    expect(out.name).toBe("foo");
  });

  it("accepts a Standard Schema object", () => {
    interface YamlType {
      name: string;
    }
    const schema: StandardSchemaV1<unknown, YamlType> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (raw: unknown) => {
          if (typeof raw !== "object" || raw === null || !("name" in raw)) {
            return { issues: [{ message: "expected object with name" }] };
          }
          return { value: raw as YamlType };
        },
      },
    };
    const yaml = `name: foo`;
    const out = parse(yaml, { schema });
    expect(out.name).toBe("foo");
  });

  it("returns a deep-frozen object", () => {
    const yaml = `a:\n  b: 1`;
    const out = parse<{ a: { b: number } }>(yaml);
    expect(Object.isFrozen(out)).toBe(true);
    expect(Object.isFrozen(out.a)).toBe(true);
  });

  it("returns a typed value via generic", () => {
    interface YamlType {
      name: string;
      fields: { data: string };
    }
    const yaml = `name: foo\nfields:\n  data: bar`;
    const out = parse<YamlType>(yaml);
    expect(out.name).toBe("foo");
    expect(out.fields.data).toBe("bar");
  });

  it("throws on invalid YAML", () => {
    const yaml = ":\n: bad";
    expect(() => parse(yaml)).toThrowError(/Invalid YAML syntax/);
  });

  it("throws when function schema rejects", () => {
    const yaml = `hello`;
    const schema = (raw: unknown) => {
      if (typeof raw !== "object") {
        throw new Error("expected object");
      }
      return raw;
    };
    expect(() => parse(yaml, { schema })).toThrowError(/expected object/);
  });

  it("throws when Standard Schema has issues", () => {
    interface YamlType {
      name: string;
    }
    const schema: StandardSchemaV1<unknown, YamlType> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (raw) => {
          if (typeof raw !== "object" || raw === null || !("name" in raw)) {
            return { issues: [{ message: "missing name", path: ["name"] }] };
          }
          return { value: raw as YamlType };
        },
      },
    };
    const yaml = `other: thing`;
    expect(() => parse(yaml, { schema })).toThrowError(/Invalid schema input/);
  });

  it("throws on async Standard Schema", () => {
    interface YamlType {
      name: string;
    }
    const schema: StandardSchemaV1<unknown, YamlType> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async (raw: unknown) => {
          if (typeof raw !== "object" || raw === null || !("name" in raw)) {
            return { issues: [{ message: "expected object with name" }] };
          }
          return { value: raw as YamlType };
        },
      },
    };
    const yaml = `name: foo`;
    expect(() => parse(yaml, { schema })).toThrowError(/Invalid schema/);
  });
});
