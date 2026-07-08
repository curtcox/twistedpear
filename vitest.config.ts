import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "conformance/mac-validation/**/*.test.mjs"],
    passWithNoTests: false
  }
});
