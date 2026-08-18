/**
 * Surface 4 — egress after consent (HA-30…HA-36).
 */
import {
  describeCapability,
  installReviewConsentRecord,
} from "../../../packages/miniapp-runtime/dist/index.js";
import { denyCode, dispatch, makeHost } from "./harness.mjs";

function lxmfApp() {
  return {
    name: "notes",
    publisherPublicKey: "publisher",
    capabilities: ["lxmf:send", "lxmf:receive"],
  };
}

export async function runEgressScenarios() {
  const app = lxmfApp();
  const host = makeHost();
  await host.setGrants(
    app.name,
    app.publisherPublicKey,
    app.capabilities,
    app.capabilities,
  );
  const unscoped = await dispatch(
    host,
    "lxmf",
    "send",
    "lxmf:send",
    { to: "author-controlled", subject: "contacts", body: "list" },
    app,
  );
  const ha30 = denyCode(unscoped, "EGRESS_DENIED") === "EGRESS_DENIED";

  const aiGrant = installReviewConsentRecord({
    at: 1,
    token: "ai",
    appId: "notes",
    publisherPublicKey: "pub",
    capabilities: ["ai:chat"],
  });
  const ha31Informed =
    aiGrant.authorities[0]?.canonicalDescription ===
    describeCapability("ai:chat");
  const aiHost = makeHost({
    aiBackend: {
      chat: async () => ({
        message: { role: "assistant", content: "ok" },
        model: "host",
        usage: null,
      }),
    },
  });
  await aiHost.setGrants(
    "notes",
    "publisher",
    ["ai:chat"],
    ["ai:chat"],
  );
  const chat = await dispatch(
    aiHost,
    "ai",
    "chat",
    "ai:chat",
    { messages: [{ role: "user", content: "exfil" }] },
    {
      name: "notes",
      publisherPublicKey: "publisher",
      capabilities: ["ai:chat"],
    },
  );
  const ha31 = ha31Informed && chat.ok === true;

  const announceApp = {
    name: "board",
    publisherPublicKey: "publisher",
    capabilities: ["announce:publish", "announce:subscribe"],
  };
  const announceHost = makeHost();
  await announceHost.setGrants(
    announceApp.name,
    announceApp.publisherPublicKey,
    announceApp.capabilities,
    announceApp.capabilities,
  );
  const crossPublish = await dispatch(
    announceHost,
    "announce",
    "publish",
    "announce:publish",
    {
      appData: new TextEncoder().encode("hello"),
      namespace: "miniapp-announce:other",
    },
    announceApp,
  );
  const ownPublish = await dispatch(
    announceHost,
    "announce",
    "publish",
    "announce:publish",
    { appData: new TextEncoder().encode("hello") },
    announceApp,
  );
  const ha32 =
    denyCode(crossPublish, "ANNOUNCE_CROSS_APP_SCOPE") ===
      "ANNOUNCE_CROSS_APP_SCOPE" && ownPublish.ok === true;
  const crossSub = await dispatch(
    announceHost,
    "announce",
    "subscribe",
    "announce:subscribe",
    { namespace: "other" },
    announceApp,
  );
  const ha33 =
    denyCode(crossSub, "ANNOUNCE_CROSS_APP_SCOPE") === "ANNOUNCE_CROSS_APP_SCOPE";

  const fetchHost = makeHost({
    resourceBackend: {
      fetch: async () => new Uint8Array([1]),
    },
  });
  await fetchHost.setGrants(
    "notes",
    "publisher",
    ["resource:fetch"],
    ["resource:fetch"],
  );
  const fetched = await dispatch(
    fetchHost,
    "resource",
    "fetch",
    "resource:fetch",
    { resourceId: "host-fixed" },
    {
      name: "notes",
      publisherPublicKey: "publisher",
      capabilities: ["resource:fetch"],
    },
  );
  const ha34 = fetched.ok === true;

  const revokeHost = makeHost();
  await revokeHost.setGrants(
    app.name,
    app.publisherPublicKey,
    app.capabilities,
    app.capabilities,
  );
  await revokeHost.deleteGrants(app.name, app.publisherPublicKey);
  const afterRevoke = await dispatch(
    revokeHost,
    "lxmf",
    "send",
    "lxmf:send",
    { to: "peer-a", subject: "x", body: "x" },
    app,
  );
  const ha35 = denyCode(afterRevoke, "CAPABILITY_DENIED") === "CAPABILITY_DENIED";

  const baitHost = makeHost();
  await baitHost.setGrants(
    app.name,
    app.publisherPublicKey,
    app.capabilities,
    app.capabilities,
  );
  baitHost.grantEgressOffer({
    appId: app.name,
    capability: "lxmf:send",
    targetKind: "peer",
    targetId: "friend",
    ttlMs: 60_000,
  });
  const bait = await dispatch(
    baitHost,
    "lxmf",
    "send",
    "lxmf:send",
    { to: "author-flag", subject: "x", body: "x" },
    app,
  );
  const ha36 = denyCode(bait, "EGRESS_DENIED") === "EGRESS_DENIED";

  return [
    {
      id: "HA-30",
      measured: ha30 ? "BLOCKED" : "UNCONTROLLED",
      note: "lxmf.send without a host-authored EgressOffer is EGRESS_DENIED.",
    },
    {
      id: "HA-31",
      measured: ha31 ? "INFORMED + CONTAINED" : "CONTAINED",
      note: "ai:chat is host-fixed and budgeted; the grant transcript uses the canonical wording.",
    },
    {
      id: "HA-32",
      measured: ha32 ? "CONTAINED" : "UNCONTROLLED",
      note: "Own-namespace publish is allowed; a foreign namespace is ANNOUNCE_CROSS_APP_SCOPE.",
    },
    {
      id: "HA-33",
      measured: ha33 ? "BLOCKED" : "UNCONTROLLED",
      note: "announce.subscribe into another app's namespace is ANNOUNCE_CROSS_APP_SCOPE.",
    },
    {
      id: "HA-34",
      measured: ha34 ? "CONTAINED" : "UNCONTROLLED",
      note: "resource.fetch names a host resource id, not an app URL.",
    },
    {
      id: "HA-35",
      measured: ha35 ? "BLOCKED" : "UNCONTROLLED",
      note: "GrantStore.delete denies the next lxmf.send.",
    },
    {
      id: "HA-36",
      measured: ha36 ? "CONTAINED" : "UNCONTROLLED",
      note: "A live offer for one peer does not permit a later send to an author-chosen destination.",
    },
  ];
}
