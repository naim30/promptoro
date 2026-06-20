import { describe, expect, it } from "vitest";
import { formatError } from "../../src/utils/error.js";

describe("formatError", () => {
  it("returns the headline with the library prefix", () => {
    const headline = "Something broke";
    const out = formatError(headline);
    expect(out).toBe("[promptoro] Something broke");
  });

  it("returns the detail keys with indentation", () => {
    const headline = "Invalid path argument";
    const details = { got: "./relative", expected: "absolute path" };
    const out = formatError(headline, details);
    expect(out).toBe(
      "[promptoro] Invalid path argument\n  got: ./relative\n  expected: absolute path",
    );
  });

  it("omits undefined detail values", () => {
    const headline = "Invalid name";
    const details = {
      got: "foo",
      hint: undefined,
      available: "bar, baz",
    };
    const out = formatError(headline, details);
    expect(out).toContain("got: foo");
    expect(out).toContain("available: bar, baz");
    expect(out).not.toContain("hint:");
  });

  it("returns just the headline when no options are passed", () => {
    const headline = "Just a headline";
    const out = formatError(headline);
    expect(out).toBe("[promptoro] Just a headline");
  });

  it("returns just the headline when the options object is empty", () => {
    const headline = "Just a headline";
    const details = {};
    const out = formatError(headline, details);
    expect(out).toBe("[promptoro] Just a headline");
  });

  it("preserves the order of details as provided", () => {
    const headline = "X";
    const details = { path: "/a", cause: "y", hint: "z" };
    const out = formatError(headline, details);
    const lines = out.split("\n");
    expect(lines[1]).toContain("path:");
    expect(lines[2]).toContain("cause:");
    expect(lines[3]).toContain("hint:");
  });
});
