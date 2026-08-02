import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "protocol-tripwire",
      include: ["packages/protocol/test/**/*.test.ts"],
      setupFiles: ["packages/protocol/test/setup-tripwire.ts"]
    }
  },
  {
    test: {
      name: "default",
      include: [
        "packages/*/test/**/*.test.ts",
        "apps/harness-mobile/test/**/*.test.ts",
        "conformance/mac-validation/**/*.test.mjs",
        "conformance/release-harness/**/*.test.mjs",
        "conformance/docs/**/*.test.mjs",
        "conformance/doc-audit/**/*.test.mjs",
        "conformance/file-sizes/**/*.test.mjs",
        "conformance/device-evidence/**/*.test.mjs",
        "conformance/cookbook/**/*.test.mjs",
        "conformance/local-multipeer/**/*.test.mjs",
        "conformance/cross-device-dev/**/*.test.mjs",
        "conformance/ui-invariants/**/*.test.mjs"
      ],
      exclude: ["packages/protocol/test/**/*.test.ts"]
    }
  }
]);
