# promptoro

> Load YAML sidecar files containing LLM tool descriptions — for MCP, Anthropic/OpenAI tools, Zod.

- **2-line API.** One import, one call.
- **Zero framework opinions.** Returns a typed object — wire it into Zod, MCP, OpenAI, anything.
- **Tiny.** One runtime dep (`yaml`). ESM-only. Node ≥ 20.

## Install

```sh
npm i promptoro
# or
pnpm add promptoro
```

## Quickstart

**Folder per tool** (sibling YAML):

```ts
// tools/episodic_create/tool.ts
import { spec } from "promptoro";
const tool = spec(import.meta.url);

// tools/episodic_create/tool.yml
// name: episodic_create
// description: |
//   Store an episodic memory.
// fields:
//   data:
//     description: Natural language event description.
```

**Central prompts folder** (registry):

```ts
// src/tools.ts
import { registry } from "promptoro";
export const tools = registry("./prompts", ["episodic_create", "episodic_search"] as const);

// tools.episodic_create.name              → "episodic_create"
// tools.episodic_create.field("data")     → "Natural language event description."
```

**Bundler / serverless** (raw string):

```ts
import { parse } from "promptoro";
const tool = parse(yamlText);
```

## Use with Zod

```ts
import { z } from "zod";
import { spec } from "promptoro";

const tool = spec(import.meta.url);

export const Input = z.object({
  data: z.string().describe(tool.field("data")),
});
```

## Use with the MCP TypeScript SDK

```ts
const tool = spec(import.meta.url);

server.registerTool(tool.name, {
  description: tool.description,
  inputSchema: z.object({
    data: z.string().describe(tool.field("data")),
  }),
}, handler);
```

No hardcoded tool names. No duplicated descriptions.

## YAML schema

```yaml
name: episodic_create              # must match folder name (spec mode) or filename basename (registry mode)
description: |
  Store an episodic memory.
fields:
  data:
    description: |
      Natural language event description.
  metadata:
    description: Optional metadata.
```

## API

```ts
spec(metaUrlOrDir: string): ToolSpec
// Reads ./tool.yml from the directory of the calling file.
// Accepts import.meta.url, __dirname, or any absolute path.

registry(dir: string): ToolRegistry
registry<const T extends readonly string[]>(dir, names): ToolRegistry & Record<T[number], ToolSpec>
// Reads every *.yml in dir. Filename basename must equal the YAML's name: field.
// Pass names as const for fully-typed property access.

parse(yamlText: string): ToolSpec
// JSON.parse-style — for bundled or serverless environments.

interface ToolSpec {
  name: string
  description: string
  fields: Record<string, { description: string }>
  hash: string                  // sha256 of YAML source — for prompt-cache invalidation
  field(name: string): string   // throws on typo, suggests close matches
}

interface ToolRegistry {
  get(name: string): ToolSpec
  has(name: string): boolean
  names(): readonly string[]
}
```

## Errors

Errors are eager and explain the convention they're enforcing:

```
[promptoro] Missing tool.yml in /abs/path/to/episodic_create
          Expected: /abs/path/to/episodic_create/tool.yml — did you create the YAML?

[promptoro] Name mismatch in prompts/episodic_create.yml
          File basename: 'episodic_create' — name: 'episodic-create' — fix one of them.

[promptoro] No field 'naem' on tool 'episodic_create'. Did you mean 'name'?
          Available: name, data, metadata.
```

## Why?

MCP tool descriptions have a measured token-bloat problem (arXiv 2602.14878 found 97.1% of MCP tool descriptions have "smells"). Inline `.describe("…")` strings stacked on every Zod field mix prompt content with implementation. promptoro moves descriptions to YAML so prompt engineers and developers can work in parallel.

It is **not** a framework. It does not generate MCP servers, Zod schemas, JSON Schema, or types. It loads a file and returns an object.

## Conventions

| Mode | Source | Identity check |
|------|--------|----------------|
| `spec(import.meta.url)` | `./tool.yml` next to caller | folder name === `name:` field |
| `registry(dir)` | every `*.yml` in `dir` | filename basename === `name:` field |
| `parse(yaml)` | raw string | none — caller's responsibility |

## License

[MIT](./LICENSE) © Naimish Lukhi
