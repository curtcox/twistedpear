// Deliberately non-conforming adapters, one per family. They mutation-test
// the pair suites: each canary must fail its family's suite when paired with
// the simulated reference.
import { realAdapters } from "./adapters.mjs";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const canaryAdapters = {
  "clock-goes-backwards": {
    family: "clock",
    factory: () => {
      let value = 100;
      return { now: () => (value -= 10) };
    },
  },
  "entropy-constant": {
    family: "entropy",
    factory: () => ({
      randomBytes: (n) => new Uint8Array(n), // all zeros, every call identical
    }),
  },
  "timers-ignore-cancel": {
    family: "timers",
    factory: () => {
      const base = realAdapters.timers();
      return { set: base.set, cancel: () => {}, settle: base.settle };
    },
  },
  "transport-reorders": {
    family: "transport",
    factory: () => {
      let deliver = () => {};
      const queue = [];
      return {
        onRecv: (cb) => {
          deliver = cb;
        },
        send: (source, send) => {
          queue.push({ source, send });
        },
        settle: async () => {
          await sleep(1);
          for (const { source, send } of queue.reverse()) {
            deliver({
              kind: "transport/recv",
              channel: send.channel,
              source,
              payload: send.payload,
              at: 0,
            });
          }
        },
      };
    },
  },
  "storage-corrupts-bytes": {
    family: "storage",
    factory: () => {
      const base = realAdapters.storage();
      return {
        apply: async (intent) => {
          const events = await base.apply(intent);
          return events.map((event) =>
            event.kind === "store/value" && event.value !== undefined
              ? { ...event, value: event.value.map((b) => b ^ 0xff) }
              : event,
          );
        },
      };
    },
  },
  "logging-drops-warnings": {
    family: "logging",
    factory: () => {
      const records = [];
      return {
        emit: (intent) => {
          if (intent.level !== "warn")
            records.push({ level: intent.level, message: intent.message });
        },
        records: () => records,
      };
    },
  },
};
