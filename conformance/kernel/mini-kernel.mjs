// Minimal independent implementation of the SPEC-KERNEL scheduler contract.
// Serves two purposes in the conformance runner: (1) a second implementation
// that must produce byte-identical traces to the reference SimKernel, and
// (2) the host for deliberately mis-ordered mutants (see misordered.mjs) that
// prove the runner's ordering fixtures actually bite.
//
// Supported alphabet: intents timer/set, timer/cancel, transport/send, log;
// events start, timer/fired, transport/recv. Store and entropy intents throw —
// ordering fixtures do not need them.

/**
 * @param {object} config - { seed, startMs?, nodes: [{id, initial, step}], delivery?: {latencyMs} }
 * @param {object} order - scheduling overrides used ONLY by mutants:
 *   timersFirst (default true), nodeOrder "asc"|"desc", timerIdOrder "asc"|"desc",
 *   transportPairOrder "asc"|"desc", ties "fifo"|"lifo".
 */
export class MiniKernel {
  constructor(config, order = {}) {
    this.order = {
      timersFirst: order.timersFirst ?? true,
      nodeOrder: order.nodeOrder ?? "asc",
      timerIdOrder: order.timerIdOrder ?? "asc",
      transportPairOrder: order.transportPairOrder ?? "asc",
      ties: order.ties ?? "fifo"
    };
    this.now = config.startMs ?? 0;
    this.latencyMs = config.delivery?.latencyMs ?? 0;
    this.trace = [];
    this.queue = [];
    this.seq = 0;
    this.nodes = new Map();
    for (const node of config.nodes) {
      this.nodes.set(node.id, {
        id: node.id,
        state: node.initial,
        step: node.step,
        timers: new Map()
      });
    }
  }

  getTrace() {
    return this.trace;
  }

  getNodeState(id) {
    return this.requireNode(id).state;
  }

  inject(nodeId, event) {
    this.dispatch(nodeId, event);
  }

  start() {
    const at = this.now;
    for (const id of [...this.nodes.keys()].sort()) {
      this.dispatch(id, { kind: "start", at });
    }
  }

  advanceTo(target) {
    let guard = 0;
    while (guard < 100_000) {
      guard += 1;
      const next = this.nextScheduledAt();
      if (next === undefined || next > target) {
        this.now = target;
        this.trace.push({ t: "advance", at: target });
        return;
      }
      this.now = next;
      this.trace.push({ t: "advance", at: next });
      this.deliverDue(next);
    }
    throw new Error("MiniKernel.advanceTo exceeded iteration guard");
  }

  runUntilIdle(until) {
    let guard = 0;
    while (guard < 100_000) {
      guard += 1;
      const next = this.nextScheduledAt();
      if (next === undefined || next > until) {
        return;
      }
      this.advanceTo(next);
    }
    throw new Error("MiniKernel.runUntilIdle exceeded iteration guard");
  }

  nextScheduledAt() {
    let soonest;
    for (const node of this.nodes.values()) {
      for (const fireAt of node.timers.values()) {
        if (soonest === undefined || fireAt < soonest) soonest = fireAt;
      }
    }
    for (const msg of this.queue) {
      if (soonest === undefined || msg.deliverAt < soonest) soonest = msg.deliverAt;
    }
    return soonest;
  }

  deliverDue(at) {
    if (this.order.timersFirst) {
      this.deliverTimers(at);
      this.deliverTransport(at);
    } else {
      this.deliverTransport(at);
      this.deliverTimers(at);
    }
  }

  deliverTimers(at) {
    const flip = this.order.nodeOrder === "desc" ? -1 : 1;
    const nodeIds = [...this.nodes.keys()].sort((a, b) => (a < b ? -flip : a > b ? flip : 0));
    for (const id of nodeIds) {
      const node = this.requireNode(id);
      const due = [...node.timers.entries()]
        .filter(([, fireAt]) => fireAt <= at)
        .map(([timerId]) => timerId)
        .sort();
      if (this.order.timerIdOrder === "desc") due.reverse();
      for (const timerId of due) {
        node.timers.delete(timerId);
        this.dispatch(id, { kind: "timer/fired", id: timerId, at });
      }
    }
  }

  deliverTransport(at) {
    const due = this.queue.filter((msg) => msg.deliverAt <= at);
    this.queue = this.queue.filter((msg) => msg.deliverAt > at);
    const flip = this.order.transportPairOrder === "desc" ? -1 : 1;
    const tie = this.order.ties === "lifo" ? -1 : 1;
    due.sort((a, b) => {
      if (a.deliverAt !== b.deliverAt) return a.deliverAt - b.deliverAt;
      if (a.source !== b.source) return a.source < b.source ? -flip : flip;
      if (a.destination !== b.destination) return a.destination < b.destination ? -flip : flip;
      return (a.seq - b.seq) * tie;
    });
    for (const msg of due) {
      this.dispatch(msg.destination, {
        kind: "transport/recv",
        channel: msg.channel,
        source: msg.source,
        payload: msg.payload,
        at
      });
    }
  }

  dispatch(nodeId, event) {
    const node = this.requireNode(nodeId);
    this.trace.push({ t: "event", node: nodeId, event });
    const result = node.step(node.state, event);
    node.state = result.state;
    for (const intent of result.intents) {
      this.trace.push({ t: "intent", node: nodeId, intent });
      this.applyIntent(node, intent);
    }
  }

  applyIntent(node, intent) {
    if (intent.kind === "timer/set") {
      node.timers.set(intent.timer.id, this.now + intent.timer.delayMs);
      return;
    }
    if (intent.kind === "timer/cancel") {
      node.timers.delete(intent.timer.id);
      return;
    }
    if (intent.kind === "transport/send") {
      this.queue.push({
        deliverAt: this.now + this.latencyMs,
        channel: intent.send.channel,
        source: node.id,
        destination: intent.send.destination,
        payload: intent.send.payload.slice(),
        seq: this.seq
      });
      this.seq += 1;
      return;
    }
    if (intent.kind === "log") {
      return;
    }
    throw new Error(`MiniKernel does not support intent kind: ${intent.kind}`);
  }

  requireNode(id) {
    const node = this.nodes.get(id);
    if (node === undefined) throw new Error(`unknown node: ${id}`);
    return node;
  }
}
