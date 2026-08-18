import { writeFile } from "node:fs/promises";
import { enumerateCells } from "../packages/effects/dist/index.js";
import {
  egressOfferMachine,
  initialEgressOfferState,
  stepEgressOffer,
} from "../packages/protocol/dist/index.js";

const examples = {
  grant: {
    kind: "egress/grant",
    offer: {
      id: "offer-1",
      appId: "app",
      capability: "lxmf:send",
      targetKind: "peer",
      targetId: "peer-a",
      displayLabel: "Ana",
      constraints: {},
      grantedAt: 1,
    },
    ttlMs: 9,
  },
  "ttl/expired": { kind: "egress/ttl", id: "offer-1", at: 10 },
  revoke: { kind: "egress/revoke", id: "offer-1", at: 5 },
};

function stateFor(phase) {
  const base = initialEgressOfferState();
  if (phase === "absent") return base;
  return {
    ...base,
    phase,
    id: "offer-1",
    appId: "app",
    capability: "lxmf:send",
    targetKind: "peer",
    targetId: "peer-a",
    displayLabel: "Ana",
    grantedAt: 0,
    expiresAt: 10,
    revokedAt: phase === "revoked" ? 5 : null,
  };
}

const vector = {
  schema: "twistedpear.transition-v1",
  machine: "egress-offer",
  generatedBy: "scripts/vectors-generate-egress-offer.mjs",
  states: egressOfferMachine.states,
  eventClasses: egressOfferMachine.events.map((event) => event.name),
  cells: enumerateCells(egressOfferMachine).map((cell) => {
    const state = stateFor(cell.state);
    const event = examples[cell.eventClass];
    const result = stepEgressOffer(state, event);
    return {
      state: cell.state,
      eventClass: cell.eventClass,
      event,
      expectedState: result.state,
      expectedIntents: result.intents,
      legal: cell.rows.length > 0,
    };
  }),
};

await writeFile(
  new URL("../conformance/vectors/egress-offer.json", import.meta.url),
  `${JSON.stringify(vector, null, 2)}\n`,
);
console.log(
  `egress-offer.json cells=${vector.cells.length} legal=${vector.cells.filter((c) => c.legal).length}`,
);
