import { createMdnsBonjourBridge } from "@twistedpear/reticulum-interfaces/bonjour-mdns";
import { createNodeMulticastBridge } from "@twistedpear/reticulum-interfaces/multicast-node";
import { createSerialNodePipe } from "@twistedpear/reticulum-interfaces/serial-node";
import { BONJOUR_RETICULUM_SERVICE } from "@twistedpear/reticulum-interfaces";
import type { SerialPipe } from "@twistedpear/reticulum-interfaces";
import type {
  HostToWorkletMessage,
  WorkletToHostMessage,
} from "@twistedpear/host-core/protocol";

function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, "hex"));
}

/** Electron main-process bridges for Bare worklet native pipes. */
export class HostDesktopBridges {
  private readonly multicast = createNodeMulticastBridge();
  private readonly bonjour = createMdnsBonjourBridge();
  private serialPipe: SerialPipe | null = null;

  constructor(
    private readonly sendToWorklet: (message: HostToWorkletMessage) => void,
  ) {
    this.multicast.setEvents({
      onPacket: (ifname, data, sourceAddress, port) => {
        this.sendToWorklet({
          type: "multicast-packet",
          ifname,
          dataHex: bytesToHex(data),
          sourceAddress,
          port,
        });
      },
      onNetworkChange: (interfaces) => {
        this.sendToWorklet({ type: "multicast-interfaces", interfaces });
      },
    });

    this.bonjour.setEvents({
      onServiceFound: (record) => {
        this.sendToWorklet({
          type: "bonjour-peer",
          ifname: record.ifname,
          address: record.host,
          port: record.port,
        });
      },
      onNetworkChange: (interfaces) => {
        this.sendToWorklet({ type: "bonjour-interfaces", interfaces });
      },
    });
  }

  async handleWorkletMessage(message: WorkletToHostMessage): Promise<void> {
    if (message.type.startsWith("multicast-")) {
      await this.handleMulticastMessage(message);
      return;
    }
    if (message.type.startsWith("bonjour-")) {
      await this.handleBonjourMessage(message);
      return;
    }
    if (message.type.startsWith("serial-")) {
      await this.handleSerialMessage(message);
    }
  }

  private async handleMulticastMessage(
    message: WorkletToHostMessage,
  ): Promise<void> {
    switch (message.type) {
      case "multicast-start":
        await this.multicast.start();
        return;
      case "multicast-stop":
        await this.multicast.stop();
        return;
      case "multicast-join":
        await this.multicast.joinGroup(
          message.ifname,
          message.groupAddress,
          message.port,
        );
        return;
      case "multicast-bind":
        await this.multicast.bindPort(message.ifname, message.port);
        return;
      case "multicast-send":
        await this.multicast.send(
          message.ifname,
          message.groupAddress,
          message.port,
          hexToBytes(message.dataHex),
        );
        return;
      case "multicast-unicast":
        await this.multicast.sendUnicast(
          message.ifname,
          message.targetAddress,
          message.port,
          hexToBytes(message.dataHex),
        );
        return;
      default:
        return;
    }
  }

  private async handleBonjourMessage(
    message: WorkletToHostMessage,
  ): Promise<void> {
    switch (message.type) {
      case "bonjour-start":
        await this.bonjour.start(BONJOUR_RETICULUM_SERVICE);
        return;
      case "bonjour-stop":
        await this.bonjour.stop();
        return;
      case "bonjour-advertise":
        await this.bonjour.advertise({
          id: `${message.ifname}:${message.address}:${message.port}`,
          ifname: message.ifname,
          host: message.address,
          port: message.port,
        });
        return;
      default:
        return;
    }
  }

  private async handleSerialMessage(
    message: WorkletToHostMessage,
  ): Promise<void> {
    switch (message.type) {
      case "serial-start":
        await this.startSerial(message.portPath ?? "", message.baudRate);
        return;
      case "serial-stop":
        await this.stopSerial();
        return;
      case "serial-write":
        await this.serialPipe?.write(hexToBytes(message.dataHex));
        return;
      default:
        return;
    }
  }

  private async startSerial(portPath: string, baudRate: number): Promise<void> {
    if (this.serialPipe !== null || portPath.length === 0) {
      return;
    }

    const pipe = createSerialNodePipe({ path: portPath, baudRate });
    pipe.setEvents({
      onData: (data) => {
        this.sendToWorklet({ type: "serial-data", dataHex: bytesToHex(data) });
      },
      onConnect: () => {
        this.sendToWorklet({ type: "serial-connect", deviceName: portPath });
      },
      onDisconnect: () => {
        this.sendToWorklet({ type: "serial-disconnect" });
      },
      onError: (error) => {
        this.sendToWorklet({ type: "serial-error", message: error.message });
      },
    });

    try {
      await pipe.open();
      this.serialPipe = pipe;
      if (pipe.connected) {
        this.sendToWorklet({ type: "serial-connect", deviceName: portPath });
      }
    } catch (error) {
      this.sendToWorklet({
        type: "serial-error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async stopSerial(): Promise<void> {
    if (this.serialPipe === null) {
      return;
    }

    await this.serialPipe.close();
    this.serialPipe = null;
  }

  isBridgeMessage(message: WorkletToHostMessage): boolean {
    return (
      message.type.startsWith("multicast-") ||
      message.type.startsWith("bonjour-") ||
      message.type.startsWith("serial-")
    );
  }

  async stop(): Promise<void> {
    await this.stopSerial();
    await this.multicast.stop();
    await this.bonjour.stop();
  }
}
