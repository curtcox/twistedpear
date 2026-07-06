import {
  createNativeBonjourBridge,
  stopNativeBonjourBridge
} from "@twistedpear/bonjour";
import { BONJOUR_RETICULUM_SERVICE } from "@twistedpear/reticulum-interfaces";
import type { HostToWorkletMessage, WorkletToHostMessage } from "../worklet/protocol";

/** Host-side glue: native Bonjour bridge ↔ worklet IPC. */
export class HostBonjourIpc {
  private bridge = createNativeBonjourBridge();

  constructor(private readonly sendToWorklet: (message: HostToWorkletMessage) => void) {
    this.bridge.setEvents({
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
  }

  async start(): Promise<void> {
    await this.bridge.start(BONJOUR_RETICULUM_SERVICE);
  }

  async stop(): Promise<void> {
    await stopNativeBonjourBridge(this.bridge);
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
      await this.bridge.advertise({
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
