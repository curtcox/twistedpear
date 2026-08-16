/**
 * `findingsFrom`'s ratchet-key logic, tested without spawning an analyzer.
 *
 * `scripts/languages/check.mjs` spawns tools, writes artifacts, and calls
 * `process.exit` at import time, so this class of logic could only be
 * exercised by a throwaway probe run by hand — not repeatable, and not run on
 * every change. Same reason `conformance/checks/mutation-floors.test.mjs` and
 * `conformance/checks/latency-benchmark.test.mjs` exist: the gate stays the
 * gate, the decisions move here.
 *
 * The regression this covers: `NO_COLOR=1` does not disable ruff's colour,
 * because `FORCE_COLOR=0` is read by its terminal detection as colour being
 * *forced*. Escapes reached the keys, breaking the rule-code match on the
 * diagnostic line and the digit-normaliser on the location line beneath it, so
 * four E402s across three files collapsed into one key with an occurrence
 * index that renumbered every time an earlier file gained a finding.
 */
import { describe, expect, it } from "vitest";

import { findingsFrom } from "../../scripts/languages/findings.mjs";

describe("findingsFrom", () => {
  it("joins a two-line ruff diagnostic into one key carrying rule and file", () => {
    const occurrences = new Map();
    const output = "E402 Module level import not at top of file\n --> file.py:28:1";
    expect(findingsFrom("ruff", output, occurrences, "")).toEqual([
      "ruff:E# Module level import not at top of file file.py:#:#:occurrence-1",
    ]);
  });

  it("produces the identical key when ANSI escapes surround the diagnostic", () => {
    // The regression itself: FORCE_COLOR=0 is read by ruff as colour forced,
    // so escapes reached the keys unless stripped.
    const esc = String.fromCharCode(27);
    const output =
      `${esc}[1m${esc}[91mE402${esc}[0m Module level import not at top of file\n` +
      ` ${esc}[94m--> file.py:28:1${esc}[0m`;
    const occurrences = new Map();
    expect(findingsFrom("ruff", output, occurrences, "")).toEqual([
      "ruff:E# Module level import not at top of file file.py:#:#:occurrence-1",
    ]);
  });

  it("keeps occurrence indices per file rather than renumbering across files", () => {
    // The specific defect: four E402s across three files used to collapse to
    // one key plus a global counter, so a finding in an early file renumbered
    // everything after it. Two findings in a.py get occurrence-1 and
    // occurrence-2; b.py and c.py each start their own count at occurrence-1.
    const output = [
      "E402 Module level import not at top of file",
      " --> a.py:10:1",
      "E402 Module level import not at top of file",
      " --> a.py:20:1",
      "E402 Module level import not at top of file",
      " --> b.py:5:1",
      "E402 Module level import not at top of file",
      " --> c.py:8:1",
    ].join("\n");
    const occurrences = new Map();
    expect(findingsFrom("ruff", output, occurrences, "")).toEqual([
      "ruff:E# Module level import not at top of file a.py:#:#:occurrence-1",
      "ruff:E# Module level import not at top of file a.py:#:#:occurrence-2",
      "ruff:E# Module level import not at top of file b.py:#:#:occurrence-1",
      "ruff:E# Module level import not at top of file c.py:#:#:occurrence-1",
    ]);
  });

  it("still produces the key a single-line tool like swiftlint produces today", () => {
    // A real line, matching one of the three entries in
    // language-ratchets/swift.json. THE KEY MUST NOT CHANGE from that file.
    const output =
      "apps/harness-mobile/modules/ble-bridge/ios/BleBridge.swift:414:1: error: File Length Violation: File should contain 400 lines or less: currently contains 417 (file_length)";
    const occurrences = new Map();
    expect(
      findingsFrom("swiftlint", output, occurrences, "/repo-root"),
    ).toEqual([
      "swiftlint:apps/harness-mobile/modules/ble-bridge/ios/BleBridge.swift:#:#: error: File Length Violation: File should contain # lines or less: currently contains # (file_length):occurrence-1",
    ]);
  });

  it("still records a standalone --> line with no diagnostic above it", () => {
    // Pre-existing behaviour for tools that emit a location line on its own:
    // the location pattern itself satisfies the diagnostic match via regex
    // backtracking (".py:5:" without the second digit group), so it becomes
    // its own entry rather than being silently dropped.
    const occurrences = new Map();
    expect(
      findingsFrom("ruff", " --> orphan.py:5:1", occurrences, ""),
    ).toEqual(["ruff:--> orphan.py:#:#:occurrence-1"]);
  });
});
