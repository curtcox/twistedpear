import { describe, expect, it } from "vitest";

import {
  packagesWithChangedBaselines,
  signatureDigestFailures,
  signatureEntries,
} from "../../scripts/analysis/api-signatures.mjs";

describe("API signature policy", () => {
  it("detects a type change when the exported symbol count is unchanged", () => {
    const before = signatureEntries(
      new Map([
        ["sdk.api.md", { package: "packages/sdk", text: "f(x: string)" }],
      ]),
    );
    const after = signatureEntries(
      new Map([
        ["sdk.api.md", { package: "packages/sdk", text: "f(x: number)" }],
      ]),
    );
    expect(signatureDigestFailures(before, after)).toEqual([
      "sdk.api.md: signature digest differs from baseline",
    ]);
  });

  it("attributes added, removed, and changed reports to their packages", () => {
    expect(
      packagesWithChangedBaselines(
        {
          "old.api.md": { package: "packages/old", sha256: "a" },
          "same.api.md": { package: "packages/same", sha256: "b" },
        },
        {
          "new.api.md": { package: "packages/new", sha256: "c" },
          "same.api.md": { package: "packages/same", sha256: "d" },
        },
      ),
    ).toEqual(["packages/new", "packages/old", "packages/same"]);
  });
});
