import { describe, expect, it } from "vitest";
import {
  assertWebHandbookDone,
  WEB_HANDBOOK_TERMINAL_STATUSES,
} from "../web-handbook/status.mjs";

describe("web handbook terminal status", () => {
  it("treats both success and page-reported failure as terminal", () => {
    expect(WEB_HANDBOOK_TERMINAL_STATUSES).toEqual(["done", "error"]);
  });

  it("accepts a completed handbook run", () => {
    expect(() => assertWebHandbookDone({ status: "done" })).not.toThrow();
  });

  it("reports a page error immediately with its snapshot", () => {
    expect(() =>
      assertWebHandbookDone({ status: "error", message: "applet failed" }),
    ).toThrow(/web handbook failed:.*applet failed/);
  });

  it("distinguishes a non-terminal state from a page error", () => {
    expect(() => assertWebHandbookDone({ status: "running" })).toThrow(
      /web handbook incomplete/,
    );
  });
});
