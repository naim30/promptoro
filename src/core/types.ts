export interface Registry<T = unknown> {
  get(name: string): T;
  has(name: string): boolean;
  names(): readonly string[];
}
