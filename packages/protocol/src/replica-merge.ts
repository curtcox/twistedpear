export const DEFAULT_REPLICA_AUTHOR_CAP = 256;

export interface ReplicaEntry {
  readonly authorId: string;
  readonly seq: number;
  readonly at: number;
  readonly payload: unknown;
  readonly key?: string;
  readonly tombstone?: true;
}

export function replicaEntryId(entry: ReplicaEntry): string {
  return `${entry.authorId}:${entry.seq}`;
}

function compareEntries(left: ReplicaEntry, right: ReplicaEntry): number {
  if (left.authorId !== right.authorId) {
    return left.authorId < right.authorId ? -1 : 1;
  }
  return left.seq - right.seq;
}

function sameEntry(left: ReplicaEntry, right: ReplicaEntry): boolean {
  return (
    left.authorId === right.authorId &&
    left.seq === right.seq &&
    left.at === right.at &&
    left.key === right.key &&
    left.tombstone === right.tombstone &&
    JSON.stringify(left.payload) === JSON.stringify(right.payload)
  );
}

export function mergeReplicaLogs(
  left: ReadonlyArray<ReplicaEntry>,
  right: ReadonlyArray<ReplicaEntry>,
): ReplicaEntry[] {
  const byId = new Map<string, ReplicaEntry>();
  for (const entry of [...left, ...right]) {
    const id = replicaEntryId(entry);
    const existing = byId.get(id);
    if (existing !== undefined && !sameEntry(existing, entry)) {
      throw new Error(`conflicting replica entry ${id}`);
    }
    byId.set(id, existing ?? entry);
  }
  return [...byId.values()].sort(compareEntries);
}

export function replicaVersionVector(
  entries: ReadonlyArray<ReplicaEntry>,
): Readonly<Record<string, number>> {
  const vector: Record<string, number> = {};
  for (const entry of entries) {
    vector[entry.authorId] = Math.max(vector[entry.authorId] ?? 0, entry.seq);
  }
  return vector;
}

function lwwWins(candidate: ReplicaEntry, current: ReplicaEntry): boolean {
  if (candidate.at !== current.at) return candidate.at > current.at;
  return candidate.authorId > current.authorId;
}

export function replicaLwwView(
  entries: ReadonlyArray<ReplicaEntry>,
): ReadonlyMap<string, ReplicaEntry> {
  const view = new Map<string, ReplicaEntry>();
  for (const entry of entries) {
    if (entry.key === undefined) continue;
    const current = view.get(entry.key);
    if (current === undefined || lwwWins(entry, current)) {
      view.set(entry.key, entry);
    }
  }
  return view;
}

export function replicaVisibleView(
  entries: ReadonlyArray<ReplicaEntry>,
): ReadonlyMap<string, ReplicaEntry> {
  const view = new Map(replicaLwwView(entries));
  for (const [key, entry] of view) {
    if (entry.tombstone === true) view.delete(key);
  }
  return view;
}

export function capReplicaLogs(
  entries: ReadonlyArray<ReplicaEntry>,
  cap = DEFAULT_REPLICA_AUTHOR_CAP,
): ReplicaEntry[] {
  const byAuthor = new Map<string, ReplicaEntry[]>();
  for (const entry of mergeReplicaLogs(entries, [])) {
    const list = byAuthor.get(entry.authorId) ?? [];
    list.push(entry);
    byAuthor.set(entry.authorId, list);
  }
  const kept: ReplicaEntry[] = [];
  for (const list of byAuthor.values()) {
    list.sort((a, b) => a.seq - b.seq);
    kept.push(...list.slice(Math.max(0, list.length - cap)));
  }
  return kept.sort(compareEntries);
}
