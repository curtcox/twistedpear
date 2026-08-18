/**
 * Host-owned escrow and recovery-quorum sessions. Mini-apps never see these
 * stores. The protocol machines stay Sans-IO; this adapter supplies identity,
 * persistence, TTL, and the designated-set check the tables do not carry.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  escrowSafetyViolation,
  initialEscrowState,
  initialRecoveryQuorumState,
  recoveryQuorumSafetyViolation,
  stepEscrow,
  stepRecoveryQuorum,
  type EscrowEvent,
  type EscrowPhase,
  type EscrowState,
  type RecoveryPhase,
  type RecoveryQuorumEvent,
  type RecoveryQuorumState,
} from "@twistedpear/protocol";
import { ensureDir } from "./config.js";
import { atomicWritePrivateFile } from "./identity.js";

const HASH_PATTERN = /^[0-9a-f]{32}$/;
const LIVE_ESCROW = new Set(["pending", "funded", "release-requested"]);
const LIVE_RECOVERY = new Set(["idle", "collecting"]);

export interface HostEscrowSession {
  readonly id: string;
  readonly held: string;
  readonly designatedAuthorizers: readonly string[];
  readonly collectedAuthorizers: readonly string[];
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly machine: EscrowState;
}

export interface HostRecoverySession {
  readonly id: string;
  readonly identityHash: string;
  readonly designatedGuardians: readonly string[];
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly machine: RecoveryQuorumState;
}

interface AuthoritySnapshot {
  readonly version: 1;
  readonly escrows: ReadonlyArray<HostEscrowSession>;
  readonly recoveries: ReadonlyArray<HostRecoverySession>;
}

const EMPTY: AuthoritySnapshot = { version: 1, escrows: [], recoveries: [] };

function normalizeHash(value: string, label: string): string {
  const normalized = value.trim().toLowerCase();
  if (!HASH_PATTERN.test(normalized)) {
    throw new Error(`${label} must be 32 hexadecimal characters`);
  }
  return normalized;
}

function uniqueHashes(values: ReadonlyArray<string>, label: string): string[] {
  const unique = [
    ...new Set(values.map((value) => normalizeHash(value, label))),
  ];
  if (unique.length === 0) throw new Error(`${label} set must not be empty`);
  return unique.sort();
}

function requireSession<T extends { readonly id: string }>(
  entries: ReadonlyArray<T>,
  id: string,
  kind: string,
): T {
  const session = entries.find((entry) => entry.id === id);
  if (session === undefined) throw new Error(`unknown ${kind} session`);
  return session;
}

function nextId(prefix: string, at: number, count: number): string {
  return `${prefix}-${at.toString(36)}-${count.toString(36)}`;
}

export class FileAuthorityStore {
  private snapshot: AuthoritySnapshot;

  constructor(
    private readonly path: string,
    private readonly now: () => number = () => Date.now(),
  ) {
    this.snapshot = existsSync(path)
      ? parseSnapshot(JSON.parse(readFileSync(path, "utf8")) as unknown)
      : EMPTY;
  }

  listEscrows(): ReadonlyArray<HostEscrowSession> {
    return this.snapshot.escrows;
  }

  listRecoveries(): ReadonlyArray<HostRecoverySession> {
    return this.snapshot.recoveries;
  }

  getEscrow(id: string): HostEscrowSession {
    return requireSession(this.snapshot.escrows, id, "escrow");
  }

  getRecovery(id: string): HostRecoverySession {
    return requireSession(this.snapshot.recoveries, id, "recovery");
  }

  createEscrow(input: {
    readonly held: string;
    readonly authorizers: ReadonlyArray<string>;
    readonly quorum: number;
    readonly ttlMs: number;
  }): HostEscrowSession {
    const held = input.held.trim();
    if (held.length === 0 || held.length > 4_096) {
      throw new Error("escrow held payload must be 1-4096 characters");
    }
    const designated = uniqueHashes(input.authorizers, "authorizer");
    if (input.quorum < 1 || input.quorum > designated.length) {
      throw new Error(
        "escrow quorum must be between 1 and the authorizer count",
      );
    }
    if (!Number.isSafeInteger(input.ttlMs) || input.ttlMs < 1) {
      throw new Error("escrow ttlMs must be a positive integer");
    }
    const createdAt = this.now();
    const session: HostEscrowSession = {
      id: nextId("escrow", createdAt, this.snapshot.escrows.length),
      held,
      designatedAuthorizers: designated,
      collectedAuthorizers: [],
      createdAt,
      expiresAt: createdAt + input.ttlMs,
      machine: initialEscrowState(input.quorum),
    };
    this.replaceEscrow(session);
    return session;
  }

  fund(id: string, amount = 1): HostEscrowSession {
    this.tick();
    return this.applyEscrow(id, { kind: "escrow/deposit", amount }, "funded");
  }

  requestRelease(id: string): HostEscrowSession {
    this.tick();
    return this.applyEscrow(
      id,
      { kind: "escrow/request-release" },
      "release-requested",
    );
  }

  authorizeEscrow(id: string, authorizer: string): HostEscrowSession {
    this.tick();
    const session = this.getEscrow(id);
    if (session.machine.phase !== "release-requested") {
      throw new Error("escrow is not awaiting authorization");
    }
    const hash = normalizeHash(authorizer, "authorizer");
    if (!session.designatedAuthorizers.includes(hash)) {
      throw new Error("authorizer is not designated for this escrow");
    }
    const collected = [
      ...new Set([...session.collectedAuthorizers, hash]),
    ].sort();
    this.replaceEscrow({ ...session, collectedAuthorizers: collected });
    if (collected.length < session.machine.quorum) {
      return this.getEscrow(id);
    }
    return this.applyEscrow(
      id,
      { kind: "escrow/authorize", authorizers: collected },
      "released",
    );
  }

  refund(id: string): HostEscrowSession {
    this.tick();
    return this.applyEscrow(id, { kind: "escrow/refund" }, "refunded");
  }

  takeReleased(id: string): string {
    const session = this.getEscrow(id);
    if (session.machine.phase !== "released") {
      throw new Error("escrow has not released");
    }
    return session.held;
  }

  createRecovery(input: {
    readonly identityHash: string;
    readonly guardians: ReadonlyArray<string>;
    readonly threshold: number;
    readonly ttlMs: number;
  }): HostRecoverySession {
    const identityHash = normalizeHash(input.identityHash, "identity hash");
    const designated = uniqueHashes(input.guardians, "guardian");
    if (input.threshold < 1 || input.threshold > designated.length) {
      throw new Error(
        "recovery threshold must be between 1 and the guardian count",
      );
    }
    if (!Number.isSafeInteger(input.ttlMs) || input.ttlMs < 1) {
      throw new Error("recovery ttlMs must be a positive integer");
    }
    const createdAt = this.now();
    const session: HostRecoverySession = {
      id: nextId("recovery", createdAt, this.snapshot.recoveries.length),
      identityHash,
      designatedGuardians: designated,
      createdAt,
      expiresAt: createdAt + input.ttlMs,
      machine: initialRecoveryQuorumState(input.threshold),
    };
    this.replaceRecovery(session);
    return session;
  }

  startRecovery(id: string): HostRecoverySession {
    this.tick();
    return this.applyRecovery(id, { kind: "recovery/start" }, "collecting");
  }

  collectShare(id: string, guardian: string): HostRecoverySession {
    this.tick();
    const session = this.getRecovery(id);
    const hash = normalizeHash(guardian, "guardian");
    if (!session.designatedGuardians.includes(hash)) {
      throw new Error("guardian is not designated for this recovery");
    }
    return this.applyRecovery(
      id,
      { kind: "recovery/share", guardian: hash },
      "collecting",
    );
  }

  authorizeRecovery(id: string): HostRecoverySession {
    this.tick();
    return this.applyRecovery(id, { kind: "recovery/authorize" }, "recovered");
  }

  rejectRecovery(id: string): HostRecoverySession {
    this.tick();
    return this.applyRecovery(id, { kind: "recovery/reject" }, "rejected");
  }

  tick(at: number = this.now()): void {
    for (const session of this.snapshot.escrows) {
      if (at < session.expiresAt || !LIVE_ESCROW.has(session.machine.phase)) {
        continue;
      }
      this.applyEscrow(session.id, { kind: "escrow/ttl" }, "expired");
    }
    for (const session of this.snapshot.recoveries) {
      if (at < session.expiresAt || !LIVE_RECOVERY.has(session.machine.phase)) {
        continue;
      }
      this.applyRecovery(session.id, { kind: "recovery/ttl" }, "expired");
    }
  }

  private applyEscrow(
    id: string,
    event: EscrowEvent,
    expected: EscrowPhase,
  ): HostEscrowSession {
    const session = this.getEscrow(id);
    const next = stepEscrow(session.machine, event).state;
    const violation = escrowSafetyViolation(next);
    if (violation !== null) throw new Error(violation);
    if (next.phase !== expected) {
      throw new Error(
        `escrow cannot ${event.kind} from ${session.machine.phase}`,
      );
    }
    const updated = { ...session, machine: next };
    this.replaceEscrow(updated);
    return updated;
  }

  private applyRecovery(
    id: string,
    event: RecoveryQuorumEvent,
    expected: RecoveryPhase,
  ): HostRecoverySession {
    const session = this.getRecovery(id);
    const next = stepRecoveryQuorum(session.machine, event).state;
    const violation = recoveryQuorumSafetyViolation(next);
    if (violation !== null) throw new Error(violation);
    if (next.phase !== expected) {
      throw new Error(
        `recovery cannot ${event.kind} from ${session.machine.phase}`,
      );
    }
    const updated = { ...session, machine: next };
    this.replaceRecovery(updated);
    return updated;
  }

  private replaceEscrow(session: HostEscrowSession): void {
    this.snapshot = {
      ...this.snapshot,
      escrows: [
        ...this.snapshot.escrows.filter((entry) => entry.id !== session.id),
        session,
      ],
    };
    this.persist();
  }

  private replaceRecovery(session: HostRecoverySession): void {
    this.snapshot = {
      ...this.snapshot,
      recoveries: [
        ...this.snapshot.recoveries.filter((entry) => entry.id !== session.id),
        session,
      ],
    };
    this.persist();
  }

  private persist(): void {
    ensureDir(dirname(this.path));
    atomicWritePrivateFile(
      this.path,
      new TextEncoder().encode(`${JSON.stringify(this.snapshot, null, 2)}\n`),
    );
  }
}

function parseSnapshot(value: unknown): AuthoritySnapshot {
  const candidate = value as Partial<AuthoritySnapshot>;
  if (
    candidate.version !== 1 ||
    !Array.isArray(candidate.escrows) ||
    !Array.isArray(candidate.recoveries)
  ) {
    throw new Error("Invalid authority store");
  }
  return {
    version: 1,
    escrows: candidate.escrows,
    recoveries: candidate.recoveries,
  };
}
