/**
 * The gate on decisions made by another of the user's own installations.
 *
 * A record arriving from a sibling installation is a **proposal, never an
 * effect**. It is verified, stored, and surfaced, but it changes nothing on
 * this machine unless this machine holds a grant for that class of decision
 * from that sibling. Default is deny, and a grant is revocable per sibling and
 * per class. See docs/linked-devices-plan.md, decision 2.
 *
 * Two boundaries are deliberate:
 *
 * - **Capability grants have no class here.** There is no sibling class that
 *   could carry them, so a grant given to an app on one machine can never
 *   become a grant on another. `SIBLING_DECISION_CLASSES` is the whole
 *   vocabulary, and `grant-installation-scope.test.ts` pins the other half.
 * - **The gate applies nothing itself.** It returns a verdict and hands back
 *   the payload; the caller performs the effect. Keeping the policy decision
 *   separate from the mutation is what makes the policy testable on its own.
 */

export const SIBLING_DECISION_CLASSES = [
  "sibling:moderation",
  "sibling:trust",
  "sibling:apps",
  "sibling:messages",
] as const;

export type SiblingDecisionClass = (typeof SIBLING_DECISION_CLASSES)[number];

export function isSiblingDecisionClass(
  value: string,
): value is SiblingDecisionClass {
  return (SIBLING_DECISION_CLASSES as ReadonlyArray<string>).includes(value);
}

/** A decision emitted by a sibling installation, before this machine believes it. */
export interface SiblingProposal {
  /** Content address of the journal record; the deduplication key. */
  readonly recordHash: string;
  /** The installation that emitted it, per its certificate. */
  readonly installationId: string;
  readonly decisionClass: string;
  readonly emittedAt: number;
  /** Opaque to the gate; meaning belongs to whoever applies it. */
  readonly payload: Uint8Array;
}

export type SiblingRejectReason =
  "unknown-class" | "not-in-roster" | "self" | "duplicate";

export type SiblingVerdict =
  | { readonly outcome: "apply"; readonly proposal: SiblingProposal }
  | { readonly outcome: "hold"; readonly proposal: SiblingProposal }
  | { readonly outcome: "reject"; readonly reason: SiblingRejectReason };

export interface SiblingGrant {
  readonly installationId: string;
  readonly decisionClass: SiblingDecisionClass;
  readonly grantedAt: number;
}

export interface SiblingGrantStore {
  isGranted(
    installationId: string,
    decisionClass: SiblingDecisionClass,
  ): Promise<boolean>;
  grant(
    installationId: string,
    decisionClass: SiblingDecisionClass,
    now: number,
  ): Promise<void>;
  revoke(
    installationId: string,
    decisionClass: SiblingDecisionClass,
  ): Promise<void>;
  list(): Promise<ReadonlyArray<SiblingGrant>>;
}

/**
 * Held proposals. The journal will supply a durable implementation; the gate
 * only needs these four operations, which is what keeps it buildable before
 * the transport exists.
 */
export interface SiblingProposalStore {
  put(proposal: SiblingProposal): Promise<void>;
  has(recordHash: string): Promise<boolean>;
  list(): Promise<ReadonlyArray<SiblingProposal>>;
  delete(recordHash: string): Promise<void>;
}

export interface SiblingKeyValueStore {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
}

const GRANT_INDEX_KEY = "sibling:grants:v1";

function normalizeInstallationId(installationId: string): string {
  const normalized = installationId.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized))
    throw new Error("Installation id must be 32 hexadecimal characters");
  return normalized;
}

/** Persists sibling grants in the host's own key/value store. */
export function createKeyValueSiblingGrantStore(
  store: SiblingKeyValueStore,
): SiblingGrantStore {
  async function load(): Promise<SiblingGrant[]> {
    const raw = await store.get(GRANT_INDEX_KEY);
    if (raw === null) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(raw),
      );
    } catch {
      throw new Error("invalid sibling grant store");
    }
    if (!Array.isArray(parsed)) throw new Error("invalid sibling grant store");
    // Persisted grants are untrusted input: a damaged or hand-edited store must
    // not be able to conjure a grant for a class this build does not know.
    return (parsed as ReadonlyArray<unknown>).filter(
      (entry): entry is SiblingGrant => {
        if (typeof entry !== "object" || entry === null) return false;
        const candidate = entry as Partial<SiblingGrant>;
        return (
          typeof candidate.installationId === "string" &&
          typeof candidate.decisionClass === "string" &&
          isSiblingDecisionClass(candidate.decisionClass) &&
          Number.isSafeInteger(candidate.grantedAt)
        );
      },
    );
  }

  async function save(entries: ReadonlyArray<SiblingGrant>): Promise<void> {
    await store.set(
      GRANT_INDEX_KEY,
      new TextEncoder().encode(JSON.stringify(entries)),
    );
  }

  return {
    async isGranted(installationId, decisionClass) {
      const id = normalizeInstallationId(installationId);
      return (await load()).some(
        (entry) =>
          entry.installationId === id && entry.decisionClass === decisionClass,
      );
    },
    async grant(installationId, decisionClass, now) {
      if (!isSiblingDecisionClass(decisionClass))
        throw new Error(`Unknown sibling decision class: ${decisionClass}`);
      const id = normalizeInstallationId(installationId);
      const entries = (await load()).filter(
        (entry) =>
          !(
            entry.installationId === id && entry.decisionClass === decisionClass
          ),
      );
      entries.push({ installationId: id, decisionClass, grantedAt: now });
      await save(entries);
    },
    async revoke(installationId, decisionClass) {
      const id = normalizeInstallationId(installationId);
      await save(
        (await load()).filter(
          (entry) =>
            !(
              entry.installationId === id &&
              entry.decisionClass === decisionClass
            ),
        ),
      );
    },
    async list() {
      return await load();
    },
  };
}

export function createInMemorySiblingProposalStore(): SiblingProposalStore {
  const held = new Map<string, SiblingProposal>();
  return {
    put(proposal) {
      held.set(proposal.recordHash, proposal);
      return Promise.resolve();
    },
    has(recordHash) {
      return Promise.resolve(held.has(recordHash));
    },
    list() {
      return Promise.resolve(
        [...held.values()].sort((a, b) => a.emittedAt - b.emittedAt),
      );
    },
    delete(recordHash) {
      held.delete(recordHash);
      return Promise.resolve();
    },
  };
}

export interface SiblingDecisionGateOptions {
  readonly grants: SiblingGrantStore;
  readonly proposals: SiblingProposalStore;
  /**
   * Whether this installation id is a sibling this machine recognises. Injected
   * because the roster does not exist yet (ID-ROSTER); until it does, a host
   * supplies whatever it knows.
   */
  isKnownInstallation(installationId: string): Promise<boolean>;
  /** This machine's own installation id, so it never acts on its own echo. */
  readonly selfInstallationId?: string;
}

export class SiblingDecisionGate {
  constructor(private readonly options: SiblingDecisionGateOptions) {}

  /**
   * Decides what a freshly received proposal may do. Held proposals are stored,
   * not dropped, so the user can be shown "your laptop blocked this sender —
   * apply here?" and grant afterwards.
   */
  async receive(proposal: SiblingProposal): Promise<SiblingVerdict> {
    if (!isSiblingDecisionClass(proposal.decisionClass))
      return { outcome: "reject", reason: "unknown-class" };

    let installationId: string;
    try {
      installationId = normalizeInstallationId(proposal.installationId);
    } catch {
      return { outcome: "reject", reason: "not-in-roster" };
    }

    if (
      this.options.selfInstallationId !== undefined &&
      installationId ===
        normalizeInstallationId(this.options.selfInstallationId)
    ) {
      return { outcome: "reject", reason: "self" };
    }

    if (!(await this.options.isKnownInstallation(installationId)))
      return { outcome: "reject", reason: "not-in-roster" };

    if (await this.options.proposals.has(proposal.recordHash))
      return { outcome: "reject", reason: "duplicate" };

    const normalized: SiblingProposal = { ...proposal, installationId };
    if (
      await this.options.grants.isGranted(
        installationId,
        proposal.decisionClass,
      )
    ) {
      return { outcome: "apply", proposal: normalized };
    }

    await this.options.proposals.put(normalized);
    return { outcome: "hold", proposal: normalized };
  }

  /** Everything waiting on a grant, oldest first. Chrome renders this. */
  async held(): Promise<ReadonlyArray<SiblingProposal>> {
    return await this.options.proposals.list();
  }

  /**
   * Grants a class from one sibling and releases the backlog it was holding.
   *
   * Releasing is explicit rather than automatic on the next receive, because a
   * user granting "accept moderation from my laptop" is answering for the
   * decisions they were just shown.
   */
  async grantAndRelease(
    installationId: string,
    decisionClass: SiblingDecisionClass,
    now: number,
  ): Promise<ReadonlyArray<SiblingProposal>> {
    const id = normalizeInstallationId(installationId);
    await this.options.grants.grant(id, decisionClass, now);
    const released = (await this.options.proposals.list()).filter(
      (proposal) =>
        proposal.installationId === id &&
        proposal.decisionClass === decisionClass,
    );
    for (const proposal of released)
      await this.options.proposals.delete(proposal.recordHash);
    return released;
  }

  /**
   * Revokes a class from one sibling. Already-applied decisions are not undone
   * — the gate governs what may be applied, not what was.
   */
  async revoke(
    installationId: string,
    decisionClass: SiblingDecisionClass,
  ): Promise<void> {
    await this.options.grants.revoke(
      normalizeInstallationId(installationId),
      decisionClass,
    );
  }
}
