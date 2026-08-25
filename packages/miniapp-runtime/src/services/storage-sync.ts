import {
  capReplicaLogs,
  DEFAULT_REPLICA_AUTHOR_CAP,
  mergeReplicaLogs,
  replicaVersionVector,
  replicaVisibleView,
  type ReplicaEntry,
} from "@twistedpear/protocol";

export class ReplicaCapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplicaCapError";
  }
}

export interface TopicLogOptions {
  readonly authorId: string;
  readonly authorCap?: number;
}

export class TopicLogStore {
  private readonly logs = new Map<string, ReplicaEntry[]>();
  private readonly clocks = new Map<string, number>();
  private readonly authorId: string;
  private readonly authorCap: number;

  constructor(options: TopicLogOptions) {
    this.authorId = options.authorId;
    this.authorCap = options.authorCap ?? DEFAULT_REPLICA_AUTHOR_CAP;
  }

  open(topic: string): void {
    if (!this.logs.has(topic)) this.logs.set(topic, []);
  }

  append(
    topic: string,
    payload: unknown,
    extra: { readonly key?: string; readonly tombstone?: true } = {},
  ): ReplicaEntry {
    const log = this.require(topic);
    const seq = nextSeq(log, this.authorId);
    const at = (this.clocks.get(topic) ?? 0) + 1;
    const entry: ReplicaEntry = {
      authorId: this.authorId,
      seq,
      at,
      payload,
      ...extra,
    };
    const next = mergeReplicaLogs(log, [entry]);
    if (countAuthor(next, this.authorId) > this.authorCap) {
      throw new ReplicaCapError(
        `replica author cap ${this.authorCap} exceeded for ${topic}`,
      );
    }
    this.logs.set(topic, next);
    this.clocks.set(topic, at);
    return entry;
  }

  set(topic: string, key: string, payload: unknown): ReplicaEntry {
    return this.append(topic, payload, { key });
  }

  tombstone(topic: string, key: string): ReplicaEntry {
    return this.append(topic, null, { key, tombstone: true });
  }

  ingest(topic: string, remote: ReadonlyArray<ReplicaEntry>): void {
    const log = this.require(topic);
    const merged = capReplicaLogs(
      mergeReplicaLogs(log, remote),
      this.authorCap,
    );
    this.logs.set(topic, merged);
    const maxAt = merged.reduce((max, entry) => Math.max(max, entry.at), 0);
    this.clocks.set(topic, Math.max(this.clocks.get(topic) ?? 0, maxAt));
  }

  entries(topic: string): ReadonlyArray<ReplicaEntry> {
    return this.require(topic);
  }

  view(topic: string): ReadonlyMap<string, ReplicaEntry> {
    return replicaVisibleView(this.require(topic));
  }

  vector(topic: string): Readonly<Record<string, number>> {
    return replicaVersionVector(this.require(topic));
  }

  private require(topic: string): ReplicaEntry[] {
    const log = this.logs.get(topic);
    if (log === undefined) {
      throw new Error(`topic not open: ${topic}`);
    }
    return log;
  }
}

export function missingReplicaEntries(
  log: ReadonlyArray<ReplicaEntry>,
  remote: Readonly<Record<string, number>>,
): ReplicaEntry[] {
  return log.filter((entry) => entry.seq > (remote[entry.authorId] ?? 0));
}

export function replicaStoreFingerprint(
  store: TopicLogStore,
  topic: string,
): string {
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

export function replicaConvergeSteps(
  step: () => void,
  done: () => boolean,
  max: number,
  label: string,
): number {
  for (let i = 0; i < max; i++) {
    step();
    if (done()) return i + 1;
  }
  throw new Error(`${label} did not converge in ${max} steps`);
}

function nextSeq(log: ReadonlyArray<ReplicaEntry>, authorId: string): number {
  let max = 0;
  for (const entry of log) {
    if (entry.authorId === authorId) max = Math.max(max, entry.seq);
  }
  return max + 1;
}

function countAuthor(
  log: ReadonlyArray<ReplicaEntry>,
  authorId: string,
): number {
  return log.filter((entry) => entry.authorId === authorId).length;
}
