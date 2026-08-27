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

function rejectDuplicate(
  existing: ReplicaEntry | undefined,
  entry: ReplicaEntry,
): ReplicaAdmitReason | null {
  if (existing === undefined) return null;
  return samePayload(existing, entry) ? null : "conflict";
}

function rejectAuthor(
  entry: ReplicaEntry,
  options: ReplicaAdmitOptions,
): ReplicaAdmitReason | null {
  if (entry.authorId === options.localAuthorId) return "forged-author";
  if (
    options.fromAuthorId !== undefined &&
    entry.authorId !== options.fromAuthorId
  ) {
    return "forged-author";
  }
  if (
    options.offeredAuthors !== undefined &&
    !options.offeredAuthors.has(entry.authorId)
  ) {
    return "unoffered-author";
  }
  return null;
}

function rejectTombstone(
  entry: ReplicaEntry,
  local: ReadonlyArray<ReplicaEntry>,
  accepted: ReadonlyArray<ReplicaEntry>,
): ReplicaAdmitReason | null {
  if (entry.tombstone !== true || entry.key === undefined) return null;
  const winner = replicaLwwView([...local, ...accepted]).get(entry.key);
  if (winner !== undefined && winner.authorId !== entry.authorId) {
    return "cross-author-tombstone";
  }
  return null;
}

function classifyEntry(
  entry: ReplicaEntry,
  existing: ReplicaEntry | undefined,
  local: ReadonlyArray<ReplicaEntry>,
  accepted: ReadonlyArray<ReplicaEntry>,
  options: ReplicaAdmitOptions,
): ReplicaAdmitReason | null {
  return (
    rejectDuplicate(existing, entry) ??
    rejectAuthor(entry, options) ??
    rejectTombstone(entry, local, accepted)
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

  for (const entry of remote) {
    const id = replicaEntryId(entry);
    const existing = byId.get(id);
    const reason = classifyEntry(entry, existing, local, accepted, options);
    if (reason !== null) {
      rejected.push({ entry, reason });
      continue;
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
