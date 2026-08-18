import { describe, expect, it } from "vitest";
import {
  CAPABILITY_RISK_HOST_API,
  CAPABILITY_RISK_REGISTRY,
  DEVICE_CLASS_REGISTRY,
  capabilityRiskById,
  deviceCapabilityId,
  riskClassForCapability,
  type CapabilityRiskClass,
} from "../src/index.js";
import {
  assertRiskAssignment,
  minimumRiskRank,
} from "../../../scripts/generate-capability-risk.mjs";

const PLAN_CORE_CLASSES: ReadonlyArray<readonly [string, CapabilityRiskClass]> =
  [
    ["storage:kv", "benign"],
    ["storage:hyperbee", "benign"],
    ["workspace", "benign"],
    ["presence", "benign"],
    ["link:observe", "benign"],
    ["relay:read", "benign"],
    ["identity", "elevated"],
    ["announce:subscribe", "elevated"],
    ["announce:publish", "elevated"],
    ["share:cas", "elevated"],
    ["ai:chat", "elevated"],
    ["ai:embed", "elevated"],
    ["resource:fetch", "elevated"],
    ["peer:connect", "elevated"],
    ["link:probe", "elevated"],
    ["apps:preview", "elevated"],
    ["lxmf:send", "sensitive"],
    ["lxmf:receive", "sensitive"],
    ["freenet:contract", "sensitive"],
    ["device:stream", "sensitive"],
    ["apps:package", "sensitive"],
    ["apps:publish", "sensitive"],
    ["apps:install", "sensitive"],
    ["relay:configure", "critical"],
  ];

const CROSS_CUTTING = [
  "device:stream",
  "device:remote",
  "device:share-policy:read",
  "device:stream:raw-inbound",
] as const;

describe("capability risk registry", () => {
  it("assigns the Phase 1 table, including apps:channel as elevated", () => {
    expect(CAPABILITY_RISK_HOST_API).toBe("0.13.0");
    for (const [id, riskClass] of PLAN_CORE_CLASSES) {
      expect(riskClassForCapability(id), id).toBe(riskClass);
    }
    expect(riskClassForCapability("apps:channel")).toBe("elevated");
  });

  it("covers every device capability and maps consent class to risk", () => {
    const deviceIds = [
      ...DEVICE_CLASS_REGISTRY.flatMap((entry) =>
        entry.tiers.map((tier) => deviceCapabilityId(entry.id, tier.id)),
      ),
      ...CROSS_CUTTING,
    ];
    for (const id of deviceIds) {
      expect(capabilityRiskById(id), id).toBeDefined();
    }
    expect(riskClassForCapability("device:share-policy:read")).toBe("benign");
    expect(riskClassForCapability("device:location")).toBe("elevated");
    expect(riskClassForCapability("device:haptics")).toBe("elevated");
    expect(riskClassForCapability("device:camera")).toBe("sensitive");
    expect(riskClassForCapability("device:camera:frames")).toBe("sensitive");
    expect(riskClassForCapability("device:nfc:apdu")).toBe("sensitive");
  });

  it("enforces answer floors and unique ids", () => {
    const ids = new Set<string>();
    for (const entry of CAPABILITY_RISK_REGISTRY) {
      expect(ids.has(entry.id), entry.id).toBe(false);
      ids.add(entry.id);
      expect(() => assertRiskAssignment(entry)).not.toThrow();
      const floor = minimumRiskRank(entry);
      const rank = { benign: 0, elevated: 1, sensitive: 2, critical: 3 };
      expect(rank[entry.riskClass]).toBeGreaterThanOrEqual(floor);
    }
    expect(() => riskClassForCapability("future:magic")).toThrow(
      /unknown capability risk id/,
    );
  });
});
