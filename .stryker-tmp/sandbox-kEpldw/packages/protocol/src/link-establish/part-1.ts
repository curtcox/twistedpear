/** Extracted from link-establish.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure link establishment status transitions (handshake → proof/RTT → ACTIVE)
 * and inbound application-request dispatch (handler invoke → response send).
 * Crypto verification and packet IO stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc status / plan.kind reads
 * beside the step). RTT compute / merge conclusions leave via machine actions
 * (no ad-hoc `computeLinkRttSeconds` / `mergeLinkRtt` reads beside the step).
 * Send / closed / reuse / packet-interface / encrypt / request-allow /
 * last-data / inbound-DATA / keepalive-update / create-channel /
 * handshake / prove / owner-public-key / validate-proof / proof-crypto /
 * accept-RTT / identify / plaintext-dispatch / resend gates conclude
 * via machine actions (no ad-hoc `canLinkSend` / `isLinkClosed` /
 * `shouldReuseActiveLink` / `shouldAcceptLinkPacketInterface` /
 * `shouldEncryptLinkPayload` / `canLinkRequest` / `shouldUpdateLinkLastData` /
 * `isLinkInboundDataPacket` / `canUpdateLinkKeepalive` /
 * `shouldCreateLinkChannel` / `canPerformLinkHandshake` / `canProveLink` /
 * `canAcceptLinkOwnerPublicKey` / `canAcceptLinkRequestOwner` /
 * `canValidateLinkProof` /
 * `shouldAttemptLinkProofCrypto` / `canAcceptLinkRtt` /
 * `shouldTeardownLinkFromRtt` / `canIdentifyOnLink` /
 * `shouldDispatchLinkPlaintext` / `canResendLinkPacket` reads beside the step).
 * Link-member register / invoke-app-request-handler / send-app-request-response
 * gates conclude via machine actions (no ad-hoc `shouldRegisterLinkMember` /
 * `shouldInvokeLinkAppRequestHandler` / `shouldSendLinkAppRequestResponse`
 * reads beside the step).
 * Continue-validate-request apply gate conclusions leave via machine actions
 * (no ad-hoc `shouldContinueLinkValidateRequest` reads beside the step).
 * Destination request-allow conclusions leave via machine actions (no ad-hoc
 * `planDestinationRequestAllow` reads beside the step).
 * Accept-link-request-owner conclusions leave via machine actions (no ad-hoc
 * `canAcceptLinkRequestOwner` reads beside the step).
 * Send-link-app-response-allow conclusions leave via machine actions (no ad-hoc
 * `canSendLinkAppResponse` reads beside the step).
 * Validate-request / app-request / app-request-dispatch / app-request-response /
 * app-request-transmit-outcome / token-access plan leaves conclude via machine
 * actions (no ad-hoc `planLinkValidateRequest` / `planLinkAppRequest` /
 * `planLinkAppRequestDispatch` / `planLinkAppRequestResponse` /
 * `planLinkAppRequestTransmitOutcome` / `planLinkTokenAccess` / `plan ===`
 * reads beside the parent step).
 * Link register-list / activate-membership / unregister-membership plans nested via
 * {@link stepLinkRegisterListPlanWithActions} /
 * {@link stepLinkActivateMembershipPlanWithActions} /
 * {@link stepLinkUnregisterMembershipPlanWithActions}.
 */function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { initialDestinationRequestAllowState, shouldAllowDestinationRequest, stepDestinationRequestAllowWithActions } from "../destination-allow.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { PacketTypeCode } from "../packet-header.js";
import { LinkStatus, type LinkStatusValue } from "../link-watchdog.js";
export interface LinkEstablishState {
  readonly status: LinkStatusValue;
  readonly initiator: boolean;
  readonly rtt: number | null;
  readonly activatedAt: number | null;
}
export type LinkEstablishEvent = Event | {
  readonly kind: "establish/handshake";
} | {
  readonly kind: "establish/activated";
  readonly atSeconds: number;
  readonly rtt: number;
} | {
  readonly kind: "establish/failed";
} | {
  readonly kind: "establish/rtt";
  readonly plaintextPresent: boolean;
} | {
  readonly kind: "establish/rtt-failed";
};

/**
 * Adapter applies handshake / activate / fail / RTT gate only from these actions.
 * Initiator activation also drives membership + LRRTT send flags.
 * Responder LRRTT: ignore / accept-rtt (unpack then activated) / teardown.
 */
export type LinkEstablishAction = {
  readonly kind: "enter-handshake";
} | {
  readonly kind: "activated";
  readonly rtt: number;
  readonly activatedAt: number;
  readonly sendRtt: boolean;
  readonly activateMembership: boolean;
} | {
  readonly kind: "failed";
} | {
  readonly kind: "ignore";
} | {
  readonly kind: "accept-rtt";
} | {
  readonly kind: "teardown";
};
export interface LinkEstablishStepResult {
  readonly state: LinkEstablishState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkEstablishAction[];
}
export function initialLinkEstablishState(options: {
  readonly initiator: boolean;
  readonly status?: LinkStatusValue;
}): LinkEstablishState {
  if (stryMutAct_9fa48("12301")) {
    {}
  } else {
    stryCov_9fa48("12301");
    return stryMutAct_9fa48("12302") ? {} : (stryCov_9fa48("12302"), {
      status: stryMutAct_9fa48("12303") ? options.status && LinkStatus.PENDING : (stryCov_9fa48("12303"), options.status ?? LinkStatus.PENDING),
      initiator: options.initiator,
      rtt: null,
      activatedAt: null
    });
  }
}
export function canLinkHandshake(status: LinkStatusValue): boolean {
  if (stryMutAct_9fa48("12304")) {
    {}
  } else {
    stryCov_9fa48("12304");
    return stryMutAct_9fa48("12307") ? status !== LinkStatus.PENDING : stryMutAct_9fa48("12306") ? false : stryMutAct_9fa48("12305") ? true : (stryCov_9fa48("12305", "12306", "12307"), status === LinkStatus.PENDING);
  }
}

/** Whether handshake may run (PENDING + local private key + peer public key). */
export function canPerformLinkHandshake(input: {
  readonly status: LinkStatusValue;
  readonly privateKeyPresent: boolean;
  readonly peerPublicKeyPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("12308")) {
    {}
  } else {
    stryCov_9fa48("12308");
    return stryMutAct_9fa48("12311") ? canLinkHandshake(input.status) && input.privateKeyPresent || input.peerPublicKeyPresent : stryMutAct_9fa48("12310") ? false : stryMutAct_9fa48("12309") ? true : (stryCov_9fa48("12309", "12310", "12311"), (stryMutAct_9fa48("12313") ? canLinkHandshake(input.status) || input.privateKeyPresent : stryMutAct_9fa48("12312") ? true : (stryCov_9fa48("12312", "12313"), canLinkHandshake(input.status) && input.privateKeyPresent)) && input.peerPublicKeyPresent);
  }
}

/**
 * canPerformLinkHandshake gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canPerformLinkHandshake` reads beside
 * the step).
 */
export type PerformLinkHandshakeAllowState = Record<string, never>;
export type PerformLinkHandshakeAllowEvent = Event | {
  readonly kind: "link/perform-handshake-allow-gate";
  readonly status: LinkStatusValue;
  readonly privateKeyPresent: boolean;
  readonly peerPublicKeyPresent: boolean;
};
export type PerformLinkHandshakeAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface PerformLinkHandshakeAllowStepResult {
  readonly state: PerformLinkHandshakeAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PerformLinkHandshakeAllowAction[];
}
export function initialPerformLinkHandshakeAllowState(): PerformLinkHandshakeAllowState {
  if (stryMutAct_9fa48("12314")) {
    {}
  } else {
    stryCov_9fa48("12314");
    return {};
  }
}
export function stepPerformLinkHandshakeAllowWithActions(state: PerformLinkHandshakeAllowState, event: PerformLinkHandshakeAllowEvent): PerformLinkHandshakeAllowStepResult {
  if (stryMutAct_9fa48("12315")) {
    {}
  } else {
    stryCov_9fa48("12315");
    if (stryMutAct_9fa48("12318") ? event.kind !== "link/perform-handshake-allow-gate" : stryMutAct_9fa48("12317") ? false : stryMutAct_9fa48("12316") ? true : (stryCov_9fa48("12316", "12317", "12318"), event.kind === (stryMutAct_9fa48("12319") ? "" : (stryCov_9fa48("12319"), "link/perform-handshake-allow-gate")))) {
      if (stryMutAct_9fa48("12320")) {
        {}
      } else {
        stryCov_9fa48("12320");
        return stryMutAct_9fa48("12321") ? {} : (stryCov_9fa48("12321"), {
          state,
          intents: stryMutAct_9fa48("12322") ? ["Stryker was here"] : (stryCov_9fa48("12322"), []),
          actions: stryMutAct_9fa48("12323") ? [] : (stryCov_9fa48("12323"), [stryMutAct_9fa48("12324") ? {} : (stryCov_9fa48("12324"), {
            kind: canPerformLinkHandshake(stryMutAct_9fa48("12325") ? {} : (stryCov_9fa48("12325"), {
              status: event.status,
              privateKeyPresent: event.privateKeyPresent,
              peerPublicKeyPresent: event.peerPublicKeyPresent
            })) ? stryMutAct_9fa48("12326") ? "" : (stryCov_9fa48("12326"), "allow") : stryMutAct_9fa48("12327") ? "" : (stryCov_9fa48("12327"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12328") ? {} : (stryCov_9fa48("12328"), {
      state,
      intents: stryMutAct_9fa48("12329") ? ["Stryker was here"] : (stryCov_9fa48("12329"), []),
      actions: stryMutAct_9fa48("12330") ? ["Stryker was here"] : (stryCov_9fa48("12330"), [])
    });
  }
}
export function shouldAllowPerformLinkHandshake(actions: ReadonlyArray<PerformLinkHandshakeAllowAction>): boolean {
  if (stryMutAct_9fa48("12331")) {
    {}
  } else {
    stryCov_9fa48("12331");
    return stryMutAct_9fa48("12332") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("12332"), actions.some(stryMutAct_9fa48("12333") ? () => undefined : (stryCov_9fa48("12333"), action => stryMutAct_9fa48("12336") ? action.kind !== "allow" : stryMutAct_9fa48("12335") ? false : stryMutAct_9fa48("12334") ? true : (stryCov_9fa48("12334", "12335", "12336"), action.kind === (stryMutAct_9fa48("12337") ? "" : (stryCov_9fa48("12337"), "allow"))))));
  }
}
export function shouldDenyPerformLinkHandshake(actions: ReadonlyArray<PerformLinkHandshakeAllowAction>): boolean {
  if (stryMutAct_9fa48("12338")) {
    {}
  } else {
    stryCov_9fa48("12338");
    return stryMutAct_9fa48("12339") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("12339"), actions.some(stryMutAct_9fa48("12340") ? () => undefined : (stryCov_9fa48("12340"), action => stryMutAct_9fa48("12343") ? action.kind !== "deny" : stryMutAct_9fa48("12342") ? false : stryMutAct_9fa48("12341") ? true : (stryCov_9fa48("12341", "12342", "12343"), action.kind === (stryMutAct_9fa48("12344") ? "" : (stryCov_9fa48("12344"), "deny"))))));
  }
}

/** Whether a responder may issue a link request proof. */
export function canProveLink(input: {
  readonly ownerPresent: boolean;
  readonly publicKeyPresent: boolean;
  readonly ownerIdentityPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("12345")) {
    {}
  } else {
    stryCov_9fa48("12345");
    return stryMutAct_9fa48("12348") ? input.ownerPresent && input.publicKeyPresent || input.ownerIdentityPresent : stryMutAct_9fa48("12347") ? false : stryMutAct_9fa48("12346") ? true : (stryCov_9fa48("12346", "12347", "12348"), (stryMutAct_9fa48("12350") ? input.ownerPresent || input.publicKeyPresent : stryMutAct_9fa48("12349") ? true : (stryCov_9fa48("12349", "12350"), input.ownerPresent && input.publicKeyPresent)) && input.ownerIdentityPresent);
  }
}

/**
 * canProveLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canProveLink` reads beside
 * the step).
 */
export type ProveLinkAllowState = Record<string, never>;
export type ProveLinkAllowEvent = Event | {
  readonly kind: "link/prove-allow-gate";
  readonly ownerPresent: boolean;
  readonly publicKeyPresent: boolean;
  readonly ownerIdentityPresent: boolean;
};
export type ProveLinkAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface ProveLinkAllowStepResult {
  readonly state: ProveLinkAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ProveLinkAllowAction[];
}
export function initialProveLinkAllowState(): ProveLinkAllowState {
  if (stryMutAct_9fa48("12351")) {
    {}
  } else {
    stryCov_9fa48("12351");
    return {};
  }
}
export function stepProveLinkAllowWithActions(state: ProveLinkAllowState, event: ProveLinkAllowEvent): ProveLinkAllowStepResult {
  if (stryMutAct_9fa48("12352")) {
    {}
  } else {
    stryCov_9fa48("12352");
    if (stryMutAct_9fa48("12355") ? event.kind !== "link/prove-allow-gate" : stryMutAct_9fa48("12354") ? false : stryMutAct_9fa48("12353") ? true : (stryCov_9fa48("12353", "12354", "12355"), event.kind === (stryMutAct_9fa48("12356") ? "" : (stryCov_9fa48("12356"), "link/prove-allow-gate")))) {
      if (stryMutAct_9fa48("12357")) {
        {}
      } else {
        stryCov_9fa48("12357");
        return stryMutAct_9fa48("12358") ? {} : (stryCov_9fa48("12358"), {
          state,
          intents: stryMutAct_9fa48("12359") ? ["Stryker was here"] : (stryCov_9fa48("12359"), []),
          actions: stryMutAct_9fa48("12360") ? [] : (stryCov_9fa48("12360"), [stryMutAct_9fa48("12361") ? {} : (stryCov_9fa48("12361"), {
            kind: canProveLink(stryMutAct_9fa48("12362") ? {} : (stryCov_9fa48("12362"), {
              ownerPresent: event.ownerPresent,
              publicKeyPresent: event.publicKeyPresent,
              ownerIdentityPresent: event.ownerIdentityPresent
            })) ? stryMutAct_9fa48("12363") ? "" : (stryCov_9fa48("12363"), "allow") : stryMutAct_9fa48("12364") ? "" : (stryCov_9fa48("12364"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12365") ? {} : (stryCov_9fa48("12365"), {
      state,
      intents: stryMutAct_9fa48("12366") ? ["Stryker was here"] : (stryCov_9fa48("12366"), []),
      actions: stryMutAct_9fa48("12367") ? ["Stryker was here"] : (stryCov_9fa48("12367"), [])
    });
  }
}
export function shouldAllowProveLink(actions: ReadonlyArray<ProveLinkAllowAction>): boolean {
  if (stryMutAct_9fa48("12368")) {
    {}
  } else {
    stryCov_9fa48("12368");
    return stryMutAct_9fa48("12369") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("12369"), actions.some(stryMutAct_9fa48("12370") ? () => undefined : (stryCov_9fa48("12370"), action => stryMutAct_9fa48("12373") ? action.kind !== "allow" : stryMutAct_9fa48("12372") ? false : stryMutAct_9fa48("12371") ? true : (stryCov_9fa48("12371", "12372", "12373"), action.kind === (stryMutAct_9fa48("12374") ? "" : (stryCov_9fa48("12374"), "allow"))))));
  }
}
export function shouldDenyProveLink(actions: ReadonlyArray<ProveLinkAllowAction>): boolean {
  if (stryMutAct_9fa48("12375")) {
    {}
  } else {
    stryCov_9fa48("12375");
    return stryMutAct_9fa48("12376") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("12376"), actions.some(stryMutAct_9fa48("12377") ? () => undefined : (stryCov_9fa48("12377"), action => stryMutAct_9fa48("12380") ? action.kind !== "deny" : stryMutAct_9fa48("12379") ? false : stryMutAct_9fa48("12378") ? true : (stryCov_9fa48("12378", "12379", "12380"), action.kind === (stryMutAct_9fa48("12381") ? "" : (stryCov_9fa48("12381"), "deny"))))));
  }
}

/** Whether owner public-key bytes split into Ed25519/X25519 halves for prove. */
export function canAcceptLinkOwnerPublicKey(splitOk: boolean): boolean {
  if (stryMutAct_9fa48("12382")) {
    {}
  } else {
    stryCov_9fa48("12382");
    return splitOk;
  }
}

/**
 * canAcceptLinkOwnerPublicKey gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkOwnerPublicKey` reads beside
 * the step).
 */
export type AcceptLinkOwnerPublicKeyState = Record<string, never>;
export type AcceptLinkOwnerPublicKeyEvent = Event | {
  readonly kind: "link/accept-owner-public-key-gate";
  readonly splitOk: boolean;
};
export type AcceptLinkOwnerPublicKeyAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};
export interface AcceptLinkOwnerPublicKeyStepResult {
  readonly state: AcceptLinkOwnerPublicKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkOwnerPublicKeyAction[];
}
export function initialAcceptLinkOwnerPublicKeyState(): AcceptLinkOwnerPublicKeyState {
  if (stryMutAct_9fa48("12383")) {
    {}
  } else {
    stryCov_9fa48("12383");
    return {};
  }
}
export function stepAcceptLinkOwnerPublicKeyWithActions(state: AcceptLinkOwnerPublicKeyState, event: AcceptLinkOwnerPublicKeyEvent): AcceptLinkOwnerPublicKeyStepResult {
  if (stryMutAct_9fa48("12384")) {
    {}
  } else {
    stryCov_9fa48("12384");
    if (stryMutAct_9fa48("12387") ? event.kind !== "link/accept-owner-public-key-gate" : stryMutAct_9fa48("12386") ? false : stryMutAct_9fa48("12385") ? true : (stryCov_9fa48("12385", "12386", "12387"), event.kind === (stryMutAct_9fa48("12388") ? "" : (stryCov_9fa48("12388"), "link/accept-owner-public-key-gate")))) {
      if (stryMutAct_9fa48("12389")) {
        {}
      } else {
        stryCov_9fa48("12389");
        return stryMutAct_9fa48("12390") ? {} : (stryCov_9fa48("12390"), {
          state,
          intents: stryMutAct_9fa48("12391") ? ["Stryker was here"] : (stryCov_9fa48("12391"), []),
          actions: stryMutAct_9fa48("12392") ? [] : (stryCov_9fa48("12392"), [stryMutAct_9fa48("12393") ? {} : (stryCov_9fa48("12393"), {
            kind: canAcceptLinkOwnerPublicKey(event.splitOk) ? stryMutAct_9fa48("12394") ? "" : (stryCov_9fa48("12394"), "accept") : stryMutAct_9fa48("12395") ? "" : (stryCov_9fa48("12395"), "reject")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12396") ? {} : (stryCov_9fa48("12396"), {
      state,
      intents: stryMutAct_9fa48("12397") ? ["Stryker was here"] : (stryCov_9fa48("12397"), []),
      actions: stryMutAct_9fa48("12398") ? ["Stryker was here"] : (stryCov_9fa48("12398"), [])
    });
  }
}
export function shouldAcceptLinkOwnerPublicKeyNow(actions: ReadonlyArray<AcceptLinkOwnerPublicKeyAction>): boolean {
  if (stryMutAct_9fa48("12399")) {
    {}
  } else {
    stryCov_9fa48("12399");
    return stryMutAct_9fa48("12400") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("12400"), actions.some(stryMutAct_9fa48("12401") ? () => undefined : (stryCov_9fa48("12401"), action => stryMutAct_9fa48("12404") ? action.kind !== "accept" : stryMutAct_9fa48("12403") ? false : stryMutAct_9fa48("12402") ? true : (stryCov_9fa48("12402", "12403", "12404"), action.kind === (stryMutAct_9fa48("12405") ? "" : (stryCov_9fa48("12405"), "accept"))))));
  }
}
export function shouldRejectLinkOwnerPublicKey(actions: ReadonlyArray<AcceptLinkOwnerPublicKeyAction>): boolean {
  if (stryMutAct_9fa48("12406")) {
    {}
  } else {
    stryCov_9fa48("12406");
    return stryMutAct_9fa48("12407") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("12407"), actions.some(stryMutAct_9fa48("12408") ? () => undefined : (stryCov_9fa48("12408"), action => stryMutAct_9fa48("12411") ? action.kind !== "reject" : stryMutAct_9fa48("12410") ? false : stryMutAct_9fa48("12409") ? true : (stryCov_9fa48("12409", "12410", "12411"), action.kind === (stryMutAct_9fa48("12412") ? "" : (stryCov_9fa48("12412"), "reject"))))));
  }
}

/** Whether an inbound link request destination has identity material. */
export function canAcceptLinkRequestOwner(identityPresent: boolean): boolean {
  if (stryMutAct_9fa48("12413")) {
    {}
  } else {
    stryCov_9fa48("12413");
    return identityPresent;
  }
}

/**
 * canAcceptLinkRequestOwner gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkRequestOwner`
 * reads beside the step).
 */
export type AcceptLinkRequestOwnerState = Record<string, never>;
export type AcceptLinkRequestOwnerEvent = Event | {
  readonly kind: "link/accept-request-owner-gate";
  readonly identityPresent: boolean;
};
export type AcceptLinkRequestOwnerAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};
export interface AcceptLinkRequestOwnerStepResult {
  readonly state: AcceptLinkRequestOwnerState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkRequestOwnerAction[];
}
export function initialAcceptLinkRequestOwnerState(): AcceptLinkRequestOwnerState {
  if (stryMutAct_9fa48("12414")) {
    {}
  } else {
    stryCov_9fa48("12414");
    return {};
  }
}
export function stepAcceptLinkRequestOwnerWithActions(state: AcceptLinkRequestOwnerState, event: AcceptLinkRequestOwnerEvent): AcceptLinkRequestOwnerStepResult {
  if (stryMutAct_9fa48("12415")) {
    {}
  } else {
    stryCov_9fa48("12415");
    if (stryMutAct_9fa48("12418") ? event.kind !== "link/accept-request-owner-gate" : stryMutAct_9fa48("12417") ? false : stryMutAct_9fa48("12416") ? true : (stryCov_9fa48("12416", "12417", "12418"), event.kind === (stryMutAct_9fa48("12419") ? "" : (stryCov_9fa48("12419"), "link/accept-request-owner-gate")))) {
      if (stryMutAct_9fa48("12420")) {
        {}
      } else {
        stryCov_9fa48("12420");
        return stryMutAct_9fa48("12421") ? {} : (stryCov_9fa48("12421"), {
          state,
          intents: stryMutAct_9fa48("12422") ? ["Stryker was here"] : (stryCov_9fa48("12422"), []),
          actions: stryMutAct_9fa48("12423") ? [] : (stryCov_9fa48("12423"), [stryMutAct_9fa48("12424") ? {} : (stryCov_9fa48("12424"), {
            kind: canAcceptLinkRequestOwner(event.identityPresent) ? stryMutAct_9fa48("12425") ? "" : (stryCov_9fa48("12425"), "accept") : stryMutAct_9fa48("12426") ? "" : (stryCov_9fa48("12426"), "reject")
          })])
        });
      }
    }
    return stryMutAct_9fa48("12427") ? {} : (stryCov_9fa48("12427"), {
      state,
      intents: stryMutAct_9fa48("12428") ? ["Stryker was here"] : (stryCov_9fa48("12428"), []),
      actions: stryMutAct_9fa48("12429") ? ["Stryker was here"] : (stryCov_9fa48("12429"), [])
    });
  }
}
export function shouldAcceptLinkRequestOwnerNow(actions: ReadonlyArray<AcceptLinkRequestOwnerAction>): boolean {
  if (stryMutAct_9fa48("12430")) {
    {}
  } else {
    stryCov_9fa48("12430");
    return stryMutAct_9fa48("12431") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("12431"), actions.some(stryMutAct_9fa48("12432") ? () => undefined : (stryCov_9fa48("12432"), action => stryMutAct_9fa48("12435") ? action.kind !== "accept" : stryMutAct_9fa48("12434") ? false : stryMutAct_9fa48("12433") ? true : (stryCov_9fa48("12433", "12434", "12435"), action.kind === (stryMutAct_9fa48("12436") ? "" : (stryCov_9fa48("12436"), "accept"))))));
  }
}
export function shouldRejectLinkRequestOwner(actions: ReadonlyArray<AcceptLinkRequestOwnerAction>): boolean {
  if (stryMutAct_9fa48("12437")) {
    {}
  } else {
    stryCov_9fa48("12437");
    return stryMutAct_9fa48("12438") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("12438"), actions.some(stryMutAct_9fa48("12439") ? () => undefined : (stryCov_9fa48("12439"), action => stryMutAct_9fa48("12442") ? action.kind !== "reject" : stryMutAct_9fa48("12441") ? false : stryMutAct_9fa48("12440") ? true : (stryCov_9fa48("12440", "12441", "12442"), action.kind === (stryMutAct_9fa48("12443") ? "" : (stryCov_9fa48("12443"), "reject"))))));
  }
}
export type LinkValidateRequestPlan = "ok" | "bad-request" | "owner-missing-identity" | "mode-disabled";

/**
 * Whether validateRequest may proceed (parsed request + owner + enabled mode).
 * Pass `ownerIdentityAccepted` from {@link stepAcceptLinkRequestOwnerWithActions}
 * (`shouldAcceptLinkRequestOwnerNow`); do not re-read `canAcceptLinkRequestOwner`
 * beside the step.
 */
export function planLinkValidateRequest(input: {
  readonly requestPresent: boolean;
  readonly ownerIdentityAccepted: boolean;
  readonly modeEnabled: boolean;
}): LinkValidateRequestPlan {
  if (stryMutAct_9fa48("12444")) {
    {}
  } else {
    stryCov_9fa48("12444");
    if (stryMutAct_9fa48("12447") ? false : stryMutAct_9fa48("12446") ? true : stryMutAct_9fa48("12445") ? input.requestPresent : (stryCov_9fa48("12445", "12446", "12447"), !input.requestPresent)) {
      if (stryMutAct_9fa48("12448")) {
        {}
      } else {
        stryCov_9fa48("12448");
        return stryMutAct_9fa48("12449") ? "" : (stryCov_9fa48("12449"), "bad-request");
      }
    }
    if (stryMutAct_9fa48("12452") ? false : stryMutAct_9fa48("12451") ? true : stryMutAct_9fa48("12450") ? input.ownerIdentityAccepted : (stryCov_9fa48("12450", "12451", "12452"), !input.ownerIdentityAccepted)) {
      if (stryMutAct_9fa48("12453")) {
        {}
      } else {
        stryCov_9fa48("12453");
        return stryMutAct_9fa48("12454") ? "" : (stryCov_9fa48("12454"), "owner-missing-identity");
      }
    }
    if (stryMutAct_9fa48("12457") ? false : stryMutAct_9fa48("12456") ? true : stryMutAct_9fa48("12455") ? input.modeEnabled : (stryCov_9fa48("12455", "12456", "12457"), !input.modeEnabled)) {
      if (stryMutAct_9fa48("12458")) {
        {}
      } else {
        stryCov_9fa48("12458");
        return stryMutAct_9fa48("12459") ? "" : (stryCov_9fa48("12459"), "mode-disabled");
      }
    }
    return stryMutAct_9fa48("12460") ? "" : (stryCov_9fa48("12460"), "ok");
  }
}
export type LinkValidateRequestPlanEvent = Event | {
  readonly kind: "validate-request/plan-gate";
  readonly requestPresent: boolean;
  readonly ownerIdentityAccepted: boolean;
  readonly modeEnabled: boolean;
};
export type LinkValidateRequestPlanAction = {
  readonly kind: "ok";
} | {
  readonly kind: "bad-request";
} | {
  readonly kind: "owner-missing-identity";
} | {
  readonly kind: "mode-disabled";
};
export function shouldOkLinkValidateRequestPlan(actions: ReadonlyArray<LinkValidateRequestPlanAction>): boolean {
  if (stryMutAct_9fa48("12461")) {
    {}
  } else {
    stryCov_9fa48("12461");
    return stryMutAct_9fa48("12462") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("12462"), actions.some(stryMutAct_9fa48("12463") ? () => undefined : (stryCov_9fa48("12463"), action => stryMutAct_9fa48("12466") ? action.kind !== "ok" : stryMutAct_9fa48("12465") ? false : stryMutAct_9fa48("12464") ? true : (stryCov_9fa48("12464", "12465", "12466"), action.kind === (stryMutAct_9fa48("12467") ? "" : (stryCov_9fa48("12467"), "ok"))))));
  }
}
export function shouldBadRequestLinkValidateRequestPlan(actions: ReadonlyArray<LinkValidateRequestPlanAction>): boolean {
  if (stryMutAct_9fa48("12468")) {
    {}
  } else {
    stryCov_9fa48("12468");
    return stryMutAct_9fa48("12469") ? actions.every(action => action.kind === "bad-request") : (stryCov_9fa48("12469"), actions.some(stryMutAct_9fa48("12470") ? () => undefined : (stryCov_9fa48("12470"), action => stryMutAct_9fa48("12473") ? action.kind !== "bad-request" : stryMutAct_9fa48("12472") ? false : stryMutAct_9fa48("12471") ? true : (stryCov_9fa48("12471", "12472", "12473"), action.kind === (stryMutAct_9fa48("12474") ? "" : (stryCov_9fa48("12474"), "bad-request"))))));
  }
}
export function shouldOwnerMissingIdentityLinkValidateRequestPlan(actions: ReadonlyArray<LinkValidateRequestPlanAction>): boolean {
  if (stryMutAct_9fa48("12475")) {
    {}
  } else {
    stryCov_9fa48("12475");
    return stryMutAct_9fa48("12476") ? actions.every(action => action.kind === "owner-missing-identity") : (stryCov_9fa48("12476"), actions.some(stryMutAct_9fa48("12477") ? () => undefined : (stryCov_9fa48("12477"), action => stryMutAct_9fa48("12480") ? action.kind !== "owner-missing-identity" : stryMutAct_9fa48("12479") ? false : stryMutAct_9fa48("12478") ? true : (stryCov_9fa48("12478", "12479", "12480"), action.kind === (stryMutAct_9fa48("12481") ? "" : (stryCov_9fa48("12481"), "owner-missing-identity"))))));
  }
}
export function shouldModeDisabledLinkValidateRequestPlan(actions: ReadonlyArray<LinkValidateRequestPlanAction>): boolean {
  if (stryMutAct_9fa48("12482")) {
    {}
  } else {
    stryCov_9fa48("12482");
    return stryMutAct_9fa48("12483") ? actions.every(action => action.kind === "mode-disabled") : (stryCov_9fa48("12483"), actions.some(stryMutAct_9fa48("12484") ? () => undefined : (stryCov_9fa48("12484"), action => stryMutAct_9fa48("12487") ? action.kind !== "mode-disabled" : stryMutAct_9fa48("12486") ? false : stryMutAct_9fa48("12485") ? true : (stryCov_9fa48("12485", "12486", "12487"), action.kind === (stryMutAct_9fa48("12488") ? "" : (stryCov_9fa48("12488"), "mode-disabled"))))));
  }
}
export type LinkValidateRequestEvent = Event | {
  readonly kind: "validate-request/gate";
  readonly requestPresent: boolean;
  readonly ownerIdentityPresent: boolean;
  readonly modeEnabled: boolean;
};
export type LinkValidateRequestAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-bad-request";
} | {
  readonly kind: "reject-owner-missing-identity";
} | {
  readonly kind: "reject-mode-disabled";
};