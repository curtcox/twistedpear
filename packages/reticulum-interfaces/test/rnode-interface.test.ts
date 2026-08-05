import { describe, expect, it } from "vitest";
import { PureCryptoProvider } from "@twistedpear/reticulum-ts";
import type { SerialPipe, SerialPipeEvents } from "../src/pipes.js";
import {
  KISS_CMD_DETECT,
  KISS_CMD_RADIO_STATE,
  KISS_DETECT_RESP,
  KISS_RADIO_STATE_ON,
  encodeDetectRequest,
  encodeKissFrame,
  encodeRadioStateAsk
} from "../src/rnode/kiss.js";
import { RNodeInterface } from "../src/rnode/interface.js";

const provider = new PureCryptoProvider();

class MockSerialPipe implements SerialPipe {
  connected = false;
  bytesIn = 0;
  bytesOut = 0;
  private events: SerialPipeEvents = {};
  readonly writes: Uint8Array[] = [];

  get stats() {
    return { bytesIn: this.bytesIn, bytesOut: this.bytesOut, connected: this.connected };
  }

  setEvents(events: SerialPipeEvents): void {
    this.events = events;
  }

  async open(): Promise<void> {
    this.connected = true;
    this.events.onConnect?.();
  }

  async close(): Promise<void> {
    this.connected = false;
    this.events.onDisconnect?.();
  }

  async write(data: Uint8Array): Promise<void> {
    this.writes.push(data);
    this.bytesOut += data.length;

    const detect = encodeKissFrame(KISS_CMD_DETECT, Uint8Array.from([KISS_DETECT_RESP]));
    const radioOn = encodeKissFrame(KISS_CMD_RADIO_STATE, Uint8Array.from([KISS_RADIO_STATE_ON]));

    if (this.sameBytes(data, encodeDetectRequest())) {
      this.emit(detect);
    } else if (this.sameBytes(data, encodeRadioStateAsk())) {
      this.emit(radioOn);
    }
  }

  emit(data: Uint8Array): void {
    this.bytesIn += data.length;
    this.events.onData?.(data);
  }

  disconnect(): void {
    this.connected = false;
    this.events.onDisconnect?.();
  }

  private sameBytes(left: Uint8Array, right: Uint8Array): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }
}

describe("RNodeInterface lifecycle", () => {
  it("goes online after detect and radio-state handshake", async () => {
    const pipe = new MockSerialPipe();
    const iface = await RNodeInterface.open(provider, {
      name: "rnode-test",
      provider,
      pipe,
      reconnectWaitMs: 50
    });

    expect(iface.online).toBe(true);
    expect(iface.rnodeStatus.radioOnline).toBe(true);
    expect(pipe.writes.length).toBeGreaterThanOrEqual(2);

    await iface.close();
    expect(iface.online).toBe(false);
  });

  it("marks offline on pipe disconnect and attempts reconnect", async () => {
    const pipe = new MockSerialPipe();
    const iface = await RNodeInterface.open(provider, {
      name: "rnode-reconnect",
      provider,
      pipe,
      reconnectWaitMs: 30
    });

    expect(iface.online).toBe(true);
    pipe.disconnect();
    expect(iface.online).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(pipe.writes.length).toBeGreaterThan(2);

    await iface.close();
  });
});
