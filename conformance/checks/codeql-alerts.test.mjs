import { describe, expect, it } from "vitest";
import {
  alertRetryDelayMs,
  fetchJsonWithRetry,
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

  it("retries 503 then returns the payload", async () => {
    const calls = [];
    const fetchImpl = async () => {
      calls.push(true);
      if (calls.length === 1) {
        return {
          ok: false,
          status: 503,
          text: async () => "unavailable",
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => [{ number: 1, state: "open" }],
      };
    };
    const sleeps = [];
    await expect(
      fetchJsonWithRetry(
        "https://example.invalid/alerts",
        {},
        {
          fetchImpl,
          sleep: async (ms) => {
            sleeps.push(ms);
          },
        },
      ),
    ).resolves.toEqual([{ number: 1, state: "open" }]);
    expect(calls).toHaveLength(2);
    expect(sleeps).toEqual([alertRetryDelayMs(1)]);
  });

  it("does not retry a non-transient status", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return { ok: false, status: 403, text: async () => "forbidden" };
    };
    await expect(
      fetchJsonWithRetry(
        "https://example.invalid/alerts",
        {},
        {
          fetchImpl,
          sleep: async () => {
            throw new Error("should not sleep");
          },
        },
      ),
    ).rejects.toThrow(/403/);
    expect(calls).toBe(1);
  });
});
