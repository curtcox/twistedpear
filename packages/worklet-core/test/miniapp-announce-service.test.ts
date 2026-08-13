import { describe, expect, it, vi } from "vitest";
import { createMiniappAnnounceService } from "../src/miniapp-announce-service.mjs";

interface AnnounceHandler {
  readonly aspectFilter: string;
  readonly receivedAnnounce: (info: {
    readonly destinationHash: Uint8Array;
    readonly appData?: Uint8Array;
  }) => void;
}

function service(overrides: Record<string, unknown> = {}) {
  const announced: {
    readonly aspects: unknown;
    readonly appData: Uint8Array;
  }[] = [];
  const registered: { readonly aspects: string[] }[] = [];
  const handlers: AnnounceHandler[] = [];
  const identity = { label: "host" };
  const node = {
    registerDestination: (options: { readonly aspects: string[] }) => {
      registered.push(options);
      return {
        hash: new Uint8Array([0xaa, 0xbb]),
        announce: async ({ appData }: { readonly appData: Uint8Array }) => {
          announced.push({ aspects: options.aspects, appData });
        },
      };
    },
    registerAnnounceHandler: (handler: AnnounceHandler) =>
      handlers.push(handler),
  };

  return {
    announced,
    registered,
    handlers,
    node,
    service: createMiniappAnnounceService({
      provider: {
        sha256: (data: Uint8Array) =>
          new Uint8Array(32).map((_byte, index) => data[index] ?? index),
      },
      bytesToHex: (bytes: Uint8Array) =>
        [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(""),
      DestinationDirection: { IN: "in" },
      DestinationType: { SINGLE: "single" },
      getNode: async () => node,
      getIdentity: async () => identity,
      ...overrides,
    }),
  };
}

describe("publish", () => {
  it("registers one destination per aspect and reuses it", async () => {
    const harness = service();

    await harness.service.publish("hello", new Uint8Array([1]));
    await harness.service.publish("hello", new Uint8Array([2]));

    expect(harness.registered).toHaveLength(1);
    expect(harness.registered[0]?.aspects[0]).toBe("miniapp");
    expect(harness.announced.map(({ appData }) => [...appData])).toEqual([
      [1],
      [2],
    ]);
  });

  it("separates namespaces from the default app scope", async () => {
    const harness = service();

    await harness.service.publish("hello", new Uint8Array([1]));
    await harness.service.publish("hello", new Uint8Array([2]), "shared");

    expect(harness.registered).toHaveLength(2);
    expect(harness.registered[0]?.aspects[1]).not.toBe(
      harness.registered[1]?.aspects[1],
    );
  });

  it("announces an empty payload when none is supplied", async () => {
    const harness = service();

    await harness.service.publish("hello");

    expect(harness.announced[0]?.appData).toEqual(new Uint8Array());
  });

  it("refuses to publish locked when an identity is required", async () => {
    const harness = service({
      requireIdentity: true,
      getIdentity: async () => null,
    });

    await expect(harness.service.publish("hello")).rejects.toThrow(
      "Unlock the host identity",
    );
  });

  it("publishes anonymously when no identity is required", async () => {
    const harness = service({ getIdentity: async () => null });

    await harness.service.publish("hello");

    expect(harness.announced).toHaveLength(1);
  });

  it("keeps only the newest 256 announces", async () => {
    const harness = service();

    for (let index = 0; index < 260; index += 1) {
      await harness.service.publish("hello", new Uint8Array([index % 256]));
    }
    const seen = await harness.service.subscribe("hello");

    expect(seen).toHaveLength(256);
    expect(seen[255]?.appData).toEqual(new Uint8Array([259 % 256]));
  });

  it("copies payloads by default and shares them when told not to", async () => {
    const copying = service();
    const payload = new Uint8Array([7]);
    await copying.service.publish("hello", payload);
    payload[0] = 9;
    expect((await copying.service.subscribe("hello"))[0]?.appData).toEqual(
      new Uint8Array([7]),
    );

    const sharing = service({ copyAppData: false });
    const shared = new Uint8Array([7]);
    await sharing.service.publish("hello", shared);
    shared[0] = 9;
    expect((await sharing.service.subscribe("hello"))[0]?.appData).toEqual(
      new Uint8Array([9]),
    );
  });
});

describe("subscribe", () => {
  it("registers one announce handler per aspect", async () => {
    const harness = service();

    await harness.service.subscribe("hello");
    await harness.service.subscribe("hello");

    expect(harness.handlers).toHaveLength(1);
    expect(harness.handlers[0]?.aspectFilter.startsWith("tp.miniapp.")).toBe(
      true,
    );
  });

  it("collects announces that arrive after subscribing", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const harness = service();
    await harness.service.subscribe("hello");

    harness.handlers[0]?.receivedAnnounce({
      destinationHash: new Uint8Array([0x01, 0x02]),
      appData: new Uint8Array([5]),
    });
    harness.handlers[0]?.receivedAnnounce({
      destinationHash: new Uint8Array([0x03]),
    });

    expect(await harness.service.subscribe("hello")).toEqual([
      {
        destination: "0102",
        appData: new Uint8Array([5]),
        receivedAt: 1_700_000_000_000,
      },
      {
        destination: "03",
        appData: new Uint8Array(),
        receivedAt: 1_700_000_000_000,
      },
    ]);
    vi.restoreAllMocks();
  });

  it("returns an empty history for an unseen app", async () => {
    const harness = service();
    expect(await harness.service.subscribe("nobody")).toEqual([]);
  });
});
