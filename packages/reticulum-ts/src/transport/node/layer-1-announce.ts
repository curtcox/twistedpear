import {
  appendPathRandomBlobFieldsFromActions,
  aspectFilterFromActions,
  initialAcceptParsedAnnounceState,
  initialAddPathEntryState,
  initialAppendPathRandomBlobState,
  initialComputePathExpiryState,
  initialDispatchAnnounceHandlersState,
  initialIgnoreLocalAnnounceState,
  initialMatchAnnounceAspectState,
  initialMatchLocalInboundDestinationState,
  initialParseAspectFilterState,
  initialReceiveAnnouncePathResponseState,
  pathExpiryFromActions,
  shouldAcceptParsedAnnounceNow,
  shouldAddPathEntryNow,
  shouldDispatchAnnounceHandlersNow,
  shouldIgnoreLocalAnnounceNow,
  shouldMatchAnnounceAspectNow,
  shouldMatchLocalInboundDestinationNow,
  shouldReceiveAnnouncePathResponseNow,
  shouldRejectParseAspectFilter,
  shouldUseAppendPathRandomBlob,
  shouldUseParseAspectFilter,
  shouldUsePathExpiry,
  stepAcceptParsedAnnounceWithActions,
  stepAddPathEntryWithActions,
  stepAppendPathRandomBlobWithActions,
  stepComputePathExpiryWithActions,
  stepDispatchAnnounceHandlersWithActions,
  stepIgnoreLocalAnnounceWithActions,
  stepMatchAnnounceAspectWithActions,
  stepMatchLocalInboundDestinationWithActions,
  stepParseAspectFilterWithActions,
  stepReceiveAnnouncePathResponseWithActions,
} from "./protocol.js";
import { Announce } from "../../announce.js";
import { equalBytes } from "../../crypto/bytes.js";
import { Destination, DestinationDirection } from "../../destination.js";
import { Identity } from "../../identity.js";
import type { PacketInterface } from "../../interfaces/interface.js";
import { Packet } from "../../packet.js";
import { hashKey } from "./shared.js";
import type { PathEntry } from "./shared.js";
import {
  dropFromLocalEcho,
  dropFromParsedSkip,
  dropFromPathSkip,
  dropFromValidatePlan,
} from "../drop-notify.js";
import { LeafTransportLayer1Core } from "./layer-1-core.js";

export class LeafTransportLayer1Announce extends LeafTransportLayer1Core {
  protected async handleAnnounce(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const destinationKey = hashKey(packet.destinationHash);
    const validatePlan = Announce.validatePlan(this.options.provider, packet);
    const validateDrop = dropFromValidatePlan(
      validatePlan,
      destinationKey,
      iface.name,
    );
    if (validateDrop !== null) {
      this.emitDrop(validateDrop);
      return;
    }

    const parsed = Announce.parse(packet);
    /** Adapt parsed-announce accept via protocol actions (no ad-hoc
     * `shouldAcceptParsedAnnounce` reads). */
    const acceptStepped = stepAcceptParsedAnnounceWithActions(
      initialAcceptParsedAnnounceState(),
      {
        kind: "announce/accept-parsed-gate",
        parsedPresent: parsed !== null,
      },
    );
    if (!shouldAcceptParsedAnnounceNow(acceptStepped.actions)) {
      this.emitDrop(
        dropFromParsedSkip(acceptStepped.actions, destinationKey, iface.name),
      );
      return;
    }
    const announce = parsed!;

    const localDestination = this.destinations.find((entry) =>
      shouldMatchLocalInboundDestinationNow(
        stepMatchLocalInboundDestinationWithActions(
          initialMatchLocalInboundDestinationState(),
          {
            kind: "transport/match-local-inbound-destination-gate",
            hashMatches: equalBytes(entry.hash, packet.destinationHash),
            directionIn: entry.direction === DestinationDirection.IN,
          },
        ).actions,
      ),
    );
    const ignoreLocalStepped = stepIgnoreLocalAnnounceWithActions(
      initialIgnoreLocalAnnounceState(),
      {
        kind: "announce/ignore-local-gate",
        hasLocalInboundDestination: localDestination !== undefined,
      },
    );
    if (shouldIgnoreLocalAnnounceNow(ignoreLocalStepped.actions)) {
      this.emitDrop(
        dropFromLocalEcho(
          ignoreLocalStepped.actions,
          destinationKey,
          iface.name,
        ),
      );
      return;
    }

    const receivedFrom = packet.transportId ?? packet.destinationHash;
    const randomBlob = announce.randomHash;
    const existing = this.pathTable.get(hashKey(packet.destinationHash));
    const now = this.clock.now() / 1000;
    const addStepped = stepAddPathEntryWithActions(initialAddPathEntryState(), {
      kind: "path/add-entry-gate",
      hops: packet.hops,
      randomBlob,
      nowSeconds: now,
      existing:
        existing === undefined
          ? null
          : {
              hops: existing.hops,
              expires: existing.expires,
              randomBlobs: existing.randomBlobs,
            },
    });
    const shouldAdd = shouldAddPathEntryNow(addStepped.actions);

    if (!shouldAdd) {
      this.emitDrop(
        dropFromPathSkip(addStepped.actions, destinationKey, iface.name),
      );
      return;
    }

    const blobStepped = stepAppendPathRandomBlobWithActions(
      initialAppendPathRandomBlobState(),
      {
        kind: "path/append-random-blob-gate",
        randomBlobs: existing?.randomBlobs ?? [],
        randomBlob,
      },
    );
    const randomBlobs = shouldUseAppendPathRandomBlob(blobStepped.actions)
      ? appendPathRandomBlobFieldsFromActions(blobStepped.actions)
      : null;
    if (randomBlobs === null) {
      return;
    }

    const expiryStepped = stepComputePathExpiryWithActions(
      initialComputePathExpiryState(),
      {
        kind: "path/expiry-gate",
        nowSeconds: now,
      },
    );
    const expires = shouldUsePathExpiry(expiryStepped.actions)
      ? pathExpiryFromActions(expiryStepped.actions)
      : null;
    if (expires === null) {
      return;
    }

    const entry: PathEntry = {
      timestamp: now,
      nextHop: Uint8Array.from(receivedFrom),
      hops: packet.hops,
      expires,
      randomBlobs,
      receivedInterface: iface,
      packetHash: packet.hash(),
      announceRaw: Uint8Array.from(packet.raw),
    };
    this.pathTable.set(hashKey(packet.destinationHash), entry);

    Identity.rememberDestination(
      packet.destinationHash,
      receivedFrom,
      announce.publicKey,
      announce.appData,
      now,
    );

    const announcedIdentity = Identity.recall(
      this.options.provider,
      packet.destinationHash,
    );
    if (
      !shouldDispatchAnnounceHandlersNow(
        stepDispatchAnnounceHandlersWithActions(
          initialDispatchAnnounceHandlersState(),
          {
            kind: "announce/dispatch-handlers-gate",
            identityPresent: announcedIdentity !== null,
          },
        ).actions,
      )
    ) {
      return;
    }
    const identity = announcedIdentity!;

    for (const handler of this.announceHandlers) {
      if (
        !shouldReceiveAnnouncePathResponseNow(
          stepReceiveAnnouncePathResponseWithActions(
            initialReceiveAnnouncePathResponseState(),
            {
              kind: "announce/receive-path-response-gate",
              context: packet.context,
              ...(handler.receivePathResponses !== undefined
                ? { receivePathResponses: handler.receivePathResponses }
                : {}),
            },
          ).actions,
        )
      ) {
        continue;
      }

      if (handler.aspectFilter != null) {
        const filterStepped = stepParseAspectFilterWithActions(
          initialParseAspectFilterState(),
          {
            kind: "destination/aspect-filter-gate",
            filter: handler.aspectFilter,
          },
        );
        const parsedFilter = shouldUseParseAspectFilter(filterStepped.actions)
          ? aspectFilterFromActions(filterStepped.actions)
          : null;
        const filterParsed =
          !shouldRejectParseAspectFilter(filterStepped.actions) &&
          parsedFilter !== null;
        const expected =
          parsedFilter === null
            ? null
            : Destination.hash(
                this.options.provider,
                identity,
                parsedFilter.appName,
                ...parsedFilter.aspects,
              );
        if (
          !shouldMatchAnnounceAspectNow(
            stepMatchAnnounceAspectWithActions(
              initialMatchAnnounceAspectState(),
              {
                kind: "announce/match-aspect-gate",
                hasFilter: true,
                filterParsed,
                hashMatches:
                  expected !== null &&
                  equalBytes(packet.destinationHash, expected),
              },
            ).actions,
          )
        ) {
          continue;
        }
      }

      handler.receivedAnnounce({
        destinationHash: packet.destinationHash,
        announcedIdentity: identity,
        appData: announce.appData,
        announce,
        packet,
      });
    }
  }
}
