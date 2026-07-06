import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { PropagationPersistence, PropagationStoredEntry } from "@twistedpear/lxmf-ts";
import { ensureDir } from "./config.js";

interface SerializedPropagationStore {
  readonly entries: ReadonlyArray<{
    readonly transientIdHex: string;
    readonly lxmfDataHex: string;
    readonly storedAt: number;
  }>;
}

export function createFilePropagationPersistence(storePath: string): PropagationPersistence {
  return {
    load(): ReadonlyArray<PropagationStoredEntry> {
      if (!existsSync(storePath)) {
        return [];
      }

      const raw = JSON.parse(readFileSync(storePath, "utf8")) as SerializedPropagationStore;
      return raw.entries.map((entry) => ({
        transientId: hexToBytes(entry.transientIdHex),
        lxmfData: hexToBytes(entry.lxmfDataHex),
        storedAt: entry.storedAt
      }));
    },
    save(entries: ReadonlyArray<PropagationStoredEntry>): void {
      ensureDir(dirname(storePath));
      const payload: SerializedPropagationStore = {
        entries: entries.map((entry) => ({
          transientIdHex: bytesToHex(entry.transientId),
          lxmfDataHex: bytesToHex(entry.lxmfData),
          storedAt: entry.storedAt
        }))
      };
      writeFileSync(storePath, `${JSON.stringify(payload)}\n`);
    }
  };
}

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}
