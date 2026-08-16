import { defineConfig } from "vitest/config";
import { MUTATED_PACKAGES } from "./stryker.config.mjs";

const requested = process.env.MUTATION_PACKAGES?.trim();
const selected = requested
  ? requested
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
  : MUTATED_PACKAGES;

const focusedTests: Record<string, string[]> = {
  "miniapp-runtime": [
    "packages/miniapp-runtime/test/broker.test.ts",
    "packages/miniapp-runtime/test/capabilities.test.ts",
    "packages/miniapp-runtime/test/security-policies.test.ts",
    "packages/miniapp-runtime/test/sandbox-boundaries.test.ts",
  ],
  "reticulum-interfaces": [
    "packages/reticulum-interfaces/test/auto-discovery.test.ts",
    "packages/reticulum-interfaces/test/ble-framing.test.ts",
    "packages/reticulum-interfaces/test/optical-interface.test.ts",
    "packages/reticulum-interfaces/test/policy.test.ts",
  ],
  "peer-discovery": [
    "packages/peer-discovery/test/budget-replay.test.ts",
    "packages/peer-discovery/test/coordinator.test.ts",
    "packages/peer-discovery/test/crypto-backend.test.ts",
  ],
};

const packageTests = selected.flatMap(
  (name) => focusedTests[name] ?? [`packages/${name}/test/**/*.test.ts`],
);
const conformanceTests = [
  "conformance/**/*.test.ts",
  "conformance/**/*.test.mjs",
];

export default defineConfig({
  test: {
    passWithNoTests: false,
    projects: [
      ...(selected.includes("protocol")
        ? [
            {
              test: {
                name: "protocol-tripwire",
                include: ["packages/protocol/test/**/*.test.ts"],
                setupFiles: ["packages/protocol/test/setup-tripwire.ts"],
              },
            },
          ]
        : []),
      {
        test: {
          name: "mutation",
          testTimeout: 60_000,
          include: [...packageTests, ...conformanceTests],
          exclude: ["packages/protocol/test/**/*.test.ts"],
        },
      },
    ],
  },
});
