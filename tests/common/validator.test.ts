import { describe, expect, it } from "vitest";
import {
  isStandardSchema,
  runValidator,
  type StandardSchemaV1,
} from "../../src/common/validator.js";

describe("isStandardSchema", () => {
  it("returns true for object with ~standard property", () => {
    const schema = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({ value: "x" }),
      },
    };
    expect(isStandardSchema(schema)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isStandardSchema(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isStandardSchema(undefined)).toBe(false);
  });

  it("returns false for objects without ~standard", () => {
    expect(isStandardSchema({})).toBe(false);
    expect(isStandardSchema({ foo: 1 })).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isStandardSchema("hello")).toBe(false);
    expect(isStandardSchema(42)).toBe(false);
    expect(isStandardSchema(true)).toBe(false);
  });

  it("returns false when ~standard is a string", () => {
    expect(isStandardSchema({ "~standard": "hello" })).toBe(false);
  });
});

describe("runValidator", () => {
  it("accepts a function as validator", () => {
    const data = { name: "foo" };
    interface YamlType {
      name: string;
    }
    const schema = (raw: unknown): YamlType => {
      return raw as YamlType;
    };
    const out = runValidator<YamlType>(data, schema);
    expect(out.name).toBe("foo");
  });

  it("accepts a Standard Schema validator", () => {
    const data = { name: "foo" };
    interface YamlType {
      name: string;
    }
    const schema: StandardSchemaV1<unknown, YamlType> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (raw: unknown) => ({ value: raw as YamlType }),
      },
    };
    const out = runValidator(data, schema);
    expect(out.name).toBe("foo");
  });

  it("accepts a transforming schema", () => {
    const data = { name: "hello" };
    interface YamlType {
      uppercaseName: string;
    }
    const schema: StandardSchemaV1<unknown, YamlType> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (raw: unknown) => ({
          value: {
            uppercaseName: (raw as { name: string }).name.toUpperCase(),
          },
        }),
      },
    };
    const out = runValidator(data, schema);
    expect(out.uppercaseName).toBe("HELLO");
  });

  it("throws when function validator rejects", () => {
    const data = {};
    const schema = () => {
      throw new Error("expected valid schema");
    };
    expect(() => runValidator(data, schema)).toThrowError(
      /expected valid schema/,
    );
  });

  it("throws when Standard Schema has issues", () => {
    const data = {};
    interface YamlType {
      name: string;
    }
    const schema: StandardSchemaV1<unknown, YamlType> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [{ message: "missing name", path: ["name"] }],
        }),
      },
    };
    expect(() => runValidator(data, schema)).toThrowError(/Invalid schema/);
  });

  it("throws on async Standard Schema", () => {
    const data = {};
    interface YamlType {
      name: string;
    }
    const schema: StandardSchemaV1<unknown, YamlType> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async () => ({ value: { name: "foo" } }),
      },
    };
    expect(() => runValidator(data, schema)).toThrowError(/Invalid schema/);
  });

  it("throws on a plain object schema", () => {
    const data = {};
    const schema = {};
    expect(() => runValidator(data, schema as never)).toThrowError(
      /Invalid schema/,
    );
  });

  it("throws on a string schema", () => {
    const data = {};
    const schema = "not a schema";
    expect(() => runValidator(data, schema as never)).toThrowError(
      /Invalid schema/,
    );
  });

  it("formats the issue path as a bracket prefix", () => {
    const data = {};
    interface YamlType {
      user: { name: string };
    }
    const schema: StandardSchemaV1<unknown, YamlType> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [{ message: "required", path: ["user", "name"] }],
        }),
      },
    };
    expect(() => runValidator(data, schema)).toThrowError(
      /\[user\.name\] required/,
    );
  });

  it("formats multiple issues joined by semicolons", () => {
    const data = {};
    const schema: StandardSchemaV1<unknown, unknown> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [
            { message: "issue one", path: ["a"] },
            { message: "issue two", path: ["b"] },
          ],
        }),
      },
    };
    expect(() => runValidator(data, schema)).toThrowError(
      /\[a\] issue one; \[b\] issue two/,
    );
  });

  it("formats issue without prefix when path is missing", () => {
    const data = {};
    const schema: StandardSchemaV1<unknown, unknown> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: () => ({
          issues: [{ message: "root error" }],
        }),
      },
    };
    expect(() => runValidator(data, schema)).toThrowError(/root error/);
  });
});
