import b4a from "b4a";
import {
  createNativeMulticastBridge,
  stopNativeMulticastBridge
} from "@twistedpear/multicast";
import type { MulticastBridge } from "@twistedpear/reticulum-interfaces";
import type { HostToWorkletMessage, WorkletToHostMessage } from "../worklet/protocol";

function bytesToHex(bytes: Uint8Array): string {
  return b4a.toString(bytes, "hex");
}

function hexToBytes(hex: string): Uint8Array {
  return b4a.from(hex, "hex");
}

/** Host-side glue: native MulticastBridge ↔ worklet IPC. */
export class HostMulticastIpc {
  private bridge: MulticastBridge | null = null;

  constructor(private readonly sendToWorklet: (message: HostToWorkletMessage) => void) {}

  private ensureBridge(): MulticastBridge {
    if (this.bridge === null) {
      this.bridge = createNativeMulticastBridge();
      this.bridge.setEvents({
        onPacket: (ifname, data, sourceAddress, port) => {
          this.sendToWorklet({
            type: "multicast-packet",
            ifname,
            dataHex: bytesToHex(data),
            sourceAddress,
            port
          });
        },
        onNetworkChange: (interfaces) => {
          this.sendToWorklet({ type: "multicast-interfaces", interfaces });
        }
      });
    }

    return this.bridge;
  }

  async start(): Promise<void> {
    const bridge = this.ensureBridge();
    await bridge.start();
  }

  async stop(): Promise<void> {
    if (this.bridge === null) {
      return;
    }

    await stopNativeMulticastBridge(this.bridge);
    this.bridge = null;
  }

  async handleWorkletMessage(message: WorkletToHostMessage): Promise<void> {
    if (message.type === "multicast-start") {
      await this.start();
      return;
    }

    if (message.type === "multicast-stop") {
      await this.stop();
      return;
    }

    const bridge = this.bridge;
    if (bridge === null) {
      return;
    }

    if (message.type === "multicast-join") {
      await bridge.joinGroup(message.ifname, message.groupAddress, message.port);
      return;
    }

    if (message.type === "multicast-bind") {
      await bridge.bindPort(message.ifname, message.port);
      return;
    }

    if (message.type === "multicast-send") {
      await bridge.send(message.ifname, message.groupAddress, message.port, hexToBytes(message.dataHex));
      return;
    }

    if (message.type === "multicast-unicast") {
      await bridge.sendUnicast(message.ifname, message.targetAddress, message.port, hexToBytes(message.dataHex));
    }
  }

  isMulticastMessage(message: WorkletToHostMessage): boolean {
    return message.type.startsWith("multicast-");
  }
}
