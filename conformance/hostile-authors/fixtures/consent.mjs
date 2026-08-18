/**
 * Surface 2 — what the user thinks they are approving (HA-10…HA-15).
 */
import { AppsService, AppsServiceError } from "../../../packages/miniapp-runtime/dist/index.js";
import {
  GrantStore,
  MemoryKvStoreBackend,
  consentDiscloses,
  describeCapability,
  installReviewConsentRecord,
  requestHostConfirmation,
} from "../../../packages/miniapp-runtime/dist/index.js";
import { grantsPreservedAcrossUpdate } from "../../../packages/app-registry/dist/update-delta.js";
import { capabilityUpdateDelta, makeHost } from "./harness.mjs";

function stubAppsBackend() {
  return {
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
    install: async () => ({ appId: "hello", version: "1.0.0", trusted: true }),
    preview: async () => ({ launched: true }),
    stopPreview: async () => {},
  };
}

export async function runConsentScenarios() {
  const host = makeHost();
  const grant = installReviewConsentRecord({
    at: 1,
    token: "grant-notes",
    appId: "notes",
    publisherPublicKey: "pub",
    capabilities: ["lxmf:send", "resource:fetch"],
  });
  host.recordConsent(grant);
  const ha10 = consentDiscloses(grant, "lxmf:send") &&
    grant.authorities.find((row) => row.capability === "lxmf:send")
      ?.canonicalDescription === describeCapability("lxmf:send");

  const previous = ["storage:kv"];
  const next = ["storage:kv", "lxmf:send"];
  const delta = capabilityUpdateDelta(previous, next, () => "sensitive");
  const preserved = grantsPreservedAcrossUpdate(["storage:kv"], next);
  const store = new GrantStore(new MemoryKvStoreBackend());
  await store.set({
    appId: "notes",
    publisherPublicKey: "pub",
    declared: previous,
    requestedGrants: previous,
    now: 1,
    ttlMs: 60_000,
  });
  const after = await store.get("notes", "pub");
  const updateReview = installReviewConsentRecord({
    at: 2,
    token: "grant-update",
    appId: "notes",
    publisherPublicKey: "pub",
    capabilities: next,
    added: new Set(["lxmf:send"]),
  });
  const ha11 =
    delta.added.some((row) => row.id === "lxmf:send") &&
    preserved.includes("storage:kv") &&
    !preserved.includes("lxmf:send") &&
    after !== null &&
    !after.granted.includes("lxmf:send") &&
    updateReview.authorities.find((row) => row.capability === "lxmf:send")
      ?.isNewSinceLastApproval === true;

  const injected = {
    kind: "install",
    appId: "studio",
    publisherPublicKey: "pub",
    summary: {
      t256: "A".repeat(94),
      note: "Verified by TwistedPear\nApproved",
    },
  };
  const captured = [];
  await requestHostConfirmation(
    {
      confirm: async (request) => {
        captured.push(request);
        return { approved: true };
      },
    },
    injected,
    {
      randomBytes: (length) => new Uint8Array(length),
      delay: async () => {},
    },
  );
  const ha12Blocked = !captured[0]?.summary.note?.includes("\n");

  let confirmCount = 0;
  for (let index = 0; index < 8; index += 1) {
    await requestHostConfirmation(
      { confirm: async () => ({ approved: true }) },
      {
        kind: "device-session",
        appId: "cam",
        publisherPublicKey: "pub",
        summary: { classId: "camera" },
      },
      {
        randomBytes: (length) => new Uint8Array(length),
        delay: async () => {},
      },
    );
    confirmCount += 1;
  }
  const ha13Blocked = confirmCount < 8;

  const preview = new AppsService(stubAppsBackend(), {
    confirm: async () => ({ approved: true }),
  });
  let previewCode = null;
  try {
    await preview.preview(
      { appId: "studio", publisherPublicKey: "pub" },
      {
        projectPrefix: "proj",
        manifest: {
          name: "demo",
          version: "1.0.0",
          entry: "bundle.js",
          capabilities: ["identity"],
        },
        grants: ["identity", "lxmf:send"],
      },
    );
  } catch (error) {
    previewCode = error instanceof AppsServiceError ? error.code : "other";
  }
  const ha14 = previewCode === "APPS_BAD_REQUEST";

  const unused = installReviewConsentRecord({
    at: 3,
    token: "unused",
    appId: "notes",
    publisherPublicKey: "pub",
    capabilities: ["storage:kv", "lxmf:send"],
  });
  const ha15 = unused.authorities.some((row) => row.capability === "lxmf:send");

  return [
    {
      id: "HA-10",
      measured: ha10 ? "INFORMED" : "UNCONTROLLED",
      note: "Install-review transcript carries the canonical lxmf:send wording.",
    },
    {
      id: "HA-11",
      measured: ha11 ? "BLOCKED then INFORMED" : "UNCONTROLLED",
      note: "Updates do not auto-activate new capabilities; the review marks isNewSinceLastApproval.",
    },
    {
      id: "HA-12",
      measured: ha12Blocked ? "BLOCKED" : "UNCONTROLLED",
      note: "ConfirmationRequest.summary is still an unsanitized string map.",
    },
    {
      id: "HA-13",
      measured: ha13Blocked ? "BLOCKED" : "UNCONTROLLED",
      note: "Eight device-session confirmations in a row are all accepted; no rate limit.",
    },
    {
      id: "HA-14",
      measured: ha14 ? "BLOCKED" : "UNCONTROLLED",
      note: "AppsService.preview rejects grants outside the declared manifest.",
    },
    {
      id: "HA-15",
      measured: ha15 ? "INFORMED" : "UNCONTROLLED",
      note: "Transcript lists every declared authority, including ones the app has not used yet. Unused is not a separate flag.",
    },
  ];
}
