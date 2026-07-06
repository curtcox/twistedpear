import { createMdnsBonjourBridge } from "@twistedpear/reticulum-interfaces/bonjour-mdns";
import { createNodeMulticastBridge } from "@twistedpear/reticulum-interfaces/multicast-node";
import { BONJOUR_RETICULUM_SERVICE } from "@twistedpear/reticulum-interfaces";
import type { HostToWorkletMessage, WorkletToHostMessage } from "@twistedpear/host-core/protocol";

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

  constructor(private readonly sendToWorklet: (message: HostToWorkletMessage) => void) {
    this.multicast.setEvents({
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

    this.bonjour.setEvents({
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
      }
    });
  }

  async handleWorkletMessage(message: WorkletToHostMessage): Promise<void> {
    if (message.type === "multicast-start") {
      await this.multicast.start();
      return;
    }

    if (message.type === "multicast-stop") {
      await this.multicast.stop();
      return;
    }

    if (message.type === "multicast-join") {
      await this.multicast.joinGroup(message.ifname, message.groupAddress, message.port);
      return;
    }

    if (message.type === "multicast-bind") {
      await this.multicast.bindPort(message.ifname, message.port);
      return;
    }

    if (message.type === "multicast-send") {
      await this.multicast.send(message.ifname, message.groupAddress, message.port, hexToBytes(message.dataHex));
      return;
    }

    if (message.type === "multicast-unicast") {
      await this.multicast.sendUnicast(message.ifname, message.targetAddress, message.port, hexToBytes(message.dataHex));
      return;
    }

    if (message.type === "bonjour-start") {
      await this.bonjour.start(BONJOUR_RETICULUM_SERVICE);
      return;
    }

    if (message.type === "bonjour-stop") {
      await this.bonjour.stop();
      return;
    }

    if (message.type === "bonjour-advertise") {
      await this.bonjour.advertise({
        id: `${message.ifname}:${message.address}:${message.port}`,
        ifname: message.ifname,
        host: message.address,
        port: message.port
      });
    }
  }

  isBridgeMessage(message: WorkletToHostMessage): boolean {
    return message.type.startsWith("multicast-") || message.type.startsWith("bonjour-");
  }

  async stop(): Promise<void> {
    await this.multicast.stop();
    await this.bonjour.stop();
  }
}
