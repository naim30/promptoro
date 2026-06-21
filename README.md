# promptoro

Load YAML prompts and tool descriptions into typed, deep-frozen JS objects.

Built for MCP servers and agent tools where prompt content lives in YAML files that non-engineers can edit. TypeScript code wires the descriptions into Zod or the MCP SDK. YAML over a TS const because it has comments, multi-line strings, and decouples prompt edits from code reviews.

Also works as a generic YAML loader.

ESM-only. Node ≥ 20.12. One runtime dependency (`yaml`).

## Install

```bash
npm install promptoro
```

## Three loading modes

```ts
import { parse, spec, register } from "promptoro";

// 1. Raw string
const tool = parse(yamlText);

// 2. Sibling file (reads ./tool.yml next to the calling module)
const tool = spec(import.meta.url);

// 3. Directory of files (recursive, keyed by filename basename)
const tools = register("./prompts");
tools.summarize;            // direct property access
tools.get("summarize");     // method access
tools.names();              // ["summarize", "translate", "classify"]
```

Each one returns whatever the YAML represents, deep-frozen so it can be shared safely.

## A typical prompt file

```yaml
# prompts/summarize.yml
name: summarize
description: |
  Summarize the input text in one paragraph.
fields:
  text:
    description: The text to summarize.
  max_words:
    description: Optional word limit for the summary.
```

## Wire it into MCP / Zod

```ts
import { z } from "zod";
import { spec } from "promptoro";
// server is an instance of the MCP SDK's Server

interface Tool {
  name: string;
  description: string;
  fields: Record<string, { description: string }>;
}

const tool = spec<Tool>(import.meta.url);

server.registerTool(tool.name, {
  description: tool.description,
  inputSchema: z.object({
    text: z.string().describe(tool.fields.text.description),
    max_words: z.number().optional().describe(tool.fields.max_words.description),
  }),
}, handler);
```

Prompt engineers edit the YAML. You wire it into Zod. The description text appears in only one place.

## Generic YAML

The same loaders work for any YAML — config files, fixture data, anything. The prompt-shaped examples above are just the design target.

```ts
import { spec } from "promptoro";

interface AppConfig {
  port: number;
  features: { auth: boolean; rate_limit: number };
}

const config = spec<AppConfig>(import.meta.url, { filename: "app.yml" });
```

## Schema validation

Pass `schema` to validate at load time. Accepts a plain function or any Standard Schema validator (Zod, Valibot, ArkType).

```ts
import { z } from "zod";

const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.record(z.string(), z.object({ description: z.string() })),
});

const tools = register<z.infer<typeof ToolSchema>>("./prompts", {
  schema: ToolSchema,
});
```

For a registry, the schema runs on every entry at load time so bad YAML fails fast.

## Phrasebook check

Pass `filenames` to assert specific files exist at startup. Useful for catching missing prompts in CI.

```ts
register("./prompts", { filenames: ["summarize", "translate", "classify"] });
```

## API

```ts
parse<T = unknown>(content: string, options?: { schema?: Validator<T> }): T

spec<T = unknown>(metaUrlOrDir: string, options?: {
  schema?: Validator<T>;
  filename?: string;     // defaults to "tool.yml"
}): T

register<T = unknown>(dir: string, options?: {
  schema?: Validator<T>;
  filenames?: readonly string[];
}): Register<T>

type Validator<T> = StandardSchemaV1<unknown, T> | ((raw: unknown) => T);

type Register<T = unknown> = {
  get(name: string): T;
  has(name: string): boolean;
  names(): readonly string[];
} & Readonly<Record<string, T>>;

clearSpecCache(): void;
clearRegisterCache(): void;
```

## Conventions

| Mode | Source | Key |
|------|--------|-----|
| `parse(yaml)` | raw string | none |
| `spec(import.meta.url)` | `./tool.yml` next to caller | none |
| `register(dir)` | every `*.yml` / `*.yaml` found recursively in `dir` | filename basename |

`register` recurses into subdirectories but flattens to the basename. Two files with the same basename in different folders throw `Duplicate filename` at load time. Filenames that clash with register methods (`get`, `has`, `names`) or JavaScript prototype properties (`__proto__`, `constructor`, `toString`, etc.) are rejected.

## Caching

`spec` caches per resolved file path. `register` caches per resolved directory path. Repeated calls with the same path return the same frozen object without re-reading from disk.

Call `clearSpecCache()` or `clearRegisterCache()` to bust them — useful for hot reload during development, isolation between tests, or rotating config at runtime.

## Bundling

The library itself works identically across npm, pnpm, yarn, and bun. No package-manager-specific code.

YAML files are read at runtime, so they must be present in the deployed build output. Most TypeScript build tools strip non-JS files by default — the same gotcha that hits `.md` files in NestJS. Configure your bundler to copy them.

**NestJS** — add to `nest-cli.json`:

```json
{
  "compilerOptions": {
    "assets": ["**/*.yml", "**/*.yaml"],
    "watchAssets": true
  }
}
```

**tsc / tsup / esbuild** — add a post-build copy step using [`copyfiles`](https://www.npmjs.com/package/copyfiles):

```json
"scripts": {
  "build": "tsup && copyfiles -u 1 \"src/**/*.{yml,yaml}\" dist"
}
```

**webpack** — use [`copy-webpack-plugin`](https://www.npmjs.com/package/copy-webpack-plugin) with a `**/*.{yml,yaml}` pattern.

**Vite** — put YAML in `public/` (auto-copied), or import as raw text with `?raw` and feed it to `parse()`.

For `register(dir)`, prefer an absolute path anchored to the calling module over a CWD-relative one — the latter breaks when the process is started from a different working directory:

```ts
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
register(join(here, "prompts"));
```

`spec(import.meta.url)` already anchors itself to the calling module, so no extra setup needed there.

## Errors

Every error starts with the `[promptoro]` prefix, a one-line headline, and indented `key: value` details.

```
[promptoro] Invalid file path
  name: tool
  error: ENOENT: no such file or directory

[promptoro] Duplicate filename
  name: summarize
  error: found at summarize.yml and nested/summarize.yml
  hint: rename one of the files

[promptoro] Invalid schema
  error: [fields.text.description] Expected string, received number
```

## License

[MIT](./LICENSE) © Naimish Lukhi
