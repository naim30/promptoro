export interface ToolSpec {
  readonly name: string;
  readonly description: string;
  readonly fields: Readonly<Record<string, { readonly description: string }>>;
  readonly hash: string;
  field(name: string): string;
}

export interface ToolRegistry {
  get(name: string): ToolSpec;
  has(name: string): boolean;
  names(): readonly string[];
}
