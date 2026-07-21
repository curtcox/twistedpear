import { existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { ensureDir } from "./config.js";
import { atomicWritePrivateFile } from "./identity.js";

export type LocalReportReason = "spam" | "harassment" | "impersonation" | "unsafe-content" | "other";

export interface ModerationEntry {
  readonly sourceHash: string;
  readonly label: string | null;
  readonly createdAt: number;
}

export interface LocalReportRecord {
  readonly id: string;
  readonly sourceHash: string;
  readonly reason: LocalReportReason;
  readonly note: string;
  readonly messageHash: string | null;
  readonly createdAt: number;
}

export interface ModerationSnapshot {
  readonly version: 1;
  readonly blocked: ReadonlyArray<ModerationEntry>;
  readonly muted: ReadonlyArray<ModerationEntry>;
  readonly reports: ReadonlyArray<LocalReportRecord>;
}

const EMPTY_SNAPSHOT: ModerationSnapshot = { version: 1, blocked: [], muted: [], reports: [] };
const HASH_PATTERN = /^[0-9a-f]{32}$/;

function normalizeHash(sourceHash: string): string {
  const normalized = sourceHash.trim().toLowerCase();
  if (!HASH_PATTERN.test(normalized)) throw new Error("LXMF source hash must be 32 hexadecimal characters");
  return normalized;
}

function parseSnapshot(value: unknown): ModerationSnapshot {
  const candidate = value as Partial<ModerationSnapshot>;
  if (candidate.version !== 1 || !Array.isArray(candidate.blocked) ||
      !Array.isArray(candidate.muted) || !Array.isArray(candidate.reports)) {
    throw new Error("Invalid moderation store");
  }
  return candidate as ModerationSnapshot;
}

export class FileModerationStore {
  private snapshot: ModerationSnapshot;

  constructor(private readonly path: string, private readonly now: () => number = () => Date.now()) {
    this.snapshot = existsSync(path)
      ? parseSnapshot(JSON.parse(readFileSync(path, "utf8")) as unknown)
      : EMPTY_SNAPSHOT;
  }

  list(): ModerationSnapshot {
    return structuredClone(this.snapshot);
  }

  disposition(sourceHash: string): "allow" | "mute" | "block" {
    const normalized = normalizeHash(sourceHash);
    if (this.snapshot.blocked.some((entry) => entry.sourceHash === normalized)) return "block";
    if (this.snapshot.muted.some((entry) => entry.sourceHash === normalized)) return "mute";
    return "allow";
  }

  block(sourceHash: string, label: string | null = null): void {
    const normalized = normalizeHash(sourceHash);
    this.snapshot = {
      ...this.snapshot,
      blocked: this.upsert(this.snapshot.blocked, normalized, label),
      muted: this.snapshot.muted.filter((entry) => entry.sourceHash !== normalized)
    };
    this.persist();
  }

  unblock(sourceHash: string): void {
    this.snapshot = { ...this.snapshot, blocked: this.remove(this.snapshot.blocked, sourceHash) };
    this.persist();
  }

  mute(sourceHash: string, label: string | null = null): void {
    const normalized = normalizeHash(sourceHash);
    if (this.snapshot.blocked.some((entry) => entry.sourceHash === normalized)) return;
    this.snapshot = { ...this.snapshot, muted: this.upsert(this.snapshot.muted, normalized, label) };
    this.persist();
  }

  unmute(sourceHash: string): void {
    this.snapshot = { ...this.snapshot, muted: this.remove(this.snapshot.muted, sourceHash) };
    this.persist();
  }

  report(input: {
    readonly sourceHash: string;
    readonly reason: LocalReportReason;
    readonly note?: string;
    readonly messageHash?: string | null;
  }): LocalReportRecord {
    const sourceHash = normalizeHash(input.sourceHash);
    const createdAt = this.now();
    const record: LocalReportRecord = {
      id: `${createdAt.toString(36)}-${this.snapshot.reports.length.toString(36)}`,
      sourceHash,
      reason: input.reason,
      note: (input.note ?? "").slice(0, 4_096),
      messageHash: input.messageHash?.trim().toLowerCase() || null,
      createdAt
    };
    this.snapshot = { ...this.snapshot, reports: [...this.snapshot.reports, record] };
    this.persist();
    return record;
  }

  exportReports(): string {
    return `${JSON.stringify({ format: "twistedpear-local-reports-v1", exportedAt: this.now(), reports: this.snapshot.reports }, null, 2)}\n`;
  }

  private upsert(entries: ReadonlyArray<ModerationEntry>, sourceHash: string, label: string | null): ReadonlyArray<ModerationEntry> {
    const existing = entries.find((entry) => entry.sourceHash === sourceHash);
    const entry = { sourceHash, label: label?.trim().slice(0, 160) || null, createdAt: existing?.createdAt ?? this.now() };
    return [...entries.filter((item) => item.sourceHash !== sourceHash), entry];
  }

  private remove(entries: ReadonlyArray<ModerationEntry>, sourceHash: string): ReadonlyArray<ModerationEntry> {
    const normalized = normalizeHash(sourceHash);
    return entries.filter((entry) => entry.sourceHash !== normalized);
  }

  private persist(): void {
    ensureDir(dirname(this.path));
    atomicWritePrivateFile(this.path, new TextEncoder().encode(`${JSON.stringify(this.snapshot, null, 2)}\n`));
  }
}
