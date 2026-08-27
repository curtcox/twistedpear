/**
 * Hostile-peer replica cases for storage:sync. Verdicts follow the
 * hostile-author catalogue: BLOCKED / CONTAINED / UNCONTROLLED.
 */
import {
  TopicLogStore,
  missingReplicaEntries,
} from "../../packages/miniapp-runtime/dist/index.js";
import {
  compileAttackProposal,
  UnlowerableAttackProposalError,
} from "../../packages/sim-adversaries/dist/index.js";

function expectVerdict(id, expected, actual) {
  if (actual === "UNCONTROLLED") {
    throw new Error(id + " measured UNCONTROLLED");
  }
  if (actual !== expected) {
    throw new Error(id + " measured " + actual + ", expected " + expected);
  }
}

function testForge() {
  const store = new TopicLogStore({ authorId: "self" });
  store.open("board");
  store.append("board", "mine");
  const result = store.ingest("board", [
    { authorId: "self", seq: 2, at: 9, payload: "forged" },
  ]);
  return (
    result.rejected[0]?.reason === "forged-author" &&
    !store.entries("board").some((entry) => entry.payload === "forged")
      ? "BLOCKED"
      : "UNCONTROLLED"
  );
}

function testCrossTomb() {
  const store = new TopicLogStore({ authorId: "self" });
  store.open("board");
  store.set("board", "slot", "held");
  const result = store.ingest(
    "board",
    [
      {
        authorId: "peer",
        seq: 1,
        at: 9,
        key: "slot",
        tombstone: true,
        payload: null,
      },
    ],
    { fromAuthorId: "peer" },
  );
  return (
    result.rejected[0]?.reason === "cross-author-tombstone" &&
    store.view("board").get("slot")?.payload === "held"
      ? "BLOCKED"
      : "UNCONTROLLED"
  );
}

function testUnoffered() {
  const store = new TopicLogStore({
    authorId: "self",
    offeredAuthors: new Set(["peer"]),
  });
  store.open("board");
  const result = store.ingest("board", [
    { authorId: "stranger", seq: 1, at: 1, payload: "spam" },
  ]);
  return (
    result.rejected[0]?.reason === "unoffered-author"
      ? "BLOCKED"
      : "UNCONTROLLED"
  );
}

function testCap() {
  const store = new TopicLogStore({ authorId: "self", authorCap: 2 });
  store.open("board");
  store.append("board", "keep");
  const flood = Array.from({ length: 8 }, (_, seq) => ({
    authorId: "peer",
    seq: seq + 1,
    at: seq + 1,
    payload: seq,
  }));
  store.ingest("board", flood, { fromAuthorId: "peer" });
  const mine = store
    .entries("board")
    .filter((entry) => entry.authorId === "self");
  const theirs = store
    .entries("board")
    .filter((entry) => entry.authorId === "peer");
  return (
    mine.length === 1 && theirs.length === 2 ? "CONTAINED" : "UNCONTROLLED"
  );
}

function testIsolate() {
  const alpha = new TopicLogStore({ authorId: "app-a" });
  const beta = new TopicLogStore({ authorId: "app-b" });
  alpha.open("board");
  beta.open("board");
  alpha.set("board", "secret", "alpha-only");
  return beta.view("board").has("secret") ? "UNCONTROLLED" : "BLOCKED";
}

function testResurrect() {
  const store = new TopicLogStore({ authorId: "self" });
  store.open("board");
  store.set("board", "item/1", { claimed: true });
  store.tombstone("board", "item/1");
  store.ingest("board", [
    {
      authorId: "peer",
      seq: 1,
      at: 0,
      key: "item/1",
      payload: { claimed: false },
    },
  ]);
  return store.view("board").has("item/1") ? "UNCONTROLLED" : "BLOCKED";
}

function testAmplify() {
  const left = new TopicLogStore({ authorId: "a" });
  const right = new TopicLogStore({ authorId: "b" });
  left.open("board");
  right.open("board");
  for (let i = 0; i < 12; i++) left.append("board", i);
  const missing = missingReplicaEntries(
    left.entries("board"),
    right.vector("board"),
  );
  const after = missingReplicaEntries(left.entries("board"), { a: 12 });
  return (
    missing.length === 12 && after.length === 0 ? "CONTAINED" : "UNCONTROLLED"
  );
}

function testFloodModel() {
  const compiled = compileAttackProposal(
    {
      name: "authorised peer flood",
      actions: [{ power: "author-flood", source: "b", destination: "a" }],
    },
    ["author-flood"],
  );
  let refused = false;
  try {
    compileAttackProposal(
      {
        name: "authorised peer flood",
        actions: [{ power: "author-flood", source: "b", destination: "a" }],
      },
      ["drop"],
    );
  } catch (error) {
    refused = error instanceof UnlowerableAttackProposalError;
  }
  return (
    compiled.powers[0] === "author-flood" && refused
      ? "CONTAINED"
      : "UNCONTROLLED"
  );
}

export async function runReplicaPeerCases() {
  const counts = { BLOCKED: 0, CONTAINED: 0, UNCONTROLLED: 0 };

  const cases = [
    { id: "HP-FORGE", expected: "BLOCKED", run: testForge },
    { id: "HP-CROSS-TOMB", expected: "BLOCKED", run: testCrossTomb },
    { id: "HP-UNOFFERED", expected: "BLOCKED", run: testUnoffered },
    { id: "HP-CAP", expected: "CONTAINED", run: testCap },
    { id: "HP-ISOLATE", expected: "BLOCKED", run: testIsolate },
    { id: "HP-RESURRECT", expected: "BLOCKED", run: testResurrect },
    { id: "HP-AMPLIFY", expected: "CONTAINED", run: testAmplify },
    { id: "HP-FLOOD-MODEL", expected: "CONTAINED", run: testFloodModel },
  ];

  for (const { id, expected, run } of cases) {
    const actual = run();
    expectVerdict(id, expected, actual);
    counts[actual] += 1;
  }

  if (counts.UNCONTROLLED > 0) {
    throw new Error("hostile replica peers left a scenario UNCONTROLLED");
  }
  console.log(
    "hostile-apps replica peers: " +
      counts.BLOCKED +
      " BLOCKED, " +
      counts.CONTAINED +
      " CONTAINED, 0 UNCONTROLLED",
  );
}
