import { describe, expect, it } from "vitest";
import {
  normalizeAlerts,
  repositoryFrom,
} from "../../scripts/security/codeql-alerts.mjs";

describe("CodeQL alert import", () => {
  it("normalizes only open alerts into stable, reviewable findings", () => {
    expect(
      normalizeAlerts([
        {
          number: 7,
          state: "open",
          rule: { id: "js/sql-injection", security_severity_level: "high" },
          most_recent_instance: {
            location: { path: "packages/a.ts", start_line: 12 },
          },
        },
        { number: 8, state: "dismissed", rule: { id: "ignored" } },
      ]),
    ).toEqual(["js/sql-injection #7 packages/a.ts:12 high"]);
  });

  it("resolves HTTPS and SSH GitHub origins", () => {
    expect(repositoryFrom("https://github.com/curtcox/twistedpear.git")).toBe(
      "curtcox/twistedpear",
    );
    expect(repositoryFrom("git@github.com:curtcox/twistedpear.git")).toBe(
      "curtcox/twistedpear",
    );
  });
});
