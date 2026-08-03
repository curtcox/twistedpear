// @ts-nocheck
import {
  createNativeBonjourBridge,
  getBonjourCapability,
  stopNativeBonjourBridge
} from "@twistedpear/bonjour";
import type { BonjourBridge } from "@twistedpear/reticulum-interfaces";
import { BONJOUR_RETICULUM_SERVICE } from "../../../packages/reticulum-interfaces/dist/auto-discovery.js";
import type { HostToWorkletMessage, WorkletToHostMessage } from "../worklet/protocol";

/** Host-side glue: native Bonjour bridge ↔ worklet IPC. */
export class HostBonjourIpc {
  private bridge: BonjourBridge | null = null;

  constructor(private readonly sendToWorklet: (message: HostToWorkletMessage) => void) {}

  private ensureBridge(): BonjourBridge | null {
    if (this.bridge !== null) {
      return this.bridge;
    }
    if (!getBonjourCapability().supported) {
      return null;
    }
    const bridge = createNativeBonjourBridge();
    bridge.setEvents({
      onServiceFound: (record) => {
        this.sendToWorklet({
          type: "bonjour-peer",
          ifname: record.ifname,
          address: record.host,
          port: record.port
        });
      },
      onNetworkChange: (interfaces) => {
        this.sendToWorklet({ type: "bonjour-interfaces", interfaces });
      },
      onError: (message) => {
        console.warn(`[bonjour-ipc] ${message}`);
      }
    });
    this.bridge = bridge;
    return bridge;
  }

  async start(): Promise<void> {
    const bridge = this.ensureBridge();
    if (bridge === null) {
      return;
    }
    await bridge.start(BONJOUR_RETICULUM_SERVICE);
  }

  async stop(): Promise<void> {
    if (this.bridge === null) {
      return;
    }
    await stopNativeBonjourBridge(this.bridge);
    this.bridge = null;
  }

  async handleWorkletMessage(message: WorkletToHostMessage): Promise<void> {
    if (message.type === "bonjour-start") {
      await this.start();
      return;
    }

    if (message.type === "bonjour-stop") {
      await this.stop();
      return;
    }

    if (message.type === "bonjour-advertise") {
      const bridge = this.ensureBridge();
      if (bridge === null) {
        return;
      }
      await bridge.advertise({
        id: `${message.ifname}:${message.address}:${message.port}`,
        ifname: message.ifname,
        host: message.address,
        port: message.port
      });
    }
  }

  isBonjourMessage(message: WorkletToHostMessage): boolean {
    return message.type.startsWith("bonjour-");
  }
}
