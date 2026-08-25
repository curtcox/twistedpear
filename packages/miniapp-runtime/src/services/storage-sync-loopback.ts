import type { ReplicaEntry } from "@twistedpear/protocol";
import { TopicLogStore } from "./storage-sync.js";

/** Deterministic wire faults. Partition is toggled with `partition()` / `heal()`. */
export type LoopbackFault =
  "none" | "drop-first" | "delay" | "reorder" | "duplicate";

function missingEntries(
  log: ReadonlyArray<ReplicaEntry>,
  remote: Readonly<Record<string, number>>,
): ReplicaEntry[] {
  return log.filter((entry) => entry.seq > (remote[entry.authorId] ?? 0));
}

class Direction {
  private held: ReplicaEntry[] | undefined;
  private dropsLeft: number;

  constructor(private readonly fault: LoopbackFault) {
    this.dropsLeft = fault === "drop-first" ? 1 : 0;
  }

  send(entries: ReadonlyArray<ReplicaEntry>): ReplicaEntry[][] {
    if (entries.length === 0) return [];
    if (this.dropsLeft > 0) {
      this.dropsLeft -= 1;
      return [];
    }
    const batch = [...entries];
    if (this.fault === "delay") {
      const ready = this.held;
      this.held = batch;
      return ready === undefined ? [] : [ready];
    }
    if (this.fault === "duplicate") return [batch, batch];
    if (this.fault === "reorder") return [batch.reverse()];
    return [batch];
  }

  flush(): ReplicaEntry[][] {
    if (this.held === undefined) return [];
    const ready = this.held;
    this.held = undefined;
    return [ready];
  }
}

/**
 * Two in-process topic logs exchanging version-vector diffs. No radio,
 * clock, or timer: tests call `tick()` until `converged()`.
 */
export class LoopbackReplicaLink {
  private partitioned = false;
  private readonly east: Direction;
  private readonly west: Direction;

  constructor(
    readonly left: TopicLogStore,
    readonly right: TopicLogStore,
    readonly topic: string,
    fault: LoopbackFault = "none",
  ) {
    left.open(topic);
    right.open(topic);
    this.east = new Direction(fault);
    this.west = new Direction(fault);
  }

  partition(): void {
    this.partitioned = true;
  }

  heal(): void {
    this.partitioned = false;
  }

  tick(): void {
    if (this.partitioned) return;
    this.pump(this.left, this.right, this.east);
    this.pump(this.right, this.left, this.west);
  }

  converge(maxTicks = 24): number {
    for (let i = 0; i < maxTicks; i++) {
      this.tick();
      if (this.converged()) return i + 1;
    }
    throw new Error(`loopback replica did not converge in ${maxTicks} ticks`);
  }

  converged(): boolean {
    return snapshot(this.left, this.topic) === snapshot(this.right, this.topic);
  }

  private pump(
    from: TopicLogStore,
    to: TopicLogStore,
    direction: Direction,
  ): void {
    for (const batch of direction.flush()) to.ingest(this.topic, batch);
    const missing = missingEntries(
      from.entries(this.topic),
      to.vector(this.topic),
    );
    for (const batch of direction.send(missing)) {
      to.ingest(this.topic, batch);
    }
  }
}

function snapshot(store: TopicLogStore, topic: string): string {
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
