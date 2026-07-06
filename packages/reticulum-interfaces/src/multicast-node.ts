import { PureCryptoProvider } from "@twistedpear/reticulum-ts";
import { createSocket, type Socket as DgramSocket } from "node:dgram";
import { networkInterfaces } from "node:os";
import {
  deriveMulticastAddress,
  descopeLinkLocal,
  MULTICAST_TEMPORARY,
  SCOPE_LINK
} from "./auto-common.js";
import { AUTO_DEFAULT_DATA_PORT, AUTO_DEFAULT_DISCOVERY_PORT, AUTO_DEFAULT_GROUP_ID } from "./auto.js";
import type { MulticastBridge, MulticastBridgeEvents, MulticastNetworkInfo } from "./pipes.js";

const ALL_IGNORE_IFS = new Set(["lo", "lo0"]);
const provider = new PureCryptoProvider();
const groupIdBytes = new TextEncoder().encode(AUTO_DEFAULT_GROUP_ID);
const multicastAddress = deriveMulticastAddress(provider, groupIdBytes, SCOPE_LINK, MULTICAST_TEMPORARY);

function enumerateLinkLocalInterfaces(): MulticastNetworkInfo[] {
  const interfaces: MulticastNetworkInfo[] = [];

  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (addresses === undefined || ALL_IGNORE_IFS.has(name)) {
      continue;
    }

    for (const address of addresses) {
      if (address.family !== "IPv6" || !address.address.startsWith("fe80:")) {
        continue;
      }

      interfaces.push({ name, linkLocalAddress: descopeLinkLocal(address.address) });
      break;
    }
  }

  return interfaces;
}

/** Desktop/Node MulticastBridge backed by node:dgram. */
export function createNodeMulticastBridge(): MulticastBridge {
  let interfaces = enumerateLinkLocalInterfaces();
  let events: MulticastBridgeEvents = {};
  const sockets = new Map<string, DgramSocket>();

  const ensureSocket = (ifname: string): DgramSocket => {
    const existing = sockets.get(ifname);
    if (existing !== undefined) {
      return existing;
    }

    const socket = createSocket({ type: "udp6", reuseAddr: true });
    socket.on("message", (buffer, remote) => {
      events.onPacket?.(ifname, new Uint8Array(buffer), remote.address, remote.port);
    });
    sockets.set(ifname, socket);
    return socket;
  };

  return {
    get interfaces() {
      return interfaces;
    },

    setEvents(next) {
      events = next;
    },

    async start() {
      interfaces = enumerateLinkLocalInterfaces();
      events.onNetworkChange?.(interfaces);
    },

    async stop() {
      for (const socket of sockets.values()) {
        socket.close();
      }

      sockets.clear();
      interfaces = [];
    },

    async joinGroup(ifname, _groupAddress, port) {
      const socket = ensureSocket(ifname);
      await new Promise<void>((resolve, reject) => {
        socket.once("error", reject);
        socket.bind(port, () => resolve());
      });
      socket.addMembership(multicastAddress, ifname);
    },

    async bindPort(ifname, port) {
      const socket = ensureSocket(ifname);
      const address = socket.address();
      if (typeof address === "object" && address.port === port) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        socket.once("error", reject);
        socket.bind(port, () => resolve());
      });
    },

    async send(ifname, groupAddress, port, data) {
      const socket = ensureSocket(ifname);
      await new Promise<void>((resolve, reject) => {
        socket.send(Buffer.from(data), port, groupAddress, (error) => (error ? reject(error) : resolve()));
      });
    },

    async sendUnicast(ifname, targetAddress, port, data) {
      if (port !== AUTO_DEFAULT_DATA_PORT) {
        return;
      }

      const socket = ensureSocket(ifname);
      await new Promise<void>((resolve, reject) => {
        socket.send(Buffer.from(data), port, targetAddress, (error) => (error ? reject(error) : resolve()));
      });
    }
  };
}

export { AUTO_DEFAULT_DISCOVERY_PORT };
