// @ts-nocheck
import {
  encodeHdlcFrameRawFromActions,
  hdlcDecodeResultFromActions,
  initialDecodeHdlcFramesState,
  initialDeliverQueuedPacketState,
  initialEncodeHdlcFrameState,
  initialEnqueueDecodedPacketState,
  initialEnqueueRawInterfaceFrameState,
  initialInterfaceClosedState,
  initialInterfaceMtuFitState,
  initialInterfaceNameValidState,
  initialInterfaceSendAllowState,
  initialYieldBufferedPacketState,
  shouldAcceptInterfaceName,
  shouldAllowInterfaceSend,
  shouldDeliverQueuedPacketNow,
  shouldEnqueueDecodedPacketNow,
  shouldEnqueueRawInterfaceFrameNow,
  shouldInterfaceClosedNow,
  shouldInterfaceMtuFit,
  shouldInterfaceMtuOverflow,
  shouldRejectInterfaceName,
  shouldUseDecodeHdlcFrames,
  shouldUseEncodeHdlcFrame,
  shouldYieldBufferedPacketNow,
  stepDecodeHdlcFramesWithActions,
  stepDeliverQueuedPacketWithActions,
  stepEncodeHdlcFrameWithActions,
  stepEnqueueDecodedPacketWithActions,
  stepEnqueueRawInterfaceFrameWithActions,
  stepInterfaceClosedWithActions,
  stepInterfaceMtuFitWithActions,
  stepInterfaceNameValidWithActions,
  stepInterfaceSendAllowWithActions,
  stepYieldBufferedPacketWithActions,
  type HdlcDecodeState
} from "@twistedpear/protocol";
import type { Packet } from "../packet.js";

export interface ReticulumInterfaceOptions {
  readonly name: string;
  readonly mtu?: number;
  readonly bitrate?: number | null;
  /** Whether this interface may send outbound packets. Mirrors RNS interface `outgoing` config. */
  readonly outgoing?: boolean;
  /** Whether this interface may receive inbound packets. Defaults to true for backward compatibility. */
  readonly incoming?: boolean;
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

  protected constructor(options: ReticulumInterfaceOptions, incoming = options.incoming ?? true, outgoing = options.outgoing ?? true) {
    const nameStepped = stepInterfaceNameValidWithActions(initialInterfaceNameValidState(), {
      kind: "iface/name-valid-gate",
      name: options.name
    });
    if (shouldRejectInterfaceName(nameStepped.actions) || !shouldAcceptInterfaceName(nameStepped.actions)) {
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
    const allowStepped = stepInterfaceSendAllowWithActions(initialInterfaceSendAllowState(), {
      kind: "iface/send-allow-gate",
      closed: this.closed,
      outgoing: this.outgoing
    });
    if (!shouldAllowInterfaceSend(allowStepped.actions)) {
      const closedStepped = stepInterfaceClosedWithActions(initialInterfaceClosedState(), {
        kind: "iface/closed-gate",
        closed: this.closed
      });
      if (shouldInterfaceClosedNow(closedStepped.actions)) {
        throw new Error(`Interface ${this.name} is closed`);
      }
      throw new Error(`Interface ${this.name} is not configured for outbound traffic`);
    }

    const mtuStepped = stepInterfaceMtuFitWithActions(initialInterfaceMtuFitState(), {
      kind: "iface/mtu-fit-gate",
      rawLength: packet.raw.length,
      mtu: this.mtu
    });
    if (shouldInterfaceMtuOverflow(mtuStepped.actions) || !shouldInterfaceMtuFit(mtuStepped.actions)) {
      throw new Error(`Packet exceeds interface MTU (${packet.raw.length} > ${this.mtu})`);
    }

    await this.writeBytes(this.encodeOutgoing(packet.raw));
  }

  async close(): Promise<void> {
    const closedStepped = stepInterfaceClosedWithActions(initialInterfaceClosedState(), {
      kind: "iface/closed-gate",
      closed: this.closed
    });
    if (shouldInterfaceClosedNow(closedStepped.actions)) {
      return;
    }

    this.closed = true;
    this.online = false;
    this.queue.close();
    await this.closeInterface();
  }

  protected receiveBytes(bytes: Uint8Array): void {
    const closedStepped = stepInterfaceClosedWithActions(initialInterfaceClosedState(), {
      kind: "iface/closed-gate",
      closed: this.closed
    });
    if (shouldInterfaceClosedNow(closedStepped.actions)) {
      return;
    }

    if (!this.incoming) {
      return;
    }

    for (const frame of this.decodeIncoming(bytes)) {
      const packet = this.decodePacket(frame);
      const enqueueStepped = stepEnqueueDecodedPacketWithActions(initialEnqueueDecodedPacketState(), {
        kind: "iface/enqueue-decoded-packet-gate",
        packetPresent: packet !== null
      });
      if (shouldEnqueueDecodedPacketNow(enqueueStepped.actions)) {
        this.queue.push(packet!);
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
    const encodeStepped = stepEncodeHdlcFrameWithActions(initialEncodeHdlcFrameState(), {
      kind: "hdlc/encode-gate",
      payload: raw
    });
    if (!shouldUseEncodeHdlcFrame(encodeStepped.actions)) {
      throw new Error("hdlc frame: missing use-raw action");
    }
    const encoded = encodeHdlcFrameRawFromActions(encodeStepped.actions);
    if (encoded === null) {
      throw new Error("hdlc frame: missing use-raw action");
    }
    return encoded;
  }

  protected override decodeIncoming(bytes: Uint8Array): ReadonlyArray<Uint8Array> {
    const decodeStepped = stepDecodeHdlcFramesWithActions(initialDecodeHdlcFramesState(), {
      kind: "hdlc/decode-gate",
      input: bytes,
      decodeState: this.decodeState
    });
    if (!shouldUseDecodeHdlcFrames(decodeStepped.actions)) {
      throw new Error("hdlc frame: missing use-fields action");
    }
    const decoded = hdlcDecodeResultFromActions(decodeStepped.actions);
    if (decoded === null) {
      throw new Error("hdlc frame: missing use-fields action");
    }
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
    const enqueueStepped = stepEnqueueRawInterfaceFrameWithActions(
      initialEnqueueRawInterfaceFrameState(),
      {
        kind: "iface/enqueue-raw-frame-gate",
        length: bytes.length
      }
    );
    return shouldEnqueueRawInterfaceFrameNow(enqueueStepped.actions) ? [bytes] : [];
  }
}

class AsyncPacketQueue implements AsyncIterable<Packet> {
  private readonly values: Packet[] = [];
  private readonly waiters: Array<(result: IteratorResult<Packet>) => void> = [];
  private closed = false;

  push(packet: Packet): void {
    const waiter = this.waiters.shift();
    const deliverStepped = stepDeliverQueuedPacketWithActions(initialDeliverQueuedPacketState(), {
      kind: "iface/deliver-queued-packet-gate",
      waiterPresent: waiter !== undefined
    });
    if (shouldDeliverQueuedPacketNow(deliverStepped.actions)) {
      waiter!({ done: false, value: packet });
      return;
    }

    this.values.push(packet);
  }

  close(): void {
    const closedStepped = stepInterfaceClosedWithActions(initialInterfaceClosedState(), {
      kind: "iface/closed-gate",
      closed: this.closed
    });
    if (shouldInterfaceClosedNow(closedStepped.actions)) {
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
        const yieldStepped = stepYieldBufferedPacketWithActions(initialYieldBufferedPacketState(), {
          kind: "iface/yield-buffered-packet-gate",
          valuePresent: value !== undefined
        });
        if (shouldYieldBufferedPacketNow(yieldStepped.actions)) {
          return { done: false, value: value! };
        }

        const closedStepped = stepInterfaceClosedWithActions(initialInterfaceClosedState(), {
          kind: "iface/closed-gate",
          closed: this.closed
        });
        if (shouldInterfaceClosedNow(closedStepped.actions)) {
          return { done: true, value: undefined };
        }

        return new Promise<IteratorResult<Packet>>((resolve) => {
          this.waiters.push(resolve);
        });
      }
    };
  }
}
