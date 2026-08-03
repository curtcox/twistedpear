// @ts-nocheck
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    passWithNoTests: false,
    workspace: "./vitest.workspace.ts"
  }
});
