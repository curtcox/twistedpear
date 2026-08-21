/**
 * Surface 2 — what the user thinks they are approving (HA-10…HA-15).
 */
import {
  AppsService,
  AppsServiceError,
} from "../../../packages/miniapp-runtime/dist/index.js";
import {
  ConfirmationError,
  GrantStore,
  MemoryKvStoreBackend,
  consentDiscloses,
  describeCapability,
  installReviewConsentRecord,
  requestHostConfirmation,
} from "../../../packages/miniapp-runtime/dist/index.js";
import { grantsPreservedAcrossUpdate } from "../../../packages/app-registry/dist/update-delta.js";
import {
  capabilityUpdateDelta,
  makeHost,
  stubAppsBackend,
} from "./harness.mjs";

export async function runConsentScenarios() {
  return [
    measureHa10(),
    await measureHa11(),
    await measureHa12(),
    await measureHa13(),
    await measureHa14(),
    measureHa15(),
  ];
}

function measureHa10() {
  const host = makeHost();
  const grant = installReviewConsentRecord({
    at: 1,
    token: "grant-notes",
    appId: "notes",
    publisherPublicKey: "pub",
    capabilities: ["lxmf:send", "resource:fetch"],
  });
  host.recordConsent(grant);
  const ha10 =
    consentDiscloses(grant, "lxmf:send") &&
    grant.authorities.find((row) => row.capability === "lxmf:send")
      ?.canonicalDescription === describeCapability("lxmf:send");
  return {
    id: "HA-10",
    measured: ha10 ? "INFORMED" : "UNCONTROLLED",
    note: "Install-review transcript carries the canonical lxmf:send wording.",
  };
}

async function measureHa11() {
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
  return {
    id: "HA-11",
    measured: ha11 ? "BLOCKED then INFORMED" : "UNCONTROLLED",
    note: "Updates do not auto-activate new capabilities; the review marks isNewSinceLastApproval.",
  };
}

async function measureHa12() {
  const captured = [];
  await requestHostConfirmation(
    {
      confirm: async (request) => {
        captured.push(request);
        return { approved: true };
      },
    },
    {
      kind: "install",
      appId: "studio",
      publisherPublicKey: "pub",
      summary: {
        t256: "A".repeat(94),
        note: "Verified by TwistedPear\nApproved",
      },
    },
    {
      randomBytes: (length) => new Uint8Array(length),
      delay: async () => {},
    },
  );
  return {
    id: "HA-12",
    measured: !captured[0]?.summary.note?.includes("\n")
      ? "BLOCKED"
      : "UNCONTROLLED",
    note: "ConfirmationRequest.summary strips newlines and bidi overrides before chrome sees them.",
  };
}

async function measureHa13() {
  const limiter = {
    stamps: /** @type {number[]} */ ([]),
    assert(appId, now) {
      const kept = this.stamps.filter((stamp) => now - stamp < 10_000);
      if (kept.length >= 3) {
        throw new ConfirmationError(
          "CONFIRMATION_RATE_LIMITED",
          `rate ${appId}`,
        );
      }
      kept.push(now);
      this.stamps = kept;
    },
  };
  let confirmCount = 0;
  for (let index = 0; index < 8; index += 1) {
    try {
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
          now: () => 1_000,
          limiter,
        },
      );
      confirmCount += 1;
    } catch (error) {
      if (
        !(error instanceof ConfirmationError) ||
        error.code !== "CONFIRMATION_RATE_LIMITED"
      ) {
        throw error;
      }
    }
  }
  return {
    id: "HA-13",
    measured: confirmCount < 8 ? "BLOCKED" : "UNCONTROLLED",
    note: "A fourth device-session confirmation in the same window is CONFIRMATION_RATE_LIMITED.",
  };
}

async function measureHa14() {
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
  return {
    id: "HA-14",
    measured: previewCode === "APPS_BAD_REQUEST" ? "BLOCKED" : "UNCONTROLLED",
    note: "AppsService.preview rejects grants outside the declared manifest.",
  };
}

function measureHa15() {
  const unused = installReviewConsentRecord({
    at: 3,
    token: "unused",
    appId: "notes",
    publisherPublicKey: "pub",
    capabilities: ["storage:kv", "lxmf:send"],
  });
  return {
    id: "HA-15",
    measured: unused.authorities.some((row) => row.capability === "lxmf:send")
      ? "INFORMED"
      : "UNCONTROLLED",
    note: "Transcript lists every declared authority, including ones the app has not used yet. Unused is not a separate flag.",
  };
}
