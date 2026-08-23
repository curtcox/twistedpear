import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  enclosingFunction,
  findingKey,
  offendingExpression,
} from "../../scripts/analysis/rust-lint-ratchet.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const rules = JSON.parse(
  fs.readFileSync(path.join(root, "rust-lint-rules.json"), "utf8"),
);
const baseline = JSON.parse(
  fs.readFileSync(path.join(root, "language-ratchets/rust-lints.json"), "utf8"),
);

/** One clippy JSON message, shaped as the real ones are. */
function message(code, { file = "src/lib.rs", line = 10, text, highlight }) {
  return {
    message: {
      code: { code },
      spans: [
        {
          is_primary: true,
          file_name: file,
          line_start: line,
          text: [
            {
              text,
              highlight_start: highlight[0],
              highlight_end: highlight[1],
            },
          ],
        },
      ],
    },
  };
}

describe("rust contract lint policy", () => {
  // The half that costs nothing and guarantees the most: these five hold at
  // zero across all three contracts, so they are denied outright rather than
  // ratcheted. A lint quietly leaving a manifest would retire the guarantee
  // without changing any baseline.
  it("denies the zero-finding lints in every shipped contract manifest", () => {
    expect(rules.denied.lints.length).toBeGreaterThan(0);
    for (const crate of rules.crates) {
      const manifest = fs.readFileSync(
        path.join(root, crate, "Cargo.toml"),
        "utf8",
      );
      expect(manifest, crate).toContain("[lints.clippy]");
      for (const lint of rules.denied.lints) {
        expect(manifest, `${crate} ${lint}`).toMatch(
          new RegExp(`^${lint}\\s*=\\s*"deny"`, "m"),
        );
      }
    }
  });

  // Release builds turn overflow checking off, so the wasm these contracts ship
  // as wraps `cursor + 9` silently while every test and fuzz target runs a debug
  // build that traps. The one configuration nobody exercises is the one users
  // get.
  it("keeps overflow checks on in the release profile that ships", () => {
    for (const crate of rules.crates) {
      const manifest = fs.readFileSync(
        path.join(root, crate, "Cargo.toml"),
        "utf8",
      );
      expect(manifest, crate).toMatch(/\[profile\.release\]/);
      expect(manifest, crate).toMatch(/^overflow-checks\s*=\s*true/m);
    }
  });

  it("does not both deny and ratchet the same lint", () => {
    const denied = new Set(rules.denied.lints.map((lint) => `clippy::${lint}`));
    for (const lint of rules.ratcheted) {
      expect(denied.has(lint), `${lint} is denied and ratcheted`).toBe(false);
    }
  });

  it("names crates that exist", () => {
    expect(rules.crates.length).toBeGreaterThan(0);
    for (const crate of rules.crates) {
      expect(fs.existsSync(path.join(root, crate, "Cargo.toml")), crate).toBe(
        true,
      );
    }
  });

  it("finds the function a diagnostic sits in", () => {
    const lines = [
      "pub fn decode_entries(bytes: &[u8]) -> Result<(), &'static str> {",
      "    let count = bytes[5];",
      "}",
      "fn max_entries(state_length: usize) -> usize {",
      "    state_length / 2",
      "}",
    ];
    expect(enclosingFunction(lines, 2)).toBe("decode_entries");
    expect(enclosingFunction(lines, 5)).toBe("max_entries");
    // A finding above any `fn` keys to the module rather than to a guess.
    expect(enclosingFunction(["const HEADER: usize = 5;"], 1)).toBe("<module>");
  });

  // Four indexing findings share one line of `decode_entries`. Collapsing them
  // would make the ratchet blind in both directions at once.
  it("tells apart findings that share a line", () => {
    const text = "    let count = u32::from_be_bytes([bytes[5], bytes[6]]);";
    const first = offendingExpression({
      text: [{ text, highlight_start: 37, highlight_end: 45 }],
    });
    const second = offendingExpression({
      text: [{ text, highlight_start: 47, highlight_end: 55 }],
    });
    expect(first).toBe("bytes[5]");
    expect(second).toBe("bytes[6]");
    expect(first).not.toBe(second);
  });

  it("keys a finding by crate, lint, file, function and expression", () => {
    const measured = new Set(rules.ratcheted);
    const readLines = () => ["pub fn valid_shape(bytes: &[u8]) -> bool {", ""];
    const key = findingKey(
      message("clippy::indexing_slicing", {
        text: "    let x = bytes[5];",
        highlight: [13, 21],
      }),
      measured,
      readLines,
      "packages/bridge-freenet/contract/locator",
    );
    expect(key).toBe(
      "packages/bridge-freenet/contract/locator:clippy::indexing_slicing:src/lib.rs:valid_shape:bytes[5]",
    );
  });

  it("ignores lints it does not measure", () => {
    const key = findingKey(
      message("clippy::needless_borrow", {
        text: "    let x = &y;",
        highlight: [13, 15],
      }),
      new Set(rules.ratcheted),
      () => [],
      "crate",
    );
    expect(key).toBeNull();
  });

  it("has a baseline whose entries all name a measured lint and a real crate", () => {
    expect(baseline.entries.length).toBeGreaterThan(0);
    const crates = new Set(rules.crates);
    const lints = new Set(rules.ratcheted);
    for (const entry of baseline.entries) {
      const crate = rules.crates.find((candidate) =>
        entry.startsWith(`${candidate}:`),
      );
      expect(crate, entry).toBeTruthy();
      expect(crates.has(crate)).toBe(true);
      // A lint name carries its own `::`, so the key is matched against the
      // declared list rather than split on the separator.
      const rest = entry.slice(crate.length + 1);
      const lint = rules.ratcheted.find((candidate) =>
        rest.startsWith(`${candidate}:`),
      );
      expect(lint, `${entry} names no measured lint`).toBeTruthy();
      expect(lints.has(lint)).toBe(true);
    }
  });
});
