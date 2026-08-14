import {
  initialAcceptPropagationGetRequestDataState,
  initialApplyPropagationRestoreState,
  initialApplyPropagationStoreCommitState,
  initialClientRateLimitState,
  initialDecodeLxmfPeerErrorState,
  initialDeletePropagationCatalogEntryState,
  initialEvictOldestPropagationEntryState,
  initialEvictPropagationCatalogEntryState,
  initialPersistDebounceState,
  initialPropagationGetState,
  initialPropagationMessageTooLargeState,
  initialPropagationRestoreState,
  initialPropagationStoreState,
  initialSelectOldestPropagationKeyState,
  initialUnpackPropagationEnvelopeState,
  initialUnpackPropagationRequestState,
  lxmfPeerErrorFromActions,
  oldestPropagationKeyFromActions,
  propagationDestinationHash,
  propagationEnvelopeFieldsFromActions,
  propagationGetApplyIds,
  propagationGetListIds,
  propagationRequestFieldsFromActions,
  propagationStoreAcceptEvictKeys,
  shouldAcceptPropagationGetRequestDataNow,
  shouldAcceptPropagationRestore,
  shouldAcceptPropagationStore,
  shouldAllowClientRequest,
  shouldApplyPropagationGet,
  shouldApplyPropagationRestoreNow,
  shouldApplyPropagationStoreCommitNow,
  shouldDeletePropagationCatalogEntryNow,
  shouldDuplicatePropagationStore,
  shouldEvictOldestPropagationEntryNow,
  shouldEvictPropagationCatalogEntryNow,
  shouldListPropagationGetIds,
  shouldRejectPropagationStore,
  shouldRejectUnpackPropagationEnvelope,
  shouldRejectUnpackPropagationRequest,
  shouldTreatPropagationMessageTooLarge,
  shouldUseUnpackPropagationEnvelope,
  shouldUseUnpackPropagationRequest,
  stepAcceptPropagationGetRequestDataWithActions,
  stepAllowClientRequestWithActions,
  stepApplyPropagationRestoreWithActions,
  stepApplyPropagationStoreCommitWithActions,
  stepDecodeLxmfPeerErrorWithActions,
  stepDeletePropagationCatalogEntryWithActions,
  stepEvictOldestPropagationEntryWithActions,
  stepEvictPropagationCatalogEntryWithActions,
  stepPersistDebounceWithActions,
  stepPropagationGetWithActions,
  stepPropagationMessageTooLargeWithActions,
  stepPropagationRestoreWithActions,
  stepPropagationStoreWithActions,
  stepSelectOldestPropagationKeyWithActions,
  stepUnpackPropagationEnvelopeWithActions,
  stepUnpackPropagationRequestWithActions,
  type ClientRateLimitState,
  type PersistDebounceState,
  type PropagationGetAction,
  type PropagationStoreAction,
} from "@twistedpear/protocol";
import type {
  CryptoProvider,
  Identity,
  RegisteredDestination,
} from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationAllowPolicy,
  DestinationDirection,
  DestinationType,
  Identity as RnsIdentity,
  type Link,
} from "@twistedpear/reticulum-ts";
import { APP_NAME, MESSAGE_GET_PATH, PeerError } from "./constants.js";
import {
  msgpackPackArray,
  msgpackPackUInt,
  msgpackPackBin,
} from "./msgpack.js";

export interface PropagationServerQuotas {
  readonly maxBytes: number;
  readonly maxMessages: number;
  readonly maxMessageBytes: number;
  readonly perClientRequestsPerMinute: number;
}

export const DEFAULT_PROPAGATION_QUOTAS: PropagationServerQuotas = {
  maxBytes: 256 * 1024 * 1024,
  maxMessages: 10_000,
  maxMessageBytes: 1_000_000,
  perClientRequestsPerMinute: 120,
};

interface StoredPropagationMessage {
  readonly transientId: Uint8Array;
  readonly destinationHash: Uint8Array;
  readonly lxmfData: Uint8Array;
  readonly storedAt: number;
  readonly size: number;
}

export interface PropagationServerStats {
  readonly messageCount: number;
  readonly usedBytes: number;
  readonly quotaBytes: number;
  readonly evictions: number;
}

export interface PropagationStoredEntry {
  readonly transientId: Uint8Array;
  readonly lxmfData: Uint8Array;
  readonly storedAt: number;
}

export interface PropagationPersistence {
  load(): ReadonlyArray<PropagationStoredEntry>;
  save(entries: ReadonlyArray<PropagationStoredEntry>): void;
}

/**
 * Optional async network mirror for meshed stores (e.g. Freenet).
 *
 * Local quotas and the sync `PropagationPersistence` snapshot remain authoritative
 * for the in-process catalog. The mirror receives the same debounced snapshot and
 * may also supply remote entries at startup via `pull`.
 */
export interface PropagationRemoteMirror {
  publish(entries: ReadonlyArray<PropagationStoredEntry>): void | Promise<void>;
  pull?():
    | ReadonlyArray<PropagationStoredEntry>
    | Promise<ReadonlyArray<PropagationStoredEntry>>;
}

export interface PropagationServerTimer {
  cancel(): void;
}

export interface PropagationServerOptions {
  readonly persistence?: PropagationPersistence;
  readonly remoteMirror?: PropagationRemoteMirror;
  /** Injected wall-clock in ms — protocol code never reads OS time. */
  readonly now: () => number;
  /** Injected scheduler — adapters supply real timers. */
  readonly schedule: (
    ms: number,
    callback: () => void,
  ) => PropagationServerTimer;
}

/** Production propagation-node server with quotas and eviction. */
export class PropagationServer {
  private readonly entries = new Map<string, StoredPropagationMessage>();
  private usedBytes = 0;
  private evictions = 0;
  private clientRateState: ClientRateLimitState;
  private readonly persistence: PropagationPersistence | null;
  private readonly remoteMirror: PropagationRemoteMirror | null;
  private readonly now: () => number;
  private readonly schedule: (
    ms: number,
    callback: () => void,
  ) => PropagationServerTimer;
  private persistTimer: PropagationServerTimer | null = null;
  private persistDebounceState: PersistDebounceState =
    initialPersistDebounceState();

  constructor(
    private readonly provider: CryptoProvider,
    private readonly quotas: PropagationServerQuotas = DEFAULT_PROPAGATION_QUOTAS,
    options: PropagationServerOptions,
  ) {
    this.clientRateState = initialClientRateLimitState(
      quotas.perClientRequestsPerMinute,
    );
    this.persistence = options.persistence ?? null;
    this.remoteMirror = options.remoteMirror ?? null;
    this.now = options.now;
    this.schedule = options.schedule;
    if (this.persistence !== null) {
      for (const entry of this.persistence.load()) {
        this.restoreEntry(entry);
      }
    }
  }

  get stats(): PropagationServerStats {
    return {
      messageCount: this.entries.size,
      usedBytes: this.usedBytes,
      quotaBytes: this.quotas.maxBytes,
      evictions: this.evictions,
    };
  }

  registerHandlers(destination: RegisteredDestination): void {
    destination.registerRequestHandler(
      MESSAGE_GET_PATH,
      (_path, data, _requestId, _linkId, remoteIdentity) => {
        const clientKey =
          remoteIdentity === null
            ? "anonymous"
            : Buffer.from(remoteIdentity.hash).toString("hex");
        if (!this.allowClientRequest(clientKey)) {
          return msgpackPackUInt(PeerError.NO_ACCESS);
        }

        return this.handleGetRequest(data, remoteIdentity);
      },
      DestinationAllowPolicy.ALLOW_ALL,
    );

    destination.setLinkEstablishedCallback((link) => {
      this.handlePropagationLink(link);
    });
  }

  storePropagationData(lxmfData: Uint8Array): Uint8Array | null {
    const transientId = RnsIdentity.fullHash(this.provider, lxmfData);
    const key = Buffer.from(transientId).toString("hex");
    const destinationHash = propagationDestinationHash(lxmfData);
    const stepped = stepPropagationStoreWithActions(
      initialPropagationStoreState(),
      {
        kind: "store/received",
        quotas: this.quotas,
        messageBytes: lxmfData.length,
        alreadyStored: this.entries.has(key),
        usedBytes: this.usedBytes,
        entries: [...this.entries.entries()].map(([entryKey, entry]) => ({
          key: entryKey,
          size: entry.size,
          storedAt: entry.storedAt,
        })),
        destinationHashPresent: destinationHash !== null,
      },
    );
    return this.applyPropagationStoreActions(stepped.actions, {
      transientId,
      key,
      lxmfData,
      destinationHash,
    });
  }

  private applyPropagationStoreActions(
    actions: readonly PropagationStoreAction[],
    input: {
      readonly transientId: Uint8Array;
      readonly key: string;
      readonly lxmfData: Uint8Array;
      readonly destinationHash: Uint8Array | null;
    },
  ): Uint8Array | null {
    if (shouldRejectPropagationStore(actions)) {
      return null;
    }
    if (shouldDuplicatePropagationStore(actions)) {
      return input.transientId;
    }
    const applyStepped = stepApplyPropagationStoreCommitWithActions(
      initialApplyPropagationStoreCommitState(),
      {
        kind: "propagation/apply-store-commit-gate",
        planAccept: shouldAcceptPropagationStore(actions),
        destinationHashPresent: input.destinationHash !== null,
      },
    );
    /* Commit store only from `apply` (no ad-hoc accept / destinationHash reads). */
    if (!shouldApplyPropagationStoreCommitNow(applyStepped.actions)) {
      return null;
    }

    const evictKeys = propagationStoreAcceptEvictKeys(actions) ?? [];
    for (const evictKey of evictKeys) {
      const entry = this.entries.get(evictKey);
      const evictStepped = stepEvictPropagationCatalogEntryWithActions(
        initialEvictPropagationCatalogEntryState(),
        {
          kind: "propagation/evict-catalog-entry-gate",
          entryPresent: entry !== undefined,
        },
      );
      if (shouldEvictPropagationCatalogEntryNow(evictStepped.actions)) {
        this.delete(entry!.transientId);
        this.evictions += 1;
      }
    }

    const storedAt = this.now();
    this.entries.set(input.key, {
      transientId: input.transientId,
      destinationHash: Uint8Array.from(input.destinationHash!),
      lxmfData: Uint8Array.from(input.lxmfData),
      storedAt,
      size: input.lxmfData.length,
    });
    this.usedBytes += input.lxmfData.length;
    this.schedulePersist();
    return input.transientId;
  }

  delete(transientId: Uint8Array): boolean {
    const key = Buffer.from(transientId).toString("hex");
    const entry = this.entries.get(key);
    const deleteStepped = stepDeletePropagationCatalogEntryWithActions(
      initialDeletePropagationCatalogEntryState(),
      {
        kind: "propagation/delete-catalog-entry-gate",
        entryPresent: entry !== undefined,
      },
    );
    if (!shouldDeletePropagationCatalogEntryNow(deleteStepped.actions)) {
      return false;
    }

    this.entries.delete(key);
    this.usedBytes -= entry!.size;
    this.schedulePersist();
    return true;
  }

  private restoreEntry(entry: PropagationStoredEntry): void {
    const key = Buffer.from(entry.transientId).toString("hex");
    const destinationHash = propagationDestinationHash(entry.lxmfData);
    const tooLargeStepped = stepPropagationMessageTooLargeWithActions(
      initialPropagationMessageTooLargeState(),
      {
        kind: "propagation/message-too-large-gate",
        messageBytes: entry.lxmfData.length,
        quotas: this.quotas,
      },
    );
    const stepped = stepPropagationRestoreWithActions(
      initialPropagationRestoreState(),
      {
        kind: "propagation/restore-gate",
        tooLarge: shouldTreatPropagationMessageTooLarge(
          tooLargeStepped.actions,
        ),
        alreadyStored: this.entries.has(key),
        destinationHashPresent: destinationHash !== null,
      },
    );
    const applyStepped = stepApplyPropagationRestoreWithActions(
      initialApplyPropagationRestoreState(),
      {
        kind: "propagation/apply-restore-gate",
        planAccept: shouldAcceptPropagationRestore(stepped.actions),
        destinationHashPresent: destinationHash !== null,
      },
    );
    /* Apply restore insert only from `apply` (no ad-hoc accept / destinationHash reads). */
    if (!shouldApplyPropagationRestoreNow(applyStepped.actions)) {
      return;
    }

    this.entries.set(key, {
      transientId: Uint8Array.from(entry.transientId),
      destinationHash: Uint8Array.from(destinationHash!),
      lxmfData: Uint8Array.from(entry.lxmfData),
      storedAt: entry.storedAt,
      size: entry.lxmfData.length,
    });
    this.usedBytes += entry.lxmfData.length;
  }

  private schedulePersist(): void {
    if (this.persistence === null && this.remoteMirror === null) {
      return;
    }

    const result = stepPersistDebounceWithActions(this.persistDebounceState, {
      kind: "persist/request",
    });
    this.persistDebounceState = result.state;

    for (const intent of result.intents) {
      if (intent.kind === "timer/cancel") {
        this.persistTimer?.cancel();
        this.persistTimer = null;
      } else if (
        intent.kind === "timer/set" &&
        intent.timer.id === "persist-debounce"
      ) {
        this.persistTimer?.cancel();
        this.persistTimer = this.schedule(intent.timer.delayMs, () => {
          this.persistTimer = null;
          const fired = stepPersistDebounceWithActions(
            this.persistDebounceState,
            {
              kind: "timer/fired",
              id: "persist-debounce",
              at: this.now(),
            },
          );
          this.persistDebounceState = fired.state;
          if (fired.actions.length > 0) {
            this.flushCatalog();
          }
        });
      }
    }
  }

  private flushCatalog(): void {
    const snapshot = this.snapshotEntries();
    this.persistence?.save(snapshot);
    if (this.remoteMirror === null) {
      return;
    }
    void Promise.resolve(this.remoteMirror.publish(snapshot)).catch(() => {
      // Mirror failures must not break the local store; hosts observe offline separately.
    });
  }

  /**
   * Pull remote mirrored entries into the local catalog (idempotent restore).
   * Returns the number of newly accepted entries.
   */
  async pullRemoteMirror(): Promise<number> {
    if (this.remoteMirror?.pull === undefined) {
      return 0;
    }
    const before = this.entries.size;
    const entries = await this.remoteMirror.pull();
    for (const entry of entries) {
      this.restoreEntry(entry);
    }
    return this.entries.size - before;
  }

  private snapshotEntries(): ReadonlyArray<PropagationStoredEntry> {
    return [...this.entries.values()].map((entry) => ({
      transientId: entry.transientId,
      lxmfData: entry.lxmfData,
      storedAt: entry.storedAt,
    }));
  }

  private evictOldest(): boolean {
    const selectStepped = stepSelectOldestPropagationKeyWithActions(
      initialSelectOldestPropagationKeyState(),
      {
        kind: "propagation/select-oldest-key-gate",
        entries: [...this.entries.entries()].map(([key, entry]) => ({
          key,
          size: entry.size,
          storedAt: entry.storedAt,
        })),
      },
    );
    const oldestKey = oldestPropagationKeyFromActions(selectStepped.actions);
    const oldest = oldestKey === null ? undefined : this.entries.get(oldestKey);
    const evictStepped = stepEvictOldestPropagationEntryWithActions(
      initialEvictOldestPropagationEntryState(),
      {
        kind: "propagation/evict-oldest-entry-gate",
        oldestKeyPresent: oldestKey !== null,
        entryPresent: oldest !== undefined,
      },
    );
    if (!shouldEvictOldestPropagationEntryNow(evictStepped.actions)) {
      return false;
    }

    this.delete(oldest!.transientId);
    this.evictions += 1;
    return true;
  }

  private allowClientRequest(clientKey: string): boolean {
    const stepped = stepAllowClientRequestWithActions(this.clientRateState, {
      kind: "rate/allow-gate",
      clientKey,
      at: this.now(),
    });
    this.clientRateState = stepped.state;
    return shouldAllowClientRequest(stepped.actions);
  }

  private handlePropagationLink(link: Link): void {
    link.callbacks.packet = (data) => {
      const unpackStepped = stepUnpackPropagationEnvelopeWithActions(
        initialUnpackPropagationEnvelopeState(),
        {
          kind: "lxmf-codec/unpack-propagation-envelope-gate",
          data,
        },
      );
      if (
        shouldRejectUnpackPropagationEnvelope(unpackStepped.actions) ||
        !shouldUseUnpackPropagationEnvelope(unpackStepped.actions)
      ) {
        return;
      }
      const fields = propagationEnvelopeFieldsFromActions(
        unpackStepped.actions,
      );
      if (fields === null) {
        return;
      }
      for (const lxmfData of fields.messages) {
        this.storePropagationData(lxmfData);
      }
    };
  }

  private handleGetRequest(
    data: Uint8Array | null,
    remoteIdentity: Identity | null,
  ): Uint8Array | null {
    const acceptStepped = stepAcceptPropagationGetRequestDataWithActions(
      initialAcceptPropagationGetRequestDataState(),
      {
        kind: "propagation/accept-get-request-data-gate",
        dataPresent: data !== null,
      },
    );
    if (!shouldAcceptPropagationGetRequestDataNow(acceptStepped.actions)) {
      return null;
    }

    const unpackStepped = stepUnpackPropagationRequestWithActions(
      initialUnpackPropagationRequestState(),
      {
        kind: "lxmf-codec/unpack-propagation-request-gate",
        data: data!,
      },
    );
    if (
      shouldRejectUnpackPropagationRequest(unpackStepped.actions) ||
      !shouldUseUnpackPropagationRequest(unpackStepped.actions)
    ) {
      return null;
    }
    const requestFields = propagationRequestFieldsFromActions(
      unpackStepped.actions,
    );
    if (requestFields === null) {
      return null;
    }
    const { wants, haves } = requestFields;

    const remoteDeliveryHash =
      remoteIdentity === null
        ? null
        : new Destination(this.provider, {
            identity: remoteIdentity,
            direction: DestinationDirection.OUT,
            type: DestinationType.SINGLE,
            appName: APP_NAME,
            aspects: ["delivery"],
          }).hash;

    const stepped = stepPropagationGetWithActions(
      initialPropagationGetState(),
      {
        kind: "get/received",
        wants,
        haves,
        remoteDeliveryHash,
        entries: [...this.entries.values()].map((entry) => ({
          transientId: entry.transientId,
          destinationHash: entry.destinationHash,
        })),
      },
    );
    return this.applyPropagationGetActions(stepped.actions);
  }

  private applyPropagationGetActions(
    actions: readonly PropagationGetAction[],
  ): Uint8Array | null {
    if (shouldListPropagationGetIds(actions)) {
      const transientIds = propagationGetListIds(actions) ?? [];
      return msgpackPackArray(transientIds.map((id) => msgpackPackBin(id)));
    }
    if (!shouldApplyPropagationGet(actions)) {
      return null;
    }

    const apply = propagationGetApplyIds(actions);
    if (apply === null) {
      return null;
    }

    for (const transientId of apply.deleteIds) {
      this.delete(transientId);
    }

    const messages = apply.fetchIds
      .map(
        (transientId) =>
          this.entries.get(Buffer.from(transientId).toString("hex")) ?? null,
      )
      .filter((entry): entry is StoredPropagationMessage => entry !== null)
      .map((entry) => entry.lxmfData);

    return msgpackPackArray(messages.map((message) => msgpackPackBin(message)));
  }
}

export function decodePropagationPeerError(
  response: Uint8Array,
): number | null {
  const stepped = stepDecodeLxmfPeerErrorWithActions(
    initialDecodeLxmfPeerErrorState(),
    {
      kind: "lxmf/peer-error-decode-gate",
      response,
    },
  );
  return lxmfPeerErrorFromActions(stepped.actions);
}
