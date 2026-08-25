import type { ReplicaEntry } from "@twistedpear/protocol";
import type { EgressOffer, EgressTargetKind } from "@twistedpear/protocol";
import {
  assertEgressAllowed,
  type EgressBudgetLedger,
} from "../egress-enforcement.js";
import { TopicLogStore } from "./storage-sync.js";

const CAPABILITY = "storage:sync";

export type ReplicaEgressAuth = {
  readonly offers: ReadonlyMap<string, EgressOffer>;
  readonly appId: string;
  readonly targetKind: EgressTargetKind;
  readonly targetId: string;
  readonly at: () => number;
  readonly ledger: EgressBudgetLedger;
};

function missingEntries(
  log: ReadonlyArray<ReplicaEntry>,
  remote: Readonly<Record<string, number>>,
): ReplicaEntry[] {
  return log.filter((entry) => entry.seq > (remote[entry.authorId] ?? 0));
}

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

function fingerprint(store: TopicLogStore, topic: string): string {
  const vector = store.vector(topic);
  const clock = Object.keys(vector)
    .sort()
    .map((author) => `${author}:${vector[author]}`)
    .join(",");
  const view = [...store.view(topic).entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([key, entry]) => `${key}:${entry.authorId}:${entry.seq}`);
  return `${clock}|${view.join(",")}`;
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
    for (let i = 0; i < maxRounds; i++) {
      this.round();
      if (this.converged()) return i + 1;
    }
    throw new Error(`lxmf replica did not converge in ${maxRounds} rounds`);
  }

  converged(): boolean {
    return (
      fingerprint(this.local, this.topic) ===
      fingerprint(this.remote, this.topic)
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
    const missing = missingEntries(
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
