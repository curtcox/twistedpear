import { describe, expect, it, vi } from "vitest";
import type { Link, RegisteredDestination } from "@twistedpear/reticulum-ts";

const sent: Array<{ payload: Uint8Array; options: unknown }> = [];

vi.mock("@twistedpear/reticulum-ts", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Resource: {
      send(_link: unknown, payload: Uint8Array, options?: unknown) {
        sent.push({ payload, options });
      },
    },
  };
});

const {
  attachPackageResourceServer,
  parseListResponse,
  RESOURCE_PROTOCOL_VERSION,
  sendPackageResourceRequest,
} = await import("../src/server/resource-server.js");

const { LinkResourceStrategy } = await import("@twistedpear/reticulum-ts");

interface FakeLink {
  callbacks: {
    packet?: (data: Uint8Array) => void;
    resourceConcluded?: (resource: { data?: Uint8Array }) => void;
  };
  strategy: number | null;
  sent: Uint8Array[];
  setResourceStrategy(strategy: number): void;
  send(data: Uint8Array): Promise<void>;
}

function fakeLink(
  onSend?: (link: FakeLink, data: Uint8Array) => void,
): FakeLink {
  const link: FakeLink = {
    callbacks: {},
    strategy: null,
    sent: [],
    setResourceStrategy(strategy) {
      link.strategy = strategy;
    },
    send(data) {
      link.sent.push(data);
      onSend?.(link, data);
      return Promise.resolve();
    },
  };
  return link;
}

function serve(
  options: Parameters<typeof attachPackageResourceServer>[1],
): FakeLink {
  let established: ((link: Link) => void) | null = null;
  const destination = {
    setLinkEstablishedCallback(callback: (link: Link) => void) {
      established = callback;
    },
  } as unknown as RegisteredDestination;

  attachPackageResourceServer(destination, options);
  const link = fakeLink();
  established?.(link as unknown as Link);
  return link;
}

function decode(index: number): unknown {
  const entry = sent[index];
  if (entry === undefined) throw new Error(`no response at index ${index}`);
  return JSON.parse(new TextDecoder().decode(entry.payload));
}

function encodeRequest(request: unknown): Uint8Array {
  return new TextEncoder().encode(
    JSON.stringify({ v: RESOURCE_PROTOCOL_VERSION, ...(request as object) }),
  );
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("attachPackageResourceServer", () => {
  it("accepts resources on established links", () => {
    sent.length = 0;
    const link = serve({
      listVersions: async () => [],
      fetchArchive: async () => new Uint8Array(0),
    });

    expect(link.strategy).toBe(LinkResourceStrategy.ACCEPT_ALL);
    expect(link.callbacks.packet).toBeTypeOf("function");
  });

  it("answers a list request with the published versions", async () => {
    sent.length = 0;
    const versions = [{ version: "1.0.0", packageHash: "hash", size: 3 }];
    const link = serve({
      listVersions: async () => versions,
      fetchArchive: async () => new Uint8Array(0),
    });

    link.callbacks.packet?.(encodeRequest({ type: "list" }));
    await settle();

    expect(decode(0)).toEqual({ versions });
    expect(parseListResponse(sent[0]?.payload ?? new Uint8Array())).toEqual(
      versions,
    );
  });

  it("advertises the archive for a fetch request", async () => {
    sent.length = 0;
    const archive = new Uint8Array([1, 2, 3]);
    const fetchArchive = vi.fn(async () => archive);
    const link = serve({ listVersions: async () => [], fetchArchive });

    link.callbacks.packet?.(encodeRequest({ type: "fetch", version: "2.0.0" }));
    await settle();

    expect(fetchArchive).toHaveBeenCalledWith("2.0.0");
    expect(sent[0]).toEqual({ payload: archive, options: { advertise: true } });
  });

  it("returns an error response for an unparseable request", async () => {
    sent.length = 0;
    const link = serve({
      listVersions: async () => [],
      fetchArchive: async () => new Uint8Array(0),
    });

    link.callbacks.packet?.(encodeRequest({ type: "delete" }));
    await settle();

    expect(decode(0)).toEqual({ error: "Invalid package resource request" });
  });

  it("returns an error response when a fetch request omits the version", async () => {
    sent.length = 0;
    const link = serve({
      listVersions: async () => [],
      fetchArchive: async () => new Uint8Array(0),
    });

    link.callbacks.packet?.(encodeRequest({ type: "fetch" }));
    await settle();

    expect(decode(0)).toEqual({ error: "Invalid package resource request" });
  });

  it("reports handler failures back over the link", async () => {
    sent.length = 0;
    const link = serve({
      listVersions: async () => {
        throw new Error("drive offline");
      },
      fetchArchive: async () => new Uint8Array(0),
    });

    link.callbacks.packet?.(encodeRequest({ type: "list" }));
    await settle();

    expect(decode(0)).toEqual({ error: "drive offline" });
  });

  it("labels non-Error handler failures generically", async () => {
    sent.length = 0;
    const link = serve({
      listVersions: async () => {
        throw "drive offline";
      },
      fetchArchive: async () => new Uint8Array(0),
    });

    link.callbacks.packet?.(encodeRequest({ type: "list" }));
    await settle();

    expect(decode(0)).toEqual({ error: "package resource error" });
  });
});

describe("sendPackageResourceRequest", () => {
  it("resolves with the concluded resource data", async () => {
    const payload = new Uint8Array([4, 5]);
    const link = fakeLink((current) => {
      current.callbacks.resourceConcluded?.({ data: payload });
    });

    const response = await sendPackageResourceRequest(link as unknown as Link, {
      type: "fetch",
      version: "1.0.0",
    });

    expect(response).toEqual(payload);
    expect(JSON.parse(new TextDecoder().decode(link.sent[0]))).toEqual({
      v: RESOURCE_PROTOCOL_VERSION,
      type: "fetch",
      version: "1.0.0",
    });
  });

  it("resolves empty when the resource carried no data", async () => {
    const link = fakeLink((current) => {
      current.callbacks.resourceConcluded?.({});
    });

    expect(
      await sendPackageResourceRequest(link as unknown as Link, {
        type: "list",
      }),
    ).toEqual(new Uint8Array(0));
  });

  it("rejects when no resource concludes before the timeout", async () => {
    const link = fakeLink();

    await expect(
      sendPackageResourceRequest(
        link as unknown as Link,
        { type: "list" },
        { timeoutMs: 20 },
      ),
    ).rejects.toThrow("package resource request timed out");
  });
});
