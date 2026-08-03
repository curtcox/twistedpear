// @ts-nocheck
// Reference adapters for the SPEC-ADAPTER pair suites: one real (host-API)
// and one simulated (kernel-owned) factory per family. New production
// adapters conform by passing the same suite these do.
import {
  SimClock,
  SimStore,
  SimTimers,
  SimTransport,
  Xoshiro128StarStar
} from "../../packages/effects/dist/adapters/sim/index.js";
import { RealClock, RealEntropy, RealTimers } from "../../packages/effects/dist/adapters/real/index.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const realAdapters = {
  clock: () => new RealClock(),
  entropy: () => new RealEntropy(),
  timers: () => {
    const timers = new RealTimers();
    return {
      set: (id, delayMs, onFire) => timers.set(id, delayMs, onFire),
      cancel: (id) => timers.cancel(id),
      settle: (maxMs) => sleep(maxMs)
    };
  },
  transport: () => {
    let deliver = () => {};
    return {
      onRecv: (cb) => {
        deliver = cb;
      },
      send: (source, send) => {
        setTimeout(() => {
          deliver({
            kind: "transport/recv",
            channel: send.channel,
            source,
            payload: send.payload.slice(),
            at: 0
          });
        }, 0);
      },
      settle: (maxMs) => sleep(Math.min(maxMs, 20))
    };
  },
  storage: () => {
    const data = new Map();
    return {
      apply: async (intent) => {
        await Promise.resolve(); // async completion, like a platform store
        if (intent.kind === "store/read") {
          const value = data.get(intent.read.key);
          return [{ kind: "store/value", key: intent.read.key, value: value?.slice() }];
        }
        if (intent.kind === "store/write") {
          data.set(intent.write.key, intent.write.value.slice());
          return [{ kind: "store/done", key: intent.write.key, op: "write" }];
        }
        if (intent.kind === "store/delete") {
          data.delete(intent.del.key);
          return [{ kind: "store/done", key: intent.del.key, op: "delete" }];
        }
        return [];
      }
    };
  },
  logging: () => {
    const records = [];
    return {
      emit: (intent) => records.push({ level: intent.level, message: intent.message }),
      records: () => records
    };
  }
};

export const simAdapters = {
  clock: () => {
    const clock = new SimClock(0);
    let next = 0;
    return {
      now: () => {
        clock.set(next);
        next += 5; // scripted virtual schedule
        return clock.now();
      }
    };
  },
  entropy: () => new Xoshiro128StarStar(0xdecafbad),
  timers: () => {
    const clock = new SimClock(0);
    const timers = new SimTimers(clock);
    const callbacks = new Map();
    return {
      set: (id, delayMs, onFire) => {
        callbacks.set(id, onFire);
        timers.applyIntent({ kind: "timer/set", timer: { id, delayMs } });
      },
      cancel: (id) => {
        callbacks.delete(id);
        timers.applyIntent({ kind: "timer/cancel", timer: { id } });
      },
      settle: (maxMs) => {
        let guard = 0;
        for (;;) {
          guard += 1;
          if (guard > 100_000) throw new Error("sim timers settle guard");
          const next = timers.nextFireAt();
          if (next === undefined || next > maxMs) return Promise.resolve();
          clock.set(next);
          for (const id of timers.dueAt(next)) {
            callbacks.get(id)?.();
            callbacks.delete(id);
          }
        }
      }
    };
  },
  transport: () => {
    const clock = new SimClock(0);
    const transport = new SimTransport({ delivery: { latencyMs: 1 } }, () => 0);
    let deliver = () => {};
    return {
      onRecv: (cb) => {
        deliver = cb;
      },
      send: (source, send) => {
        transport.applySend({ kind: "transport/send", send }, source, clock.now());
      },
      settle: (maxMs) => {
        let guard = 0;
        for (;;) {
          guard += 1;
          if (guard > 100_000) throw new Error("sim transport settle guard");
          const next = transport.nextDeliverAt();
          if (next === undefined || next > maxMs) return Promise.resolve();
          clock.set(next);
          for (const msg of transport.deliverDue(next)) {
            deliver({
              kind: "transport/recv",
              channel: msg.channel,
              source: msg.source,
              payload: msg.payload,
              at: next
            });
          }
        }
      }
    };
  },
  storage: () => {
    const store = new SimStore();
    return {
      apply: (intent) => Promise.resolve(store.applyIntent(intent))
    };
  },
  logging: () => {
    // The sim records log intents in the trace; observation is the same list.
    const trace = [];
    return {
      emit: (intent) => trace.push({ t: "intent", node: "n", intent }),
      records: () => trace.map((entry) => ({ level: entry.intent.level, message: entry.intent.message }))
    };
  }
};
