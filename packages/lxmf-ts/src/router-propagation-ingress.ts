import {
  initialAcceptLxmfPropagationLocalDeliveryState,
  initialPackLxmfDestinationPrefixedState,
  initialSplitLxmfDestinationPrefixedState,
  lxmfDestinationPrefixedFieldsFromActions,
  packLxmfDestinationPrefixedRawFromActions,
  shouldAcceptLxmfPropagationLocalDeliveryNow,
  shouldRejectPackLxmfDestinationPrefixed,
  shouldRejectSplitLxmfDestinationPrefixed,
  shouldUsePackLxmfDestinationPrefixed,
  shouldUseSplitLxmfDestinationPrefixed,
  stepAcceptLxmfPropagationLocalDeliveryWithActions,
  stepPackLxmfDestinationPrefixedWithActions,
  stepSplitLxmfDestinationPrefixedWithActions,
  type LxmfDestinationPrefixed,
} from "@twistedpear/protocol";
import type { RegisteredDestination } from "@twistedpear/reticulum-ts";
import { equalBytes } from "@twistedpear/reticulum-ts";

export function splitLxmfDestinationPrefixed(
  lxmfData: Uint8Array,
): LxmfDestinationPrefixed | null {
  const splitStepped = stepSplitLxmfDestinationPrefixedWithActions(
    initialSplitLxmfDestinationPrefixedState(),
    {
      kind: "lxmf-destination-prefixed/split-gate",
      bytes: lxmfData,
    },
  );
  if (
    shouldRejectSplitLxmfDestinationPrefixed(splitStepped.actions) ||
    !shouldUseSplitLxmfDestinationPrefixed(splitStepped.actions)
  ) {
    return null;
  }
  return lxmfDestinationPrefixedFieldsFromActions(splitStepped.actions);
}

export function propagationLocalHashMatches(
  deliveryDestination: RegisteredDestination | null,
  prefixed: LxmfDestinationPrefixed | null,
): boolean {
  return (
    deliveryDestination !== null &&
    prefixed !== null &&
    equalBytes(deliveryDestination.hash, prefixed.destinationHash)
  );
}

export function decryptPropagationLocalRemainder(
  deliveryDestination: RegisteredDestination | null,
  prefixed: LxmfDestinationPrefixed | null,
  destinationHashMatches: boolean,
): Uint8Array | null {
  const localDelivery = stepAcceptLxmfPropagationLocalDeliveryWithActions(
    initialAcceptLxmfPropagationLocalDeliveryState(),
    {
      kind: "propagation-local-delivery/accept-gate",
      deliveryDestinationPresent: deliveryDestination !== null,
      destinationHashMatches,
    },
  );
  if (
    prefixed === null ||
    !shouldAcceptLxmfPropagationLocalDeliveryNow(localDelivery.actions) ||
    deliveryDestination === null
  ) {
    return null;
  }
  return deliveryDestination.decrypt(prefixed.remainder);
}

export function packPropagationLocalDeliveryData(
  destinationHash: Uint8Array,
  remainder: Uint8Array,
): Uint8Array | null {
  const packStepped = stepPackLxmfDestinationPrefixedWithActions(
    initialPackLxmfDestinationPrefixedState(),
    {
      kind: "lxmf-destination-prefixed/pack-gate",
      destinationHash,
      remainder,
    },
  );
  if (
    shouldRejectPackLxmfDestinationPrefixed(packStepped.actions) ||
    !shouldUsePackLxmfDestinationPrefixed(packStepped.actions)
  ) {
    return null;
  }
  return packLxmfDestinationPrefixedRawFromActions(packStepped.actions);
}
