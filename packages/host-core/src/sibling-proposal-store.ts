/**
 * Durable held-proposal store. Replaces `createInMemorySiblingProposalStore`
 * on a real host so a restart does not drop what the user has not yet granted.
 */
import {
  isSiblingDecisionClass,
  type SiblingKeyValueStore,
  type SiblingProposal,
  type SiblingProposalStore,
} from "./sibling-decisions.js";

const STORE_KEY = "sibling:proposals:v1";

interface StoredProposal {
  readonly recordHash: string;
  readonly installationId: string;
  readonly decisionClass: string;
  readonly emittedAt: number;
  readonly payloadHex: string;
}

function isStoredProposal(value: unknown): value is StoredProposal {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StoredProposal>;
  return (
    typeof candidate.recordHash === "string" &&
    typeof candidate.installationId === "string" &&
    typeof candidate.decisionClass === "string" &&
    isSiblingDecisionClass(candidate.decisionClass) &&
    Number.isSafeInteger(candidate.emittedAt) &&
    typeof candidate.payloadHex === "string" &&
    /^[0-9a-f]*$/i.test(candidate.payloadHex) &&
    candidate.payloadHex.length % 2 === 0
  );
}

function toProposal(stored: StoredProposal): SiblingProposal {
  const payload = new Uint8Array(stored.payloadHex.length / 2);
  for (let index = 0; index < payload.length; index += 1) {
    payload[index] = Number.parseInt(
      stored.payloadHex.slice(index * 2, index * 2 + 2),
      16,
    );
  }
  return {
    recordHash: stored.recordHash,
    installationId: stored.installationId,
    decisionClass: stored.decisionClass,
    emittedAt: stored.emittedAt,
    payload,
  };
}

function toStored(proposal: SiblingProposal): StoredProposal {
  let payloadHex = "";
  for (const byte of proposal.payload) {
    payloadHex += byte.toString(16).padStart(2, "0");
  }
  return {
    recordHash: proposal.recordHash,
    installationId: proposal.installationId,
    decisionClass: proposal.decisionClass,
    emittedAt: proposal.emittedAt,
    payloadHex,
  };
}

export function createKeyValueSiblingProposalStore(
  store: SiblingKeyValueStore,
): SiblingProposalStore {
  async function load(): Promise<StoredProposal[]> {
    const raw = await store.get(STORE_KEY);
    if (raw === null) return [];
    let parsed: unknown;
    try {
      parsed = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(raw),
      );
    } catch {
      throw new Error("invalid sibling proposal store");
    }
    if (!Array.isArray(parsed))
      throw new Error("invalid sibling proposal store");
    return parsed.filter(isStoredProposal);
  }

  async function save(entries: ReadonlyArray<StoredProposal>): Promise<void> {
    await store.set(
      STORE_KEY,
      new TextEncoder().encode(JSON.stringify(entries)),
    );
  }

  return {
    async put(proposal) {
      const entries = (await load()).filter(
        (entry) => entry.recordHash !== proposal.recordHash,
      );
      entries.push(toStored(proposal));
      await save(entries);
    },
    async has(recordHash) {
      return (await load()).some((entry) => entry.recordHash === recordHash);
    },
    async list() {
      return (await load())
        .map(toProposal)
        .sort((left, right) => left.emittedAt - right.emittedAt);
    },
    async delete(recordHash) {
      await save(
        (await load()).filter((entry) => entry.recordHash !== recordHash),
      );
    },
  };
}
