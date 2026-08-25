import { writeFile } from "node:fs/promises";
import {
  POLICY_SUBJECTS,
  TRITS,
  evaluatePolicy,
  kleeneAll,
  kleeneAny,
  kleeneAssume,
  kleeneKnown,
  kleeneNot,
  loadPolicy,
} from "../packages/protocol/dist/index.js";

const denyBase = Object.fromEntries(
  POLICY_SUBJECTS.map((subject) => [subject, "deny"]),
);

const kleene = [];
for (const left of TRITS) {
  for (const right of TRITS) {
    kleene.push({
      id: `all-${left}-${right}`,
      op: "all",
      args: [left, right],
      expected: kleeneAll([left, right]),
    });
    kleene.push({
      id: `any-${left}-${right}`,
      op: "any",
      args: [left, right],
      expected: kleeneAny([left, right]),
    });
  }
}
for (const value of TRITS) {
  kleene.push({ id: `not-${value}`, op: "not", args: [value], expected: kleeneNot(value) });
  kleene.push({
    id: `known-${value}`,
    op: "known",
    args: [value],
    expected: kleeneKnown(value),
  });
  kleene.push({
    id: `assume-true-${value}`,
    op: "assume",
    args: [value, true],
    expected: kleeneAssume(value, true),
  });
}

const policy = loadPolicy({
  version: 1,
  base: denyBase,
  rules: [
    {
      id: "home-install",
      subject: "app:install",
      effect: "allow",
      onUnknown: "deny",
      when: { known: { "place.is": "home" } },
    },
    {
      id: "deny-network",
      subject: "app:install",
      effect: "deny",
      onUnknown: "deny",
      when: "app.usesNetwork",
    },
  ],
});

const decisions = [
  {
    id: "base-when-unmatched",
    query: { subject: "app:launch" },
    evidence: {},
  },
  {
    id: "needs-place",
    query: { subject: "app:install" },
    evidence: {},
  },
  {
    id: "deny-overrides-allow",
    query: { subject: "app:install" },
    evidence: {
      predicates: { "place.is:home": "true", "app.usesNetwork": "true" },
    },
  },
  {
    id: "allow-offline-at-home",
    query: { subject: "app:install" },
    evidence: {
      predicates: { "place.is:home": "true", "app.usesNetwork": "false" },
    },
  },
].map((cell) => ({
  ...cell,
  expected: evaluatePolicy(policy, cell.query, cell.evidence),
}));

const vector = {
  schema: "twistedpear.policy-v1",
  machine: "policy-evaluate",
  generatedBy: "scripts/vectors-generate-policy.mjs",
  kleene,
  decisions,
};

await writeFile(
  new URL("../conformance/vectors/policy.json", import.meta.url),
  `${JSON.stringify(vector, null, 2)}\n`,
);
console.log(
  `policy.json kleene=${kleene.length} decisions=${decisions.length}`,
);
