import { utf8Decode, utf8Encode } from "./utf8.js";

/** Host adapter only: validate an old JSON record and return its canonical replacement. */
export function migrateLegacyGrantRecord(bytes: Uint8Array): Uint8Array | null {
  try {
    const text = utf8Decode(bytes);
    const keys = topLevelObjectKeys(text);
    if (keys === null || new Set(keys).size !== keys.length) return null;
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value))
      return null;
    const record = value as Record<string, unknown>;
    if (
      Object.keys(record).some(
        (key) =>
          !["appId", "publisherPublicKey", "granted", "updatedAt"].includes(
            key,
          ),
      )
    )
      return null;
    if (
      typeof record.appId !== "string" ||
      typeof record.publisherPublicKey !== "string" ||
      !Array.isArray(record.granted) ||
      record.granted.some((entry) => typeof entry !== "string") ||
      new Set(record.granted).size !== record.granted.length ||
      typeof record.updatedAt !== "number" ||
      !Number.isSafeInteger(record.updatedAt) ||
      record.updatedAt < 0
    )
      return null;
    return utf8Encode(
      JSON.stringify({
        appId: record.appId,
        publisherPublicKey: record.publisherPublicKey,
        granted: record.granted,
        updatedAt: record.updatedAt,
      }),
    );
  } catch {
    return null;
  }
}

/** Decode top-level key spellings before checking uniqueness (for example, `\u0061ppId`). */
function topLevelObjectKeys(text: string): readonly string[] | null {
  const keys: string[] = [];
  let objectDepth = 0;
  let arrayDepth = 0;
  let previous: "open" | "comma" | "other" = "other";
  let offset = 0;

  while (offset < text.length) {
    const character = text[offset]!;
    if (/\s/.test(character)) {
      offset += 1;
      continue;
    }
    if (character === '"') {
      const end = jsonStringEnd(text, offset);
      if (end === null) return null;
      if (
        objectDepth === 1 &&
        arrayDepth === 0 &&
        (previous === "open" || previous === "comma")
      ) {
        const key: unknown = JSON.parse(text.slice(offset, end));
        if (typeof key !== "string") return null;
        keys.push(key);
      }
      previous = "other";
      offset = end;
      continue;
    }
    if (character === "{") {
      objectDepth += 1;
      previous = "open";
    } else if (character === "}") {
      objectDepth -= 1;
      previous = "other";
    } else if (character === "[") {
      arrayDepth += 1;
      previous = "other";
    } else if (character === "]") {
      arrayDepth -= 1;
      previous = "other";
    } else if (character === ",") {
      previous = "comma";
    } else if (character !== ":") {
      previous = "other";
    }
    if (objectDepth < 0 || arrayDepth < 0) return null;
    offset += 1;
  }
  return objectDepth === 0 && arrayDepth === 0 ? keys : null;
}

function jsonStringEnd(text: string, start: number): number | null {
  for (let offset = start + 1; offset < text.length; offset += 1) {
    if (text[offset] === "\\") {
      offset += 1;
      continue;
    }
    if (text[offset] === '"') return offset + 1;
  }
  return null;
}
