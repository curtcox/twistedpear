import type { InstantMs, Intent, NodeId, TransportAdversaryAction } from "../../types.js";
import {
  sampleLatency,
  transportClass,
  type LinkConfig,
  type TransportClass
} from "./transport-classes.js";

export interface DeliveryModel {
  /** Extra delay in ms applied to each send. */
  readonly latencyMs?: number;
  /** Drop probability in [0, 1]. Uses injected rng. */
  readonly lossRate?: number;
}

export interface SimTransportConfig {
  readonly delivery?: DeliveryModel;
  readonly links?: readonly LinkConfig[];
}

export interface TransportStats {
  readonly sent: number;
  readonly dropped: number;
  readonly partitioned: number;
  readonly dutyCycleDropped: number;
  readonly dutyCycleDelayed: number;
  /** Messages actually changed by mediated adversary actions (not merely requested actions). */
  readonly adversaryDropped: number;
  readonly adversaryDelayed: number;
  readonly adversaryReordered: number;
  readonly adversaryDuplicated: number;
  readonly adversaryInjected: number;
  readonly serializedBytes: number;
  readonly airtimeMs: number;
}

export class UnauthorizedAdversaryPowerError extends Error {
  constructor(actor: NodeId, action: TransportAdversaryAction) {
    super(`${actor} cannot ${action.power} link ${action.source}->${action.destination}`);
    this.name = "UnauthorizedAdversaryPowerError";
  }
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
  private readonly occupiedUntil = new Map<string, InstantMs>();
  private readonly burstBad = new Map<string, boolean>();
  private sent = 0;
  private dropped = 0;
  private partitioned = 0;
  private dutyCycleDropped = 0;
  private dutyCycleDelayed = 0;
  private adversaryDropped = 0;
  private adversaryDelayed = 0;
  private adversaryReordered = 0;
  private adversaryDuplicated = 0;
  private adversaryInjected = 0;
  private serializedBytes = 0;
  private airtimeMs = 0;
  private seq = 0;
  private readonly config: SimTransportConfig;

  constructor(
    config: DeliveryModel | SimTransportConfig = {},
    private readonly rng: () => number = () => 0
  ) {
    this.config = "latencyMs" in config || "lossRate" in config
      ? { delivery: config }
      : config as SimTransportConfig;
  }

  applySend(intent: Intent, source: NodeId, now: InstantMs): void {
    if (intent.kind !== "transport/send") {
      return;
    }

    this.sent += 1;
    this.serializedBytes += intent.send.payload.byteLength;
    const destination = intent.send.destination as NodeId;
    const key = `${source}\u0000${destination}`;
    const model = this.modelFor(source, destination);

    if (model !== undefined) {
      if (model.partitions?.some((window) => now >= window.fromMs && now < window.toMs)) {
        this.partitioned += 1;
        this.dropped += 1;
        return;
      }
      if (this.shouldDropForLoss(key, model)) {
        this.dropped += 1;
        return;
      }
    } else {
      const loss = this.config.delivery?.lossRate ?? 0;
      if (loss > 0 && this.rng() < loss) {
        this.dropped += 1;
        return;
      }
    }

    const latency = model === undefined
      ? this.config.delivery?.latencyMs ?? 0
      : sampleLatency(model.latency, this.rng);
    const airtime = model === undefined
      ? 0
      : (intent.send.payload.byteLength * 8 * 1_000) / Math.max(1, model.bandwidthBps);
    let sendAt = Math.max(now, this.occupiedUntil.get(key) ?? now);
    if (model?.dutyCycle !== undefined && model.dutyCycle > 0 && model.dutyCycle < 1) {
      const dutyReadyAt = this.occupiedUntil.get(`${key}\u0000duty`) ?? now;
      if (dutyReadyAt > sendAt) {
        if (model.dutyCyclePolicy === "drop") {
          this.dutyCycleDropped += 1;
          this.dropped += 1;
          return;
        }
        this.dutyCycleDelayed += 1;
        sendAt = dutyReadyAt;
      }
      this.occupiedUntil.set(`${key}\u0000duty`, sendAt + airtime / model.dutyCycle);
    }
    this.airtimeMs += airtime;
    this.occupiedUntil.set(key, sendAt + airtime);
    this.queue.push({
      deliverAt: sendAt + airtime + latency,
      channel: intent.send.channel,
      source,
      destination,
      payload: intent.send.payload.slice()
    });
    this.seq += 1;
  }

  applyAdversary(action: TransportAdversaryAction, actor: NodeId, now: InstantMs): void {
    const link = this.config.links?.find(
      (candidate) => candidate.source === action.source && candidate.destination === action.destination
    );
    if (link?.adversary !== actor || !link.powers?.includes(action.power)) {
      throw new UnauthorizedAdversaryPowerError(actor, action);
    }
    const matches = (message: InFlightMessage) =>
      message.source === action.source && message.destination === action.destination;
    if (action.power === "drop") {
      const kept = this.queue.filter((message) => !matches(message));
      const affected = this.queue.length - kept.length;
      this.dropped += affected;
      this.adversaryDropped += affected;
      this.queue.length = 0;
      this.queue.push(...kept);
      return;
    }
    if (action.power === "delay") {
      this.adversaryDelayed += this.queue.filter(matches).length;
      const delay = Math.max(0, action.delayMs);
      const delayed = this.queue.map((message) => matches(message)
        ? { ...message, deliverAt: message.deliverAt + delay }
        : message);
      this.queue.length = 0;
      this.queue.push(...delayed);
      return;
    }
    if (action.power === "reorder") {
      const indexes = this.queue.map((message, index) => matches(message) ? index : -1).filter((index) => index >= 0);
      this.adversaryReordered += indexes.length;
      const deliverySlots = indexes.map((index) => this.queue[index]!.deliverAt).reverse();
      indexes.forEach((index, offset) => {
        this.queue[index] = { ...this.queue[index]!, deliverAt: deliverySlots[offset]! };
      });
      return;
    }
    if (action.power === "duplicate") {
      const copies = this.queue.filter(matches).map((message) => ({ ...message, payload: message.payload.slice() }));
      this.adversaryDuplicated += copies.length;
      this.queue.push(...copies);
      return;
    }
    this.adversaryInjected += 1;
    this.queue.push({
      deliverAt: now + Math.max(0, action.delayMs ?? 0),
      channel: action.channel,
      source: action.source,
      destination: action.destination,
      payload: action.payload.slice()
    });
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
        const model = this.modelFor(msg.source, msg.destination);
        if (model?.partitions?.some((window) => at >= window.fromMs && at < window.toMs)) {
          this.partitioned += 1;
          this.dropped += 1;
        } else {
          due.push(msg);
        }
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

  getStats(): TransportStats {
    return {
      sent: this.sent,
      dropped: this.dropped,
      partitioned: this.partitioned,
      dutyCycleDropped: this.dutyCycleDropped,
      dutyCycleDelayed: this.dutyCycleDelayed,
      adversaryDropped: this.adversaryDropped,
      adversaryDelayed: this.adversaryDelayed,
      adversaryReordered: this.adversaryReordered,
      adversaryDuplicated: this.adversaryDuplicated,
      adversaryInjected: this.adversaryInjected,
      serializedBytes: this.serializedBytes,
      airtimeMs: this.airtimeMs
    };
  }

  private modelFor(source: NodeId, destination: NodeId): TransportClass | undefined {
    const link = this.config.links?.find(
      (candidate) => candidate.source === source && candidate.destination === destination
    );
    return link === undefined ? undefined : transportClass(link.class, link.params);
  }

  private shouldDropForLoss(key: string, model: TransportClass): boolean {
    let lossRate = model.lossRate;
    const burst = model.burstLoss;
    if (burst !== undefined) {
      const bad = this.burstBad.get(key) ?? false;
      lossRate = bad ? burst.badLossRate : burst.goodLossRate;
      const changes = this.rng();
      this.burstBad.set(key, bad ? changes >= burst.badToGood : changes < burst.goodToBad);
    }
    return lossRate > 0 && this.rng() < lossRate;
  }
}
