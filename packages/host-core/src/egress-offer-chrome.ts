/**
 * Host chrome that authors egress offers from something the user was already
 * doing. A standalone "choose destinations" dialog is not a valid authoring
 * path — that would be a rubber stamp wearing a control's clothes.
 */
import type {
  EgressOffer,
  EgressOfferConstraints,
  EgressTargetKind,
} from "@twistedpear/protocol";

export const EGRESS_OFFER_SETTINGS_TITLE = "Where apps may send";
export const EGRESS_OFFER_REVOKE_LABEL = "Revoke";

export type NaturalUseAction =
  | {
      readonly kind: "pick-contact";
      readonly appId: string;
      readonly peerId: string;
      readonly displayLabel: string;
    }
  | {
      readonly kind: "accept-call";
      readonly appId: string;
      readonly peerId: string;
      readonly classId: string;
    }
  | {
      readonly kind: "scan-qr";
      readonly appId: string;
      readonly peerId: string;
      readonly displayLabel: string;
    };

export interface AuthoredOfferDraft {
  readonly appId: string;
  readonly capability: string;
  readonly targetKind: EgressTargetKind;
  readonly targetId: string;
  readonly displayLabel: string;
  readonly constraints: EgressOfferConstraints;
}

export interface EgressOfferSettingsRow {
  readonly id: string;
  readonly appId: string;
  readonly capability: string;
  readonly displayLabel: string;
  readonly targetId: string;
  readonly revokeLabel: typeof EGRESS_OFFER_REVOKE_LABEL;
}

export interface EgressOfferSettingsPresentation {
  readonly title: typeof EGRESS_OFFER_SETTINGS_TITLE;
  readonly rows: ReadonlyArray<EgressOfferSettingsRow>;
}

export function authorOfferFromNaturalUse(
  action: NaturalUseAction,
): AuthoredOfferDraft {
  switch (action.kind) {
    case "pick-contact":
      return {
        appId: action.appId,
        capability: "lxmf:send",
        targetKind: "peer",
        targetId: action.peerId,
        displayLabel: action.displayLabel,
        constraints: {},
      };
    case "accept-call":
      return {
        appId: action.appId,
        capability: "device:stream",
        targetKind: "peer",
        targetId: action.peerId,
        displayLabel: action.peerId,
        constraints: { classId: action.classId },
      };
    case "scan-qr":
      return {
        appId: action.appId,
        capability: "peer:connect",
        targetKind: "peer",
        targetId: action.peerId,
        displayLabel: action.displayLabel,
        constraints: {},
      };
  }
}

export function presentEgressOfferSettings(
  offers: ReadonlyArray<EgressOffer>,
): EgressOfferSettingsPresentation {
  return {
    title: EGRESS_OFFER_SETTINGS_TITLE,
    rows: offers
      .filter((offer) => offer.phase === "active")
      .map((offer) => ({
        id: offer.id,
        appId: offer.appId,
        capability: offer.capability,
        displayLabel: offer.displayLabel,
        targetId: offer.targetId,
        revokeLabel: EGRESS_OFFER_REVOKE_LABEL,
      })),
  };
}
