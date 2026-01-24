/**
 * Type guards for runtime type checking
 * Use these instead of `as any` to safely narrow types
 */

export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasProperty<K extends PropertyKey>(
  value: unknown,
  key: K,
): value is Record<K, unknown> {
  return isRecord(value) && key in value;
}

export function satisfiesProperties<T extends Record<string, unknown>>(
  value: unknown,
  keys: (keyof T)[],
): value is T {
  if (!isRecord(value)) return false;
  return keys.every((key) => key in value);
}

export function isPartial<T extends Record<string, unknown>>(
  value: unknown,
  _validator: (v: unknown) => v is T,
): value is Partial<T> {
  return isRecord(value);
}
