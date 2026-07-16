import type { GrantRecord } from "./grants.js";
import { encodeGrantRecord } from "./grants.js";
import { utf8Decode } from "./utf8.js";

/** Host adapter only: validate an old JSON record and return its canonical replacement. */
export function migrateLegacyGrantRecord(bytes: Uint8Array): Uint8Array | null {
  try {
    const text = utf8Decode(bytes);
    for (const key of ["appId", "publisherPublicKey", "granted", "updatedAt"]) {
      if ([...text.matchAll(new RegExp(`"${key}"\\s*:`, "g"))].length !== 1) return null;
    }
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (Object.keys(record).some((key) => !["appId", "publisherPublicKey", "granted", "updatedAt"].includes(key))) return null;
    if (typeof record.appId !== "string" || typeof record.publisherPublicKey !== "string" ||
        !Array.isArray(record.granted) || record.granted.some((entry) => typeof entry !== "string") ||
        new Set(record.granted).size !== record.granted.length ||
        typeof record.updatedAt !== "number" || !Number.isSafeInteger(record.updatedAt) || record.updatedAt < 0) return null;
    return encodeGrantRecord(record as unknown as GrantRecord);
  } catch {
    return null;
  }
}
