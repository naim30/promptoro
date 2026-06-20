import { describe, expect, it } from "vitest";
import { deepFreeze } from "../../src/utils/deep-freeze.js";

describe("deepFreeze", () => {
  it("freezes a flat object", () => {
    const input = { a: 1, b: 2 };
    const out = deepFreeze(input);
    expect(Object.isFrozen(out)).toBe(true);
  });

  it("freezes nested objects", () => {
    const input = { a: { b: { c: 1 } } };
    deepFreeze(input);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(input.a)).toBe(true);
    expect(Object.isFrozen(input.a.b)).toBe(true);
  });

  it("freezes arrays and their items", () => {
    const input = [{ a: 1 }, { b: 2 }];
    deepFreeze(input);
    expect(Object.isFrozen(input)).toBe(true);
    expect(Object.isFrozen(input[0])).toBe(true);
    expect(Object.isFrozen(input[1])).toBe(true);
  });

  it("returns primitives unchanged", () => {
    expect(deepFreeze("hello")).toBe("hello");
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze(true)).toBe(true);
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
  });

  it("returns already-frozen objects without re-traversing", () => {
    const input = Object.freeze({ a: 1 });
    const out = deepFreeze(input);
    expect(out).toBe(input);
  });

  it("handles cyclic references without infinite looping", () => {
    const input: Record<string, unknown> = { name: "a" };
    input.self = input;
    expect(() => deepFreeze(input)).not.toThrow();
    expect(Object.isFrozen(input)).toBe(true);
  });

  it("preserves the input type via generic", () => {
    interface YamlType {
      x: number;
    }
    const input: YamlType = { x: 42 };
    const out = deepFreeze<YamlType>(input);
    expect(out.x).toBe(42);
  });

  it("throws when mutating a frozen object", () => {
    const out = deepFreeze({ a: 1 }) as { a: number };
    expect(() => {
      out.a = 2;
    }).toThrow();
  });
});
