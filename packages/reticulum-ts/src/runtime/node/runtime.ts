import type { Clock, KeyValueStore, Runtime, Timer } from "../runtime.js";
import { nodeTcpFactory, nodeUdpFactory } from "./sockets.js";

class NodeTimer implements Timer {
  constructor(private readonly timeout: NodeJS.Timeout) {}

  cancel(): void {
    clearTimeout(this.timeout);
  }
}

class NodeClock implements Clock {
  now(): number {
    return Date.now();
  }

  setTimeout(callback: () => void, milliseconds: number): Timer {
    return new NodeTimer(setTimeout(callback, milliseconds));
  }
}

class MemoryKeyValueStore implements KeyValueStore {
  private readonly values = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | undefined> {
    const value = this.values.get(key);
    return value === undefined ? undefined : Uint8Array.from(value);
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, Uint8Array.from(value));
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }
}

export function nodeRuntime(): Runtime {
  return {
    clock: new NodeClock(),
    store: new MemoryKeyValueStore(),
    tcp: nodeTcpFactory,
    udp: nodeUdpFactory
  };
}
