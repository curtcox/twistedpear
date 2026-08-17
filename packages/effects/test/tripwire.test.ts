import { afterEach, describe, expect, it } from "vitest";
import {
  SansIOViolation,
  installTripwire,
  isTripwireInstalled,
  uninstallTripwire,
} from "../src/tripwire.js";

describe("sans-io tripwire", () => {
  afterEach(() => {
    uninstallTripwire();
  });

  it("throws on Date.now", () => {
    installTripwire();
    expect(isTripwireInstalled()).toBe(true);
    expect(() => Date.now()).toThrow(SansIOViolation);
  });

  it("throws on Math.random", () => {
    installTripwire();
    expect(() => Math.random()).toThrow(SansIOViolation);
  });

  it("throws on setTimeout", () => {
    installTripwire();
    expect(() => setTimeout(() => undefined, 0)).toThrow(SansIOViolation);
  });

  it("allows Date constructed with an explicit value", () => {
    installTripwire();
    expect(new Date(0).getTime()).toBe(0);
  });

  it("uninstall restores Date.now", () => {
    installTripwire();
    uninstallTripwire();
    expect(typeof Date.now()).toBe("number");
  });

  it("blocks every available nondeterministic global and restores it exactly", () => {
    const originals = {
      Date,
      random: Math.random,
      setTimeout,
      setInterval,
      setImmediate: globalThis.setImmediate,
      clearTimeout,
      clearInterval,
      queueMicrotask,
      fetch: globalThis.fetch,
      performanceNow: globalThis.performance?.now,
      getRandomValues: globalThis.crypto?.getRandomValues,
      randomUUID: globalThis.crypto?.randomUUID,
    };
    const violation = (run: () => unknown, api: string) => {
      try {
        run();
        throw new Error(`expected ${api} to throw`);
      } catch (error) {
        expect(error).toBeInstanceOf(SansIOViolation);
        expect((error as SansIOViolation).api).toBe(api);
      }
    };

    installTripwire();
    const installedDate = Date;
    installTripwire();
    expect(Date).toBe(installedDate);
    expect(Date.name).toBe("Date");
    expect(Date.prototype).toBe(originals.Date.prototype);
    expect(Date.parse("1970-01-01T00:00:00.000Z")).toBe(0);
    expect(Date.UTC(1970, 0, 1)).toBe(0);
    violation(() => new Date(), "new Date()");
    violation(() => Date.now(), "Date.now");
    violation(() => Math.random(), "Math.random");
    violation(() => setTimeout(() => undefined, 0), "setTimeout");
    violation(() => setInterval(() => undefined, 0), "setInterval");
    violation(() => clearTimeout(undefined), "clearTimeout");
    violation(() => clearInterval(undefined), "clearInterval");
    violation(() => queueMicrotask(() => undefined), "queueMicrotask");
    if (originals.setImmediate)
      violation(() => setImmediate(() => undefined), "setImmediate");
    if (originals.fetch)
      violation(
        () =>
          globalThis.fetch("https://example.invalid", {
            signal: AbortSignal.abort(),
          }),
        "fetch",
      );
    if (originals.performanceNow)
      violation(() => performance.now(), "performance.now");
    if (originals.getRandomValues)
      violation(
        () => crypto.getRandomValues(new Uint8Array(1)),
        "crypto.getRandomValues",
      );
    if (originals.randomUUID)
      violation(() => crypto.randomUUID(), "crypto.randomUUID");

    uninstallTripwire();
    expect(Date).toBe(originals.Date);
    expect(Math.random).toBe(originals.random);
    expect(setTimeout).toBe(originals.setTimeout);
    expect(setInterval).toBe(originals.setInterval);
    expect(globalThis.setImmediate).toBe(originals.setImmediate);
    expect(clearTimeout).toBe(originals.clearTimeout);
    expect(clearInterval).toBe(originals.clearInterval);
    expect(queueMicrotask).toBe(originals.queueMicrotask);
    expect(globalThis.fetch).toBe(originals.fetch);
    expect(globalThis.performance?.now).toBe(originals.performanceNow);
    expect(globalThis.crypto?.getRandomValues).toBe(originals.getRandomValues);
    expect(globalThis.crypto?.randomUUID).toBe(originals.randomUUID);
    expect(isTripwireInstalled()).toBe(false);
    uninstallTripwire();
    expect(isTripwireInstalled()).toBe(false);
  });

  it("retains explicit violation messages", () => {
    expect(new SansIOViolation("clock").message).toBe(
      "Sans-IO violation: protocol code must not call clock",
    );
    expect(new SansIOViolation("clock", "custom").message).toBe("custom");
    expect(new SansIOViolation("clock").name).toBe("SansIOViolation");
  });
});
