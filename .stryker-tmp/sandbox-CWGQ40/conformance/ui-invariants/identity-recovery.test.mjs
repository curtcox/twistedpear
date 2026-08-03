// @ts-nocheck
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readWorkletSource } from "./worklet-source.mjs";

describe("desktop identity recovery surface", () => {
  it("keeps private operations in host chrome and exposes every recovery action", () => {
    const html = readFileSync("apps/host-desktop/src/renderer/index.html", "utf8");
    for (const id of [
      "identity-export",
      "identity-import",
      "identity-recovery-show",
      "identity-recovery-import",
      "identity-change"
    ]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain('type="password" id="identity-current"');
    expect(html).toContain('autocomplete="off"');
  });

  it("inspects and confirms a candidate hash before either destructive replacement path", () => {
    const renderer = readFileSync("apps/host-desktop/src/renderer/app.js", "utf8");
    const worklet = readWorkletSource("apps/host-desktop/worklet/entry.mjs");
    for (const operation of ["identity-import", "identity-recovery-import"]) {
      expect(renderer).toContain(`type: "${operation}-inspect"`);
      expect(renderer).toContain(`type: "${operation}",`);
      expect(worklet).toContain(`message.type === "${operation}-inspect"`);
    }
    expect(renderer).toContain("window.confirm");
    expect(renderer).toContain("confirmedCandidateHash: candidate");
    expect(worklet).toContain("message.confirmedCandidateHash !== candidateIdentityHash");
    expect(worklet).toContain("Identity replacement was not confirmed");
  });

  it("passes explicit confirmation fields across host IPC", () => {
    const renderer = readFileSync("apps/host-desktop/src/renderer/app.js", "utf8");
    const worklet = readWorkletSource("apps/host-desktop/worklet/entry.mjs");
    for (const field of [
      "backupPassphraseConfirmation",
      "vaultPassphraseConfirmation",
      "nextPassphraseConfirmation"
    ]) {
      expect(renderer).toContain(field);
      expect(worklet).toContain(field);
    }
  });
});
