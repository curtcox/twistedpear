import type { EgressOffer, EgressTargetKind } from "@twistedpear/protocol";
import {
  assertEgressAllowed,
  type EgressBudgetLedger,
} from "../egress-enforcement.js";
import {
  missingReplicaEntries,
  replicaConvergeSteps,
  replicaStoreFingerprint,
  TopicLogStore,
} from "./storage-sync.js";

const CAPABILITY = "storage:sync";

export type ReplicaEgressAuth = {
  readonly offers: ReadonlyMap<string, EgressOffer>;
  readonly appId: string;
  readonly targetKind: EgressTargetKind;
  readonly targetId: string;
  readonly at: () => number;
  readonly ledger: EgressBudgetLedger;
};

function encodedBytes(body: unknown): number {
  return new TextEncoder().encode(JSON.stringify(body)).length;
}

function emit(auth: ReplicaEgressAuth, body: unknown): number {
  const bytes = encodedBytes(body);
  assertEgressAllowed({
    offers: auth.offers,
    appId: auth.appId,
    capability: CAPABILITY,
    targetKind: auth.targetKind,
    targetId: auth.targetId,
    at: auth.at(),
    bytes,
    ledger: auth.ledger,
  });
  return bytes;
}

/**
 * Two topic logs exchanging version-vector digests and missing entries as
 * LXMF frames. Each frame is offer-bound and metered; apps cannot force a
 * round. Tests supply an in-process peer — the wire is the frame size.
 */
export class LxmfReplicaLink {
  constructor(
    readonly local: TopicLogStore,
    readonly remote: TopicLogStore,
    readonly topic: string,
    private readonly localAuth: ReplicaEgressAuth,
    private readonly remoteAuth: ReplicaEgressAuth,
  ) {
    local.open(topic);
    remote.open(topic);
  }

  round(): number {
    return (
      this.push(this.local, this.remote, this.localAuth) +
      this.push(this.remote, this.local, this.remoteAuth)
    );
  }

  converge(maxRounds = 8): number {
    return replicaConvergeSteps(
      () => this.round(),
      () => this.converged(),
      maxRounds,
      "lxmf replica",
    );
  }

  converged(): boolean {
    return (
      replicaStoreFingerprint(this.local, this.topic) ===
      replicaStoreFingerprint(this.remote, this.topic)
    );
  }

  private push(
    from: TopicLogStore,
    to: TopicLogStore,
    auth: ReplicaEgressAuth,
  ): number {
    const digestBytes = emit(auth, {
      kind: "digest",
      topic: this.topic,
      vector: from.vector(this.topic),
    });
    const missing = missingReplicaEntries(
      from.entries(this.topic),
      to.vector(this.topic),
    );
    const entryBytes = emit(auth, {
      kind: "entries",
      topic: this.topic,
      entries: missing,
    });
    to.ingest(this.topic, missing);
    return digestBytes + entryBytes;
  }
}
