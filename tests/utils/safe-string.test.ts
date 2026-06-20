import { describe, expect, it } from "vitest";
import { safeString } from "../../src/utils/safe-string.js";

describe("safeString", () => {
  it("quotes a plain string", () => {
    const input = "hello";
    const out = safeString(input);
    expect(out).toBe('"hello"');
  });

  it("quotes an empty string", () => {
    const input = "";
    const out = safeString(input);
    expect(out).toBe('""');
  });

  it("escapes ANSI escape codes", () => {
    const input = "\x1b[31mRED";
    const out = safeString(input);
    expect(out).not.toContain("\x1b");
    expect(out).toContain("\\u001b");
  });

  it("escapes newlines", () => {
    const input = "line1\nline2";
    const out = safeString(input);
    expect(out).toBe('"line1\\nline2"');
  });

  it("coerces non-string inputs to string", () => {
    expect(safeString(42)).toBe('"42"');
    expect(safeString(true)).toBe('"true"');
    expect(safeString(null)).toBe('"null"');
    expect(safeString(undefined)).toBe('"undefined"');
  });

  it("coerces objects to their string representation", () => {
    const input = { foo: 1 };
    const out = safeString(input);
    expect(out).toBe('"[object Object]"');
  });

  it("truncates strings longer than maxLen", () => {
    const input = "a".repeat(500);
    const out = safeString(input);
    expect(out.length).toBeLessThanOrEqual(204);
  });

  it("accepts a custom maxLen", () => {
    const input = "hello world";
    const out = safeString(input, 5);
    expect(out).toBe('"hello"');
  });
});
