import {
  encode256t,
  encodeCasLocator,
  encodeCasLocatorRequest,
  signCasLocator,
  type CasLocator,
} from "@twistedpear/cas-256t";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCasLocatorOps } from "../src/worklet-entry-cas.mjs";

const provider = new NodeCryptoProvider();
const identity = new Identity(provider);
const archive = new Uint8Array(2_048).map((_byte, index) => (index * 5) % 256);
const t256 = encode256t(archive, (data: Uint8Array) => provider.sha512(data));
const locator: CasLocator = signCasLocator(identity, {
  t256,
  appId: "hello",
  version: "1.0.0",
  driveKey: "ab".repeat(32),
  packageHash: "cd".repeat(32),
  packageSize: archive.length,
});

interface Announce {
  readonly aspects: unknown;
  readonly appData: Uint8Array;
}

interface Harness {
  readonly log: string[];
  readonly announces: Announce[];
  readonly reannounced: string[];
  readonly casLocators: Map<string, CasLocator>;
  readonly casRequestDestinations: Map<string, unknown>;
  readonly ensureEntryCasStore: () => unknown;
  readonly ingestCasLocator: (appData: Uint8Array) => void;
  readonly announceCasLocatorRequest: (id: string) => Promise<void>;
  readonly respondToCasLocatorRequest: (appData: Uint8Array) => Promise<void>;
  readonly waitForCasLocator: (
    id: string,
    timeoutMs?: number,
  ) => Promise<CasLocator>;
}

function harness(overrides: Record<string, unknown> = {}): Harness {
  const log: string[] = [];
  const announces: Announce[] = [];
  const reannounced: string[] = [];
  const casLocators = new Map<string, CasLocator>();
  const casRequestDestinations = new Map<string, unknown>();
  const reticulum = {
    registerDestination: (options: { readonly aspects: unknown }) => ({
      announce: async ({ appData }: { readonly appData: Uint8Array }) => {
        announces.push({ aspects: options.aspects, appData });
      },
    }),
  };

  const ops = createCasLocatorOps({
    provider,
    log: (line: string) => log.push(line),
    logReannounce: (id: string) => reannounced.push(id),
    casLocators,
    casRequestDestinations,
    casResponseDestinations: new Map<string, unknown>(),
    DestinationDirection: { IN: "in" },
    DestinationType: { SINGLE: "single" },
    ensureReticulum: async () => reticulum,
    getReticulum: () => reticulum,
    resolveIdentity: async () => identity,
    runtimeKeyValueStore: () => new Map(),
    ...overrides,
  }) as Omit<
    Harness,
    | "log"
    | "announces"
    | "reannounced"
    | "casLocators"
    | "casRequestDestinations"
  >;

  return {
    log,
    announces,
    reannounced,
    casLocators,
    casRequestDestinations,
    ...ops,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ingestCasLocator", () => {
  it("keeps a locator that verifies and logs it", () => {
    const { ingestCasLocator, casLocators, log } = harness();

    ingestCasLocator(encodeCasLocator(locator));

    expect(casLocators.get(t256)).toEqual(locator);
    expect(log).toEqual(["CAS locator: hello v1.0.0"]);
  });

  it("ignores payloads that are not locators", () => {
    const { ingestCasLocator, casLocators, log } = harness();

    ingestCasLocator(new Uint8Array([1, 2, 3]));

    expect(casLocators.size).toBe(0);
    expect(log).toEqual([]);
  });

  it("drops a locator whose signature does not verify", () => {
    const { ingestCasLocator, casLocators } = harness();

    ingestCasLocator(
      encodeCasLocator({ ...locator, signature: "00".repeat(64) }),
    );

    expect(casLocators.size).toBe(0);
  });
});

describe("announceCasLocatorRequest", () => {
  it("registers one destination and reuses it", async () => {
    const {
      announceCasLocatorRequest,
      announces,
      casRequestDestinations,
      log,
    } = harness();

    await announceCasLocatorRequest(t256);
    await announceCasLocatorRequest(t256);

    expect(casRequestDestinations.size).toBe(1);
    expect(announces).toHaveLength(2);
    expect(announces[0]?.appData).toEqual(encodeCasLocatorRequest(t256));
    expect(log[0]).toContain("Requested CAS locator");
  });

  it("refuses to request without a host identity", async () => {
    const { announceCasLocatorRequest } = harness({
      resolveIdentity: async () => null,
    });

    await expect(announceCasLocatorRequest(t256)).rejects.toThrow(
      "No host identity available",
    );
  });
});

describe("respondToCasLocatorRequest", () => {
  it("re-announces a locator it holds", async () => {
    const { respondToCasLocatorRequest, casLocators, announces, reannounced } =
      harness();
    casLocators.set(t256, locator);

    await respondToCasLocatorRequest(encodeCasLocatorRequest(t256));
    await respondToCasLocatorRequest(encodeCasLocatorRequest(t256));

    expect(announces).toHaveLength(2);
    expect(announces[0]?.appData).toEqual(encodeCasLocator(locator));
    expect(reannounced).toEqual([t256, t256]);
  });

  it("ignores a malformed request", async () => {
    const { respondToCasLocatorRequest, announces } = harness();
    await respondToCasLocatorRequest(new Uint8Array([9, 9]));
    expect(announces).toEqual([]);
  });

  it("ignores an id it holds no locator for", async () => {
    const { respondToCasLocatorRequest, announces } = harness();
    await respondToCasLocatorRequest(encodeCasLocatorRequest(t256));
    expect(announces).toEqual([]);
  });

  it("stays silent while the node is offline", async () => {
    const offline = harness({ getReticulum: () => null });
    offline.casLocators.set(t256, locator);

    await offline.respondToCasLocatorRequest(encodeCasLocatorRequest(t256));

    expect(offline.announces).toEqual([]);
  });

  it("stays silent without a host identity", async () => {
    const anonymous = harness({ resolveIdentity: async () => null });
    anonymous.casLocators.set(t256, locator);

    await anonymous.respondToCasLocatorRequest(encodeCasLocatorRequest(t256));

    expect(anonymous.announces).toEqual([]);
  });
});

describe("waitForCasLocator", () => {
  it("returns a locator that is already known without announcing", async () => {
    const { waitForCasLocator, casLocators, announces } = harness();
    casLocators.set(t256, locator);

    await expect(waitForCasLocator(t256)).resolves.toEqual(locator);
    expect(announces).toEqual([]);
  });

  it("re-requests every five seconds until the locator arrives", async () => {
    vi.useFakeTimers();
    const { waitForCasLocator, casLocators, announces } = harness();

    const pending = waitForCasLocator(t256);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(announces.length).toBeGreaterThan(1);

    casLocators.set(t256, locator);
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toEqual(locator);
  });

  it("rejects once the timeout passes", async () => {
    vi.useFakeTimers();
    const { waitForCasLocator } = harness();

    const pending = waitForCasLocator(t256, 1_000);
    const rejection = expect(pending).rejects.toThrow(
      "No locator announce received",
    );
    await vi.advanceTimersByTimeAsync(2_000);
    await rejection;
  });

  it("logs a failed re-request instead of rejecting", async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const { waitForCasLocator, casLocators, log } = harness({
      ensureReticulum: async () => {
        attempts += 1;
        if (attempts > 1) throw new Error("radio offline");
        return {
          registerDestination: () => ({ announce: async () => {} }),
        };
      },
    });

    const pending = waitForCasLocator(t256);
    await vi.advanceTimersByTimeAsync(6_000);
    expect(log.some((line) => line.includes("radio offline"))).toBe(true);

    casLocators.set(t256, locator);
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toEqual(locator);
  });
});

describe("ensureEntryCasStore", () => {
  it("builds the store once", () => {
    const { ensureEntryCasStore } = harness();
    expect(ensureEntryCasStore()).toBe(ensureEntryCasStore());
  });
});
