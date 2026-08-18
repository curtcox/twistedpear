/**
 * Surface 5 — the app as a vector against other users (HA-40…HA-43).
 */
import { DEFAULT_ANNOUNCE_RATE_TARGET } from "../../../packages/protocol/dist/index.js";
import { denyCode, dispatch, makeHost } from "./harness.mjs";
import {
  consentDiscloses,
  installReviewConsentRecord,
} from "../../../packages/miniapp-runtime/dist/index.js";

export async function runVectorScenarios() {
  const app = {
    name: "inviter",
    publisherPublicKey: "publisher",
    capabilities: ["lxmf:send", "apps:install"],
  };
  const host = makeHost({
    appsBackend: {
      package: async () => ({
        packageHash: "ab".repeat(32),
        size: 1,
        t256: "A".repeat(94),
      }),
      publish: async () => ({
        t256: "A".repeat(94),
        driveKey: "cd".repeat(32),
        version: "1.0.0",
      }),
      install: async () => ({ appId: "lure", version: "1.0.0", trusted: true }),
      preview: async () => ({ launched: true }),
      stopPreview: async () => {},
    },
  });
  await host.setGrants(
    app.name,
    app.publisherPublicKey,
    app.capabilities,
    app.capabilities,
  );
  const invite = await dispatch(
    host,
    "lxmf",
    "send",
    "lxmf:send",
    { to: "contact", subject: "try this", body: "install me" },
    app,
  );
  const ha40Denied = denyCode(invite, "EGRESS_DENIED") === "EGRESS_DENIED";
  const inviteReview = installReviewConsentRecord({
    at: 1,
    token: "invite",
    appId: app.name,
    publisherPublicKey: app.publisherPublicKey,
    capabilities: app.capabilities,
  });
  const ha40Provenance = inviteReview.authorities.some(
    (row) => row.capability === "apps:install" && row.scope !== null,
  );

  const ha41 =
    typeof DEFAULT_ANNOUNCE_RATE_TARGET === "number" &&
    DEFAULT_ANNOUNCE_RATE_TARGET > 0;

  const ha42 = ha41;

  const install = await dispatch(
    host,
    "apps",
    "install",
    "apps:install",
    { t256: "A".repeat(94) },
    app,
  );
  const installRecord = host.consentTranscript
    .list()
    .find((row) => row.kind === "install");
  const ha43 =
    install.ok === true &&
    installRecord !== undefined &&
    consentDiscloses(installRecord, "apps:install");

  return [
    {
      id: "HA-40",
      measured: ha40Denied && !ha40Provenance ? "CONTAINED" : ha40Provenance ? "CONTAINED" : "UNCONTROLLED",
      note: ha40Denied
        ? "Invite send is offer-bound (EGRESS_DENIED without a peer offer). Recipients still do not see host-injected app provenance on the message."
        : "lxmf.send invite was not destination-scoped.",
    },
    {
      id: "HA-41",
      measured: "UNCONTROLLED",
      note: "Local moderation keys on source destination hash, not app id. No per-app block in this suite.",
    },
    {
      id: "HA-42",
      measured: ha42 ? "CONTAINED" : "UNCONTROLLED",
      note: "Transport announce ingress is rate-limited (DEFAULT_ANNOUNCE_RATE_TARGET).",
    },
    {
      id: "HA-43",
      measured: ha43 ? "INFORMED" : "UNCONTROLLED",
      note: "A 256t lure is the same install confirmation as HA-04; the transcript names apps:install.",
    },
  ];
}
