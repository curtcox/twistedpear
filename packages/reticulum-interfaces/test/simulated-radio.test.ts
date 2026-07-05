import { describe, expect, it } from "vitest";
import { PureCryptoProvider, Reticulum, nodeRuntime } from "@twistedpear/reticulum-ts";
import { SimulatedBlePipe } from "../src/ble/sim.js";
import { BleInterface } from "../src/ble/interface.js";
import type { SerialPipe, SerialPipeEvents } from "../src/pipes.js";
import { RNodeInterface } from "../src/rnode/interface.js";
import {
  KISS_CMD_DATA,
  KISS_CMD_DETECT,
  KISS_CMD_RADIO_STATE,
  KISS_DETECT_RESP,
  KISS_RADIO_STATE_ON,
  decodeKissFrames,
  createKissDecodeState,
  encodeKissFrame
} from "../src/rnode/kiss.js";

const provider = new PureCryptoProvider();

describe("simulated radio interfaces", () => {
  it("exchanges packets over linked BLE pipes with loss", async () => {
    const leftPipe = new SimulatedBlePipe({ mtu: 185, lossRate: 0.02, random: () => 0.99 });
    const rightPipe = new SimulatedBlePipe({ mtu: 185, lossRate: 0.02, random: () => 0.99 });
    leftPipe.linkPeer(rightPipe);

    const left = await BleInterface.open(provider, { name: "ble-left", provider, pipe: leftPipe, pipeMtu: 185 });
    const right = await BleInterface.open(provider, { name: "ble-right", provider, pipe: rightPipe, pipeMtu: 185 });

    const reticulum = Reticulum.create({ provider, runtime: nodeRuntime() });
    reticulum.start();
    reticulum.registerInterface(left);
    reticulum.registerInterface(right);

    expect(left.online).toBe(true);
    expect(right.online).toBe(true);

    await left.close();
    await right.close();
  });

  it("drives RNodeInterface over a simulated serial pipe", async () => {
    const pipe = new SimulatedRNodePipe();
    const iface = await RNodeInterface.open(provider, { name: "rnode-test", provider, pipe });
    expect(iface.rnodeStatus.radioOnline).toBe(true);
    await iface.close();
    await pipe.close();
  });
});

class SimulatedRNodePipe implements SerialPipe {
  private events: SerialPipeEvents = {};
  private openState = false;
  private bytesIn = 0;
  private bytesOut = 0;
  private decodeState = createKissDecodeState();

  get connected(): boolean {
    return this.openState;
  }

  get stats() {
    return { bytesIn: this.bytesIn, bytesOut: this.bytesOut, connected: this.openState };
  }

  setEvents(events: SerialPipeEvents): void {
    this.events = events;
  }

  async open(): Promise<void> {
    this.openState = true;
    this.events.onConnect?.();
  }

  async close(): Promise<void> {
    this.openState = false;
    this.events.onDisconnect?.();
  }

  async write(data: Uint8Array): Promise<void> {
    this.bytesOut += data.length;
    const decoded = decodeKissFrames(data, this.decodeState);
    this.decodeState = decoded.state;

    for (const frame of decoded.frames) {
      if (frame.command === KISS_CMD_DETECT) {
        this.reply(encodeKissFrame(KISS_CMD_DETECT, Uint8Array.from([KISS_DETECT_RESP])));
      } else if (frame.command === KISS_CMD_RADIO_STATE) {
        this.reply(encodeKissFrame(KISS_CMD_RADIO_STATE, Uint8Array.from([KISS_RADIO_STATE_ON])));
      }
    }
  }

  private reply(data: Uint8Array): void {
    this.bytesIn += data.length;
    this.events.onData?.(data);
  }
}
