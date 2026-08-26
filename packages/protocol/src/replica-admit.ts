import {
  replicaEntryId,
  replicaLwwView,
  type ReplicaEntry,
} from "./replica-merge.js";

export type ReplicaAdmitReason =
  "forged-author" | "unoffered-author" | "cross-author-tombstone" | "conflict";

export interface ReplicaAdmitRejection {
  readonly entry: ReplicaEntry;
  readonly reason: ReplicaAdmitReason;
}

export interface ReplicaAdmitResult {
  readonly accepted: ReplicaEntry[];
  readonly rejected: ReplicaAdmitRejection[];
}

export interface ReplicaAdmitOptions {
  readonly localAuthorId: string;
  readonly fromAuthorId?: string;
  readonly offeredAuthors?: ReadonlySet<string>;
}

function samePayload(left: ReplicaEntry, right: ReplicaEntry): boolean {
  return (
    left.at === right.at &&
    left.key === right.key &&
    left.tombstone === right.tombstone &&
    JSON.stringify(left.payload) === JSON.stringify(right.payload)
  );
}

export function admitReplicaEntries(
  local: ReadonlyArray<ReplicaEntry>,
  remote: ReadonlyArray<ReplicaEntry>,
  options: ReplicaAdmitOptions,
): ReplicaAdmitResult {
  const byId = new Map(local.map((entry) => [replicaEntryId(entry), entry]));
  const accepted: ReplicaEntry[] = [];
  const rejected: ReplicaAdmitRejection[] = [];
  const offered = options.offeredAuthors;

  for (const entry of remote) {
    const id = replicaEntryId(entry);
    const existing = byId.get(id);
    if (existing !== undefined) {
      if (!samePayload(existing, entry)) {
        rejected.push({ entry, reason: "conflict" });
      }
      continue;
    }
    if (entry.authorId === options.localAuthorId) {
      rejected.push({ entry, reason: "forged-author" });
      continue;
    }
    if (
      options.fromAuthorId !== undefined &&
      entry.authorId !== options.fromAuthorId
    ) {
      rejected.push({ entry, reason: "forged-author" });
      continue;
    }
    if (offered !== undefined && !offered.has(entry.authorId)) {
      rejected.push({ entry, reason: "unoffered-author" });
      continue;
    }
    if (entry.tombstone === true && entry.key !== undefined) {
      const winner = replicaLwwView([...local, ...accepted]).get(entry.key);
      if (winner !== undefined && winner.authorId !== entry.authorId) {
        rejected.push({ entry, reason: "cross-author-tombstone" });
        continue;
      }
    }
    accepted.push(entry);
    byId.set(id, entry);
  }
  return { accepted, rejected };
}

export function replicaRetentionWindows(
  entries: ReadonlyArray<ReplicaEntry>,
): Readonly<
  Record<string, { readonly minSeq: number; readonly maxSeq: number }>
> {
  const windows: Record<string, { minSeq: number; maxSeq: number }> = {};
  for (const entry of entries) {
    const current = windows[entry.authorId];
    if (current === undefined) {
      windows[entry.authorId] = { minSeq: entry.seq, maxSeq: entry.seq };
    } else {
      current.minSeq = Math.min(current.minSeq, entry.seq);
      current.maxSeq = Math.max(current.maxSeq, entry.seq);
    }
  }
  return windows;
}
