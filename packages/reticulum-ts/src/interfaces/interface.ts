import type { Packet } from "../packet.js";
import { decodeHdlcFrames, encodeHdlcFrame, type HdlcDecodeState } from "./framing.js";

export interface ReticulumInterfaceOptions {
  readonly name: string;
  readonly mtu?: number;
  readonly bitrate?: number | null;
}

export interface PacketInterface {
  readonly name: string;
  readonly mtu: number;
  readonly bitrate: number | null;
  readonly packets: AsyncIterable<Packet>;
  send(packet: Packet): Promise<void>;
  close(): Promise<void>;
}

export abstract class AbstractPacketInterface implements PacketInterface {
  readonly name: string;
  readonly mtu: number;
  readonly bitrate: number | null;

  private readonly queue = new AsyncPacketQueue();
  private decodeState: HdlcDecodeState = {};
  private closed = false;

  protected constructor(options: ReticulumInterfaceOptions) {
    if (options.name.length === 0) {
      throw new Error("Interface name cannot be empty");
    }

    this.name = options.name;
    this.mtu = options.mtu ?? 500;
    this.bitrate = options.bitrate ?? null;
  }

  get packets(): AsyncIterable<Packet> {
    return this.queue;
  }

  async send(packet: Packet): Promise<void> {
    if (this.closed) {
      throw new Error(`Interface ${this.name} is closed`);
    }

    if (packet.raw.length > this.mtu) {
      throw new Error(`Packet exceeds interface MTU (${packet.raw.length} > ${this.mtu})`);
    }

    await this.writeFrame(encodeHdlcFrame(packet.raw));
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.queue.close();
    await this.closeInterface();
  }

  protected receiveFramedBytes(bytes: Uint8Array): void {
    if (this.closed) {
      return;
    }

    const decoded = decodeHdlcFrames(bytes, this.decodeState);
    this.decodeState = {
      buffer: decoded.buffer,
      inEscape: decoded.inEscape
    };

    for (const frame of decoded.frames) {
      const packet = this.decodePacket(frame);
      if (packet !== null) {
        this.queue.push(packet);
      }
    }
  }

  protected abstract decodePacket(frame: Uint8Array): Packet | null;
  protected abstract writeFrame(frame: Uint8Array): Promise<void>;
  protected abstract closeInterface(): Promise<void>;
}

class AsyncPacketQueue implements AsyncIterable<Packet> {
  private readonly values: Packet[] = [];
  private readonly waiters: Array<(result: IteratorResult<Packet>) => void> = [];
  private closed = false;

  push(packet: Packet): void {
    const waiter = this.waiters.shift();
    if (waiter !== undefined) {
      waiter({ done: false, value: packet });
      return;
    }

    this.values.push(packet);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    for (const waiter of this.waiters.splice(0)) {
      waiter({ done: true, value: undefined });
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<Packet> {
    return {
      next: async () => {
        const value = this.values.shift();
        if (value !== undefined) {
          return { done: false, value };
        }

        if (this.closed) {
          return { done: true, value: undefined };
        }

        return new Promise<IteratorResult<Packet>>((resolve) => {
          this.waiters.push(resolve);
        });
      }
    };
  }
}
