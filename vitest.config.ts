import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: false,
    projects: [
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
            "conformance/mac-validation/**/*.test.mjs",
            "conformance/docs/**/*.test.mjs"
          ],
          exclude: ["packages/protocol/test/**/*.test.ts"]
        }
      }
    ]
  }
});
