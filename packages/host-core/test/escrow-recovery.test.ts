import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { escrowSafetyViolation } from "@twistedpear/protocol";
import { describe, expect, it } from "vitest";
import { FileAuthorityStore } from "../src/escrow-recovery.js";

const ALICE = "aa".repeat(16);
const BOB = "bb".repeat(16);
const CAROL = "cc".repeat(16);
const IDENTITY = "11".repeat(16);

function openStore(now: number): { store: FileAuthorityStore; path: string } {
  const path = join(
    mkdtempSync(join(tmpdir(), "tp-authority-")),
    "authority.json",
  );
  return { store: new FileAuthorityStore(path, () => now), path };
}

describe("host escrow and recovery sessions", () => {
  it("releases held value only after the designated quorum authorizes", () => {
    const { store, path } = openStore(1_000);
    const session = store.createEscrow({
      held: "sibling-grant:aa",
      authorizers: [ALICE, BOB, CAROL],
      quorum: 2,
      ttlMs: 60_000,
    });
    expect(session.machine.phase).toBe("pending");
    store.fund(session.id, 1);
    store.requestRelease(session.id);
    const waiting = store.authorizeEscrow(session.id, ALICE);
    expect(waiting.machine.phase).toBe("release-requested");
    expect(waiting.collectedAuthorizers).toEqual([ALICE]);
    expect(() => store.takeReleased(session.id)).toThrow(/has not released/);
    expect(() => store.authorizeEscrow(session.id, "dd".repeat(16))).toThrow(
      /not designated/,
    );
    const released = store.authorizeEscrow(session.id, BOB);
    expect(released.machine.phase).toBe("released");
    expect(released.machine.authorizers).toEqual([ALICE, BOB]);
    expect(store.takeReleased(session.id)).toBe("sibling-grant:aa");
    const reopened = new FileAuthorityStore(path).getEscrow(session.id);
    expect(escrowSafetyViolation(reopened.machine)).toBeNull();
  });

  it("refunds or expires without releasing, and survives reopen", () => {
    let now = 5_000;
    const path = join(
      mkdtempSync(join(tmpdir(), "tp-authority-ttl-")),
      "authority.json",
    );
    const store = new FileAuthorityStore(path, () => now);
    const refunded = store.createEscrow({
      held: "token:refund",
      authorizers: [ALICE],
      quorum: 1,
      ttlMs: 10_000,
    });
    store.fund(refunded.id);
    expect(store.refund(refunded.id).machine.phase).toBe("refunded");
    expect(() => store.takeReleased(refunded.id)).toThrow(/has not released/);

    const live = store.createEscrow({
      held: "token:ttl",
      authorizers: [ALICE, BOB],
      quorum: 2,
      ttlMs: 1_000,
    });
    store.fund(live.id);
    now = 7_000;
    store.tick();
    expect(store.getEscrow(live.id).machine.phase).toBe("expired");
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(new FileAuthorityStore(path).getEscrow(live.id).machine.phase).toBe(
      "expired",
    );
  });

  it("recovers identity only at the guardian threshold", () => {
    const { store } = openStore(9_000);
    const session = store.createRecovery({
      identityHash: IDENTITY,
      guardians: [ALICE, BOB, CAROL],
      threshold: 2,
      ttlMs: 60_000,
    });
    store.startRecovery(session.id);
    store.collectShare(session.id, ALICE);
    store.collectShare(session.id, ALICE);
    expect(() => store.authorizeRecovery(session.id)).toThrow(
      /cannot recovery\/authorize/,
    );
    expect(() => store.collectShare(session.id, "dd".repeat(16))).toThrow(
      /not designated/,
    );
    store.collectShare(session.id, BOB);
    const recovered = store.authorizeRecovery(session.id);
    expect(recovered.machine.phase).toBe("recovered");
    expect(recovered.machine.recoveredWith).toEqual([ALICE, BOB]);
    expect(recovered.identityHash).toBe(IDENTITY);
  });

  it("rejects and expires recovery without reconstructing", () => {
    let now = 20_000;
    const path = join(
      mkdtempSync(join(tmpdir(), "tp-recovery-ttl-")),
      "authority.json",
    );
    const store = new FileAuthorityStore(path, () => now);
    const rejected = store.createRecovery({
      identityHash: IDENTITY,
      guardians: [ALICE, BOB],
      threshold: 2,
      ttlMs: 5_000,
    });
    store.startRecovery(rejected.id);
    expect(store.rejectRecovery(rejected.id).machine.phase).toBe("rejected");

    const live = store.createRecovery({
      identityHash: IDENTITY,
      guardians: [ALICE, BOB],
      threshold: 2,
      ttlMs: 500,
    });
    store.startRecovery(live.id);
    now = 21_000;
    store.tick();
    expect(store.getRecovery(live.id).machine.phase).toBe("expired");
  });
});
