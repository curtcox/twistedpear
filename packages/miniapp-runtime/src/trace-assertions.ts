import { AppTraceFormatError } from "./trace-errors.js";

export function asRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new AppTraceFormatError(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

export function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new AppTraceFormatError(`${path} must be an array`);
  }
  return value;
}
