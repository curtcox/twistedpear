/**
 * Chrome and store wiring for held sibling decisions.
 *
 * The gate still applies nothing. This module turns an `apply` verdict into a
 * write on the local moderation or trust store, persists held proposals, and
 * shapes the prompt chrome renders. Removing a sibling from the local roster
 * is not a global revocation — that limit is a user-visible string, not a
 * comment.
 */
import type { TrustStore } from "@twistedpear/app-registry";
import type { LinkedInstallationRoster } from "./linked-installation-roster.js";
import type {
  FileModerationStore,
  LocalReportReason,
} from "./moderation-store.js";
import {
  isSiblingDecisionClass,
  type SiblingDecisionClass,
  type SiblingDecisionGate,
  type SiblingProposal,
  type SiblingVerdict,
} from "./sibling-decisions.js";

export const SIBLING_ROSTER_REMOVAL_NOTICE =
  "Removing an installation from this device stops sending it new decisions, but does not revoke it globally. Offline installations learn of the removal only when they next sync.";

const REPORT_REASONS = [
  "spam",
  "harassment",
  "impersonation",
  "unsafe-content",
  "other",
] as const satisfies ReadonlyArray<LocalReportReason>;

export type SiblingModerationAction =
  | {
      readonly type: "block";
      readonly sourceHash: string;
      readonly label: string | null;
    }
  | { readonly type: "unblock"; readonly sourceHash: string }
  | {
      readonly type: "mute";
      readonly sourceHash: string;
      readonly label: string | null;
    }
  | { readonly type: "unmute"; readonly sourceHash: string }
  | {
      readonly type: "report";
      readonly sourceHash: string;
      readonly reason: LocalReportReason;
      readonly note?: string;
      readonly messageHash?: string | null;
    };

export type SiblingTrustAction =
  | {
      readonly type: "trust";
      readonly publisherPublicKey: string;
      readonly label: string;
      readonly source: "qr" | "paste" | "manual";
    }
  | { readonly type: "untrust"; readonly publisherPublicKey: string };

export type SiblingDecisionAction =
  SiblingModerationAction | SiblingTrustAction;

export interface SiblingHeldChromeItem {
  readonly recordHash: string;
  readonly installationId: string;
  readonly installationLabel: string;
  readonly decisionClass: SiblingDecisionClass;
  readonly summary: string;
  readonly prompt: string;
  readonly emittedAt: number;
}

export function encodeSiblingDecisionAction(
  action: SiblingDecisionAction,
): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(action));
}

function isReportReason(value: unknown): value is LocalReportReason {
  return (
    typeof value === "string" &&
    (REPORT_REASONS as ReadonlyArray<string>).includes(value)
  );
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function decodeReportAction(
  record: Record<string, unknown>,
  sourceHash: string,
): SiblingModerationAction | null {
  if (record.type !== "report" || !isReportReason(record.reason)) return null;
  return {
    type: "report",
    sourceHash,
    reason: record.reason,
    ...(typeof record.note === "string" ? { note: record.note } : {}),
    ...(typeof record.messageHash === "string" || record.messageHash === null
      ? { messageHash: record.messageHash }
      : {}),
  };
}

function decodeModerationAction(
  record: Record<string, unknown>,
): SiblingModerationAction | null {
  const type = record.type;
  const sourceHash = asTrimmedString(record.sourceHash);
  if (sourceHash === null) return null;
  if (type === "unblock" || type === "unmute") return { type, sourceHash };
  if (type === "block" || type === "mute") {
    return { type, sourceHash, label: asTrimmedString(record.label) };
  }
  return decodeReportAction(record, sourceHash);
}

function decodeTrustAction(
  record: Record<string, unknown>,
): SiblingTrustAction | null {
  const publisherPublicKey = asTrimmedString(record.publisherPublicKey);
  if (publisherPublicKey === null) return null;
  if (record.type === "untrust") return { type: "untrust", publisherPublicKey };
  if (record.type !== "trust" || typeof record.label !== "string") return null;
  if (
    record.source !== "qr" &&
    record.source !== "paste" &&
    record.source !== "manual"
  ) {
    return null;
  }
  return {
    type: "trust",
    publisherPublicKey,
    label: record.label,
    source: record.source,
  };
}

export function decodeSiblingDecisionAction(
  payload: Uint8Array,
): SiblingDecisionAction | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(payload),
    );
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const record = parsed as Record<string, unknown>;
  return decodeModerationAction(record) ?? decodeTrustAction(record);
}

const SUMMARIES: Record<SiblingDecisionAction["type"], string> = {
  block: "blocked this sender",
  unblock: "unblocked this sender",
  mute: "muted this sender",
  unmute: "unmuted this sender",
  report: "filed a local report",
  trust: "trusted a publisher",
  untrust: "removed a publisher from the trust list",
};

export function siblingDecisionSummary(proposal: SiblingProposal): string {
  const action = decodeSiblingDecisionAction(proposal.payload);
  if (action !== null) return SUMMARIES[action.type];
  if (proposal.decisionClass === "sibling:apps") {
    return "changed installed apps";
  }
  if (proposal.decisionClass === "sibling:messages") {
    return "synced a message";
  }
  return "made a sibling decision";
}

function applyModeration(
  moderation: FileModerationStore,
  action: SiblingModerationAction,
): void {
  if (action.type === "block")
    moderation.block(action.sourceHash, action.label);
  else if (action.type === "unblock") moderation.unblock(action.sourceHash);
  else if (action.type === "mute")
    moderation.mute(action.sourceHash, action.label);
  else if (action.type === "unmute") moderation.unmute(action.sourceHash);
  else {
    moderation.report({
      sourceHash: action.sourceHash,
      reason: action.reason,
      ...(action.note === undefined ? {} : { note: action.note }),
      ...(action.messageHash === undefined
        ? {}
        : { messageHash: action.messageHash }),
    });
  }
}

async function applyTrust(
  trust: TrustStore,
  action: SiblingTrustAction,
  addedAt: number,
): Promise<void> {
  if (action.type === "untrust") {
    await trust.remove(action.publisherPublicKey);
    return;
  }
  await trust.add({
    publisherPublicKey: action.publisherPublicKey,
    label: action.label,
    addedAt,
    source: action.source,
  });
}

/** Applies one proposal to local stores. Unknown or un-wired classes are skipped. */
export async function applySiblingProposal(
  proposal: SiblingProposal,
  stores: {
    readonly moderation: FileModerationStore;
    readonly trust: TrustStore;
  },
): Promise<boolean> {
  const action = decodeSiblingDecisionAction(proposal.payload);
  if (action === null) return false;
  if (proposal.decisionClass === "sibling:moderation") {
    if (!("sourceHash" in action)) return false;
    applyModeration(stores.moderation, action);
    return true;
  }
  if (proposal.decisionClass === "sibling:trust") {
    if (!("publisherPublicKey" in action)) return false;
    await applyTrust(stores.trust, action, proposal.emittedAt);
    return true;
  }
  return false;
}

export interface SiblingDecisionChrome {
  readonly rosterRemovalNotice: string;
  ingest(proposal: SiblingProposal): Promise<SiblingVerdict>;
  held(): Promise<ReadonlyArray<SiblingHeldChromeItem>>;
  grantAndApply(
    installationId: string,
    decisionClass: SiblingDecisionClass,
    now: number,
  ): Promise<ReadonlyArray<SiblingHeldChromeItem>>;
  revoke(
    installationId: string,
    decisionClass: SiblingDecisionClass,
  ): Promise<void>;
}

async function chromeItem(
  roster: LinkedInstallationRoster,
  proposal: SiblingProposal,
): Promise<SiblingHeldChromeItem> {
  const known = await roster.get(proposal.installationId);
  const installationLabel = known?.certificate.label ?? "Another device";
  const summary = siblingDecisionSummary(proposal);
  const decisionClass = isSiblingDecisionClass(proposal.decisionClass)
    ? proposal.decisionClass
    : "sibling:moderation";
  return {
    recordHash: proposal.recordHash,
    installationId: proposal.installationId,
    installationLabel,
    decisionClass,
    summary,
    prompt: `${installationLabel} ${summary} — apply here?`,
    emittedAt: proposal.emittedAt,
  };
}

export function createSiblingDecisionChrome(options: {
  readonly gate: SiblingDecisionGate;
  readonly roster: LinkedInstallationRoster;
  readonly moderation: FileModerationStore;
  readonly trust: TrustStore;
}): SiblingDecisionChrome {
  const stores = {
    moderation: options.moderation,
    trust: options.trust,
  };

  async function applyAll(
    proposals: ReadonlyArray<SiblingProposal>,
  ): Promise<void> {
    for (const proposal of proposals) {
      await applySiblingProposal(proposal, stores);
    }
  }

  return {
    rosterRemovalNotice: SIBLING_ROSTER_REMOVAL_NOTICE,
    async ingest(proposal) {
      const verdict = await options.gate.receive(proposal);
      if (verdict.outcome === "apply") {
        await applySiblingProposal(verdict.proposal, stores);
      }
      return verdict;
    },
    async held() {
      const held = await options.gate.held();
      return Promise.all(
        held.map((proposal) => chromeItem(options.roster, proposal)),
      );
    },
    async grantAndApply(installationId, decisionClass, now) {
      const released = await options.gate.grantAndRelease(
        installationId,
        decisionClass,
        now,
      );
      await applyAll(released);
      return Promise.all(
        released.map((proposal) => chromeItem(options.roster, proposal)),
      );
    },
    async revoke(installationId, decisionClass) {
      await options.gate.revoke(installationId, decisionClass);
    },
  };
}
