import b4a from "b4a";
import {
  createNativeBlePipe,
  stopNativeBlePipe,
} from "@twistedpear/ble-bridge";
import type { BlePipe } from "@twistedpear/reticulum-interfaces";
import type {
  HostToWorkletMessage,
  WorkletToHostMessage,
} from "../worklet/protocol";

function bytesToHex(bytes: Uint8Array): string {
  return b4a.toString(bytes, "hex");
}

function hexToBytes(hex: string): Uint8Array {
  return b4a.from(hex, "hex");
}

const PEER_INVITATION_PREFIX = Uint8Array.of(0x54, 0x50, 0x42, 0x31);
function isPeerInvitationFrame(data: Uint8Array): boolean {
  return (
    data.length > PEER_INVITATION_PREFIX.length &&
    PEER_INVITATION_PREFIX.every((byte, index) => data[index] === byte)
  );
}

/** Host-side glue: native BlePipe ↔ worklet IPC. */
export class HostBleIpc {
  private pipe: BlePipe | null = null;

  constructor(
    private readonly sendToWorklet: (message: HostToWorkletMessage) => void,
  ) {}

  async start(identityHashHex: string): Promise<void> {
    if (this.pipe !== null) {
      return;
    }

    const identityHash = hexToBytes(identityHashHex);
    const pipe = createNativeBlePipe(identityHash);
    pipe.setEvents({
      onData: (data: Uint8Array) => {
        if (isPeerInvitationFrame(data))
          this.sendToWorklet({
            type: "peer-bluetooth-frame",
            frameHex: bytesToHex(data.subarray(PEER_INVITATION_PREFIX.length)),
          });
        else
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
      },
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
      return;
    }

    if (message.type === "peer-bluetooth-send") {
      if (this.pipe === null || !this.pipe.connected)
        throw new Error("BLE invitation channel is not connected");
      for (const frameHex of message.framesHex) {
        const frame = hexToBytes(frameHex);
        const packet = new Uint8Array(
          PEER_INVITATION_PREFIX.length + frame.length,
        );
        packet.set(PEER_INVITATION_PREFIX);
        packet.set(frame, PEER_INVITATION_PREFIX.length);
        if (packet.length > this.pipe.mtu - 3)
          throw new Error(
            `BLE invitation frame exceeds negotiated MTU (${packet.length} > ${this.pipe.mtu - 3})`,
          );
        await this.pipe.write(packet);
      }
    }
  }

  isBleMessage(message: WorkletToHostMessage): boolean {
    return (
      message.type.startsWith("ble-") || message.type === "peer-bluetooth-send"
    );
  }
}
