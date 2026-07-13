/**
 * Pure LXMF announce app-data stamp-cost extraction.
 */
import { msgpackUnpack } from "./msgpack-core.js";

export function stampCostFromAppData(appData: Uint8Array | null): number | null {
  if (appData === null || appData.length === 0) {
    return null;
  }

  const tag = appData[0];
  if (tag === undefined || ((tag < 0x90 || tag > 0x9f) && tag !== 0xdc)) {
    return null;
  }

  try {
    const value = msgpackUnpack(appData);
    if (value.type !== "array" || value.array.length < 2) {
      return null;
    }
    const cost = value.array[1];
    return cost !== undefined && cost.type === "int" ? cost.int : null;
  } catch {
    return null;
  }
}
