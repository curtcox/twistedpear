import b4a from "b4a";
import { createNativeSerialPipe } from "@twistedpear/usb-serial";
import type { SerialPipe } from "@twistedpear/reticulum-interfaces";
import type { HostToWorkletMessage, WorkletToHostMessage } from "../worklet/protocol";

function bytesToHex(bytes: Uint8Array): string {
  return b4a.toString(bytes, "hex");
}

function hexToBytes(hex: string): Uint8Array {
  return b4a.from(hex, "hex");
}

/** Host-side glue: native SerialPipe ↔ worklet IPC (USB-serial for RNode). */
export class HostUsbIpc {
  private pipe: SerialPipe | null = null;

  constructor(private readonly sendToWorklet: (message: HostToWorkletMessage) => void) {}

  async start(deviceId: number, baudRate: number): Promise<void> {
    if (this.pipe !== null) {
      return;
    }

    const pipe = createNativeSerialPipe(deviceId, baudRate);
    pipe.setEvents({
      onData: (data: Uint8Array) => {
        this.sendToWorklet({ type: "serial-data", dataHex: bytesToHex(data) });
      },
      onConnect: () => {
        this.sendToWorklet({ type: "serial-connect", deviceName: `usb-${deviceId}` });
      },
      onDisconnect: () => {
        this.sendToWorklet({ type: "serial-disconnect" });
      },
      onError: (error: Error) => {
        this.sendToWorklet({ type: "serial-error", message: error.message });
      }
    });

    await pipe.open();
    this.pipe = pipe;

    if (pipe.connected) {
      this.sendToWorklet({ type: "serial-connect", deviceName: `usb-${deviceId}` });
    }
  }

  async stop(): Promise<void> {
    if (this.pipe === null) {
      return;
    }

    await this.pipe.close();
    this.pipe = null;
  }

  async handleWorkletMessage(message: WorkletToHostMessage): Promise<void> {
    if (message.type === "serial-start") {
      await this.start(message.deviceId, message.baudRate);
      return;
    }

    if (message.type === "serial-stop") {
      await this.stop();
      return;
    }

    if (message.type === "serial-write") {
      await this.pipe?.write(hexToBytes(message.dataHex));
    }
  }

  isSerialMessage(message: WorkletToHostMessage): boolean {
    return message.type.startsWith("serial-");
  }
}
