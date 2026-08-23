import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  extractConstants,
  foldName,
  normalizeLiteral,
} from "../../scripts/analysis/native-parity.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const declaration = JSON.parse(
  fs.readFileSync(
    path.join(root, "conformance/native-parity/ble-bridge.json"),
    "utf8",
  ),
);

/**
 * Run the gate against a tree where `edit` has been applied, then put the file
 * back. The gate reads the working tree, so a regression test for it has to
 * write to the working tree — restoring in a `finally` keeps a failing
 * expectation from leaving the checkout modified.
 */
function gateWith(relative, edit) {
  const file = path.join(root, relative);
  const original = fs.readFileSync(file, "utf8");
  const mutated = edit(original);
  expect(mutated, `${relative} edit changed nothing`).not.toBe(original);
  try {
    fs.writeFileSync(file, mutated);
    return spawnSync(
      globalThis.process.execPath,
      ["scripts/analysis/native-parity.mjs"],
      { cwd: root, encoding: "utf8" },
    );
  } finally {
    fs.writeFileSync(file, original);
  }
}

const swift = "apps/harness-mobile/modules/ble-bridge/ios/BleBridgeSpec.swift";
const kotlin =
  "apps/harness-mobile/modules/ble-bridge/android/src/main/java/network/twistedpear/harness/BleBridgeSpec.kt";
const worklet = "apps/harness-mobile/worklet/ipc-ble-bridge.mjs";

describe("native bridge parity", () => {
  it("passes on the tree as committed", () => {
    const result = spawnSync(
      globalThis.process.execPath,
      ["scripts/analysis/native-parity.mjs"],
      { cwd: root, encoding: "utf8" },
    );
    expect(result.stdout).toContain("native-parity: PASS");
    expect(result.status).toBe(0);
  });

  it("unwraps each language's spelling of the same literal", () => {
    expect(normalizeLiteral('CBUUID(string: "6e6f0001")')).toBe("6e6f0001");
    expect(normalizeLiteral('UUID.fromString("6e6f0001")')).toBe("6e6f0001");
    // 500 and 500L are one constant under two type systems, not a divergence.
    expect(normalizeLiteral("500L")).toBe(500);
    expect(normalizeLiteral("500")).toBe(500);
    expect(normalizeLiteral("0x08")).toBe(8);
    // Anything compound is not a shared constant and must not be guessed at.
    expect(normalizeLiteral("computeMtu(peer)")).toBeNull();
    expect(normalizeLiteral("DEFAULT_MTU - 4")).toBeNull();
  });

  it("folds the three case conventions onto one name", () => {
    expect(foldName("DEFAULT_MTU")).toBe(foldName("defaultMtu"));
    expect(foldName("BLE_FRAME_HEADER_SIZE")).toBe(
      foldName("bleFrameHeaderSize"),
    );
  });

  it("reads constants out of each declaration form", () => {
    expect(
      extractConstants("swift", "  static let defaultMtu = 247\n").get(
        "defaultMtu",
      ),
    ).toBe(247);
    expect(
      extractConstants("kotlin", "    const val DEFAULT_MTU = 247\n").get(
        "DEFAULT_MTU",
      ),
    ).toBe(247);
    expect(
      extractConstants(
        "kotlin",
        '    val SERVICE_UUID: UUID = UUID.fromString("abc")\n',
      ).get("SERVICE_UUID"),
    ).toBe("abc");
    expect(
      extractConstants("worklet", "const DEFAULT_MTU = 247;\n").get(
        "DEFAULT_MTU",
      ),
    ).toBe(247);
  });

  it("fails when one implementation's UUID digit is transposed", () => {
    const result = gateWith(kotlin, (source) =>
      source.replace(
        "6e6f0002-7e3a-4f2d-9b1c-8a5d3e2f1a0b",
        "6e6f0002-7e3a-4f2d-9b1c-8a5d3e2f1a0d",
      ),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("dataCharacteristicUuid: kotlin");
  });

  it("fails when the MTU moves in one copy out of five", () => {
    const result = gateWith(worklet, (source) =>
      source.replace("const DEFAULT_MTU = 247", "const DEFAULT_MTU = 185"),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("defaultMtu: worklet DEFAULT_MTU is 185");
  });

  // The rule that keeps the declaration from going stale. Both native specs
  // gain a constant under the same name and nobody registers it; the values
  // even disagree. Nothing else in the repository would notice.
  it("fails on a shared constant no row governs", () => {
    const file = path.join(root, kotlin);
    const original = fs.readFileSync(file, "utf8");
    try {
      fs.writeFileSync(
        file,
        original.replace(
          "    const val TARGET_MTU = 512",
          "    const val TARGET_MTU = 512\n    const val CONNECTION_TIMEOUT_MS = 9000L",
        ),
      );
      const result = gateWith(swift, (source) =>
        source.replace(
          "  static let targetMtu = 512",
          "  static let targetMtu = 512\n  static let connectionTimeoutMs = 8000",
        ),
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("unregistered shared constant");
      expect(result.stderr).toContain("connectionTimeoutMs");
    } finally {
      fs.writeFileSync(file, original);
    }
  });

  // A gate that quietly measures nothing is worse than no gate: it reports the
  // same green as a tree that agrees.
  it("fails rather than passing when it can no longer read a file", () => {
    const result = gateWith(swift, (source) =>
      source.replaceAll("static let ", "static var "),
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("extracted no constants");
  });

  it("declares a binding for every constant, and a source for every binding", () => {
    expect(declaration.constants.length).toBeGreaterThan(0);
    for (const constant of declaration.constants) {
      expect(Object.keys(constant.bindings).length).toBeGreaterThan(0);
      for (const language of Object.keys(constant.bindings)) {
        expect(declaration.sources[language], language).toBeTruthy();
      }
    }
    for (const source of Object.values(declaration.sources)) {
      expect(fs.existsSync(path.join(root, source.file))).toBe(true);
    }
    expect(fs.existsSync(path.join(root, declaration.spec))).toBe(true);
  });
});
