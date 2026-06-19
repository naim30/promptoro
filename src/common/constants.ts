export const YAML_OPTIONS = {
  merge: false,
  version: "1.2" as const,
  maxAliasCount: 100,
  customTags: [],
};

export const RESERVED_FILENAMES: ReadonlySet<string> = new Set([
  // legacy Object.prototype
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
  // register methods
  "get",
  "has",
  "names",
  // properties Object.prototype
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "valueOf",
  "toLocaleString",
]);
