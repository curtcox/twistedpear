// @ts-nocheck
import {
  FreenetClient,
  type FreenetUpdateOptions
} from "../core/client.js";
import {
  decodePropagationSetState,
  encodePropagationSetParameters,
  encodePropagationSetState,
  mergePropagationSetStates,
  type PropagationSetEntry
} from "../core/propagation-set.js";

/** Matches `@twistedpear/lxmf-ts` `PropagationStoredEntry` without a package edge. */
export interface FreenetPropagationEntry {
  readonly transientId: Uint8Array;
  readonly lxmfData: Uint8Array;
  readonly storedAt: number;
}

export interface FreenetPropagationStoreOptions {
  readonly client: FreenetClient;
  /** Propagation-set WASM contract bytes. */
  readonly wasm: Uint8Array;
  /**
   * Destination hashes to pull on `pull()`. Empty means publish-only until
   * destinations are observed via `publish()`.
   */
  readonly watchDestinationHashes?: ReadonlyArray<Uint8Array>;
  readonly updateOptions?: FreenetUpdateOptions;
}

const DESTINATION_HASH_BYTES = 16;

function destinationHashOf(lxmfData: Uint8Array): Uint8Array | null {
  if (lxmfData.length < DESTINATION_HASH_BYTES) {
    return null;
  }
  return lxmfData.subarray(0, DESTINATION_HASH_BYTES);
}

function destinationKey(hash: Uint8Array): string {
  let out = "";
  for (const value of hash) {
    out += value.toString(16).padStart(2, "0");
  }
  return out;
}

function toSetEntries(
  entries: ReadonlyArray<FreenetPropagationEntry>
): PropagationSetEntry[] {
  return entries.map((entry) => ({
    transientId: entry.transientId,
    storedAt: BigInt(entry.storedAt),
    lxmfData: entry.lxmfData
  }));
}

function fromSetEntries(
  entries: ReadonlyArray<PropagationSetEntry>
): FreenetPropagationEntry[] {
  return entries.map((entry) => ({
    transientId: entry.transientId,
    storedAt: Number(entry.storedAt),
    lxmfData: entry.lxmfData
  }));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

/**
 * Groups LXMF ciphertext by destination and mirrors each group into a Freenet
 * propagation-set contract. Quotas remain the caller's responsibility.
 */
export class FreenetPropagationStore {
  readonly #client: FreenetClient;
  readonly #wasm: Uint8Array;
  readonly #updateOptions: FreenetUpdateOptions | undefined;
  readonly #watched = new Map<string, Uint8Array>();

  constructor(options: FreenetPropagationStoreOptions) {
    this.#client = options.client;
    this.#wasm = options.wasm;
    this.#updateOptions = options.updateOptions;
    for (const hash of options.watchDestinationHashes ?? []) {
      if (hash.length !== DESTINATION_HASH_BYTES) {
        throw new Error("Freenet propagation watch hash must be 16 bytes");
      }
      this.#watched.set(destinationKey(hash), Uint8Array.from(hash));
    }
  }

  async publish(
    entries: ReadonlyArray<FreenetPropagationEntry>
  ): Promise<void> {
    const byDestination = new Map<string, FreenetPropagationEntry[]>();
    for (const entry of entries) {
      const hash = destinationHashOf(entry.lxmfData);
      if (hash === null) continue;
      const key = destinationKey(hash);
      this.#watched.set(key, Uint8Array.from(hash));
      const group = byDestination.get(key) ?? [];
      group.push(entry);
      byDestination.set(key, group);
    }

    for (const [key, group] of byDestination) {
      const destinationHash = this.#watched.get(key)!;
      const source = {
        wasm: this.#wasm,
        parameters: encodePropagationSetParameters({ destinationHash })
      };
      const { key: contractKey, codeHash } = FreenetClient.deriveKey(source);
      const encoded = encodePropagationSetState(toSetEntries(group));
      const existing = await this.#client.get(contractKey).catch(() => null);
      if (existing === null) {
        await this.#client.put(source, encoded);
        continue;
      }
      const merged = mergePropagationSetStates(existing.state, encoded);
      if (equalBytes(merged, existing.state)) {
        continue;
      }
      await this.#client.update(
        contractKey,
        codeHash,
        merged,
        this.#updateOptions
      );
    }
  }

  async pull(): Promise<FreenetPropagationEntry[]> {
    const out: FreenetPropagationEntry[] = [];
    for (const destinationHash of this.#watched.values()) {
      const source = {
        wasm: this.#wasm,
        parameters: encodePropagationSetParameters({ destinationHash })
      };
      const { key } = FreenetClient.deriveKey(source);
      const record = await this.#client.get(key).catch(() => null);
      if (record === null) continue;
      out.push(...fromSetEntries(decodePropagationSetState(record.state)));
    }
    return out;
  }
}
