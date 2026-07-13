import {
  canInterfaceSend,
  isInterfaceClosed,
  isValidInterfaceName,
  packetFitsInterfaceMtu,
  shouldEnqueueRawInterfaceFrame
} from "@twistedpear/protocol";
import type { Packet } from "../packet.js";
import { decodeHdlcFrames, encodeHdlcFrame, type HdlcDecodeState } from "./framing.js";

export interface ReticulumInterfaceOptions {
  readonly name: string;
  readonly mtu?: number;
  readonly bitrate?: number | null;
  /** Whether this interface may send outbound packets. Mirrors RNS interface `outgoing` config. */
  readonly outgoing?: boolean;
}

export interface PacketInterface {
  readonly name: string;
  readonly mtu: number;
  readonly bitrate: number | null;
  readonly incoming: boolean;
  readonly outgoing: boolean;
  readonly online: boolean;
  readonly packets: AsyncIterable<Packet>;
  send(packet: Packet): Promise<void>;
  close(): Promise<void>;
}

export abstract class AbstractPacketInterface implements PacketInterface {
  readonly name: string;
  readonly mtu: number;
  readonly bitrate: number | null;
  readonly incoming: boolean;
  readonly outgoing: boolean;
  online = false;

  private readonly queue = new AsyncPacketQueue();
  private closed = false;

  protected constructor(options: ReticulumInterfaceOptions, incoming = true, outgoing = options.outgoing ?? true) {
    if (!isValidInterfaceName(options.name)) {
      throw new Error("Interface name cannot be empty");
    }

    this.name = options.name;
    this.mtu = options.mtu ?? 500;
    this.bitrate = options.bitrate ?? null;
    this.incoming = incoming;
    this.outgoing = outgoing;
  }

  get packets(): AsyncIterable<Packet> {
    return this.queue;
  }

  async send(packet: Packet): Promise<void> {
    if (!canInterfaceSend({ closed: this.closed, outgoing: this.outgoing })) {
      if (isInterfaceClosed(this.closed)) {
        throw new Error(`Interface ${this.name} is closed`);
      }
      throw new Error(`Interface ${this.name} is not configured for outbound traffic`);
    }

    if (!packetFitsInterfaceMtu(packet.raw.length, this.mtu)) {
      throw new Error(`Packet exceeds interface MTU (${packet.raw.length} > ${this.mtu})`);
    }

    await this.writeBytes(this.encodeOutgoing(packet.raw));
  }

  async close(): Promise<void> {
    if (isInterfaceClosed(this.closed)) {
      return;
    }

    this.closed = true;
    this.online = false;
    this.queue.close();
    await this.closeInterface();
  }

  protected receiveBytes(bytes: Uint8Array): void {
    if (isInterfaceClosed(this.closed)) {
      return;
    }

    for (const frame of this.decodeIncoming(bytes)) {
      const packet = this.decodePacket(frame);
      if (packet !== null) {
        this.queue.push(packet);
      }
    }
  }

  protected abstract decodePacket(frame: Uint8Array): Packet | null;
  protected abstract encodeOutgoing(raw: Uint8Array): Uint8Array;
  protected abstract decodeIncoming(bytes: Uint8Array): ReadonlyArray<Uint8Array>;
  protected abstract writeBytes(bytes: Uint8Array): Promise<void>;
  protected abstract closeInterface(): Promise<void>;
}

export abstract class HdlcPacketInterface extends AbstractPacketInterface {
  private decodeState: HdlcDecodeState = {};

  protected override encodeOutgoing(raw: Uint8Array): Uint8Array {
    return encodeHdlcFrame(raw);
  }

  protected override decodeIncoming(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
    const decoded = decodeHdlcFrames(bytes, this.decodeState);
    this.decodeState = {
      buffer: decoded.buffer,
      inEscape: decoded.inEscape
    };
    return decoded.frames;
  }
}

export abstract class RawPacketInterface extends AbstractPacketInterface {
  protected override encodeOutgoing(raw: Uint8Array): Uint8Array {
    return raw;
  }

  protected override decodeIncoming(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
    return shouldEnqueueRawInterfaceFrame(bytes.length) ? [bytes] : [];
  }
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
