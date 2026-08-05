/* global clearTimeout, setTimeout */
import { bytesToHex } from "../../reticulum-ts/dist/crypto/bytes.js";
import { Identity } from "../../reticulum-ts/dist/identity.js";
import { DestinationProofStrategy } from "../../reticulum-ts/dist/registered-destination.js";
import { decodePeerInvitation } from "../../protocol/dist/index.js";
import { peerServiceAspect } from "./worklet-entry-shared-helpers.mjs";

export function createAutomaticReticulumDiscovery(deps) {
  function receiveAutomaticAnswer(data) {
    try {
      const invitation = decodePeerInvitation(data, Date.now());
      if (invitation.role !== "answer") return;
      const key = bytesToHex(invitation.sessionId);
      const waiter = deps.automaticAnswerWaiters.get(key);
      if (waiter === undefined) return;
      deps.automaticAnswerWaiters.delete(key);
      deps.automaticOfferKeys.delete(waiter.adapterSessionId);
      waiter.resolve(data);
    } catch {
      // Ignore unauthenticated or malformed link payloads.
    }
  }

  async function ensurePeerLinkDestination(identity, service) {
    const node = await deps.ensureReticulum();
    const aspect = peerServiceAspect(deps.provider, service);
    let destination = deps.peerLinkDestinations.get(aspect);
    if (destination === undefined) {
      destination = node.registerDestination({
        provider: deps.provider,
        identity,
        direction: deps.DestinationDirection.IN,
        type: deps.DestinationType.SINGLE,
        appName: "tp",
        aspects: ["peer", aspect],
      });
      destination.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
      destination.setLinkEstablishedCallback((link) => {
        const existing = link.callbacks.packet;
        link.callbacks.packet = (data, packet) => {
          receiveAutomaticAnswer(data);
          existing?.(data, packet);
        };
      });
      deps.peerLinkDestinations.set(aspect, destination);
    }
    return destination;
  }

  async function ensureAutomaticDiscoveryListener(service, identity) {
    const node = await deps.ensureReticulum();
    const aspect = peerServiceAspect(deps.provider, service);
    if (deps.automaticDiscoveryHandlers.has(aspect)) return aspect;
    node.registerAnnounceHandler({
      aspectFilter: `tp.peer-discovery.${aspect}`,
      receivedAnnounce(info) {
        if (
          info.appData === null ||
          bytesToHex(info.announcedIdentity.hash) === bytesToHex(identity.hash)
        )
          return;
        try {
          const offer = decodePeerInvitation(info.appData, Date.now());
          if (offer.role !== "offer" || offer.service !== service) return;
          const session = {
            id: `auto:${bytesToHex(offer.sessionId)}`,
            kind: "reticulum",
          };
          const inbound = { session, envelope: info.appData };
          deps.automaticInboundRoutes.set(session.id, offer);
          const waiters = deps.automaticInboundWaiters.get(aspect) ?? [];
          const waiter = waiters.shift();
          if (waiter !== undefined) waiter(inbound);
          else {
            const bucket = deps.automaticInboundBuckets.get(aspect) ?? [];
            bucket.push(inbound);
            deps.automaticInboundBuckets.set(aspect, bucket.slice(-32));
          }
          deps.automaticInboundWaiters.set(aspect, waiters);
        } catch {
          // Hostile announce data is discarded before pairing.
        }
      },
    });
    deps.automaticDiscoveryHandlers.add(aspect);
    return aspect;
  }

  function automaticReticulumChannel(identity) {
    return {
      async availability() {
        return deps.getReticulum() !== null && deps.status.onlineInterfaces > 0
          ? {
              state: "available",
              reason: "Reticulum announce and Link signaling are online",
            }
          : {
              state: "offline",
              reason:
                "No online Reticulum interface is available for automatic discovery",
            };
      },
      async *offer(session, envelope) {
        const node = await deps.ensureReticulum();
        const invitation = decodePeerInvitation(envelope, Date.now());
        const key = bytesToHex(invitation.sessionId);
        deps.automaticOfferKeys.set(session.id, key);
        const answer = new Promise((resolve, reject) =>
          deps.automaticAnswerWaiters.set(key, {
            resolve,
            reject,
            adapterSessionId: session.id,
          }),
        );
        const aspect = peerServiceAspect(deps.provider, invitation.service);
        let destination = deps.automaticDiscoveryDestinations.get(aspect);
        if (destination === undefined) {
          destination = node.registerDestination({
            provider: deps.provider,
            identity,
            direction: deps.DestinationDirection.IN,
            type: deps.DestinationType.SINGLE,
            appName: "tp",
            aspects: ["peer-discovery", aspect],
          });
          deps.automaticDiscoveryDestinations.set(aspect, destination);
        }
        await destination.announce({ appData: envelope });
        yield await answer;
      },
      async *listen(options) {
        const aspect = await ensureAutomaticDiscoveryListener(
          options.service,
          identity,
        );
        const bucket = deps.automaticInboundBuckets.get(aspect) ?? [];
        const immediate = bucket.shift();
        deps.automaticInboundBuckets.set(aspect, bucket);
        if (immediate !== undefined) {
          yield immediate;
          return;
        }
        yield await new Promise((resolve) => {
          const waiters = deps.automaticInboundWaiters.get(aspect) ?? [];
          waiters.push(resolve);
          deps.automaticInboundWaiters.set(aspect, waiters);
        });
      },
      async answer(session, envelope) {
        const offer = deps.automaticInboundRoutes.get(session.id);
        deps.automaticInboundRoutes.delete(session.id);
        const candidate = offer?.candidates.find(
          (entry) => entry.kind === "reticulum",
        );
        const remoteIdentity =
          offer?.identityProof === undefined
            ? null
            : Identity.fromPublicKey(deps.provider, offer.identityProof);
        if (
          offer === undefined ||
          candidate === undefined ||
          remoteIdentity === null
        ) {
          throw new Error(
            "Automatic Reticulum offer has no authenticated return destination",
          );
        }
        const node = await deps.ensureReticulum();
        const outbound = node.registerDestination({
          provider: deps.provider,
          identity: remoteIdentity,
          direction: deps.DestinationDirection.OUT,
          type: deps.DestinationType.SINGLE,
          appName: "tp",
          aspects: ["peer", peerServiceAspect(deps.provider, offer.service)],
        });
        if (bytesToHex(outbound.hash) !== bytesToHex(candidate.value)) {
          throw new Error(
            "Automatic Reticulum return destination does not match the signed offer",
          );
        }
        if (!node.hasPath(outbound.hash)) {
          node.requestPath(outbound.hash);
          if (!(await node.awaitPath(outbound.hash, 15))) {
            throw new Error("No Reticulum path for automatic discovery answer");
          }
        }
        const link = await new Promise((resolve, reject) => {
          const timer = setTimeout(
            () =>
              reject(new Error("Automatic Reticulum answer link timed out")),
            30_000,
          );
          outbound.requestLink({
            linkEstablished(established) {
              clearTimeout(timer);
              resolve(established);
            },
            linkClosed() {
              clearTimeout(timer);
              reject(new Error("Automatic Reticulum answer link closed"));
            },
          });
        });
        await link.send(envelope);
        setTimeout(() => {
          void link.teardown();
        }, 1_000);
      },
      async cancel(sessionId) {
        deps.automaticInboundRoutes.delete(sessionId);
        const key = deps.automaticOfferKeys.get(sessionId);
        if (key !== undefined) {
          deps.automaticOfferKeys.delete(sessionId);
          const waiter = deps.automaticAnswerWaiters.get(key);
          deps.automaticAnswerWaiters.delete(key);
          waiter?.reject(new Error("Automatic Reticulum discovery cancelled"));
        }
      },
    };
  }

  return {
    receiveAutomaticAnswer,
    ensurePeerLinkDestination,
    ensureAutomaticDiscoveryListener,
    automaticReticulumChannel,
  };
}
