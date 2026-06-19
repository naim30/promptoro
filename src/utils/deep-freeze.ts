export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Object.isFrozen(obj)) {
    return obj;
  }
  Object.freeze(obj);
  for (const v of Object.values(obj as Record<string, unknown>)) {
    deepFreeze(v);
  }
  return obj;
}
