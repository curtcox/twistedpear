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
});
