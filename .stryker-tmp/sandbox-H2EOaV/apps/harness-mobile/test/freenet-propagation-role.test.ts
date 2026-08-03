// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  freenetPropagationRoleLabel,
  freenetPropagationRoleOnline
} from "../src/freenet-propagation-role.js";

describe("freenetPropagationRoleOnline", () => {
  it("requires grant, attached mirror, and running PropagationServer", () => {
    expect(
      freenetPropagationRoleOnline({
        freenetPropagation: true,
        freenetPropagationAttached: true,
        freenetPropagationRole: true,
        propagationEnabled: true
      })
    ).toBe(true);
    expect(
      freenetPropagationRoleOnline({
        freenetPropagation: true,
        freenetPropagationAttached: true,
        freenetPropagationRole: false,
        propagationEnabled: false
      })
    ).toBe(false);
    expect(
      freenetPropagationRoleOnline({
        freenetPropagation: false,
        freenetPropagationAttached: false,
        freenetPropagationRole: false,
        propagationEnabled: false
      })
    ).toBe(false);
  });
});

describe("freenetPropagationRoleLabel", () => {
  it("summarizes online and offline states without secrets", () => {
    expect(
      freenetPropagationRoleLabel({
        freenetPropagation: true,
        freenetPropagationAttached: true,
        freenetPropagationRole: true,
        propagationEnabled: true,
        propagationMessageCount: 3,
        propagationStoreBytes: 120
      })
    ).toBe("Propagation role online · 3 msg · 120 B");
    expect(
      freenetPropagationRoleLabel({
        freenetPropagation: true,
        freenetPropagationAttached: false,
        freenetPropagationRole: false,
        propagationEnabled: false
      })
    ).toBe("Propagation grant enabled · role not running");
    expect(freenetPropagationRoleLabel({})).toBe("Propagation role off");
  });
});
