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
import { isLinkClosed } from "./part-3.js";
import { isLinkInboundDataPacket } from "./part-6.js";
import type { LinkInboundDataPacketEvent, LinkInboundDataPacketState } from "./part-6.js";
export type LinkInboundDataPacketAction = {
  readonly kind: "data";
} | {
  readonly kind: "other";
};
export interface LinkInboundDataPacketStepResult {
  readonly state: LinkInboundDataPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkInboundDataPacketAction[];
}
export function initialLinkInboundDataPacketState(): LinkInboundDataPacketState {
  if (stryMutAct_9fa48("14073")) {
    {}
  } else {
    stryCov_9fa48("14073");
    return {};
  }
}
export function stepLinkInboundDataPacketWithActions(state: LinkInboundDataPacketState, event: LinkInboundDataPacketEvent): LinkInboundDataPacketStepResult {
  if (stryMutAct_9fa48("14074")) {
    {}
  } else {
    stryCov_9fa48("14074");
    if (stryMutAct_9fa48("14077") ? event.kind !== "link/inbound-data-packet-gate" : stryMutAct_9fa48("14076") ? false : stryMutAct_9fa48("14075") ? true : (stryCov_9fa48("14075", "14076", "14077"), event.kind === (stryMutAct_9fa48("14078") ? "" : (stryCov_9fa48("14078"), "link/inbound-data-packet-gate")))) {
      if (stryMutAct_9fa48("14079")) {
        {}
      } else {
        stryCov_9fa48("14079");
        return stryMutAct_9fa48("14080") ? {} : (stryCov_9fa48("14080"), {
          state,
          intents: stryMutAct_9fa48("14081") ? ["Stryker was here"] : (stryCov_9fa48("14081"), []),
          actions: stryMutAct_9fa48("14082") ? [] : (stryCov_9fa48("14082"), [stryMutAct_9fa48("14083") ? {} : (stryCov_9fa48("14083"), {
            kind: isLinkInboundDataPacket(event.packetType) ? stryMutAct_9fa48("14084") ? "" : (stryCov_9fa48("14084"), "data") : stryMutAct_9fa48("14085") ? "" : (stryCov_9fa48("14085"), "other")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14086") ? {} : (stryCov_9fa48("14086"), {
      state,
      intents: stryMutAct_9fa48("14087") ? ["Stryker was here"] : (stryCov_9fa48("14087"), []),
      actions: stryMutAct_9fa48("14088") ? ["Stryker was here"] : (stryCov_9fa48("14088"), [])
    });
  }
}
export function shouldDispatchLinkInboundData(actions: ReadonlyArray<LinkInboundDataPacketAction>): boolean {
  if (stryMutAct_9fa48("14089")) {
    {}
  } else {
    stryCov_9fa48("14089");
    return stryMutAct_9fa48("14090") ? actions.every(action => action.kind === "data") : (stryCov_9fa48("14090"), actions.some(stryMutAct_9fa48("14091") ? () => undefined : (stryCov_9fa48("14091"), action => stryMutAct_9fa48("14094") ? action.kind !== "data" : stryMutAct_9fa48("14093") ? false : stryMutAct_9fa48("14092") ? true : (stryCov_9fa48("14092", "14093", "14094"), action.kind === (stryMutAct_9fa48("14095") ? "" : (stryCov_9fa48("14095"), "data"))))));
  }
}
export function shouldIgnoreLinkInboundNonData(actions: ReadonlyArray<LinkInboundDataPacketAction>): boolean {
  if (stryMutAct_9fa48("14096")) {
    {}
  } else {
    stryCov_9fa48("14096");
    return stryMutAct_9fa48("14097") ? actions.every(action => action.kind === "other") : (stryCov_9fa48("14097"), actions.some(stryMutAct_9fa48("14098") ? () => undefined : (stryCov_9fa48("14098"), action => stryMutAct_9fa48("14101") ? action.kind !== "other" : stryMutAct_9fa48("14100") ? false : stryMutAct_9fa48("14099") ? true : (stryCov_9fa48("14099", "14100", "14101"), action.kind === (stryMutAct_9fa48("14102") ? "" : (stryCov_9fa48("14102"), "other"))))));
  }
}
/** Whether the link may send application/context data (ACTIVE). */
export function canLinkSend(status: LinkStatusValue): boolean {
  if (stryMutAct_9fa48("14103")) {
    {}
  } else {
    stryCov_9fa48("14103");
    return stryMutAct_9fa48("14106") ? status !== LinkStatus.ACTIVE : stryMutAct_9fa48("14105") ? false : stryMutAct_9fa48("14104") ? true : (stryCov_9fa48("14104", "14105", "14106"), status === LinkStatus.ACTIVE);
  }
}

/**
 * canLinkSend gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canLinkSend` reads beside
 * the step).
 */
export type LinkSendAllowState = Record<string, never>;
export type LinkSendAllowEvent = Event | {
  readonly kind: "link/send-allow-gate";
  readonly status: LinkStatusValue;
};
export type LinkSendAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface LinkSendAllowStepResult {
  readonly state: LinkSendAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkSendAllowAction[];
}
export function initialLinkSendAllowState(): LinkSendAllowState {
  if (stryMutAct_9fa48("14107")) {
    {}
  } else {
    stryCov_9fa48("14107");
    return {};
  }
}
export function stepLinkSendAllowWithActions(state: LinkSendAllowState, event: LinkSendAllowEvent): LinkSendAllowStepResult {
  if (stryMutAct_9fa48("14108")) {
    {}
  } else {
    stryCov_9fa48("14108");
    if (stryMutAct_9fa48("14111") ? event.kind !== "link/send-allow-gate" : stryMutAct_9fa48("14110") ? false : stryMutAct_9fa48("14109") ? true : (stryCov_9fa48("14109", "14110", "14111"), event.kind === (stryMutAct_9fa48("14112") ? "" : (stryCov_9fa48("14112"), "link/send-allow-gate")))) {
      if (stryMutAct_9fa48("14113")) {
        {}
      } else {
        stryCov_9fa48("14113");
        return stryMutAct_9fa48("14114") ? {} : (stryCov_9fa48("14114"), {
          state,
          intents: stryMutAct_9fa48("14115") ? ["Stryker was here"] : (stryCov_9fa48("14115"), []),
          actions: stryMutAct_9fa48("14116") ? [] : (stryCov_9fa48("14116"), [stryMutAct_9fa48("14117") ? {} : (stryCov_9fa48("14117"), {
            kind: canLinkSend(event.status) ? stryMutAct_9fa48("14118") ? "" : (stryCov_9fa48("14118"), "allow") : stryMutAct_9fa48("14119") ? "" : (stryCov_9fa48("14119"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14120") ? {} : (stryCov_9fa48("14120"), {
      state,
      intents: stryMutAct_9fa48("14121") ? ["Stryker was here"] : (stryCov_9fa48("14121"), []),
      actions: stryMutAct_9fa48("14122") ? ["Stryker was here"] : (stryCov_9fa48("14122"), [])
    });
  }
}
export function shouldAllowLinkSend(actions: ReadonlyArray<LinkSendAllowAction>): boolean {
  if (stryMutAct_9fa48("14123")) {
    {}
  } else {
    stryCov_9fa48("14123");
    return stryMutAct_9fa48("14124") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("14124"), actions.some(stryMutAct_9fa48("14125") ? () => undefined : (stryCov_9fa48("14125"), action => stryMutAct_9fa48("14128") ? action.kind !== "allow" : stryMutAct_9fa48("14127") ? false : stryMutAct_9fa48("14126") ? true : (stryCov_9fa48("14126", "14127", "14128"), action.kind === (stryMutAct_9fa48("14129") ? "" : (stryCov_9fa48("14129"), "allow"))))));
  }
}
export function shouldDenyLinkSend(actions: ReadonlyArray<LinkSendAllowAction>): boolean {
  if (stryMutAct_9fa48("14130")) {
    {}
  } else {
    stryCov_9fa48("14130");
    return stryMutAct_9fa48("14131") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("14131"), actions.some(stryMutAct_9fa48("14132") ? () => undefined : (stryCov_9fa48("14132"), action => stryMutAct_9fa48("14135") ? action.kind !== "deny" : stryMutAct_9fa48("14134") ? false : stryMutAct_9fa48("14133") ? true : (stryCov_9fa48("14133", "14134", "14135"), action.kind === (stryMutAct_9fa48("14136") ? "" : (stryCov_9fa48("14136"), "deny"))))));
  }
}
/** Whether an existing link may be reused for outbound send (present + ACTIVE). */
export function shouldReuseActiveLink(input: {
  readonly linkPresent: boolean;
  readonly status: LinkStatusValue;
}): boolean {
  if (stryMutAct_9fa48("14137")) {
    {}
  } else {
    stryCov_9fa48("14137");
    return stryMutAct_9fa48("14140") ? input.linkPresent || canLinkSend(input.status) : stryMutAct_9fa48("14139") ? false : stryMutAct_9fa48("14138") ? true : (stryCov_9fa48("14138", "14139", "14140"), input.linkPresent && canLinkSend(input.status));
  }
}

/**
 * shouldReuseActiveLink gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReuseActiveLink` reads beside
 * the step).
 */
export type ReuseActiveLinkState = Record<string, never>;
export type ReuseActiveLinkEvent = Event | {
  readonly kind: "link/reuse-active-gate";
  readonly linkPresent: boolean;
  readonly status: LinkStatusValue;
};
export type ReuseActiveLinkAction = {
  readonly kind: "reuse";
} | {
  readonly kind: "skip";
};
export interface ReuseActiveLinkStepResult {
  readonly state: ReuseActiveLinkState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReuseActiveLinkAction[];
}
export function initialReuseActiveLinkState(): ReuseActiveLinkState {
  if (stryMutAct_9fa48("14141")) {
    {}
  } else {
    stryCov_9fa48("14141");
    return {};
  }
}
export function stepReuseActiveLinkWithActions(state: ReuseActiveLinkState, event: ReuseActiveLinkEvent): ReuseActiveLinkStepResult {
  if (stryMutAct_9fa48("14142")) {
    {}
  } else {
    stryCov_9fa48("14142");
    if (stryMutAct_9fa48("14145") ? event.kind !== "link/reuse-active-gate" : stryMutAct_9fa48("14144") ? false : stryMutAct_9fa48("14143") ? true : (stryCov_9fa48("14143", "14144", "14145"), event.kind === (stryMutAct_9fa48("14146") ? "" : (stryCov_9fa48("14146"), "link/reuse-active-gate")))) {
      if (stryMutAct_9fa48("14147")) {
        {}
      } else {
        stryCov_9fa48("14147");
        return stryMutAct_9fa48("14148") ? {} : (stryCov_9fa48("14148"), {
          state,
          intents: stryMutAct_9fa48("14149") ? ["Stryker was here"] : (stryCov_9fa48("14149"), []),
          actions: stryMutAct_9fa48("14150") ? [] : (stryCov_9fa48("14150"), [stryMutAct_9fa48("14151") ? {} : (stryCov_9fa48("14151"), {
            kind: shouldReuseActiveLink(stryMutAct_9fa48("14152") ? {} : (stryCov_9fa48("14152"), {
              linkPresent: event.linkPresent,
              status: event.status
            })) ? stryMutAct_9fa48("14153") ? "" : (stryCov_9fa48("14153"), "reuse") : stryMutAct_9fa48("14154") ? "" : (stryCov_9fa48("14154"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14155") ? {} : (stryCov_9fa48("14155"), {
      state,
      intents: stryMutAct_9fa48("14156") ? ["Stryker was here"] : (stryCov_9fa48("14156"), []),
      actions: stryMutAct_9fa48("14157") ? ["Stryker was here"] : (stryCov_9fa48("14157"), [])
    });
  }
}
export function shouldReuseActiveLinkNow(actions: ReadonlyArray<ReuseActiveLinkAction>): boolean {
  if (stryMutAct_9fa48("14158")) {
    {}
  } else {
    stryCov_9fa48("14158");
    return stryMutAct_9fa48("14159") ? actions.every(action => action.kind === "reuse") : (stryCov_9fa48("14159"), actions.some(stryMutAct_9fa48("14160") ? () => undefined : (stryCov_9fa48("14160"), action => stryMutAct_9fa48("14163") ? action.kind !== "reuse" : stryMutAct_9fa48("14162") ? false : stryMutAct_9fa48("14161") ? true : (stryCov_9fa48("14161", "14162", "14163"), action.kind === (stryMutAct_9fa48("14164") ? "" : (stryCov_9fa48("14164"), "reuse"))))));
  }
}
export function shouldSkipReuseActiveLink(actions: ReadonlyArray<ReuseActiveLinkAction>): boolean {
  if (stryMutAct_9fa48("14165")) {
    {}
  } else {
    stryCov_9fa48("14165");
    return stryMutAct_9fa48("14166") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("14166"), actions.some(stryMutAct_9fa48("14167") ? () => undefined : (stryCov_9fa48("14167"), action => stryMutAct_9fa48("14170") ? action.kind !== "skip" : stryMutAct_9fa48("14169") ? false : stryMutAct_9fa48("14168") ? true : (stryCov_9fa48("14168", "14169", "14170"), action.kind === (stryMutAct_9fa48("14171") ? "" : (stryCov_9fa48("14171"), "skip"))))));
  }
}
/** Whether inbound link traffic should be accepted from this interface attachment. */
export function shouldAcceptLinkPacketInterface(input: {
  readonly hasAttachedInterface: boolean;
  readonly sameInterface: boolean;
}): boolean {
  if (stryMutAct_9fa48("14172")) {
    {}
  } else {
    stryCov_9fa48("14172");
    return stryMutAct_9fa48("14175") ? !input.hasAttachedInterface && input.sameInterface : stryMutAct_9fa48("14174") ? false : stryMutAct_9fa48("14173") ? true : (stryCov_9fa48("14173", "14174", "14175"), (stryMutAct_9fa48("14176") ? input.hasAttachedInterface : (stryCov_9fa48("14176"), !input.hasAttachedInterface)) || input.sameInterface);
  }
}

/**
 * shouldAcceptLinkPacketInterface gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptLinkPacketInterface` reads beside
 * the step).
 */
export type AcceptLinkPacketInterfaceState = Record<string, never>;
export type AcceptLinkPacketInterfaceEvent = Event | {
  readonly kind: "link/accept-packet-interface-gate";
  readonly hasAttachedInterface: boolean;
  readonly sameInterface: boolean;
};
export type AcceptLinkPacketInterfaceAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptLinkPacketInterfaceStepResult {
  readonly state: AcceptLinkPacketInterfaceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkPacketInterfaceAction[];
}
export function initialAcceptLinkPacketInterfaceState(): AcceptLinkPacketInterfaceState {
  if (stryMutAct_9fa48("14177")) {
    {}
  } else {
    stryCov_9fa48("14177");
    return {};
  }
}
export function stepAcceptLinkPacketInterfaceWithActions(state: AcceptLinkPacketInterfaceState, event: AcceptLinkPacketInterfaceEvent): AcceptLinkPacketInterfaceStepResult {
  if (stryMutAct_9fa48("14178")) {
    {}
  } else {
    stryCov_9fa48("14178");
    if (stryMutAct_9fa48("14181") ? event.kind !== "link/accept-packet-interface-gate" : stryMutAct_9fa48("14180") ? false : stryMutAct_9fa48("14179") ? true : (stryCov_9fa48("14179", "14180", "14181"), event.kind === (stryMutAct_9fa48("14182") ? "" : (stryCov_9fa48("14182"), "link/accept-packet-interface-gate")))) {
      if (stryMutAct_9fa48("14183")) {
        {}
      } else {
        stryCov_9fa48("14183");
        return stryMutAct_9fa48("14184") ? {} : (stryCov_9fa48("14184"), {
          state,
          intents: stryMutAct_9fa48("14185") ? ["Stryker was here"] : (stryCov_9fa48("14185"), []),
          actions: stryMutAct_9fa48("14186") ? [] : (stryCov_9fa48("14186"), [stryMutAct_9fa48("14187") ? {} : (stryCov_9fa48("14187"), {
            kind: shouldAcceptLinkPacketInterface(stryMutAct_9fa48("14188") ? {} : (stryCov_9fa48("14188"), {
              hasAttachedInterface: event.hasAttachedInterface,
              sameInterface: event.sameInterface
            })) ? stryMutAct_9fa48("14189") ? "" : (stryCov_9fa48("14189"), "accept") : stryMutAct_9fa48("14190") ? "" : (stryCov_9fa48("14190"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14191") ? {} : (stryCov_9fa48("14191"), {
      state,
      intents: stryMutAct_9fa48("14192") ? ["Stryker was here"] : (stryCov_9fa48("14192"), []),
      actions: stryMutAct_9fa48("14193") ? ["Stryker was here"] : (stryCov_9fa48("14193"), [])
    });
  }
}
export function shouldAcceptLinkPacketInterfaceNow(actions: ReadonlyArray<AcceptLinkPacketInterfaceAction>): boolean {
  if (stryMutAct_9fa48("14194")) {
    {}
  } else {
    stryCov_9fa48("14194");
    return stryMutAct_9fa48("14195") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("14195"), actions.some(stryMutAct_9fa48("14196") ? () => undefined : (stryCov_9fa48("14196"), action => stryMutAct_9fa48("14199") ? action.kind !== "accept" : stryMutAct_9fa48("14198") ? false : stryMutAct_9fa48("14197") ? true : (stryCov_9fa48("14197", "14198", "14199"), action.kind === (stryMutAct_9fa48("14200") ? "" : (stryCov_9fa48("14200"), "accept"))))));
  }
}
export function shouldSkipLinkPacketInterface(actions: ReadonlyArray<AcceptLinkPacketInterfaceAction>): boolean {
  if (stryMutAct_9fa48("14201")) {
    {}
  } else {
    stryCov_9fa48("14201");
    return stryMutAct_9fa48("14202") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("14202"), actions.some(stryMutAct_9fa48("14203") ? () => undefined : (stryCov_9fa48("14203"), action => stryMutAct_9fa48("14206") ? action.kind !== "skip" : stryMutAct_9fa48("14205") ? false : stryMutAct_9fa48("14204") ? true : (stryCov_9fa48("14204", "14205", "14206"), action.kind === (stryMutAct_9fa48("14207") ? "" : (stryCov_9fa48("14207"), "skip"))))));
  }
}
/** Whether link sendContext should encrypt the payload (default yes unless encrypt:false). */
export function shouldEncryptLinkPayload(encryptOption: boolean | undefined): boolean {
  if (stryMutAct_9fa48("14208")) {
    {}
  } else {
    stryCov_9fa48("14208");
    return stryMutAct_9fa48("14211") ? encryptOption === false : stryMutAct_9fa48("14210") ? false : stryMutAct_9fa48("14209") ? true : (stryCov_9fa48("14209", "14210", "14211"), encryptOption !== (stryMutAct_9fa48("14212") ? true : (stryCov_9fa48("14212"), false)));
  }
}

/**
 * shouldEncryptLinkPayload gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEncryptLinkPayload` reads beside
 * the step).
 */
export type EncryptLinkPayloadState = Record<string, never>;
export type EncryptLinkPayloadEvent = Event | {
  readonly kind: "link/encrypt-payload-gate";
  readonly encryptOption: boolean | undefined;
};
export type EncryptLinkPayloadAction = {
  readonly kind: "encrypt";
} | {
  readonly kind: "plaintext";
};
export interface EncryptLinkPayloadStepResult {
  readonly state: EncryptLinkPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncryptLinkPayloadAction[];
}
export function initialEncryptLinkPayloadState(): EncryptLinkPayloadState {
  if (stryMutAct_9fa48("14213")) {
    {}
  } else {
    stryCov_9fa48("14213");
    return {};
  }
}
export function stepEncryptLinkPayloadWithActions(state: EncryptLinkPayloadState, event: EncryptLinkPayloadEvent): EncryptLinkPayloadStepResult {
  if (stryMutAct_9fa48("14214")) {
    {}
  } else {
    stryCov_9fa48("14214");
    if (stryMutAct_9fa48("14217") ? event.kind !== "link/encrypt-payload-gate" : stryMutAct_9fa48("14216") ? false : stryMutAct_9fa48("14215") ? true : (stryCov_9fa48("14215", "14216", "14217"), event.kind === (stryMutAct_9fa48("14218") ? "" : (stryCov_9fa48("14218"), "link/encrypt-payload-gate")))) {
      if (stryMutAct_9fa48("14219")) {
        {}
      } else {
        stryCov_9fa48("14219");
        return stryMutAct_9fa48("14220") ? {} : (stryCov_9fa48("14220"), {
          state,
          intents: stryMutAct_9fa48("14221") ? ["Stryker was here"] : (stryCov_9fa48("14221"), []),
          actions: stryMutAct_9fa48("14222") ? [] : (stryCov_9fa48("14222"), [stryMutAct_9fa48("14223") ? {} : (stryCov_9fa48("14223"), {
            kind: shouldEncryptLinkPayload(event.encryptOption) ? stryMutAct_9fa48("14224") ? "" : (stryCov_9fa48("14224"), "encrypt") : stryMutAct_9fa48("14225") ? "" : (stryCov_9fa48("14225"), "plaintext")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14226") ? {} : (stryCov_9fa48("14226"), {
      state,
      intents: stryMutAct_9fa48("14227") ? ["Stryker was here"] : (stryCov_9fa48("14227"), []),
      actions: stryMutAct_9fa48("14228") ? ["Stryker was here"] : (stryCov_9fa48("14228"), [])
    });
  }
}
export function shouldEncryptLinkPayloadNow(actions: ReadonlyArray<EncryptLinkPayloadAction>): boolean {
  if (stryMutAct_9fa48("14229")) {
    {}
  } else {
    stryCov_9fa48("14229");
    return stryMutAct_9fa48("14230") ? actions.every(action => action.kind === "encrypt") : (stryCov_9fa48("14230"), actions.some(stryMutAct_9fa48("14231") ? () => undefined : (stryCov_9fa48("14231"), action => stryMutAct_9fa48("14234") ? action.kind !== "encrypt" : stryMutAct_9fa48("14233") ? false : stryMutAct_9fa48("14232") ? true : (stryCov_9fa48("14232", "14233", "14234"), action.kind === (stryMutAct_9fa48("14235") ? "" : (stryCov_9fa48("14235"), "encrypt"))))));
  }
}
export function shouldSendLinkPayloadPlaintext(actions: ReadonlyArray<EncryptLinkPayloadAction>): boolean {
  if (stryMutAct_9fa48("14236")) {
    {}
  } else {
    stryCov_9fa48("14236");
    return stryMutAct_9fa48("14237") ? actions.every(action => action.kind === "plaintext") : (stryCov_9fa48("14237"), actions.some(stryMutAct_9fa48("14238") ? () => undefined : (stryCov_9fa48("14238"), action => stryMutAct_9fa48("14241") ? action.kind !== "plaintext" : stryMutAct_9fa48("14240") ? false : stryMutAct_9fa48("14239") ? true : (stryCov_9fa48("14239", "14240", "14241"), action.kind === (stryMutAct_9fa48("14242") ? "" : (stryCov_9fa48("14242"), "plaintext"))))));
  }
}

/**
 * isLinkClosed gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isLinkClosed` reads beside
 * the step).
 */
export type LinkClosedState = Record<string, never>;
export type LinkClosedEvent = Event | {
  readonly kind: "link/closed-gate";
  readonly status: LinkStatusValue;
};
export type LinkClosedAction = {
  readonly kind: "closed";
} | {
  readonly kind: "open";
};
export interface LinkClosedStepResult {
  readonly state: LinkClosedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkClosedAction[];
}
export function initialLinkClosedState(): LinkClosedState {
  if (stryMutAct_9fa48("14243")) {
    {}
  } else {
    stryCov_9fa48("14243");
    return {};
  }
}
export function stepLinkClosedWithActions(state: LinkClosedState, event: LinkClosedEvent): LinkClosedStepResult {
  if (stryMutAct_9fa48("14244")) {
    {}
  } else {
    stryCov_9fa48("14244");
    if (stryMutAct_9fa48("14247") ? event.kind !== "link/closed-gate" : stryMutAct_9fa48("14246") ? false : stryMutAct_9fa48("14245") ? true : (stryCov_9fa48("14245", "14246", "14247"), event.kind === (stryMutAct_9fa48("14248") ? "" : (stryCov_9fa48("14248"), "link/closed-gate")))) {
      if (stryMutAct_9fa48("14249")) {
        {}
      } else {
        stryCov_9fa48("14249");
        return stryMutAct_9fa48("14250") ? {} : (stryCov_9fa48("14250"), {
          state,
          intents: stryMutAct_9fa48("14251") ? ["Stryker was here"] : (stryCov_9fa48("14251"), []),
          actions: stryMutAct_9fa48("14252") ? [] : (stryCov_9fa48("14252"), [stryMutAct_9fa48("14253") ? {} : (stryCov_9fa48("14253"), {
            kind: isLinkClosed(event.status) ? stryMutAct_9fa48("14254") ? "" : (stryCov_9fa48("14254"), "closed") : stryMutAct_9fa48("14255") ? "" : (stryCov_9fa48("14255"), "open")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14256") ? {} : (stryCov_9fa48("14256"), {
      state,
      intents: stryMutAct_9fa48("14257") ? ["Stryker was here"] : (stryCov_9fa48("14257"), []),
      actions: stryMutAct_9fa48("14258") ? ["Stryker was here"] : (stryCov_9fa48("14258"), [])
    });
  }
}
export function shouldTreatLinkClosed(actions: ReadonlyArray<LinkClosedAction>): boolean {
  if (stryMutAct_9fa48("14259")) {
    {}
  } else {
    stryCov_9fa48("14259");
    return stryMutAct_9fa48("14260") ? actions.every(action => action.kind === "closed") : (stryCov_9fa48("14260"), actions.some(stryMutAct_9fa48("14261") ? () => undefined : (stryCov_9fa48("14261"), action => stryMutAct_9fa48("14264") ? action.kind !== "closed" : stryMutAct_9fa48("14263") ? false : stryMutAct_9fa48("14262") ? true : (stryCov_9fa48("14262", "14263", "14264"), action.kind === (stryMutAct_9fa48("14265") ? "" : (stryCov_9fa48("14265"), "closed"))))));
  }
}
export function shouldTreatLinkOpen(actions: ReadonlyArray<LinkClosedAction>): boolean {
  if (stryMutAct_9fa48("14266")) {
    {}
  } else {
    stryCov_9fa48("14266");
    return stryMutAct_9fa48("14267") ? actions.every(action => action.kind === "open") : (stryCov_9fa48("14267"), actions.some(stryMutAct_9fa48("14268") ? () => undefined : (stryCov_9fa48("14268"), action => stryMutAct_9fa48("14271") ? action.kind !== "open" : stryMutAct_9fa48("14270") ? false : stryMutAct_9fa48("14269") ? true : (stryCov_9fa48("14269", "14270", "14271"), action.kind === (stryMutAct_9fa48("14272") ? "" : (stryCov_9fa48("14272"), "open"))))));
  }
}
export type LinkRegisterList = "pending" | "active";

/** Which transport link list should receive a newly registered link. */
export function planLinkRegisterList(initiator: boolean): LinkRegisterList {
  if (stryMutAct_9fa48("14273")) {
    {}
  } else {
    stryCov_9fa48("14273");
    return initiator ? stryMutAct_9fa48("14274") ? "" : (stryCov_9fa48("14274"), "pending") : stryMutAct_9fa48("14275") ? "" : (stryCov_9fa48("14275"), "active");
  }
}
export type LinkRegisterListPlanEvent = Event | {
  readonly kind: "link/register-list-plan-gate";
  readonly initiator: boolean;
};
export type LinkRegisterListPlanAction = {
  readonly kind: LinkRegisterList;
};

/** Extract the link register-list plan from actions; null when empty. */
export function linkRegisterListPlanFromActions(actions: ReadonlyArray<LinkRegisterListPlanAction>): LinkRegisterList | null {
  if (stryMutAct_9fa48("14276")) {
    {}
  } else {
    stryCov_9fa48("14276");
    const action = actions[0];
    return stryMutAct_9fa48("14277") ? action?.kind && null : (stryCov_9fa48("14277"), (stryMutAct_9fa48("14278") ? action.kind : (stryCov_9fa48("14278"), action?.kind)) ?? null);
  }
}
export type LinkRegisterListEvent = Event | {
  readonly kind: "link/register-list-gate";
  readonly initiator: boolean;
};
export type LinkRegisterListAction = {
  readonly kind: LinkRegisterList;
};