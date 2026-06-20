import {
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { describe, expect, it } from "vitest";
import { getDirPath, safePath } from "../../src/utils/path.js";

describe("getDirPath", () => {
  it("returns the parent directory of an absolute file path", () => {
    const input = "/abs/path/tool.ts";
    const out = getDirPath(input);
    expect(out).toBe("/abs/path");
  });

  it("returns the path as-is for an absolute directory", () => {
    const input = "/abs/path/dir";
    const out = getDirPath(input);
    expect(out).toBe("/abs/path/dir");
  });

  it("returns the directory of a file:// URL", () => {
    const input = "file:///abs/path/tool.ts";
    const out = getDirPath(input);
    expect(out).toBe("/abs/path");
  });

  it("returns an absolute path for a relative directory", () => {
    const input = "./some/dir";
    const out = getDirPath(input);
    expect(isAbsolute(out)).toBe(true);
    expect(out).toContain("some/dir");
  });

  it("returns the parent directory of a relative file path", () => {
    const input = "./some/dir/tool.ts";
    const out = getDirPath(input);
    expect(isAbsolute(out)).toBe(true);
    expect(out).toContain("some/dir");
    expect(out).not.toContain("tool.ts");
  });
});

describe("safePath", () => {
  it("returns the path unchanged when it does not exist", () => {
    const input = "/this/path/does/not/exist";
    const out = safePath(input);
    expect(out).toBe(input);
  });

  it("returns the realpath of an existing file", () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "promptoro-safepath-")));
    try {
      const input = join(dir, "file.txt");
      writeFileSync(input, "hello");
      const out = safePath(input);
      expect(out).toBe(input);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns the symlink target", () => {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "promptoro-symlink-")));
    try {
      const target = join(dir, "real.txt");
      const input = join(dir, "link.txt");
      writeFileSync(target, "hello");
      symlinkSync(target, input);
      const out = safePath(input);
      expect(out).toBe(target);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
