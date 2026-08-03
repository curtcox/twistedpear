// @ts-nocheck
import { describe, expect, it } from "vitest";
import { PureCryptoProvider, Reticulum, nodeRuntime, type PacketInterface } from "@twistedpear/reticulum-ts";
import type { MulticastBridge, MulticastBridgeEvents, MulticastNetworkInfo } from "../src/pipes.js";
import { AutoInterfaceBridge } from "../src/auto-bridge.js";
import { SimulatedBlePipe } from "../src/ble/sim.js";
import { BleInterface } from "../src/ble/interface.js";
import {
  rankOutgoingInterfaces,
  selectPreferredInterface
} from "../src/policy.js";
import type { SerialPipe, SerialPipeEvents } from "../src/pipes.js";
import { RNodeInterface } from "../src/rnode/interface.js";
import {
  KISS_CMD_DETECT,
  KISS_CMD_RADIO_STATE,
  KISS_DETECT_RESP,
  KISS_RADIO_STATE_ON,
  createKissDecodeState,
  decodeKissFrames,
  encodeDetectRequest,
  encodeKissFrame,
  encodeRadioStateAsk
} from "../src/rnode/kiss.js";

const provider = new PureCryptoProvider();
const runtime = nodeRuntime();

const SOAK_DURATION_MS = Number.parseInt(process.env.SOAK_DURATION_MS ?? "12000", 10);
const FLAP_INTERVAL_MS = Number.parseInt(process.env.INTEGRATION_SOAK_FLAP_MS ?? "2000", 10);

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

class MockMulticastBridge implements MulticastBridge {
  interfaces: MulticastNetworkInfo[] = [{ name: "mock0", linkLocalAddress: "fe80::1" }];
  private events: MulticastBridgeEvents = {};

  setEvents(events: MulticastBridgeEvents): void {
    this.events = events;
  }

  async start(): Promise<void> {
    this.events.onNetworkChange?.(this.interfaces);
  }

  async stop(): Promise<void> {}

  async joinGroup(): Promise<void> {}

  async bindPort(): Promise<void> {}

  async send(): Promise<void> {}

  async sendUnicast(): Promise<void> {}
}

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

describe("integration soak (M9)", () => {
  it(
    "keeps simulated BLE, AutoInterface, and RNode alive under interface flapping",
    async () => {
      const leftPipe = new SimulatedBlePipe({ mtu: 247, lossRate: 0.02, random: () => 0.99 });
      const rightPipe = new SimulatedBlePipe({ mtu: 247, lossRate: 0.02, random: () => 0.99 });
      leftPipe.linkPeer(rightPipe);

      const reticulum = Reticulum.create({ provider, runtime });
      reticulum.start();

      const autoBridge = new MockMulticastBridge();
      const autoIface = await AutoInterfaceBridge.open(provider, {
        name: "soak-auto",
        provider,
        runtime,
        bridge: autoBridge,
        peeringTimeoutMs: 500
      });
      reticulum.registerInterface(autoIface);

      const rnodePipe = new SimulatedRNodePipe();
      const rnodeIface = await RNodeInterface.open(provider, {
        name: "soak-rnode",
        provider,
        pipe: rnodePipe,
        reconnectWaitMs: 100
      });
      reticulum.registerInterface(rnodeIface);

      let bleLeft: BleInterface | null = null;
      let bleRight: BleInterface | null = null;
      let bleEnabled = false;
      const trackedInterfaces: PacketInterface[] = [autoIface, rnodeIface];
      const startedAt = Date.now();
      let flaps = 0;

      while (Date.now() - startedAt < SOAK_DURATION_MS) {
        if (bleEnabled) {
          await bleLeft?.close();
          await bleRight?.close();
          bleLeft = null;
          bleRight = null;
        } else {
          bleLeft = await BleInterface.open(provider, {
            name: "soak-ble-left",
            provider,
            pipe: leftPipe,
            pipeMtu: 247
          });
          bleRight = await BleInterface.open(provider, {
            name: "soak-ble-right",
            provider,
            pipe: rightPipe,
            pipeMtu: 247
          });
          reticulum.registerInterface(bleLeft);
          reticulum.registerInterface(bleRight);
          trackedInterfaces.push(bleLeft, bleRight);
        }

        bleEnabled = !bleEnabled;
        flaps += 1;

        const ranked = rankOutgoingInterfaces(trackedInterfaces);
        const preferred = selectPreferredInterface(trackedInterfaces);
        expect(ranked.length).toBeGreaterThan(0);
        expect(preferred).not.toBeNull();

        if (bleLeft !== null && bleRight !== null) {
          expect(bleLeft.online).toBe(true);
          expect(bleRight.online).toBe(true);
        }

        expect(autoIface.online).toBe(true);
        expect(rnodeIface.online).toBe(true);

        await sleep(FLAP_INTERVAL_MS);
      }

      expect(flaps).toBeGreaterThanOrEqual(4);

      await bleLeft?.close();
      await bleRight?.close();
      await rnodeIface.close();
      await autoIface.close();
      reticulum.stop();
    },
    SOAK_DURATION_MS + 10_000
  );
});
