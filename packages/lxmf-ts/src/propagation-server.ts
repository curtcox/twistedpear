import type { CryptoProvider, Identity, RegisteredDestination } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationAllowPolicy,
  DestinationDirection,
  DestinationType,
  Identity as RnsIdentity,
  type Link
} from "@twistedpear/reticulum-ts";
import { APP_NAME, MESSAGE_GET_PATH, PeerError } from "./constants.js";
import {
  msgpackPackArray,
  msgpackPackUInt,
  msgpackPackBin,
  msgpackUnpack,
  msgpackUnpackMessageList,
  msgpackUnpackPropagationEnvelope,
  msgpackUnpackPropagationRequest,
  msgpackUnpackTransientIdList
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
  perClientRequestsPerMinute: 120
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

/** Production propagation-node server with quotas and eviction. */
export class PropagationServer {
  private readonly entries = new Map<string, StoredPropagationMessage>();
  private usedBytes = 0;
  private evictions = 0;
  private readonly clientBuckets = new Map<string, { count: number; windowStart: number }>();

  constructor(
    private readonly provider: CryptoProvider,
    private readonly quotas: PropagationServerQuotas = DEFAULT_PROPAGATION_QUOTAS
  ) {}

  get stats(): PropagationServerStats {
    return {
      messageCount: this.entries.size,
      usedBytes: this.usedBytes,
      quotaBytes: this.quotas.maxBytes,
      evictions: this.evictions
    };
  }

  registerHandlers(destination: RegisteredDestination): void {
    destination.registerRequestHandler(
      MESSAGE_GET_PATH,
      (_path, data, _requestId, _linkId, remoteIdentity) => {
        const clientKey = remoteIdentity === null ? "anonymous" : Buffer.from(remoteIdentity.hash).toString("hex");
        if (!this.allowClientRequest(clientKey)) {
          return msgpackPackUInt(PeerError.NO_ACCESS);
        }

        return this.handleGetRequest(data, remoteIdentity);
      },
      DestinationAllowPolicy.ALLOW_ALL
    );

    destination.setLinkEstablishedCallback((link) => {
      this.handlePropagationLink(link);
    });
  }

  storePropagationData(lxmfData: Uint8Array): Uint8Array | null {
    if (lxmfData.length > this.quotas.maxMessageBytes) {
      return null;
    }

    const transientId = RnsIdentity.fullHash(this.provider, lxmfData);
    const key = Buffer.from(transientId).toString("hex");
    if (this.entries.has(key)) {
      return transientId;
    }

    while (
      this.entries.size >= this.quotas.maxMessages ||
      this.usedBytes + lxmfData.length > this.quotas.maxBytes
    ) {
      if (!this.evictOldest()) {
        return null;
      }
    }

    const destinationHash = lxmfData.subarray(0, 16);
    this.entries.set(key, {
      transientId,
      destinationHash,
      lxmfData: Uint8Array.from(lxmfData),
      storedAt: Date.now(),
      size: lxmfData.length
    });
    this.usedBytes += lxmfData.length;
    return transientId;
  }

  delete(transientId: Uint8Array): boolean {
    const key = Buffer.from(transientId).toString("hex");
    const entry = this.entries.get(key);
    if (entry === undefined) {
      return false;
    }

    this.entries.delete(key);
    this.usedBytes -= entry.size;
    return true;
  }

  private evictOldest(): boolean {
    let oldest: StoredPropagationMessage | null = null;
    for (const entry of this.entries.values()) {
      if (oldest === null || entry.storedAt < oldest.storedAt) {
        oldest = entry;
      }
    }

    if (oldest === null) {
      return false;
    }

    this.delete(oldest.transientId);
    this.evictions += 1;
    return true;
  }

  private allowClientRequest(clientKey: string): boolean {
    const now = Date.now();
    const bucket = this.clientBuckets.get(clientKey) ?? { count: 0, windowStart: now };
    const next =
      now - bucket.windowStart >= 60_000
        ? { count: 1, windowStart: now }
        : { count: bucket.count + 1, windowStart: bucket.windowStart };

    this.clientBuckets.set(clientKey, next);
    return next.count <= this.quotas.perClientRequestsPerMinute;
  }

  private handlePropagationLink(link: Link): void {
    link.callbacks.packet = (data) => {
      try {
        const messages = msgpackUnpackPropagationEnvelope(data);
        for (const lxmfData of messages) {
          this.storePropagationData(lxmfData);
        }
      } catch {
        // Ignore malformed propagation envelopes.
      }
    };
  }

  private handleGetRequest(data: Uint8Array | null, remoteIdentity: Identity | null): Uint8Array | null {
    if (data === null) {
      return null;
    }

    let wants: ReadonlyArray<Uint8Array> | null;
    let haves: ReadonlyArray<Uint8Array> | null;
    try {
      [wants, haves] = msgpackUnpackPropagationRequest(data);
    } catch {
      return null;
    }

    const remoteDeliveryHash =
      remoteIdentity === null
        ? null
        : new Destination(this.provider, {
            identity: remoteIdentity,
            direction: DestinationDirection.OUT,
            type: DestinationType.SINGLE,
            appName: APP_NAME,
            aspects: ["delivery"]
          }).hash;

    if (wants === null && haves === null) {
      const ids = [...this.entries.values()]
        .filter((entry) => remoteDeliveryHash === null || equalDestinationHash(entry.destinationHash, remoteDeliveryHash))
        .map((entry) => entry.transientId);
      return msgpackPackArray(ids.map((id) => msgpackPackBin(id)));
    }

    if (haves !== null) {
      for (const transientId of haves) {
        this.delete(transientId);
      }
    }

    if (wants === null || wants.length === 0) {
      return msgpackPackArray([]);
    }

    const messages = wants
      .map((transientId) => this.entries.get(Buffer.from(transientId).toString("hex")) ?? null)
      .filter(
        (entry): entry is StoredPropagationMessage =>
          entry !== null &&
          (remoteDeliveryHash === null || equalDestinationHash(entry.destinationHash, remoteDeliveryHash))
      )
      .map((entry) => entry.lxmfData);

    return msgpackPackArray(messages.map((message) => msgpackPackBin(message)));
  }
}

function equalDestinationHash(left: Uint8Array, right: Uint8Array): boolean {
  return Buffer.from(left).equals(Buffer.from(right));
}

export function decodePropagationPeerError(response: Uint8Array): number | null {
  try {
    const value = msgpackUnpack(response);
    if (value.type === "int" && (value.int === PeerError.NO_IDENTITY || value.int === PeerError.NO_ACCESS)) {
      return value.int;
    }
  } catch {
    // Not an error payload.
  }

  return null;
}
