import type { Intent } from "../../types.js";

export interface StoreResult {
  readonly intents: Intent[];
  readonly events: Array<
    | {
        readonly kind: "store/value";
        readonly key: string;
        readonly value: Uint8Array | undefined;
      }
    | {
        readonly kind: "store/done";
        readonly key: string;
        readonly op: "write" | "delete";
      }
  >;
}

/** Synchronous in-memory KV. Store intents resolve to events in the same step. */
export class SimStore {
  private readonly data = new Map<string, Uint8Array>();

  applyIntent(intent: Intent): StoreResult["events"] {
    if (intent.kind === "store/read") {
      const value = this.data.get(intent.read.key);
      return [
        { kind: "store/value", key: intent.read.key, value: value?.slice() },
      ];
    }
    if (intent.kind === "store/write") {
      this.data.set(intent.write.key, intent.write.value.slice());
      return [{ kind: "store/done", key: intent.write.key, op: "write" }];
    }
    if (intent.kind === "store/delete") {
      this.data.delete(intent.del.key);
      return [{ kind: "store/done", key: intent.del.key, op: "delete" }];
    }
    return [];
  }

  get(key: string): Uint8Array | undefined {
    const value = this.data.get(key);
    return value?.slice();
  }

  snapshot(): Map<string, Uint8Array> {
    const out = new Map<string, Uint8Array>();
    for (const [k, v] of this.data) {
      out.set(k, v.slice());
    }
    return out;
  }
}
