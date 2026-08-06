import type { Clock, Entropy, Runtime, Timer } from "../runtime.js";
import { BareKeyValueStore } from "./store.js";
import { bareTcpFactory, bareUdpFactory } from "./sockets.js";

class BareTimer implements Timer {
  constructor(private readonly timeout: ReturnType<typeof setTimeout>) {}

  cancel(): void {
    clearTimeout(this.timeout);
  }
}

class BareClock implements Clock {
  now(): number {
    return Date.now();
  }

  setTimeout(callback: () => void, milliseconds: number): Timer {
    return new BareTimer(setTimeout(callback, milliseconds));
  }
}

type GlobalCrypto = {
  getRandomValues: (array: Uint8Array) => Uint8Array;
};

class BareEntropy implements Entropy {
  randomBytes(length: number): Uint8Array {
    const out = new Uint8Array(length);
    const c = (globalThis as { crypto?: GlobalCrypto }).crypto;
    if (c !== undefined && typeof c.getRandomValues === "function") {
      c.getRandomValues(out);
      return out;
    }
    throw new Error("BareEntropy requires globalThis.crypto.getRandomValues");
  }
}

export interface BareRuntimeOptions {
  readonly storePath?: string;
  readonly clock?: Clock;
  readonly entropy?: Entropy;
}

export function bareRuntime(options: BareRuntimeOptions = {}): Runtime {
  return {
    clock: options.clock ?? new BareClock(),
    entropy: options.entropy ?? new BareEntropy(),
    store: new BareKeyValueStore({
      rootPath: options.storePath ?? ".reticulum-store",
    }),
    tcp: bareTcpFactory,
    udp: bareUdpFactory,
  };
}
