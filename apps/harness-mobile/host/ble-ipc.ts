import b4a from "b4a";
import { createNativeBlePipe, stopNativeBlePipe } from "@twistedpear/ble-bridge";
import type { BlePipe } from "@twistedpear/reticulum-interfaces";
import type { HostToWorkletMessage, WorkletToHostMessage } from "../worklet/protocol";

function bytesToHex(bytes: Uint8Array): string {
  return b4a.toString(bytes, "hex");
}

function hexToBytes(hex: string): Uint8Array {
  return b4a.from(hex, "hex");
}

/** Host-side glue: native BlePipe ↔ worklet IPC. */
export class HostBleIpc {
  private pipe: BlePipe | null = null;

  constructor(private readonly sendToWorklet: (message: HostToWorkletMessage) => void) {}

  async start(identityHashHex: string): Promise<void> {
    if (this.pipe !== null) {
      return;
    }

    const identityHash = hexToBytes(identityHashHex);
    const pipe = createNativeBlePipe(identityHash);
    pipe.setEvents({
      onData: (data: Uint8Array) => {
        this.sendToWorklet({ type: "ble-data", dataHex: bytesToHex(data) });
      },
      onConnect: () => {
        this.sendToWorklet({ type: "ble-connect", mtu: pipe.mtu });
      },
      onDisconnect: () => {
        this.sendToWorklet({ type: "ble-disconnect" });
      },
      onError: (error: Error) => {
        this.sendToWorklet({ type: "ble-error", message: error.message });
      }
    });

    await pipe.start();
    this.pipe = pipe;

    if (pipe.connected) {
      this.sendToWorklet({ type: "ble-connect", mtu: pipe.mtu });
    }
  }

  async stop(): Promise<void> {
    if (this.pipe === null) {
      return;
    }

    await stopNativeBlePipe(this.pipe);
    this.pipe = null;
  }

  async handleWorkletMessage(message: WorkletToHostMessage): Promise<void> {
    if (message.type === "ble-start") {
      await this.start(message.identityHashHex);
      return;
    }

    if (message.type === "ble-stop") {
      await this.stop();
      return;
    }

    if (message.type === "ble-write") {
      await this.pipe?.write(hexToBytes(message.dataHex));
    }
  }

  isBleMessage(message: WorkletToHostMessage): boolean {
    return message.type.startsWith("ble-");
  }
}
