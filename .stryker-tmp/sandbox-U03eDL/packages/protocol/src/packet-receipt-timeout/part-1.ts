/** Extracted from packet-receipt-timeout.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure packet-receipt timeout conclusion.
 * Adapters schedule/cancel clocks from timer intents and invoke
 * delivery/timeout callbacks only via machine actions (no ad-hoc
 * `state.timedOut` reads beside the step).
 * Register / keep / fail-and-drop gates conclude via machine actions (no
 * ad-hoc `shouldRegisterPacketReceipt` / `shouldKeepOutboundReceipt` /
 * `shouldFailAndDropOutboundReceipt` reads beside the step).
 * Outbound-receipt / packet-receipt-proof-ingress / packet-receipt-callback /
 * packet-receipt-unregister plans nested via
 * {@link stepOutboundReceiptPlanWithActions} /
 * {@link stepPacketReceiptProofIngressPlanWithActions} /
 * {@link stepPacketReceiptCallbackPlanWithActions} /
 * {@link stepPacketReceiptUnregisterPlanWithActions}.
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
export const RECEIPT_TIMEOUT_TIMER_ID = stryMutAct_9fa48("23832") ? "" : (stryCov_9fa48("23832"), "receipt-timeout");
export const PacketReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  CULLED: 0xff
} as const;
export type PacketReceiptStatusValue = (typeof PacketReceiptStatus)[keyof typeof PacketReceiptStatus];
export interface PacketReceiptTimeoutState {
  readonly status: PacketReceiptStatusValue;
  readonly timeoutAt: number | null;
  readonly concludedAt: number | null;
  readonly timedOut: boolean;
}
export type PacketReceiptTimeoutEvent = Event | {
  readonly kind: "receipt/arm";
  readonly at: number;
  readonly timeoutSeconds: number;
} | {
  readonly kind: "receipt/delivered";
  readonly at: number;
} | {
  readonly kind: "receipt/failed";
  readonly at: number;
} | {
  readonly kind: "receipt/check";
  readonly at: number;
};
export type PacketReceiptTimeoutAction = {
  readonly kind: "timeout";
} | {
  readonly kind: "delivered";
} | {
  readonly kind: "failed";
};
export interface PacketReceiptTimeoutStepResult {
  readonly state: PacketReceiptTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptTimeoutAction[];
}
export function initialPacketReceiptTimeoutState(): PacketReceiptTimeoutState {
  if (stryMutAct_9fa48("23833")) {
    {}
  } else {
    stryCov_9fa48("23833");
    return stryMutAct_9fa48("23834") ? {} : (stryCov_9fa48("23834"), {
      status: PacketReceiptStatus.SENT,
      timeoutAt: null,
      concludedAt: null,
      timedOut: stryMutAct_9fa48("23835") ? true : (stryCov_9fa48("23835"), false)
    });
  }
}
export function checkPacketReceiptTimeout(input: {
  readonly status: PacketReceiptStatusValue;
  readonly timeoutAt: number | null;
  readonly nowSeconds: number;
}): {
  readonly timedOut: boolean;
  readonly status: PacketReceiptStatusValue;
  readonly concludedAt: number | null;
} {
  if (stryMutAct_9fa48("23836")) {
    {}
  } else {
    stryCov_9fa48("23836");
    if (stryMutAct_9fa48("23839") ? input.status === PacketReceiptStatus.DELIVERED && input.status === PacketReceiptStatus.FAILED : stryMutAct_9fa48("23838") ? false : stryMutAct_9fa48("23837") ? true : (stryCov_9fa48("23837", "23838", "23839"), (stryMutAct_9fa48("23841") ? input.status !== PacketReceiptStatus.DELIVERED : stryMutAct_9fa48("23840") ? false : (stryCov_9fa48("23840", "23841"), input.status === PacketReceiptStatus.DELIVERED)) || (stryMutAct_9fa48("23843") ? input.status !== PacketReceiptStatus.FAILED : stryMutAct_9fa48("23842") ? false : (stryCov_9fa48("23842", "23843"), input.status === PacketReceiptStatus.FAILED)))) {
      if (stryMutAct_9fa48("23844")) {
        {}
      } else {
        stryCov_9fa48("23844");
        return stryMutAct_9fa48("23845") ? {} : (stryCov_9fa48("23845"), {
          timedOut: stryMutAct_9fa48("23846") ? true : (stryCov_9fa48("23846"), false),
          status: input.status,
          concludedAt: null
        });
      }
    }
    if (stryMutAct_9fa48("23849") ? input.timeoutAt !== null || input.nowSeconds >= input.timeoutAt : stryMutAct_9fa48("23848") ? false : stryMutAct_9fa48("23847") ? true : (stryCov_9fa48("23847", "23848", "23849"), (stryMutAct_9fa48("23851") ? input.timeoutAt === null : stryMutAct_9fa48("23850") ? true : (stryCov_9fa48("23850", "23851"), input.timeoutAt !== null)) && (stryMutAct_9fa48("23854") ? input.nowSeconds < input.timeoutAt : stryMutAct_9fa48("23853") ? input.nowSeconds > input.timeoutAt : stryMutAct_9fa48("23852") ? true : (stryCov_9fa48("23852", "23853", "23854"), input.nowSeconds >= input.timeoutAt)))) {
      if (stryMutAct_9fa48("23855")) {
        {}
      } else {
        stryCov_9fa48("23855");
        return stryMutAct_9fa48("23856") ? {} : (stryCov_9fa48("23856"), {
          timedOut: stryMutAct_9fa48("23857") ? false : (stryCov_9fa48("23857"), true),
          status: PacketReceiptStatus.FAILED,
          concludedAt: input.nowSeconds
        });
      }
    }
    return stryMutAct_9fa48("23858") ? {} : (stryCov_9fa48("23858"), {
      timedOut: stryMutAct_9fa48("23859") ? true : (stryCov_9fa48("23859"), false),
      status: input.status,
      concludedAt: null
    });
  }
}

/** Whether a packet-receipt timeout timer should be armed from intents. */
export function shouldArmPacketReceiptTimeoutTimer(timeoutSeconds: number): boolean {
  if (stryMutAct_9fa48("23860")) {
    {}
  } else {
    stryCov_9fa48("23860");
    return stryMutAct_9fa48("23864") ? timeoutSeconds <= 0 : stryMutAct_9fa48("23863") ? timeoutSeconds >= 0 : stryMutAct_9fa48("23862") ? false : stryMutAct_9fa48("23861") ? true : (stryCov_9fa48("23861", "23862", "23863", "23864"), timeoutSeconds > 0);
  }
}
export const stepPacketReceiptTimeout: StepFn<PacketReceiptTimeoutState> = (state, event) => {
  if (stryMutAct_9fa48("23865")) {
    {}
  } else {
    stryCov_9fa48("23865");
    const result = stepPacketReceiptTimeoutInner(state, event as PacketReceiptTimeoutEvent);
    return stryMutAct_9fa48("23866") ? {} : (stryCov_9fa48("23866"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPacketReceiptTimeoutWithActions(state: PacketReceiptTimeoutState, event: PacketReceiptTimeoutEvent): PacketReceiptTimeoutStepResult {
  if (stryMutAct_9fa48("23867")) {
    {}
  } else {
    stryCov_9fa48("23867");
    return stepPacketReceiptTimeoutInner(state, event);
  }
}
function stepPacketReceiptTimeoutInner(state: PacketReceiptTimeoutState, event: PacketReceiptTimeoutEvent): PacketReceiptTimeoutStepResult {
  if (stryMutAct_9fa48("23868")) {
    {}
  } else {
    stryCov_9fa48("23868");
    if (stryMutAct_9fa48("23871") ? event.kind !== "receipt/arm" : stryMutAct_9fa48("23870") ? false : stryMutAct_9fa48("23869") ? true : (stryCov_9fa48("23869", "23870", "23871"), event.kind === (stryMutAct_9fa48("23872") ? "" : (stryCov_9fa48("23872"), "receipt/arm")))) {
      if (stryMutAct_9fa48("23873")) {
        {}
      } else {
        stryCov_9fa48("23873");
        const intents: Intent[] = stryMutAct_9fa48("23874") ? [] : (stryCov_9fa48("23874"), [stryMutAct_9fa48("23875") ? {} : (stryCov_9fa48("23875"), {
          kind: stryMutAct_9fa48("23876") ? "" : (stryCov_9fa48("23876"), "timer/cancel"),
          timer: stryMutAct_9fa48("23877") ? {} : (stryCov_9fa48("23877"), {
            id: RECEIPT_TIMEOUT_TIMER_ID
          })
        })]);
        if (stryMutAct_9fa48("23879") ? false : stryMutAct_9fa48("23878") ? true : (stryCov_9fa48("23878", "23879"), shouldArmPacketReceiptTimeoutTimer(event.timeoutSeconds))) {
          if (stryMutAct_9fa48("23880")) {
            {}
          } else {
            stryCov_9fa48("23880");
            intents.push(stryMutAct_9fa48("23881") ? {} : (stryCov_9fa48("23881"), {
              kind: stryMutAct_9fa48("23882") ? "" : (stryCov_9fa48("23882"), "timer/set"),
              timer: stryMutAct_9fa48("23883") ? {} : (stryCov_9fa48("23883"), {
                id: RECEIPT_TIMEOUT_TIMER_ID,
                delayMs: stryMutAct_9fa48("23884") ? event.timeoutSeconds / 1000 : (stryCov_9fa48("23884"), event.timeoutSeconds * 1000)
              })
            }));
          }
        }
        return stryMutAct_9fa48("23885") ? {} : (stryCov_9fa48("23885"), {
          state: stryMutAct_9fa48("23886") ? {} : (stryCov_9fa48("23886"), {
            status: PacketReceiptStatus.SENT,
            timeoutAt: stryMutAct_9fa48("23887") ? event.at - event.timeoutSeconds : (stryCov_9fa48("23887"), event.at + event.timeoutSeconds),
            concludedAt: null,
            timedOut: stryMutAct_9fa48("23888") ? true : (stryCov_9fa48("23888"), false)
          }),
          intents,
          actions: stryMutAct_9fa48("23889") ? ["Stryker was here"] : (stryCov_9fa48("23889"), [])
        });
      }
    }
    if (stryMutAct_9fa48("23892") ? event.kind !== "receipt/delivered" : stryMutAct_9fa48("23891") ? false : stryMutAct_9fa48("23890") ? true : (stryCov_9fa48("23890", "23891", "23892"), event.kind === (stryMutAct_9fa48("23893") ? "" : (stryCov_9fa48("23893"), "receipt/delivered")))) {
      if (stryMutAct_9fa48("23894")) {
        {}
      } else {
        stryCov_9fa48("23894");
        return stryMutAct_9fa48("23895") ? {} : (stryCov_9fa48("23895"), {
          state: stryMutAct_9fa48("23896") ? {} : (stryCov_9fa48("23896"), {
            ...state,
            status: PacketReceiptStatus.DELIVERED,
            concludedAt: event.at,
            timedOut: stryMutAct_9fa48("23897") ? true : (stryCov_9fa48("23897"), false)
          }),
          intents: stryMutAct_9fa48("23898") ? [] : (stryCov_9fa48("23898"), [stryMutAct_9fa48("23899") ? {} : (stryCov_9fa48("23899"), {
            kind: stryMutAct_9fa48("23900") ? "" : (stryCov_9fa48("23900"), "timer/cancel"),
            timer: stryMutAct_9fa48("23901") ? {} : (stryCov_9fa48("23901"), {
              id: RECEIPT_TIMEOUT_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("23902") ? [] : (stryCov_9fa48("23902"), [stryMutAct_9fa48("23903") ? {} : (stryCov_9fa48("23903"), {
            kind: stryMutAct_9fa48("23904") ? "" : (stryCov_9fa48("23904"), "delivered")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("23907") ? event.kind !== "receipt/failed" : stryMutAct_9fa48("23906") ? false : stryMutAct_9fa48("23905") ? true : (stryCov_9fa48("23905", "23906", "23907"), event.kind === (stryMutAct_9fa48("23908") ? "" : (stryCov_9fa48("23908"), "receipt/failed")))) {
      if (stryMutAct_9fa48("23909")) {
        {}
      } else {
        stryCov_9fa48("23909");
        if (stryMutAct_9fa48("23912") ? state.status === PacketReceiptStatus.DELIVERED && state.status === PacketReceiptStatus.FAILED : stryMutAct_9fa48("23911") ? false : stryMutAct_9fa48("23910") ? true : (stryCov_9fa48("23910", "23911", "23912"), (stryMutAct_9fa48("23914") ? state.status !== PacketReceiptStatus.DELIVERED : stryMutAct_9fa48("23913") ? false : (stryCov_9fa48("23913", "23914"), state.status === PacketReceiptStatus.DELIVERED)) || (stryMutAct_9fa48("23916") ? state.status !== PacketReceiptStatus.FAILED : stryMutAct_9fa48("23915") ? false : (stryCov_9fa48("23915", "23916"), state.status === PacketReceiptStatus.FAILED)))) {
          if (stryMutAct_9fa48("23917")) {
            {}
          } else {
            stryCov_9fa48("23917");
            return stryMutAct_9fa48("23918") ? {} : (stryCov_9fa48("23918"), {
              state,
              intents: stryMutAct_9fa48("23919") ? ["Stryker was here"] : (stryCov_9fa48("23919"), []),
              actions: stryMutAct_9fa48("23920") ? ["Stryker was here"] : (stryCov_9fa48("23920"), [])
            });
          }
        }
        return stryMutAct_9fa48("23921") ? {} : (stryCov_9fa48("23921"), {
          state: stryMutAct_9fa48("23922") ? {} : (stryCov_9fa48("23922"), {
            ...state,
            status: PacketReceiptStatus.FAILED,
            concludedAt: event.at,
            timedOut: stryMutAct_9fa48("23923") ? true : (stryCov_9fa48("23923"), false)
          }),
          intents: stryMutAct_9fa48("23924") ? [] : (stryCov_9fa48("23924"), [stryMutAct_9fa48("23925") ? {} : (stryCov_9fa48("23925"), {
            kind: stryMutAct_9fa48("23926") ? "" : (stryCov_9fa48("23926"), "timer/cancel"),
            timer: stryMutAct_9fa48("23927") ? {} : (stryCov_9fa48("23927"), {
              id: RECEIPT_TIMEOUT_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("23928") ? [] : (stryCov_9fa48("23928"), [stryMutAct_9fa48("23929") ? {} : (stryCov_9fa48("23929"), {
            kind: stryMutAct_9fa48("23930") ? "" : (stryCov_9fa48("23930"), "failed")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("23933") ? event.kind === "receipt/check" && event.kind === "timer/fired" && event.id === RECEIPT_TIMEOUT_TIMER_ID : stryMutAct_9fa48("23932") ? false : stryMutAct_9fa48("23931") ? true : (stryCov_9fa48("23931", "23932", "23933"), (stryMutAct_9fa48("23935") ? event.kind !== "receipt/check" : stryMutAct_9fa48("23934") ? false : (stryCov_9fa48("23934", "23935"), event.kind === (stryMutAct_9fa48("23936") ? "" : (stryCov_9fa48("23936"), "receipt/check")))) || (stryMutAct_9fa48("23938") ? event.kind === "timer/fired" || event.id === RECEIPT_TIMEOUT_TIMER_ID : stryMutAct_9fa48("23937") ? false : (stryCov_9fa48("23937", "23938"), (stryMutAct_9fa48("23940") ? event.kind !== "timer/fired" : stryMutAct_9fa48("23939") ? true : (stryCov_9fa48("23939", "23940"), event.kind === (stryMutAct_9fa48("23941") ? "" : (stryCov_9fa48("23941"), "timer/fired")))) && (stryMutAct_9fa48("23943") ? event.id !== RECEIPT_TIMEOUT_TIMER_ID : stryMutAct_9fa48("23942") ? true : (stryCov_9fa48("23942", "23943"), event.id === RECEIPT_TIMEOUT_TIMER_ID)))))) {
      if (stryMutAct_9fa48("23944")) {
        {}
      } else {
        stryCov_9fa48("23944");
        const at = (stryMutAct_9fa48("23947") ? event.kind !== "receipt/check" : stryMutAct_9fa48("23946") ? false : stryMutAct_9fa48("23945") ? true : (stryCov_9fa48("23945", "23946", "23947"), event.kind === (stryMutAct_9fa48("23948") ? "" : (stryCov_9fa48("23948"), "receipt/check")))) ? event.at : stryMutAct_9fa48("23949") ? event.at * 1000 : (stryCov_9fa48("23949"), event.at / 1000);
        const result = checkPacketReceiptTimeout(stryMutAct_9fa48("23950") ? {} : (stryCov_9fa48("23950"), {
          status: state.status,
          timeoutAt: state.timeoutAt,
          nowSeconds: at
        }));
        if (stryMutAct_9fa48("23953") ? false : stryMutAct_9fa48("23952") ? true : stryMutAct_9fa48("23951") ? result.timedOut : (stryCov_9fa48("23951", "23952", "23953"), !result.timedOut)) {
          if (stryMutAct_9fa48("23954")) {
            {}
          } else {
            stryCov_9fa48("23954");
            return stryMutAct_9fa48("23955") ? {} : (stryCov_9fa48("23955"), {
              state: stryMutAct_9fa48("23956") ? {} : (stryCov_9fa48("23956"), {
                ...state,
                timedOut: stryMutAct_9fa48("23957") ? true : (stryCov_9fa48("23957"), false)
              }),
              intents: stryMutAct_9fa48("23958") ? ["Stryker was here"] : (stryCov_9fa48("23958"), []),
              actions: stryMutAct_9fa48("23959") ? ["Stryker was here"] : (stryCov_9fa48("23959"), [])
            });
          }
        }
        return stryMutAct_9fa48("23960") ? {} : (stryCov_9fa48("23960"), {
          state: stryMutAct_9fa48("23961") ? {} : (stryCov_9fa48("23961"), {
            status: result.status,
            timeoutAt: state.timeoutAt,
            concludedAt: result.concludedAt,
            timedOut: stryMutAct_9fa48("23962") ? false : (stryCov_9fa48("23962"), true)
          }),
          intents: (stryMutAct_9fa48("23965") ? event.kind !== "receipt/check" : stryMutAct_9fa48("23964") ? false : stryMutAct_9fa48("23963") ? true : (stryCov_9fa48("23963", "23964", "23965"), event.kind === (stryMutAct_9fa48("23966") ? "" : (stryCov_9fa48("23966"), "receipt/check")))) ? stryMutAct_9fa48("23967") ? [] : (stryCov_9fa48("23967"), [stryMutAct_9fa48("23968") ? {} : (stryCov_9fa48("23968"), {
            kind: stryMutAct_9fa48("23969") ? "" : (stryCov_9fa48("23969"), "timer/cancel"),
            timer: stryMutAct_9fa48("23970") ? {} : (stryCov_9fa48("23970"), {
              id: RECEIPT_TIMEOUT_TIMER_ID
            })
          })]) : stryMutAct_9fa48("23971") ? ["Stryker was here"] : (stryCov_9fa48("23971"), []),
          actions: stryMutAct_9fa48("23972") ? [] : (stryCov_9fa48("23972"), [stryMutAct_9fa48("23973") ? {} : (stryCov_9fa48("23973"), {
            kind: stryMutAct_9fa48("23974") ? "" : (stryCov_9fa48("23974"), "timeout")
          })])
        });
      }
    }
    return stryMutAct_9fa48("23975") ? {} : (stryCov_9fa48("23975"), {
      state,
      intents: stryMutAct_9fa48("23976") ? ["Stryker was here"] : (stryCov_9fa48("23976"), []),
      actions: stryMutAct_9fa48("23977") ? ["Stryker was here"] : (stryCov_9fa48("23977"), [])
    });
  }
}
export type OutboundReceiptOutcome = "none" | "keep-receipt" | "fail-and-drop-receipt";

/**
 * After outbound transmit: whether a created receipt is kept, failed+dropped, or unused.
 * Receipt construction / markFailed / splice stay at the adapter edge.
 */
export function planOutboundReceiptOutcome(input: {
  readonly createReceipt: boolean;
  readonly sent: boolean;
}): OutboundReceiptOutcome {
  if (stryMutAct_9fa48("23978")) {
    {}
  } else {
    stryCov_9fa48("23978");
    if (stryMutAct_9fa48("23981") ? false : stryMutAct_9fa48("23980") ? true : stryMutAct_9fa48("23979") ? input.createReceipt : (stryCov_9fa48("23979", "23980", "23981"), !input.createReceipt)) {
      if (stryMutAct_9fa48("23982")) {
        {}
      } else {
        stryCov_9fa48("23982");
        return stryMutAct_9fa48("23983") ? "" : (stryCov_9fa48("23983"), "none");
      }
    }
    if (stryMutAct_9fa48("23985") ? false : stryMutAct_9fa48("23984") ? true : (stryCov_9fa48("23984", "23985"), input.sent)) {
      if (stryMutAct_9fa48("23986")) {
        {}
      } else {
        stryCov_9fa48("23986");
        return stryMutAct_9fa48("23987") ? "" : (stryCov_9fa48("23987"), "keep-receipt");
      }
    }
    return stryMutAct_9fa48("23988") ? "" : (stryCov_9fa48("23988"), "fail-and-drop-receipt");
  }
}

/**
 * Outbound receipt outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planOutboundReceiptOutcome` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepOutboundReceiptWithActions}.
 */
export type OutboundReceiptPlanState = Record<string, never>;
export type OutboundReceiptPlanEvent = Event | {
  readonly kind: "receipt/outbound-plan-gate";
  readonly createReceipt: boolean;
  readonly sent: boolean;
};
export type OutboundReceiptPlanAction = {
  readonly kind: OutboundReceiptOutcome;
};
export interface OutboundReceiptPlanStepResult {
  readonly state: OutboundReceiptPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OutboundReceiptPlanAction[];
}
export function initialOutboundReceiptPlanState(): OutboundReceiptPlanState {
  if (stryMutAct_9fa48("23989")) {
    {}
  } else {
    stryCov_9fa48("23989");
    return {};
  }
}
export function stepOutboundReceiptPlanWithActions(state: OutboundReceiptPlanState, event: OutboundReceiptPlanEvent): OutboundReceiptPlanStepResult {
  if (stryMutAct_9fa48("23990")) {
    {}
  } else {
    stryCov_9fa48("23990");
    if (stryMutAct_9fa48("23993") ? event.kind !== "receipt/outbound-plan-gate" : stryMutAct_9fa48("23992") ? false : stryMutAct_9fa48("23991") ? true : (stryCov_9fa48("23991", "23992", "23993"), event.kind === (stryMutAct_9fa48("23994") ? "" : (stryCov_9fa48("23994"), "receipt/outbound-plan-gate")))) {
      if (stryMutAct_9fa48("23995")) {
        {}
      } else {
        stryCov_9fa48("23995");
        return stryMutAct_9fa48("23996") ? {} : (stryCov_9fa48("23996"), {
          state,
          intents: stryMutAct_9fa48("23997") ? ["Stryker was here"] : (stryCov_9fa48("23997"), []),
          actions: stryMutAct_9fa48("23998") ? [] : (stryCov_9fa48("23998"), [stryMutAct_9fa48("23999") ? {} : (stryCov_9fa48("23999"), {
            kind: planOutboundReceiptOutcome(stryMutAct_9fa48("24000") ? {} : (stryCov_9fa48("24000"), {
              createReceipt: event.createReceipt,
              sent: event.sent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("24001") ? {} : (stryCov_9fa48("24001"), {
      state,
      intents: stryMutAct_9fa48("24002") ? ["Stryker was here"] : (stryCov_9fa48("24002"), []),
      actions: stryMutAct_9fa48("24003") ? ["Stryker was here"] : (stryCov_9fa48("24003"), [])
    });
  }
}

/** Extract the outbound receipt plan from actions; null when empty. */
export function outboundReceiptPlanFromActions(actions: ReadonlyArray<OutboundReceiptPlanAction>): OutboundReceiptOutcome | null {
  if (stryMutAct_9fa48("24004")) {
    {}
  } else {
    stryCov_9fa48("24004");
    const action = actions[0];
    return stryMutAct_9fa48("24005") ? action?.kind && null : (stryCov_9fa48("24005"), (stryMutAct_9fa48("24006") ? action.kind : (stryCov_9fa48("24006"), action?.kind)) ?? null);
  }
}
export function shouldOutboundReceiptNonePlan(actions: ReadonlyArray<OutboundReceiptPlanAction>): boolean {
  if (stryMutAct_9fa48("24007")) {
    {}
  } else {
    stryCov_9fa48("24007");
    return stryMutAct_9fa48("24008") ? actions.every(action => action.kind === "none") : (stryCov_9fa48("24008"), actions.some(stryMutAct_9fa48("24009") ? () => undefined : (stryCov_9fa48("24009"), action => stryMutAct_9fa48("24012") ? action.kind !== "none" : stryMutAct_9fa48("24011") ? false : stryMutAct_9fa48("24010") ? true : (stryCov_9fa48("24010", "24011", "24012"), action.kind === (stryMutAct_9fa48("24013") ? "" : (stryCov_9fa48("24013"), "none"))))));
  }
}
export function shouldOutboundKeepReceiptPlan(actions: ReadonlyArray<OutboundReceiptPlanAction>): boolean {
  if (stryMutAct_9fa48("24014")) {
    {}
  } else {
    stryCov_9fa48("24014");
    return stryMutAct_9fa48("24015") ? actions.every(action => action.kind === "keep-receipt") : (stryCov_9fa48("24015"), actions.some(stryMutAct_9fa48("24016") ? () => undefined : (stryCov_9fa48("24016"), action => stryMutAct_9fa48("24019") ? action.kind !== "keep-receipt" : stryMutAct_9fa48("24018") ? false : stryMutAct_9fa48("24017") ? true : (stryCov_9fa48("24017", "24018", "24019"), action.kind === (stryMutAct_9fa48("24020") ? "" : (stryCov_9fa48("24020"), "keep-receipt"))))));
  }
}
export function shouldOutboundFailAndDropReceiptPlan(actions: ReadonlyArray<OutboundReceiptPlanAction>): boolean {
  if (stryMutAct_9fa48("24021")) {
    {}
  } else {
    stryCov_9fa48("24021");
    return stryMutAct_9fa48("24022") ? actions.every(action => action.kind === "fail-and-drop-receipt") : (stryCov_9fa48("24022"), actions.some(stryMutAct_9fa48("24023") ? () => undefined : (stryCov_9fa48("24023"), action => stryMutAct_9fa48("24026") ? action.kind !== "fail-and-drop-receipt" : stryMutAct_9fa48("24025") ? false : stryMutAct_9fa48("24024") ? true : (stryCov_9fa48("24024", "24025", "24026"), action.kind === (stryMutAct_9fa48("24027") ? "" : (stryCov_9fa48("24027"), "fail-and-drop-receipt"))))));
  }
}

/** Whether outbound send should fail+drop a created receipt after transmit failure. */
export function shouldFailAndDropOutboundReceipt(input: {
  readonly failAndDrop: boolean;
  readonly receiptPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("24028")) {
    {}
  } else {
    stryCov_9fa48("24028");
    return stryMutAct_9fa48("24031") ? input.failAndDrop || input.receiptPresent : stryMutAct_9fa48("24030") ? false : stryMutAct_9fa48("24029") ? true : (stryCov_9fa48("24029", "24030", "24031"), input.failAndDrop && input.receiptPresent);
  }
}

/**
 * Outbound fail-and-drop gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldFailAndDropOutboundReceipt` reads beside the step).
 */
export type FailAndDropOutboundReceiptState = Record<string, never>;
export type FailAndDropOutboundReceiptEvent = Event | {
  readonly kind: "receipt/fail-and-drop-gate";
  readonly failAndDrop: boolean;
  readonly receiptPresent: boolean;
};
export type FailAndDropOutboundReceiptAction = {
  readonly kind: "fail-and-drop";
} | {
  readonly kind: "skip";
};
export interface FailAndDropOutboundReceiptStepResult {
  readonly state: FailAndDropOutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly FailAndDropOutboundReceiptAction[];
}
export function initialFailAndDropOutboundReceiptState(): FailAndDropOutboundReceiptState {
  if (stryMutAct_9fa48("24032")) {
    {}
  } else {
    stryCov_9fa48("24032");
    return {};
  }
}
export function stepFailAndDropOutboundReceiptWithActions(state: FailAndDropOutboundReceiptState, event: FailAndDropOutboundReceiptEvent): FailAndDropOutboundReceiptStepResult {
  if (stryMutAct_9fa48("24033")) {
    {}
  } else {
    stryCov_9fa48("24033");
    if (stryMutAct_9fa48("24036") ? event.kind !== "receipt/fail-and-drop-gate" : stryMutAct_9fa48("24035") ? false : stryMutAct_9fa48("24034") ? true : (stryCov_9fa48("24034", "24035", "24036"), event.kind === (stryMutAct_9fa48("24037") ? "" : (stryCov_9fa48("24037"), "receipt/fail-and-drop-gate")))) {
      if (stryMutAct_9fa48("24038")) {
        {}
      } else {
        stryCov_9fa48("24038");
        return stryMutAct_9fa48("24039") ? {} : (stryCov_9fa48("24039"), {
          state,
          intents: stryMutAct_9fa48("24040") ? ["Stryker was here"] : (stryCov_9fa48("24040"), []),
          actions: stryMutAct_9fa48("24041") ? [] : (stryCov_9fa48("24041"), [stryMutAct_9fa48("24042") ? {} : (stryCov_9fa48("24042"), {
            kind: shouldFailAndDropOutboundReceipt(stryMutAct_9fa48("24043") ? {} : (stryCov_9fa48("24043"), {
              failAndDrop: event.failAndDrop,
              receiptPresent: event.receiptPresent
            })) ? stryMutAct_9fa48("24044") ? "" : (stryCov_9fa48("24044"), "fail-and-drop") : stryMutAct_9fa48("24045") ? "" : (stryCov_9fa48("24045"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("24046") ? {} : (stryCov_9fa48("24046"), {
      state,
      intents: stryMutAct_9fa48("24047") ? ["Stryker was here"] : (stryCov_9fa48("24047"), []),
      actions: stryMutAct_9fa48("24048") ? ["Stryker was here"] : (stryCov_9fa48("24048"), [])
    });
  }
}
export function shouldFailAndDropOutboundReceiptNow(actions: ReadonlyArray<FailAndDropOutboundReceiptAction>): boolean {
  if (stryMutAct_9fa48("24049")) {
    {}
  } else {
    stryCov_9fa48("24049");
    return stryMutAct_9fa48("24050") ? actions.every(action => action.kind === "fail-and-drop") : (stryCov_9fa48("24050"), actions.some(stryMutAct_9fa48("24051") ? () => undefined : (stryCov_9fa48("24051"), action => stryMutAct_9fa48("24054") ? action.kind !== "fail-and-drop" : stryMutAct_9fa48("24053") ? false : stryMutAct_9fa48("24052") ? true : (stryCov_9fa48("24052", "24053", "24054"), action.kind === (stryMutAct_9fa48("24055") ? "" : (stryCov_9fa48("24055"), "fail-and-drop"))))));
  }
}
export function shouldSkipFailAndDropOutboundReceipt(actions: ReadonlyArray<FailAndDropOutboundReceiptAction>): boolean {
  if (stryMutAct_9fa48("24056")) {
    {}
  } else {
    stryCov_9fa48("24056");
    return stryMutAct_9fa48("24057") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("24057"), actions.some(stryMutAct_9fa48("24058") ? () => undefined : (stryCov_9fa48("24058"), action => stryMutAct_9fa48("24061") ? action.kind !== "skip" : stryMutAct_9fa48("24060") ? false : stryMutAct_9fa48("24059") ? true : (stryCov_9fa48("24059", "24060", "24061"), action.kind === (stryMutAct_9fa48("24062") ? "" : (stryCov_9fa48("24062"), "skip"))))));
  }
}

/**
 * Whether outbound send should return a kept receipt after outbound-outcome
 * actions say keep and the transmit succeeded.
 */
export function shouldKeepOutboundReceipt(input: {
  readonly planKeep: boolean;
  readonly sent: boolean;
}): boolean {
  if (stryMutAct_9fa48("24063")) {
    {}
  } else {
    stryCov_9fa48("24063");
    return stryMutAct_9fa48("24066") ? input.planKeep || input.sent : stryMutAct_9fa48("24065") ? false : stryMutAct_9fa48("24064") ? true : (stryCov_9fa48("24064", "24065", "24066"), input.planKeep && input.sent);
  }
}

/**
 * Outbound keep-receipt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldKeepOutboundReceipt`
 * reads beside the step).
 */
export type KeepOutboundReceiptState = Record<string, never>;
export type KeepOutboundReceiptEvent = Event | {
  readonly kind: "receipt/keep-outbound-gate";
  readonly planKeep: boolean;
  readonly sent: boolean;
};
export type KeepOutboundReceiptAction = {
  readonly kind: "keep";
} | {
  readonly kind: "skip";
};
export interface KeepOutboundReceiptStepResult {
  readonly state: KeepOutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly KeepOutboundReceiptAction[];
}
export function initialKeepOutboundReceiptState(): KeepOutboundReceiptState {
  if (stryMutAct_9fa48("24067")) {
    {}
  } else {
    stryCov_9fa48("24067");
    return {};
  }
}

/**
 * Outbound receipt outcome is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepOutboundReceiptPlanWithActions}
 * (`none`|`keep-receipt`|`fail-and-drop-receipt`).
 */
export type OutboundReceiptState = Record<string, never>;
export type OutboundReceiptEvent = Event | {
  readonly kind: "receipt/outbound-gate";
  readonly createReceipt: boolean;
  readonly sent: boolean;
};
export type OutboundReceiptAction = {
  readonly kind: OutboundReceiptOutcome;
};
export interface OutboundReceiptStepResult {
  readonly state: OutboundReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly OutboundReceiptAction[];
}
export function stepOutboundReceiptWithActions(state: OutboundReceiptState, event: OutboundReceiptEvent): OutboundReceiptStepResult {
  if (stryMutAct_9fa48("24068")) {
    {}
  } else {
    stryCov_9fa48("24068");
    return stepOutboundReceiptInner(state, event);
  }
}
export function stepOutboundReceiptInner(state: OutboundReceiptState, event: OutboundReceiptEvent): OutboundReceiptStepResult {
  if (stryMutAct_9fa48("24069")) {
    {}
  } else {
    stryCov_9fa48("24069");
    if (stryMutAct_9fa48("24072") ? event.kind !== "receipt/outbound-gate" : stryMutAct_9fa48("24071") ? false : stryMutAct_9fa48("24070") ? true : (stryCov_9fa48("24070", "24071", "24072"), event.kind === (stryMutAct_9fa48("24073") ? "" : (stryCov_9fa48("24073"), "receipt/outbound-gate")))) {
      if (stryMutAct_9fa48("24074")) {
        {}
      } else {
        stryCov_9fa48("24074");
        const planActions = stepOutboundReceiptPlanWithActions(initialOutboundReceiptPlanState(), stryMutAct_9fa48("24075") ? {} : (stryCov_9fa48("24075"), {
          kind: stryMutAct_9fa48("24076") ? "" : (stryCov_9fa48("24076"), "receipt/outbound-plan-gate"),
          createReceipt: event.createReceipt,
          sent: event.sent
        })).actions;
        const plan = outboundReceiptPlanFromActions(planActions);
        if (stryMutAct_9fa48("24079") ? plan !== null : stryMutAct_9fa48("24078") ? false : stryMutAct_9fa48("24077") ? true : (stryCov_9fa48("24077", "24078", "24079"), plan === null)) {
          if (stryMutAct_9fa48("24080")) {
            {}
          } else {
            stryCov_9fa48("24080");
            return stryMutAct_9fa48("24081") ? {} : (stryCov_9fa48("24081"), {
              state,
              intents: stryMutAct_9fa48("24082") ? ["Stryker was here"] : (stryCov_9fa48("24082"), []),
              actions: stryMutAct_9fa48("24083") ? ["Stryker was here"] : (stryCov_9fa48("24083"), [])
            });
          }
        }
        return stryMutAct_9fa48("24084") ? {} : (stryCov_9fa48("24084"), {
          state,
          intents: stryMutAct_9fa48("24085") ? ["Stryker was here"] : (stryCov_9fa48("24085"), []),
          actions: stryMutAct_9fa48("24086") ? [] : (stryCov_9fa48("24086"), [stryMutAct_9fa48("24087") ? {} : (stryCov_9fa48("24087"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("24088") ? {} : (stryCov_9fa48("24088"), {
      state,
      intents: stryMutAct_9fa48("24089") ? ["Stryker was here"] : (stryCov_9fa48("24089"), []),
      actions: stryMutAct_9fa48("24090") ? ["Stryker was here"] : (stryCov_9fa48("24090"), [])
    });
  }
}