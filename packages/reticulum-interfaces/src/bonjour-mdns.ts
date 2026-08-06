import createMdns from "multicast-dns";
import { BONJOUR_RETICULUM_SERVICE } from "./auto-discovery.js";
import type {
  BonjourBridge,
  BonjourBridgeEvents,
  BonjourServiceRecord,
} from "./bonjour.js";
import type { MulticastNetworkInfo } from "./pipes.js";

interface MdnsResponse {
  readonly answers: ReadonlyArray<{
    readonly name: string;
    readonly type: string;
    readonly data: unknown;
  }>;
}

export interface MdnsBonjourBridgeOptions {
  readonly serviceType?: string;
  readonly interfaces?: ReadonlyArray<MulticastNetworkInfo>;
}

/** Desktop/Node BonjourBridge backed by multicast-dns (mDNS). */
export function createMdnsBonjourBridge(
  options: MdnsBonjourBridgeOptions = {},
): BonjourBridge {
  const serviceType = options.serviceType ?? BONJOUR_RETICULUM_SERVICE;
  let interfaces: ReadonlyArray<MulticastNetworkInfo> =
    options.interfaces ?? [];
  let events: BonjourBridgeEvents = {};
  let mdns: ReturnType<typeof createMdns> | null = null;
  const advertised = new Map<string, BonjourServiceRecord>();

  const bridge: BonjourBridge = {
    get interfaces() {
      return interfaces;
    },

    setEvents(next) {
      events = next;
    },

    async start() {
      if (mdns !== null) {
        return;
      }

      mdns = createMdns();
      mdns.on("response", (response: MdnsResponse) => {
        for (const answer of response.answers) {
          if (answer.type !== "PTR" || answer.name !== serviceType) {
            continue;
          }

          const instanceName = String(answer.data);
          const service = response.answers.find(
            (entry) => entry.name === instanceName && entry.type === "SRV",
          );
          const address = response.answers.find(
            (entry) => entry.type === "A" || entry.type === "AAAA",
          );
          if (service === undefined || address === undefined) {
            continue;
          }

          const host = String(address.data);
          const port = Number((service.data as { port: number }).port);
          const record: BonjourServiceRecord = {
            id: instanceName,
            ifname: interfaces[0]?.name ?? "mdns",
            host,
            port,
          };

          events.onServiceFound?.(record);
        }
      });

      mdns.on("error", (error: unknown) => {
        events.onError?.(
          error instanceof Error ? error.message : String(error),
        );
      });

      mdns.query({
        questions: [{ name: serviceType, type: "PTR" }],
      });
    },

    async stop() {
      mdns?.destroy();
      mdns = null;
      advertised.clear();
    },

    async advertise(record) {
      if (mdns === null) {
        throw new Error("Bonjour bridge is not started");
      }

      advertised.set(record.id, record);
      const instanceName = `${record.id}.${serviceType}`;
      const target = `${record.id}.local`;

      mdns.respond({
        answers: [
          { name: serviceType, type: "PTR", ttl: 120, data: instanceName },
          {
            name: instanceName,
            type: "SRV",
            ttl: 120,
            data: { port: record.port, weight: 0, priority: 0, target },
          },
          { name: target, type: "AAAA", ttl: 120, data: record.host },
        ],
      });
    },
  };

  return bridge;
}
