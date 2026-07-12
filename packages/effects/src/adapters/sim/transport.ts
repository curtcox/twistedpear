import type { InstantMs, Intent, NodeId } from "../../types.js";

export interface DeliveryModel {
  /** Extra delay in ms applied to each send. */
  readonly latencyMs?: number;
  /** Drop probability in [0, 1]. Uses injected rng. */
  readonly lossRate?: number;
}

export interface InFlightMessage {
  readonly deliverAt: InstantMs;
  readonly channel: string;
  readonly source: NodeId;
  readonly destination: NodeId;
  readonly payload: Uint8Array;
}

/**
 * In-memory multi-node transport with pluggable latency/loss.
 * Sends are intents; receives become events when the kernel advances time.
 */
export class SimTransport {
  private readonly queue: InFlightMessage[] = [];
  private seq = 0;

  constructor(
    private readonly model: DeliveryModel = {},
    private readonly rng: () => number = () => 0
  ) {}

  applySend(intent: Intent, source: NodeId, now: InstantMs): void {
    if (intent.kind !== "transport/send") {
      return;
    }

    const loss = this.model.lossRate ?? 0;
    if (loss > 0 && this.rng() < loss) {
      return;
    }

    const latency = this.model.latencyMs ?? 0;
    this.queue.push({
      deliverAt: now + latency,
      channel: intent.send.channel,
      source,
      destination: intent.send.destination as NodeId,
      payload: intent.send.payload.slice()
    });
    this.seq += 1;
  }

  nextDeliverAt(): InstantMs | undefined {
    let soonest: InstantMs | undefined;
    for (const msg of this.queue) {
      if (soonest === undefined || msg.deliverAt < soonest) {
        soonest = msg.deliverAt;
      }
    }
    return soonest;
  }

  deliverDue(at: InstantMs): InFlightMessage[] {
    const due: InFlightMessage[] = [];
    const rest: InFlightMessage[] = [];
    for (const msg of this.queue) {
      if (msg.deliverAt <= at) {
        due.push(msg);
      } else {
        rest.push(msg);
      }
    }
    this.queue.length = 0;
    this.queue.push(...rest);
    due.sort((a, b) => {
      if (a.deliverAt !== b.deliverAt) return a.deliverAt - b.deliverAt;
      if (a.source !== b.source) return a.source < b.source ? -1 : 1;
      if (a.destination !== b.destination) {
        return a.destination < b.destination ? -1 : 1;
      }
      return 0;
    });
    return due;
  }

  get inFlight(): number {
    return this.queue.length;
  }

  get sequence(): number {
    return this.seq;
  }
}
