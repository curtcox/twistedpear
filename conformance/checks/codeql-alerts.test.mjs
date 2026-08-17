import { describe, expect, it } from "vitest";
import {
  ALERT_RETRY_ATTEMPTS,
  alertRetryDelayMs,
  fetchJsonWithRetry,
  isRetryableAlertError,
  isUnavailableAlertError,
  normalizeAlerts,
  parseRetryAfterMs,
  repositoryFrom,
} from "../../scripts/security/codeql-alerts.mjs";

function jsonOk(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

function httpError(status, body, retryAfter) {
  return {
    ok: false,
    status,
    headers: retryAfter
      ? { get: (name) => (name === "retry-after" ? retryAfter : null) }
      : undefined,
    text: async () => body,
  };
}

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
      if (calls.length === 1) return httpError(503, "unavailable");
      return jsonOk([{ number: 1, state: "open" }]);
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

  it("honors Retry-After on a transient status", async () => {
    const sleeps = [];
    await expect(
      fetchJsonWithRetry(
        "https://example.invalid/alerts",
        {},
        {
          fetchImpl: async () => {
            if (sleeps.length === 0) return httpError(429, "slow down", "5");
            return jsonOk([]);
          },
          sleep: async (ms) => {
            sleeps.push(ms);
          },
        },
      ),
    ).resolves.toEqual([]);
    expect(sleeps).toEqual([5000]);
  });

  it("retries a timeout then returns the payload", async () => {
    const calls = [];
    const fetchImpl = async () => {
      calls.push(true);
      if (calls.length === 1) {
        const error = new Error("aborted");
        error.name = "AbortError";
        throw error;
      }
      return jsonOk([]);
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
    ).resolves.toEqual([]);
    expect(calls).toHaveLength(2);
    expect(sleeps).toEqual([alertRetryDelayMs(1)]);
  });

  it("does not retry a non-transient status", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return httpError(403, "forbidden");
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

  it("exhausts retries on a persistent 503", async () => {
    let calls = 0;
    const sleeps = [];
    await expect(
      fetchJsonWithRetry(
        "https://example.invalid/alerts",
        {},
        {
          fetchImpl: async () => {
            calls += 1;
            return httpError(503, "unavailable");
          },
          sleep: async (ms) => {
            sleeps.push(ms);
          },
        },
      ),
    ).rejects.toThrow(/503/);
    expect(calls).toBe(ALERT_RETRY_ATTEMPTS);
    expect(sleeps).toHaveLength(ALERT_RETRY_ATTEMPTS - 1);
  });

  it("caps Retry-After and treats abort-class errors as retryable", () => {
    expect(parseRetryAfterMs("120")).toBe(60_000);
    expect(isRetryableAlertError({ name: "AbortError" })).toBe(true);
    expect(isRetryableAlertError({ name: "TypeError" })).toBe(true);
    expect(isRetryableAlertError({ name: "SyntaxError" })).toBe(false);
  });

  it("treats exhausted 503s as unavailable rather than as open alerts", () => {
    // A GitHub Pages outage used to fail this gate and paint /results/ red
    // with no CodeQL finding. After retries are spent, that is "we could not
    // import", not "new alerts appeared".
    expect(
      isUnavailableAlertError(
        new Error(
          'CodeQL alerts API returned 503: {"message": "No server is currently available"}',
        ),
      ),
    ).toBe(true);
    expect(
      isUnavailableAlertError(
        new Error("CodeQL alerts API returned 403: forbidden"),
      ),
    ).toBe(false);
  });

  it("gives each attempt its own timeout signal", async () => {
    const signals = [];
    await fetchJsonWithRetry(
      "https://example.invalid/alerts",
      { headers: { accept: "application/json" } },
      {
        timeoutMs: 1_000,
        fetchImpl: async (_url, options) => {
          signals.push(options.signal);
          if (signals.length === 1) return httpError(503, "unavailable");
          return jsonOk([]);
        },
        sleep: async () => {},
      },
    );
    expect(signals).toHaveLength(2);
    expect(signals[0]).not.toBe(signals[1]);
    expect(signals[0]).toBeInstanceOf(AbortSignal);
  });
});
