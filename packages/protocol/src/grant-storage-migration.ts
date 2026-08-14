import { utf8Decode, utf8Encode } from "./utf8.js";

/** Host adapter only: validate an old JSON record and return its canonical replacement. */
export function migrateLegacyGrantRecord(bytes: Uint8Array): Uint8Array | null {
  try {
    const text = utf8Decode(bytes);
    const keys = topLevelObjectKeys(text);
    if (keys === null || new Set(keys).size !== keys.length) return null;
    const value: unknown = JSON.parse(text);
    if (!isCanonicalGrantRecord(value)) return null;
    return utf8Encode(
      JSON.stringify({
        appId: value.appId,
        publisherPublicKey: value.publisherPublicKey,
        granted: value.granted,
        updatedAt: value.updatedAt,
      }),
    );
  } catch {
    return null;
  }
}

function isCanonicalGrantRecord(value: unknown): value is {
  appId: string;
  publisherPublicKey: string;
  granted: string[];
  updatedAt: number;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some(
      (key) =>
        !["appId", "publisherPublicKey", "granted", "updatedAt"].includes(key),
    )
  ) {
    return false;
  }
  if (!Array.isArray(record.granted)) return false;
  if (
    typeof record.appId !== "string" ||
    typeof record.publisherPublicKey !== "string"
  ) {
    return false;
  }
  return grantedFieldsHold(record.granted, record.updatedAt);
}

function grantedFieldsHold(granted: unknown[], updatedAt: unknown): boolean {
  return (
    granted.every((entry) => typeof entry === "string") &&
    new Set(granted).size === granted.length &&
    typeof updatedAt === "number" &&
    Number.isSafeInteger(updatedAt) &&
    updatedAt >= 0
  );
}

/** Decode top-level key spellings before checking uniqueness (for example, `\u0061ppId`). */
function topLevelObjectKeys(text: string): readonly string[] | null {
  const keys: string[] = [];
  const depths = { object: 0, array: 0 };
  let previous: "open" | "comma" | "other" = "other";
  let offset = 0;

  while (offset < text.length) {
    const character = text[offset]!;
    if (/\s/.test(character)) {
      offset += 1;
      continue;
    }
    if (character === '"') {
      const consumed = consumeJsonKey(text, offset, depths, previous, keys);
      if (consumed === null) return null;
      previous = "other";
      offset = consumed;
      continue;
    }
    previous = applyJsonStructure(character, depths, previous);
    if (depths.object < 0 || depths.array < 0) return null;
    offset += 1;
  }
  return depths.object === 0 && depths.array === 0 ? keys : null;
}

function isTopLevelObjectKey(
  objectDepth: number,
  arrayDepth: number,
  previous: "open" | "comma" | "other",
): boolean {
  return (
    objectDepth === 1 &&
    arrayDepth === 0 &&
    (previous === "open" || previous === "comma")
  );
}

function applyJsonStructure(
  character: string,
  depths: { object: number; array: number },
  previous: "open" | "comma" | "other",
): "open" | "comma" | "other" {
  if (character === "{") {
    depths.object += 1;
    return "open";
  }
  if (character === "}") {
    depths.object -= 1;
    return "other";
  }
  if (character === "[") {
    depths.array += 1;
    return "other";
  }
  if (character === "]") {
    depths.array -= 1;
    return "other";
  }
  if (character === ",") return "comma";
  if (character === ":") return previous;
  return "other";
}

function consumeJsonKey(
  text: string,
  offset: number,
  depths: { object: number; array: number },
  previous: "open" | "comma" | "other",
  keys: string[],
): number | null {
  const end = jsonStringEnd(text, offset);
  if (end === null) return null;
  if (isTopLevelObjectKey(depths.object, depths.array, previous)) {
    const key: unknown = JSON.parse(text.slice(offset, end));
    if (typeof key !== "string") return null;
    keys.push(key);
  }
  return end;
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
