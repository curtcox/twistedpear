import type { Clock, Runtime, Timer } from "../runtime.js";
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

export interface BareRuntimeOptions {
  readonly storePath?: string;
}

export function bareRuntime(options: BareRuntimeOptions = {}): Runtime {
  return {
    clock: new BareClock(),
    store: new BareKeyValueStore({ rootPath: options.storePath ?? ".reticulum-store" }),
    tcp: bareTcpFactory,
    udp: bareUdpFactory
  };
}
