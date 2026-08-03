/**
 * Pure link request-receipt status codes and transitions (RNS Link.RequestReceipt).
 * Pending-request index / unregister / RESPONSE-deliver conclusions leave via
 * machine actions (no ad-hoc `indexOfPendingLinkAppRequest` /
 * `planUnregisterPendingLinkRequest` /
 * `shouldDeliverPendingLinkAppResponse` reads beside the step).
 * Unregister plan nested via {@link stepPendingLinkRequestUnregisterPlanWithActions}.
 */
// @ts-nocheck
function stryNS_9fa48() {
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
import type { Event, Intent } from "@twistedpear/effects";
import { equalByteArrays } from "./path-table.js";
export const LinkRequestReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  RECEIVING: 0x03,
  READY: 0x04
} as const;
export type LinkRequestReceiptStatusValue = (typeof LinkRequestReceiptStatus)[keyof typeof LinkRequestReceiptStatus];
export interface LinkRequestReceiptState {
  readonly status: LinkRequestReceiptStatusValue;
  readonly response: Uint8Array | null;
  readonly progress: number;
  readonly concludedAt: number | null;
}
export type LinkRequestReceiptEvent = {
  readonly kind: "request/timeout";
  readonly at: number;
} | {
  readonly kind: "request/response";
  readonly at: number;
  readonly response: Uint8Array | null;
};
export type LinkRequestReceiptAction = {
  readonly kind: "failed";
} | {
  readonly kind: "response";
};
export interface LinkRequestReceiptStepResult {
  readonly state: LinkRequestReceiptState;
  readonly actions: readonly LinkRequestReceiptAction[];
}
export function initialLinkRequestReceiptState(): LinkRequestReceiptState {
  if (stryMutAct_9fa48("16988")) {
    {}
  } else {
    stryCov_9fa48("16988");
    return stryMutAct_9fa48("16989") ? {} : (stryCov_9fa48("16989"), {
      status: LinkRequestReceiptStatus.SENT,
      response: null,
      progress: 0,
      concludedAt: null
    });
  }
}
export function stepLinkRequestReceipt(state: LinkRequestReceiptState, event: LinkRequestReceiptEvent): LinkRequestReceiptStepResult {
  if (stryMutAct_9fa48("16990")) {
    {}
  } else {
    stryCov_9fa48("16990");
    if (stryMutAct_9fa48("16993") ? event.kind !== "request/timeout" : stryMutAct_9fa48("16992") ? false : stryMutAct_9fa48("16991") ? true : (stryCov_9fa48("16991", "16992", "16993"), event.kind === (stryMutAct_9fa48("16994") ? "" : (stryCov_9fa48("16994"), "request/timeout")))) {
      if (stryMutAct_9fa48("16995")) {
        {}
      } else {
        stryCov_9fa48("16995");
        if (stryMutAct_9fa48("16998") ? state.status === LinkRequestReceiptStatus.SENT && state.status === LinkRequestReceiptStatus.DELIVERED : stryMutAct_9fa48("16997") ? false : stryMutAct_9fa48("16996") ? true : (stryCov_9fa48("16996", "16997", "16998"), (stryMutAct_9fa48("17000") ? state.status !== LinkRequestReceiptStatus.SENT : stryMutAct_9fa48("16999") ? false : (stryCov_9fa48("16999", "17000"), state.status === LinkRequestReceiptStatus.SENT)) || (stryMutAct_9fa48("17002") ? state.status !== LinkRequestReceiptStatus.DELIVERED : stryMutAct_9fa48("17001") ? false : (stryCov_9fa48("17001", "17002"), state.status === LinkRequestReceiptStatus.DELIVERED)))) {
          if (stryMutAct_9fa48("17003")) {
            {}
          } else {
            stryCov_9fa48("17003");
            return stryMutAct_9fa48("17004") ? {} : (stryCov_9fa48("17004"), {
              state: stryMutAct_9fa48("17005") ? {} : (stryCov_9fa48("17005"), {
                ...state,
                status: LinkRequestReceiptStatus.FAILED,
                concludedAt: event.at
              }),
              actions: stryMutAct_9fa48("17006") ? [] : (stryCov_9fa48("17006"), [stryMutAct_9fa48("17007") ? {} : (stryCov_9fa48("17007"), {
                kind: stryMutAct_9fa48("17008") ? "" : (stryCov_9fa48("17008"), "failed")
              })])
            });
          }
        }
        return stryMutAct_9fa48("17009") ? {} : (stryCov_9fa48("17009"), {
          state,
          actions: stryMutAct_9fa48("17010") ? ["Stryker was here"] : (stryCov_9fa48("17010"), [])
        });
      }
    }
    return stryMutAct_9fa48("17011") ? {} : (stryCov_9fa48("17011"), {
      state: stryMutAct_9fa48("17012") ? {} : (stryCov_9fa48("17012"), {
        status: LinkRequestReceiptStatus.READY,
        response: event.response,
        progress: 1,
        concludedAt: event.at
      }),
      actions: stryMutAct_9fa48("17013") ? [] : (stryCov_9fa48("17013"), [stryMutAct_9fa48("17014") ? {} : (stryCov_9fa48("17014"), {
        kind: stryMutAct_9fa48("17015") ? "" : (stryCov_9fa48("17015"), "response")
      })])
    });
  }
}

/** Index of a pending link app-request by request-id (RESPONSE dispatch). */
export function indexOfPendingLinkAppRequest(input: {
  readonly requestIds: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
}): number | null {
  if (stryMutAct_9fa48("17016")) {
    {}
  } else {
    stryCov_9fa48("17016");
    for (let index = 0; stryMutAct_9fa48("17019") ? index >= input.requestIds.length : stryMutAct_9fa48("17018") ? index <= input.requestIds.length : stryMutAct_9fa48("17017") ? false : (stryCov_9fa48("17017", "17018", "17019"), index < input.requestIds.length); stryMutAct_9fa48("17020") ? index -= 1 : (stryCov_9fa48("17020"), index += 1)) {
      if (stryMutAct_9fa48("17021")) {
        {}
      } else {
        stryCov_9fa48("17021");
        const requestId = input.requestIds[index];
        if (stryMutAct_9fa48("17024") ? requestId != null || equalByteArrays(requestId, input.target) : stryMutAct_9fa48("17023") ? false : stryMutAct_9fa48("17022") ? true : (stryCov_9fa48("17022", "17023", "17024"), (stryMutAct_9fa48("17026") ? requestId == null : stryMutAct_9fa48("17025") ? true : (stryCov_9fa48("17025", "17026"), requestId != null)) && equalByteArrays(requestId, input.target))) {
          if (stryMutAct_9fa48("17027")) {
            {}
          } else {
            stryCov_9fa48("17027");
            return index;
          }
        }
      }
    }
    return null;
  }
}

/**
 * Pending link app-request index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfPendingLinkAppRequest`
 * reads beside the step).
 */
export type IndexOfPendingLinkAppRequestState = Record<string, never>;
export type IndexOfPendingLinkAppRequestEvent = Event | {
  readonly kind: "link/pending-app-request-index-gate";
  readonly requestIds: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
};
export type IndexOfPendingLinkAppRequestAction = {
  readonly kind: "use-index";
  readonly index: number;
} | {
  readonly kind: "miss";
};
export interface IndexOfPendingLinkAppRequestStepResult {
  readonly state: IndexOfPendingLinkAppRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IndexOfPendingLinkAppRequestAction[];
}
export function initialIndexOfPendingLinkAppRequestState(): IndexOfPendingLinkAppRequestState {
  if (stryMutAct_9fa48("17028")) {
    {}
  } else {
    stryCov_9fa48("17028");
    return {};
  }
}
export function stepIndexOfPendingLinkAppRequestWithActions(state: IndexOfPendingLinkAppRequestState, event: IndexOfPendingLinkAppRequestEvent): IndexOfPendingLinkAppRequestStepResult {
  if (stryMutAct_9fa48("17029")) {
    {}
  } else {
    stryCov_9fa48("17029");
    if (stryMutAct_9fa48("17032") ? event.kind !== "link/pending-app-request-index-gate" : stryMutAct_9fa48("17031") ? false : stryMutAct_9fa48("17030") ? true : (stryCov_9fa48("17030", "17031", "17032"), event.kind === (stryMutAct_9fa48("17033") ? "" : (stryCov_9fa48("17033"), "link/pending-app-request-index-gate")))) {
      if (stryMutAct_9fa48("17034")) {
        {}
      } else {
        stryCov_9fa48("17034");
        const index = indexOfPendingLinkAppRequest(stryMutAct_9fa48("17035") ? {} : (stryCov_9fa48("17035"), {
          requestIds: event.requestIds,
          target: event.target
        }));
        return stryMutAct_9fa48("17036") ? {} : (stryCov_9fa48("17036"), {
          state,
          intents: stryMutAct_9fa48("17037") ? ["Stryker was here"] : (stryCov_9fa48("17037"), []),
          actions: (stryMutAct_9fa48("17040") ? index !== null : stryMutAct_9fa48("17039") ? false : stryMutAct_9fa48("17038") ? true : (stryCov_9fa48("17038", "17039", "17040"), index === null)) ? stryMutAct_9fa48("17041") ? [] : (stryCov_9fa48("17041"), [stryMutAct_9fa48("17042") ? {} : (stryCov_9fa48("17042"), {
            kind: stryMutAct_9fa48("17043") ? "" : (stryCov_9fa48("17043"), "miss")
          })]) : stryMutAct_9fa48("17044") ? [] : (stryCov_9fa48("17044"), [stryMutAct_9fa48("17045") ? {} : (stryCov_9fa48("17045"), {
            kind: stryMutAct_9fa48("17046") ? "" : (stryCov_9fa48("17046"), "use-index"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("17047") ? {} : (stryCov_9fa48("17047"), {
      state,
      intents: stryMutAct_9fa48("17048") ? ["Stryker was here"] : (stryCov_9fa48("17048"), []),
      actions: stryMutAct_9fa48("17049") ? ["Stryker was here"] : (stryCov_9fa48("17049"), [])
    });
  }
}
export function shouldUsePendingLinkAppRequestIndex(actions: ReadonlyArray<IndexOfPendingLinkAppRequestAction>): boolean {
  if (stryMutAct_9fa48("17050")) {
    {}
  } else {
    stryCov_9fa48("17050");
    return stryMutAct_9fa48("17051") ? actions.every(action => action.kind === "use-index") : (stryCov_9fa48("17051"), actions.some(stryMutAct_9fa48("17052") ? () => undefined : (stryCov_9fa48("17052"), action => stryMutAct_9fa48("17055") ? action.kind !== "use-index" : stryMutAct_9fa48("17054") ? false : stryMutAct_9fa48("17053") ? true : (stryCov_9fa48("17053", "17054", "17055"), action.kind === (stryMutAct_9fa48("17056") ? "" : (stryCov_9fa48("17056"), "use-index"))))));
  }
}
export function shouldMissPendingLinkAppRequestIndex(actions: ReadonlyArray<IndexOfPendingLinkAppRequestAction>): boolean {
  if (stryMutAct_9fa48("17057")) {
    {}
  } else {
    stryCov_9fa48("17057");
    return stryMutAct_9fa48("17058") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("17058"), actions.some(stryMutAct_9fa48("17059") ? () => undefined : (stryCov_9fa48("17059"), action => stryMutAct_9fa48("17062") ? action.kind !== "miss" : stryMutAct_9fa48("17061") ? false : stryMutAct_9fa48("17060") ? true : (stryCov_9fa48("17060", "17061", "17062"), action.kind === (stryMutAct_9fa48("17063") ? "" : (stryCov_9fa48("17063"), "miss"))))));
  }
}

/** Extract pending app-request index from step actions; null when no `use-index`. */
export function pendingLinkAppRequestIndexFromActions(actions: ReadonlyArray<IndexOfPendingLinkAppRequestAction>): number | null {
  if (stryMutAct_9fa48("17064")) {
    {}
  } else {
    stryCov_9fa48("17064");
    const action = actions.find(stryMutAct_9fa48("17065") ? () => undefined : (stryCov_9fa48("17065"), entry => stryMutAct_9fa48("17068") ? entry.kind !== "use-index" : stryMutAct_9fa48("17067") ? false : stryMutAct_9fa48("17066") ? true : (stryCov_9fa48("17066", "17067", "17068"), entry.kind === (stryMutAct_9fa48("17069") ? "" : (stryCov_9fa48("17069"), "use-index")))));
    return (stryMutAct_9fa48("17072") ? action?.kind !== "use-index" : stryMutAct_9fa48("17071") ? false : stryMutAct_9fa48("17070") ? true : (stryCov_9fa48("17070", "17071", "17072"), (stryMutAct_9fa48("17073") ? action.kind : (stryCov_9fa48("17073"), action?.kind)) === (stryMutAct_9fa48("17074") ? "" : (stryCov_9fa48("17074"), "use-index")))) ? action.index : null;
  }
}

/** Whether RESPONSE dispatch may deliver after {@link indexOfPendingLinkAppRequest}. */
export function shouldDeliverPendingLinkAppResponse(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("17075")) {
    {}
  } else {
    stryCov_9fa48("17075");
    return indexPresent;
  }
}

/**
 * Pending link-app RESPONSE deliver gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldDeliverPendingLinkAppResponse` reads beside the step).
 */
export type DeliverPendingLinkAppResponseState = Record<string, never>;
export type DeliverPendingLinkAppResponseEvent = Event | {
  readonly kind: "link/pending-app-response-deliver-gate";
  readonly indexPresent: boolean;
};
export type DeliverPendingLinkAppResponseAction = {
  readonly kind: "deliver";
} | {
  readonly kind: "skip";
};
export interface DeliverPendingLinkAppResponseStepResult {
  readonly state: DeliverPendingLinkAppResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeliverPendingLinkAppResponseAction[];
}
export function initialDeliverPendingLinkAppResponseState(): DeliverPendingLinkAppResponseState {
  if (stryMutAct_9fa48("17076")) {
    {}
  } else {
    stryCov_9fa48("17076");
    return {};
  }
}
export function stepDeliverPendingLinkAppResponseWithActions(state: DeliverPendingLinkAppResponseState, event: DeliverPendingLinkAppResponseEvent): DeliverPendingLinkAppResponseStepResult {
  if (stryMutAct_9fa48("17077")) {
    {}
  } else {
    stryCov_9fa48("17077");
    if (stryMutAct_9fa48("17080") ? event.kind !== "link/pending-app-response-deliver-gate" : stryMutAct_9fa48("17079") ? false : stryMutAct_9fa48("17078") ? true : (stryCov_9fa48("17078", "17079", "17080"), event.kind === (stryMutAct_9fa48("17081") ? "" : (stryCov_9fa48("17081"), "link/pending-app-response-deliver-gate")))) {
      if (stryMutAct_9fa48("17082")) {
        {}
      } else {
        stryCov_9fa48("17082");
        return stryMutAct_9fa48("17083") ? {} : (stryCov_9fa48("17083"), {
          state,
          intents: stryMutAct_9fa48("17084") ? ["Stryker was here"] : (stryCov_9fa48("17084"), []),
          actions: stryMutAct_9fa48("17085") ? [] : (stryCov_9fa48("17085"), [stryMutAct_9fa48("17086") ? {} : (stryCov_9fa48("17086"), {
            kind: shouldDeliverPendingLinkAppResponse(event.indexPresent) ? stryMutAct_9fa48("17087") ? "" : (stryCov_9fa48("17087"), "deliver") : stryMutAct_9fa48("17088") ? "" : (stryCov_9fa48("17088"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("17089") ? {} : (stryCov_9fa48("17089"), {
      state,
      intents: stryMutAct_9fa48("17090") ? ["Stryker was here"] : (stryCov_9fa48("17090"), []),
      actions: stryMutAct_9fa48("17091") ? ["Stryker was here"] : (stryCov_9fa48("17091"), [])
    });
  }
}
export function shouldDeliverPendingLinkAppResponseNow(actions: ReadonlyArray<DeliverPendingLinkAppResponseAction>): boolean {
  if (stryMutAct_9fa48("17092")) {
    {}
  } else {
    stryCov_9fa48("17092");
    return stryMutAct_9fa48("17093") ? actions.every(action => action.kind === "deliver") : (stryCov_9fa48("17093"), actions.some(stryMutAct_9fa48("17094") ? () => undefined : (stryCov_9fa48("17094"), action => stryMutAct_9fa48("17097") ? action.kind !== "deliver" : stryMutAct_9fa48("17096") ? false : stryMutAct_9fa48("17095") ? true : (stryCov_9fa48("17095", "17096", "17097"), action.kind === (stryMutAct_9fa48("17098") ? "" : (stryCov_9fa48("17098"), "deliver"))))));
  }
}
export function shouldSkipPendingLinkAppResponseDeliver(actions: ReadonlyArray<DeliverPendingLinkAppResponseAction>): boolean {
  if (stryMutAct_9fa48("17099")) {
    {}
  } else {
    stryCov_9fa48("17099");
    return stryMutAct_9fa48("17100") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("17100"), actions.some(stryMutAct_9fa48("17101") ? () => undefined : (stryCov_9fa48("17101"), action => stryMutAct_9fa48("17104") ? action.kind !== "skip" : stryMutAct_9fa48("17103") ? false : stryMutAct_9fa48("17102") ? true : (stryCov_9fa48("17102", "17103", "17104"), action.kind === (stryMutAct_9fa48("17105") ? "" : (stryCov_9fa48("17105"), "skip"))))));
  }
}

/** Whether a pending link-request receipt list should receive a new member. */
export function shouldRegisterPendingLinkRequest(alreadyPresent: boolean): boolean {
  if (stryMutAct_9fa48("17106")) {
    {}
  } else {
    stryCov_9fa48("17106");
    return stryMutAct_9fa48("17107") ? alreadyPresent : (stryCov_9fa48("17107"), !alreadyPresent);
  }
}

/**
 * Pending link-request register gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterPendingLinkRequest` reads beside the step).
 */
export type PendingLinkRequestRegisterState = Record<string, never>;
export type PendingLinkRequestRegisterEvent = Event | {
  readonly kind: "link/pending-request-register-gate";
  readonly alreadyPresent: boolean;
};
export type PendingLinkRequestRegisterAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export interface PendingLinkRequestRegisterStepResult {
  readonly state: PendingLinkRequestRegisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PendingLinkRequestRegisterAction[];
}
export function initialPendingLinkRequestRegisterState(): PendingLinkRequestRegisterState {
  if (stryMutAct_9fa48("17108")) {
    {}
  } else {
    stryCov_9fa48("17108");
    return {};
  }
}
export function stepPendingLinkRequestRegisterWithActions(state: PendingLinkRequestRegisterState, event: PendingLinkRequestRegisterEvent): PendingLinkRequestRegisterStepResult {
  if (stryMutAct_9fa48("17109")) {
    {}
  } else {
    stryCov_9fa48("17109");
    if (stryMutAct_9fa48("17112") ? event.kind !== "link/pending-request-register-gate" : stryMutAct_9fa48("17111") ? false : stryMutAct_9fa48("17110") ? true : (stryCov_9fa48("17110", "17111", "17112"), event.kind === (stryMutAct_9fa48("17113") ? "" : (stryCov_9fa48("17113"), "link/pending-request-register-gate")))) {
      if (stryMutAct_9fa48("17114")) {
        {}
      } else {
        stryCov_9fa48("17114");
        return stryMutAct_9fa48("17115") ? {} : (stryCov_9fa48("17115"), {
          state,
          intents: stryMutAct_9fa48("17116") ? ["Stryker was here"] : (stryCov_9fa48("17116"), []),
          actions: stryMutAct_9fa48("17117") ? [] : (stryCov_9fa48("17117"), [stryMutAct_9fa48("17118") ? {} : (stryCov_9fa48("17118"), {
            kind: shouldRegisterPendingLinkRequest(event.alreadyPresent) ? stryMutAct_9fa48("17119") ? "" : (stryCov_9fa48("17119"), "register") : stryMutAct_9fa48("17120") ? "" : (stryCov_9fa48("17120"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("17121") ? {} : (stryCov_9fa48("17121"), {
      state,
      intents: stryMutAct_9fa48("17122") ? ["Stryker was here"] : (stryCov_9fa48("17122"), []),
      actions: stryMutAct_9fa48("17123") ? ["Stryker was here"] : (stryCov_9fa48("17123"), [])
    });
  }
}
export function shouldRegisterPendingLinkRequestNow(actions: ReadonlyArray<PendingLinkRequestRegisterAction>): boolean {
  if (stryMutAct_9fa48("17124")) {
    {}
  } else {
    stryCov_9fa48("17124");
    return stryMutAct_9fa48("17125") ? actions.every(action => action.kind === "register") : (stryCov_9fa48("17125"), actions.some(stryMutAct_9fa48("17126") ? () => undefined : (stryCov_9fa48("17126"), action => stryMutAct_9fa48("17129") ? action.kind !== "register" : stryMutAct_9fa48("17128") ? false : stryMutAct_9fa48("17127") ? true : (stryCov_9fa48("17127", "17128", "17129"), action.kind === (stryMutAct_9fa48("17130") ? "" : (stryCov_9fa48("17130"), "register"))))));
  }
}
export function shouldSkipPendingLinkRequestRegister(actions: ReadonlyArray<PendingLinkRequestRegisterAction>): boolean {
  if (stryMutAct_9fa48("17131")) {
    {}
  } else {
    stryCov_9fa48("17131");
    return stryMutAct_9fa48("17132") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("17132"), actions.some(stryMutAct_9fa48("17133") ? () => undefined : (stryCov_9fa48("17133"), action => stryMutAct_9fa48("17136") ? action.kind !== "skip" : stryMutAct_9fa48("17135") ? false : stryMutAct_9fa48("17134") ? true : (stryCov_9fa48("17134", "17135", "17136"), action.kind === (stryMutAct_9fa48("17137") ? "" : (stryCov_9fa48("17137"), "skip"))))));
  }
}

/** Whether construction should attach an outbound packet receipt to the request receipt. */
export function shouldAttachLinkRequestPacketReceipt(packetReceiptPresent: boolean): boolean {
  if (stryMutAct_9fa48("17138")) {
    {}
  } else {
    stryCov_9fa48("17138");
    return packetReceiptPresent;
  }
}

/**
 * Link-request packet-receipt attach gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldAttachLinkRequestPacketReceipt` reads beside the step).
 */
export type AttachLinkRequestPacketReceiptState = Record<string, never>;
export type AttachLinkRequestPacketReceiptEvent = Event | {
  readonly kind: "link/attach-request-packet-receipt-gate";
  readonly packetReceiptPresent: boolean;
};
export type AttachLinkRequestPacketReceiptAction = {
  readonly kind: "attach";
} | {
  readonly kind: "skip";
};
export interface AttachLinkRequestPacketReceiptStepResult {
  readonly state: AttachLinkRequestPacketReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttachLinkRequestPacketReceiptAction[];
}
export function initialAttachLinkRequestPacketReceiptState(): AttachLinkRequestPacketReceiptState {
  if (stryMutAct_9fa48("17139")) {
    {}
  } else {
    stryCov_9fa48("17139");
    return {};
  }
}
export function stepAttachLinkRequestPacketReceiptWithActions(state: AttachLinkRequestPacketReceiptState, event: AttachLinkRequestPacketReceiptEvent): AttachLinkRequestPacketReceiptStepResult {
  if (stryMutAct_9fa48("17140")) {
    {}
  } else {
    stryCov_9fa48("17140");
    if (stryMutAct_9fa48("17143") ? event.kind !== "link/attach-request-packet-receipt-gate" : stryMutAct_9fa48("17142") ? false : stryMutAct_9fa48("17141") ? true : (stryCov_9fa48("17141", "17142", "17143"), event.kind === (stryMutAct_9fa48("17144") ? "" : (stryCov_9fa48("17144"), "link/attach-request-packet-receipt-gate")))) {
      if (stryMutAct_9fa48("17145")) {
        {}
      } else {
        stryCov_9fa48("17145");
        return stryMutAct_9fa48("17146") ? {} : (stryCov_9fa48("17146"), {
          state,
          intents: stryMutAct_9fa48("17147") ? ["Stryker was here"] : (stryCov_9fa48("17147"), []),
          actions: stryMutAct_9fa48("17148") ? [] : (stryCov_9fa48("17148"), [stryMutAct_9fa48("17149") ? {} : (stryCov_9fa48("17149"), {
            kind: shouldAttachLinkRequestPacketReceipt(event.packetReceiptPresent) ? stryMutAct_9fa48("17150") ? "" : (stryCov_9fa48("17150"), "attach") : stryMutAct_9fa48("17151") ? "" : (stryCov_9fa48("17151"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("17152") ? {} : (stryCov_9fa48("17152"), {
      state,
      intents: stryMutAct_9fa48("17153") ? ["Stryker was here"] : (stryCov_9fa48("17153"), []),
      actions: stryMutAct_9fa48("17154") ? ["Stryker was here"] : (stryCov_9fa48("17154"), [])
    });
  }
}
export function shouldAttachLinkRequestPacketReceiptNow(actions: ReadonlyArray<AttachLinkRequestPacketReceiptAction>): boolean {
  if (stryMutAct_9fa48("17155")) {
    {}
  } else {
    stryCov_9fa48("17155");
    return stryMutAct_9fa48("17156") ? actions.every(action => action.kind === "attach") : (stryCov_9fa48("17156"), actions.some(stryMutAct_9fa48("17157") ? () => undefined : (stryCov_9fa48("17157"), action => stryMutAct_9fa48("17160") ? action.kind !== "attach" : stryMutAct_9fa48("17159") ? false : stryMutAct_9fa48("17158") ? true : (stryCov_9fa48("17158", "17159", "17160"), action.kind === (stryMutAct_9fa48("17161") ? "" : (stryCov_9fa48("17161"), "attach"))))));
  }
}
export function shouldSkipLinkRequestPacketReceiptAttach(actions: ReadonlyArray<AttachLinkRequestPacketReceiptAction>): boolean {
  if (stryMutAct_9fa48("17162")) {
    {}
  } else {
    stryCov_9fa48("17162");
    return stryMutAct_9fa48("17163") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("17163"), actions.some(stryMutAct_9fa48("17164") ? () => undefined : (stryCov_9fa48("17164"), action => stryMutAct_9fa48("17167") ? action.kind !== "skip" : stryMutAct_9fa48("17166") ? false : stryMutAct_9fa48("17165") ? true : (stryCov_9fa48("17165", "17166", "17167"), action.kind === (stryMutAct_9fa48("17168") ? "" : (stryCov_9fa48("17168"), "skip"))))));
  }
}

/**
 * Unregister a pending link-request receipt: splice index or skip when absent.
 * Splice stays at the adapter.
 */
export function planUnregisterPendingLinkRequest(index: number): number | null {
  if (stryMutAct_9fa48("17169")) {
    {}
  } else {
    stryCov_9fa48("17169");
    return (stryMutAct_9fa48("17173") ? index < 0 : stryMutAct_9fa48("17172") ? index > 0 : stryMutAct_9fa48("17171") ? false : stryMutAct_9fa48("17170") ? true : (stryCov_9fa48("17170", "17171", "17172", "17173"), index >= 0)) ? index : null;
  }
}

/** Whether unregister may splice after {@link planUnregisterPendingLinkRequest}. */
export function shouldUnregisterPendingLinkRequest(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("17174")) {
    {}
  } else {
    stryCov_9fa48("17174");
    return indexPresent;
  }
}

/**
 * Pending link-request unregister plan leaf is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPendingLinkRequest` reads beside the step). Nested under
 * {@link stepPendingLinkRequestUnregisterWithActions}.
 */
export type PendingLinkRequestUnregisterPlanState = Record<string, never>;
export type PendingLinkRequestUnregisterPlanEvent = Event | {
  readonly kind: "link/pending-request-unregister-plan-gate";
  readonly index: number;
};
export type PendingLinkRequestUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};
export interface PendingLinkRequestUnregisterPlanStepResult {
  readonly state: PendingLinkRequestUnregisterPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PendingLinkRequestUnregisterPlanAction[];
}
export function initialPendingLinkRequestUnregisterPlanState(): PendingLinkRequestUnregisterPlanState {
  if (stryMutAct_9fa48("17175")) {
    {}
  } else {
    stryCov_9fa48("17175");
    return {};
  }
}
export function stepPendingLinkRequestUnregisterPlanWithActions(state: PendingLinkRequestUnregisterPlanState, event: PendingLinkRequestUnregisterPlanEvent): PendingLinkRequestUnregisterPlanStepResult {
  if (stryMutAct_9fa48("17176")) {
    {}
  } else {
    stryCov_9fa48("17176");
    if (stryMutAct_9fa48("17179") ? event.kind !== "link/pending-request-unregister-plan-gate" : stryMutAct_9fa48("17178") ? false : stryMutAct_9fa48("17177") ? true : (stryCov_9fa48("17177", "17178", "17179"), event.kind === (stryMutAct_9fa48("17180") ? "" : (stryCov_9fa48("17180"), "link/pending-request-unregister-plan-gate")))) {
      if (stryMutAct_9fa48("17181")) {
        {}
      } else {
        stryCov_9fa48("17181");
        const index = planUnregisterPendingLinkRequest(event.index);
        return stryMutAct_9fa48("17182") ? {} : (stryCov_9fa48("17182"), {
          state,
          intents: stryMutAct_9fa48("17183") ? ["Stryker was here"] : (stryCov_9fa48("17183"), []),
          actions: (stryMutAct_9fa48("17186") ? index !== null : stryMutAct_9fa48("17185") ? false : stryMutAct_9fa48("17184") ? true : (stryCov_9fa48("17184", "17185", "17186"), index === null)) ? stryMutAct_9fa48("17187") ? ["Stryker was here"] : (stryCov_9fa48("17187"), []) : stryMutAct_9fa48("17188") ? [] : (stryCov_9fa48("17188"), [stryMutAct_9fa48("17189") ? {} : (stryCov_9fa48("17189"), {
            kind: stryMutAct_9fa48("17190") ? "" : (stryCov_9fa48("17190"), "remove"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("17191") ? {} : (stryCov_9fa48("17191"), {
      state,
      intents: stryMutAct_9fa48("17192") ? ["Stryker was here"] : (stryCov_9fa48("17192"), []),
      actions: stryMutAct_9fa48("17193") ? ["Stryker was here"] : (stryCov_9fa48("17193"), [])
    });
  }
}
export function pendingLinkRequestUnregisterPlanIndex(actions: ReadonlyArray<PendingLinkRequestUnregisterPlanAction>): number | null {
  if (stryMutAct_9fa48("17194")) {
    {}
  } else {
    stryCov_9fa48("17194");
    const action = actions.find(stryMutAct_9fa48("17195") ? () => undefined : (stryCov_9fa48("17195"), entry => stryMutAct_9fa48("17198") ? entry.kind !== "remove" : stryMutAct_9fa48("17197") ? false : stryMutAct_9fa48("17196") ? true : (stryCov_9fa48("17196", "17197", "17198"), entry.kind === (stryMutAct_9fa48("17199") ? "" : (stryCov_9fa48("17199"), "remove")))));
    return (stryMutAct_9fa48("17202") ? action?.kind !== "remove" : stryMutAct_9fa48("17201") ? false : stryMutAct_9fa48("17200") ? true : (stryCov_9fa48("17200", "17201", "17202"), (stryMutAct_9fa48("17203") ? action.kind : (stryCov_9fa48("17203"), action?.kind)) === (stryMutAct_9fa48("17204") ? "" : (stryCov_9fa48("17204"), "remove")))) ? action.index : null;
  }
}
export function shouldRemovePendingLinkRequestUnregisterPlan(actions: ReadonlyArray<PendingLinkRequestUnregisterPlanAction>): boolean {
  if (stryMutAct_9fa48("17205")) {
    {}
  } else {
    stryCov_9fa48("17205");
    return stryMutAct_9fa48("17206") ? actions.every(action => action.kind === "remove") : (stryCov_9fa48("17206"), actions.some(stryMutAct_9fa48("17207") ? () => undefined : (stryCov_9fa48("17207"), action => stryMutAct_9fa48("17210") ? action.kind !== "remove" : stryMutAct_9fa48("17209") ? false : stryMutAct_9fa48("17208") ? true : (stryCov_9fa48("17208", "17209", "17210"), action.kind === (stryMutAct_9fa48("17211") ? "" : (stryCov_9fa48("17211"), "remove"))))));
  }
}

/**
 * Pending link-request unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPendingLinkRequest` reads beside the step).
 * Plan nested via {@link stepPendingLinkRequestUnregisterPlanWithActions}
 * (`remove`).
 */
export type PendingLinkRequestUnregisterState = Record<string, never>;
export type PendingLinkRequestUnregisterEvent = Event | {
  readonly kind: "link/pending-request-unregister-gate";
  readonly index: number;
};
export type PendingLinkRequestUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};
export interface PendingLinkRequestUnregisterStepResult {
  readonly state: PendingLinkRequestUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PendingLinkRequestUnregisterAction[];
}
export function initialPendingLinkRequestUnregisterState(): PendingLinkRequestUnregisterState {
  if (stryMutAct_9fa48("17212")) {
    {}
  } else {
    stryCov_9fa48("17212");
    return {};
  }
}
export function stepPendingLinkRequestUnregisterWithActions(state: PendingLinkRequestUnregisterState, event: PendingLinkRequestUnregisterEvent): PendingLinkRequestUnregisterStepResult {
  if (stryMutAct_9fa48("17213")) {
    {}
  } else {
    stryCov_9fa48("17213");
    if (stryMutAct_9fa48("17216") ? event.kind !== "link/pending-request-unregister-gate" : stryMutAct_9fa48("17215") ? false : stryMutAct_9fa48("17214") ? true : (stryCov_9fa48("17214", "17215", "17216"), event.kind === (stryMutAct_9fa48("17217") ? "" : (stryCov_9fa48("17217"), "link/pending-request-unregister-gate")))) {
      if (stryMutAct_9fa48("17218")) {
        {}
      } else {
        stryCov_9fa48("17218");
        const planActions = stepPendingLinkRequestUnregisterPlanWithActions(initialPendingLinkRequestUnregisterPlanState(), stryMutAct_9fa48("17219") ? {} : (stryCov_9fa48("17219"), {
          kind: stryMutAct_9fa48("17220") ? "" : (stryCov_9fa48("17220"), "link/pending-request-unregister-plan-gate"),
          index: event.index
        })).actions;
        const index = pendingLinkRequestUnregisterPlanIndex(planActions);
        return stryMutAct_9fa48("17221") ? {} : (stryCov_9fa48("17221"), {
          state,
          intents: stryMutAct_9fa48("17222") ? ["Stryker was here"] : (stryCov_9fa48("17222"), []),
          actions: (stryMutAct_9fa48("17225") ? index !== null : stryMutAct_9fa48("17224") ? false : stryMutAct_9fa48("17223") ? true : (stryCov_9fa48("17223", "17224", "17225"), index === null)) ? stryMutAct_9fa48("17226") ? ["Stryker was here"] : (stryCov_9fa48("17226"), []) : stryMutAct_9fa48("17227") ? [] : (stryCov_9fa48("17227"), [stryMutAct_9fa48("17228") ? {} : (stryCov_9fa48("17228"), {
            kind: stryMutAct_9fa48("17229") ? "" : (stryCov_9fa48("17229"), "remove"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("17230") ? {} : (stryCov_9fa48("17230"), {
      state,
      intents: stryMutAct_9fa48("17231") ? ["Stryker was here"] : (stryCov_9fa48("17231"), []),
      actions: stryMutAct_9fa48("17232") ? ["Stryker was here"] : (stryCov_9fa48("17232"), [])
    });
  }
}
export function pendingLinkRequestUnregisterIndex(actions: ReadonlyArray<PendingLinkRequestUnregisterAction>): number | null {
  if (stryMutAct_9fa48("17233")) {
    {}
  } else {
    stryCov_9fa48("17233");
    const action = actions.find(stryMutAct_9fa48("17234") ? () => undefined : (stryCov_9fa48("17234"), entry => stryMutAct_9fa48("17237") ? entry.kind !== "remove" : stryMutAct_9fa48("17236") ? false : stryMutAct_9fa48("17235") ? true : (stryCov_9fa48("17235", "17236", "17237"), entry.kind === (stryMutAct_9fa48("17238") ? "" : (stryCov_9fa48("17238"), "remove")))));
    return (stryMutAct_9fa48("17241") ? action?.kind !== "remove" : stryMutAct_9fa48("17240") ? false : stryMutAct_9fa48("17239") ? true : (stryCov_9fa48("17239", "17240", "17241"), (stryMutAct_9fa48("17242") ? action.kind : (stryCov_9fa48("17242"), action?.kind)) === (stryMutAct_9fa48("17243") ? "" : (stryCov_9fa48("17243"), "remove")))) ? action.index : null;
  }
}
export function shouldRemovePendingLinkRequest(actions: ReadonlyArray<PendingLinkRequestUnregisterAction>): boolean {
  if (stryMutAct_9fa48("17244")) {
    {}
  } else {
    stryCov_9fa48("17244");
    return stryMutAct_9fa48("17245") ? actions.every(action => action.kind === "remove") : (stryCov_9fa48("17245"), actions.some(stryMutAct_9fa48("17246") ? () => undefined : (stryCov_9fa48("17246"), action => stryMutAct_9fa48("17249") ? action.kind !== "remove" : stryMutAct_9fa48("17248") ? false : stryMutAct_9fa48("17247") ? true : (stryCov_9fa48("17247", "17248", "17249"), action.kind === (stryMutAct_9fa48("17250") ? "" : (stryCov_9fa48("17250"), "remove"))))));
  }
}

/** Whether step actions include a failed/response fanout for the adapter callback. */
export function shouldInvokeLinkRequestReceiptAction(actions: ReadonlyArray<LinkRequestReceiptAction>, kind: LinkRequestReceiptAction["kind"]): boolean {
  if (stryMutAct_9fa48("17251")) {
    {}
  } else {
    stryCov_9fa48("17251");
    return stryMutAct_9fa48("17252") ? actions.every(action => action.kind === kind) : (stryCov_9fa48("17252"), actions.some(stryMutAct_9fa48("17253") ? () => undefined : (stryCov_9fa48("17253"), action => stryMutAct_9fa48("17256") ? action.kind !== kind : stryMutAct_9fa48("17255") ? false : stryMutAct_9fa48("17254") ? true : (stryCov_9fa48("17254", "17255", "17256"), action.kind === kind))));
  }
}