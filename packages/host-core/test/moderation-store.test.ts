import { mkdtempSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { FileModerationStore } from "../src/moderation-store.js";

const ALICE = "01".repeat(16);

describe("FileModerationStore", () => {
  it("persists block and mute policy with block precedence", () => {
    const path = join(
      mkdtempSync(join(tmpdir(), "tp-moderation-")),
      "moderation.json",
    );
    const store = new FileModerationStore(path, () => 42);
    store.mute(ALICE, "Alice");
    expect(store.disposition(ALICE)).toBe("mute");
    store.block(ALICE, "Alice");
    expect(store.disposition(ALICE)).toBe("block");
    expect(store.list().muted).toEqual([]);
    expect(new FileModerationStore(path).disposition(ALICE)).toBe("block");
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("records local-only reports and exports a portable JSON record", () => {
    const path = join(
      mkdtempSync(join(tmpdir(), "tp-reports-")),
      "moderation.json",
    );
    const store = new FileModerationStore(path, () => 1234);
    const report = store.report({
      sourceHash: ALICE,
      reason: "spam",
      note: "Repeated unsolicited messages",
    });
    expect(report.id).toBe("ya-0");
    expect(JSON.parse(store.exportReports())).toMatchObject({
      format: "twistedpear-local-reports-v1",
      reports: [{ sourceHash: ALICE, reason: "spam" }],
    });
    expect(JSON.parse(readFileSync(path, "utf8")).reports).toHaveLength(1);
  });
});
