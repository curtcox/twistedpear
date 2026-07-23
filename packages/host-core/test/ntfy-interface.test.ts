import { describe, expect, it } from "vitest";
import {
  DestinationType,
  NodeCryptoProvider,
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
  hexToBytes
} from "@twistedpear/reticulum-ts";
import { NtfyPacketInterface } from "../src/ntfy-interface.js";

const provider = new NodeCryptoProvider();

function makePacket(data = new Uint8Array([1, 2, 3])): Packet {
  return Packet.fromFields(provider, {
    headerType: PacketHeaderType.HEADER_1,
    transportType: TransportType.BROADCAST,
    destinationType: DestinationType.SINGLE,
    packetType: PacketType.DATA,
    destinationHash: hexToBytes("00112233445566778899aabbccddeeff"),
    context: PacketContext.NONE,
    data
  });
}

/**
 * A mock fetch that records published messages and returns them on poll.
 */
function createMockNtfyServer() {
  const messages: string[] = [];
  let pollCount = 0;

  const mockFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method ?? "GET";

    if (method === "POST") {
      const body = init?.body;
      if (typeof body === "string") {
        messages.push(body);
      }
      return new Response("", { status: 200 });
    }

    if (method === "GET" && url.includes("poll=1")) {
      pollCount++;
      // Return accumulated messages as ndjson
      const events = messages.map((msg) => JSON.stringify({ event: "message", message: msg }));
      return new Response(events.join("\n"), {
        status: 200,
        headers: { "Content-Type": "application/x-ndjson" }
      });
    }

    return new Response("", { status: 404 });
  };

  return { mockFetch, messages, getPollCount: () => pollCount };
}

describe("NtfyPacketInterface", () => {
  it("encrypts and publishes a packet via fetch POST", async () => {
    const { mockFetch, messages } = createMockNtfyServer();

    const iface = new NtfyPacketInterface(provider, {
      name: "test-ntfy",
      provider,
      baseUrl: "https://ntfy.test",
      topic: "test-topic",
      secret: "test-secret-key",
      pollIntervalMs: 50_000,
      fetch: mockFetch
    });
    await iface.start();

    await iface.send(makePacket());
    expect(messages.length).toBe(1);
    expect(messages[0]!.length).toBeGreaterThan(0);

    await iface.close();
  });

  it("decrypts received messages from poll response", async () => {
    const { mockFetch } = createMockNtfyServer();

    // Use two interfaces with the same secret/topic to test round-trip
    const ifaceA = new NtfyPacketInterface(provider, {
      name: "test-ntfy-a",
      provider,
      baseUrl: "https://ntfy.test",
      topic: "shared-topic",
      secret: "shared-secret",
      pollIntervalMs: 50_000,
      fetch: mockFetch
    });

    const ifaceB = new NtfyPacketInterface(provider, {
      name: "test-ntfy-b",
      provider,
      baseUrl: "https://ntfy.test",
      topic: "shared-topic",
      secret: "shared-secret",
      pollIntervalMs: 50,
      fetch: mockFetch
    });

    await ifaceA.start();
    await ifaceB.start();

    // A publishes
    const pkt = makePacket(new Uint8Array([10, 20, 30]));
    await ifaceA.send(pkt);

    // B polls and receives
    // Give the poll loop a chance to run
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Read from B's packets iterator
    const iterator = ifaceB.packets[Symbol.asyncIterator]();
    const result = await Promise.race([
      iterator.next(),
      new Promise<IteratorResult<Packet, undefined>>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 500)
      )
    ]);

    expect(result.done).toBe(false);
    expect(Array.from(result.value.data)).toEqual([10, 20, 30]);

    await ifaceA.close();
    await ifaceB.close();
  });

  it("rejects send when outgoing is false", async () => {
    const { mockFetch } = createMockNtfyServer();

    const iface = new NtfyPacketInterface(provider, {
      name: "test-ntfy-rx",
      provider,
      baseUrl: "https://ntfy.test",
      topic: "rx-topic",
      secret: "secret",
      pollIntervalMs: 50_000,
      fetch: mockFetch,
      outgoing: false
    });
    await iface.start();

    await expect(iface.send(makePacket())).rejects.toThrow("not configured for outbound");
    await iface.close();
  });

  it("reports online after start and offline after close", async () => {
    const { mockFetch } = createMockNtfyServer();

    const iface = new NtfyPacketInterface(provider, {
      name: "test-ntfy-status",
      provider,
      baseUrl: "https://ntfy.test",
      topic: "status-topic",
      secret: "secret",
      pollIntervalMs: 50_000,
      fetch: mockFetch
    });

    expect(iface.online).toBe(false);
    await iface.start();
    expect(iface.online).toBe(true);
    await iface.close();
    expect(iface.online).toBe(false);
  });

  it("includes bearer token in headers when configured", async () => {
    let capturedHeaders: Headers | null = null;
    const mockFetch: typeof fetch = async (_input, init) => {
      capturedHeaders = init?.headers as Headers;
      return new Response("", { status: 200 });
    };

    const iface = new NtfyPacketInterface(provider, {
      name: "test-ntfy-auth",
      provider,
      baseUrl: "https://ntfy.test",
      topic: "auth-topic",
      secret: "secret",
      bearerToken: "my-token",
      pollIntervalMs: 50_000,
      fetch: mockFetch
    });
    await iface.start();
    await iface.send(makePacket());

    expect(capturedHeaders).not.toBeNull();
    expect(capturedHeaders!.get("Authorization")).toBe("Bearer my-token");
    await iface.close();
  });
});
