import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  cruiseResolved,
  normalizeTarget,
} from "../../scripts/analysis/coupling-resolve.mjs";

const root = path.resolve(import.meta.dirname, "../..");

describe("coupling resolve", () => {
  it("joins an unresolved relative dist specifier onto the importer", () => {
    expect(
      cruiseResolved("apps/host-desktop/worklet/entry.mjs", {
        resolved: "../../../packages/reticulum-ts/dist/destination.js",
      }),
    ).toBe("packages/reticulum-ts/dist/destination.js");
    expect(
      cruiseResolved("packages/worklet-core/src/worklet-entry-announce.mjs", {
        resolved: "../../reticulum-ts/dist/crypto/bytes.js",
        module: "../../reticulum-ts/dist/crypto/bytes.js",
      }),
    ).toBe("packages/reticulum-ts/dist/crypto/bytes.js");
  });

  it("leaves a repo-relative resolution from a built tree unchanged", () => {
    expect(
      cruiseResolved("apps/host-desktop/worklet/entry.mjs", {
        resolved: "packages/reticulum-ts/dist/destination.js",
      }),
    ).toBe("packages/reticulum-ts/dist/destination.js");
  });

  it("maps dist output to authored source whether or not dist exists", () => {
    expect(
      normalizeTarget(root, "packages/reticulum-ts/dist/destination.js"),
    ).toBe("packages/reticulum-ts/src/destination.ts");
    expect(
      normalizeTarget(root, "packages/reticulum-ts/dist/crypto/bytes.js"),
    ).toBe("packages/reticulum-ts/src/crypto/bytes.ts");
    expect(normalizeTarget(root, "@twistedpear/protocol")).toBe(
      "packages/protocol/src/index.ts",
    );
  });
});
