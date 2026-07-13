import { randomBytes as nodeRandomBytes } from "node:crypto";
import type { Clock, Entropy, KeyValueStore, Runtime, Timer } from "../runtime.js";
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

class NodeEntropy implements Entropy {
  randomBytes(length: number): Uint8Array {
    return new Uint8Array(nodeRandomBytes(length));
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

export interface NodeRuntimeOptions {
  readonly clock?: Clock;
  readonly entropy?: Entropy;
}

export function nodeRuntime(options: NodeRuntimeOptions = {}): Runtime {
  return {
    clock: options.clock ?? new NodeClock(),
    entropy: options.entropy ?? new NodeEntropy(),
    store: new MemoryKeyValueStore(),
    tcp: nodeTcpFactory,
    udp: nodeUdpFactory
  };
}
