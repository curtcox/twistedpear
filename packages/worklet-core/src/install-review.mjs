import { unpackPackage, verifyPackage } from "../../app-registry/dist/index.js";
import { HOST_API_VERSION } from "../../miniapp-runtime/dist/host-api.js";
import {
  installReviewHostMessage,
  presentCapabilityReview,
} from "./capability-review.mjs";

export async function confirmInstallReview(options) {
  const {
    provider,
    archive,
    minVersionFor,
    trustStore,
    capabilitiesForReview,
    requestHostReply,
    hostApiVersion = HOST_API_VERSION,
  } = options;
  const appId = unpackPackage(provider, archive).manifest.name;
  const minVersion = minVersionFor?.(appId);
  const verified = verifyPackage(provider, archive, {
    hostApiVersion,
    ...(minVersion === undefined ? {} : { minVersion }),
  });
  const trusted = await trustStore.isTrusted(
    verified.manifest.publisherPublicKey,
  );
  const trustedEntry = trusted
    ? (await trustStore.list()).find(
        (entry) =>
          entry.publisherPublicKey === verified.manifest.publisherPublicKey,
      )
    : undefined;
  const presented = presentCapabilityReview(capabilitiesForReview(verified));
  const review = await requestHostReply(
    installReviewHostMessage({
      randomBytes: (length) => provider.randomBytes(length),
      appId,
      version: verified.manifest.version,
      publisherPublicKey: verified.manifest.publisherPublicKey,
      trusted,
      trustedLabel: trustedEntry?.label ?? null,
      presented,
    }),
  );
  if (review === null || review.accept !== true) {
    throw new Error("Install cancelled at capability review");
  }
  return { appId, verified, trusted, review };
}
