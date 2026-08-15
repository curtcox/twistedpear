/**
 * The distinct-node Freenet run records whether it was clean.
 *
 * `freenet-real-node` was a coin flip for days and nothing in its output said
 * so: a run that passed on its second attempt looked exactly like one that
 * passed first time. These assertions pin the distinction, which is the whole
 * point of the bookkeeping — the mesh itself needs a Freenet binary and cannot
 * run here.
 */
import { describe, expect, it } from "vitest";

import {
  formatOutcomes,
  summarizeOutcomes,
} from "../freenet-spike/outcomes.mjs";

const passed = (label, attempts = 1) => ({
  label,
  status: "passed",
  attempts,
  diagnostic: false,
});

describe("summarizeOutcomes", () => {
  it("calls a first-attempt run clean", () => {
    const summary = summarizeOutcomes([passed("F2"), passed("F3")], "smoke");
    expect(summary).toMatchObject({
      scenarios: 2,
      retried: 0,
      degraded: 0,
      failed: 0,
      clean: true,
    });
  });

  it("refuses to call a retried run clean", () => {
    const summary = summarizeOutcomes([passed("F2"), passed("F3", 2)], "smoke");
    expect(summary).toMatchObject({ retried: 1, failed: 0, clean: false });
  });

  it("counts a degraded diagnostic without counting it as a failure", () => {
    const summary = summarizeOutcomes(
      [
        {
          label: "cross-node notify",
          status: "degraded",
          attempts: 2,
          diagnostic: true,
          message: "reconcile timed out waiting for counter 1",
        },
        passed("F2"),
      ],
      "smoke",
    );
    // The distinction the job turns on: degraded is visible, but it is not a
    // failure, because this measurement declares itself not gate evidence.
    expect(summary).toMatchObject({ degraded: 1, failed: 0, clean: false });
  });

  it("counts a real scenario failure as a failure", () => {
    const summary = summarizeOutcomes(
      [
        {
          label: "F2 after subscriber restart",
          status: "failed",
          attempts: 3,
          diagnostic: false,
          message: "Request timeout",
        },
      ],
      "smoke",
    );
    expect(summary).toMatchObject({ degraded: 0, failed: 1, clean: false });
  });
});

describe("formatOutcomes", () => {
  it("says out loud that a retried run was not clean", () => {
    expect(formatOutcomes([passed("F2", 3)])).toContain("was not clean");
  });

  it("stays quiet when nothing was retried", () => {
    expect(formatOutcomes([passed("F2")])).not.toContain("was not clean");
  });
});
