import { defineConfig } from "vitest/config";

const focusedUnitGate = process.env.TP_UNIT_GATE === "1";
const dedicatedUnitGateExcludes = [
  "conformance/release-harness/**",
  "conformance/doc-audit/**",
  "packages/guida-twistedpear/test/parity.test.ts",
  "packages/guida-twistedpear/test/wrap-scope.test.ts",
  "packages/guida-twistedpear/test/sdk-descriptor.test.ts",
  "packages/guida-twistedpear/test/sdk-vectors.test.ts",
  "packages/guida-twistedpear/test/compiler.test.ts",
  "packages/reticulum-ts/test/fuzz.test.ts",
  "packages/lxmf-ts/test/fuzz.test.ts",
];

export default defineConfig({
  test: {
    passWithNoTests: false,
    // Vitest 4 removed the `workspace` option and the separate workspace file it
    // pointed at; project definitions live here instead.
    projects: [
      {
        test: {
          name: "protocol-tripwire",
          include: ["packages/protocol/test/**/*.test.ts"],
          exclude: focusedUnitGate
            ? ["packages/protocol/test/properties*.test.ts"]
            : [],
          setupFiles: ["packages/protocol/test/setup-tripwire.ts"],
        },
      },
      {
        // React Native components only render off-device through
        // react-native-web, so `.tsx` unit tests resolve "react-native" to it
        // and render with react-dom's server renderer.
        resolve: {
          alias: { "react-native": "react-native-web" },
        },
        test: {
          name: "default",
          // KDF/identity tests slow down substantially under V8 coverage
          // instrumentation; 60 seconds keeps them green while still failing
          // genuinely hung tests quickly enough for local iteration.
          testTimeout: 60000,
          include: [
            "packages/*/test/**/*.test.ts",
            "packages/*/test/**/*.test.tsx",
            "apps/harness-mobile/test/**/*.test.ts",
            "apps/host-desktop/test/**/*.test.ts",
            "apps/handbook/test/**/*.test.mjs",
            "conformance/mac-validation/**/*.test.mjs",
            "conformance/release-harness/**/*.test.mjs",
            "conformance/docs/**/*.test.mjs",
            "conformance/doc-audit/**/*.test.mjs",
            "conformance/file-sizes/**/*.test.mjs",
            "conformance/device-evidence/**/*.test.mjs",
            "conformance/cookbook/**/*.test.mjs",
            "conformance/android-emulator/**/*.test.mjs",
            "conformance/local-multipeer/**/*.test.mjs",
            "conformance/miniapp-identity/**/*.test.mjs",
            "conformance/reticulum-interfaces/**/*.test.ts",
            "conformance/cross-device-dev/**/*.test.mjs",
            "conformance/ui-invariants/**/*.test.mjs",
            "conformance/checks/**/*.test.mjs",
            "conformance/desktop/**/*.test.mjs",
          ],
          exclude: [
            "packages/protocol/test/**/*.test.ts",
            ...(focusedUnitGate ? dedicatedUnitGateExcludes : []),
            // Coverage measures the unit suite plus the conformance files that
            // are already in this project. Vitest 4 project includes ignore
            // CLI `--exclude`, so coverage-run.mjs sets TP_COVERAGE and this
            // drops cookbook — those tests time out under V8 instrumentation.
            ...(process.env.TP_COVERAGE === "1"
              ? ["conformance/cookbook/**"]
              : []),
          ],
        },
      },
    ],
  },
});
