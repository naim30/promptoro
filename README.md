# promptoro

Tiny YAML loader for TypeScript. Three ways to load a YAML file into a typed JavaScript object. No schema enforced, no caps. You put whatever you want in the YAML and you get it back as a frozen object.

Built originally for LLM tool descriptions (MCP, Anthropic, OpenAI), but it works for any YAML.

- 2-line API. One import, one call.
- ESM-only. Node ≥ 20.12.
- One runtime dep (`yaml`).

## Install

```sh
npm i promptoro
```

## Quickstart

**Sibling file** (one YAML per folder):

```ts
import { spec } from "promptoro";
const data = spec(import.meta.url);                       // reads ./tool.yml
const data = spec(import.meta.url, { filename: "x.yml" }); // reads ./x.yml
```

**Folder of files** (registry, key by filename):

```ts
import { register } from "promptoro";
const tools = register("/abs/path/to/prompts");
tools.get("episodic_create");
```

**Raw string**:

```ts
import { parse } from "promptoro";
const data = parse(content);
```

All three return a deep-frozen JavaScript value matching whatever the YAML represents. Objects, arrays, scalars, nested anything.

## Typed access

Pass a generic to get a typed return:

```ts
interface Tool { name: string; description: string; }
const tool = spec<Tool>(import.meta.url);
tool.name;   // string
```

For the registry, type each lookup:

```ts
const tools = register<Tool>("/abs/path/to/prompts");
tools.get("episodic_create").name;
```

## Phrasebook mode (runtime check)

Pass a list of expected names. The registry throws at load time if any are missing:

```ts
const tools = register<Tool>(dir, { filenames: ["episodic_create", "episodic_search"] });
```

Useful for catching missing YAML files early.

## Optional schema validation

By default no shape is enforced. If you want validation, pass a `schema`. It accepts either a function or any Standard Schema object (Zod, Valibot, ArkType).

**Function:**

```ts
const tool = parse(content, {
  schema: (raw) => {
    if (typeof raw !== "object" || raw === null) throw new Error("not an object");
    return raw as Tool;
  },
});
```

**Zod (or any Standard Schema validator):**

```ts
import { z } from "zod";

const ToolSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const tool = parse(content, { schema: ToolSchema });
// tool is typed as { name: string; description: string }
```

Works the same on `spec()` and `register()`. For a registry, the schema runs on every entry at construction.

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

type Validator<T> = StandardSchemaV1<unknown, T> | ((raw: unknown) => T)

type Register<T = unknown> = {
  get(name: string): T
  has(name: string): boolean
  names(): readonly string[]
} & Readonly<Record<string, T>>

clearSpecCache(): void
clearRegisterCache(): void
```

Direct property access works too — `tools.episodic_create` and `tools.get("episodic_create")` both return the same entry. Use `.has()` first if you are unsure the entry exists, since direct access types it as `T` even when the key is missing at runtime.

## Conventions

| Mode | Source | Key |
|------|--------|-----|
| `spec(import.meta.url)` | `./tool.yml` next to caller | none |
| `register(dir)` | every `*.yml` and `*.yaml` found recursively in `dir` | filename basename |
| `parse(yaml)` | raw string | none |

`register` recurses into subdirectories but flattens to the filename. Two files with the same basename in different folders throw `Duplicate filename` at load time. The register also rejects filenames that would clash with its own methods (`get`, `has`, `names`) or with JavaScript prototype methods (`__proto__`, `constructor`, `toString`, etc).

## What it does NOT do

- No schema validation by default. Your YAML can be anything. Opt in via `{ schema }`.
- No length caps. Your strings can be any size.
- No templating. If you need `{{vars}}`, do it in TypeScript after the load.
- No prompt management server. This is a file loader.

## Use with Zod

```ts
import { z } from "zod";
import { spec } from "promptoro";

interface Tool {
  description: string;
  fields: Record<string, { description: string }>;
}
const tool = spec<Tool>(import.meta.url);

export const Input = z.object({
  data: z.string().describe(tool.fields.data.description),
});
```

## Errors

Errors are eager and formatted with a one-line headline plus indented `key: value` details. Every message starts with the `[promptoro]` prefix so they are easy to grep.

```
[promptoro] Invalid file path
  name: tool
  error: ENOENT: no such file or directory, open '/abs/path/to/tool/tool.yml'

[promptoro] Invalid name
  name: episodic_creat

[promptoro] Reserved filename
  name: __proto__
  error: conflicts with a register method or built-in property
  hint: rename the file

[promptoro] Duplicate filename
  name: foo
  error: found at foo.yml and nested/foo.yml
  hint: rename one of the files

[promptoro] Invalid schema input
  error: [name] Expected string, received number
```

## License

[MIT](./LICENSE) © Naimish Lukhi
