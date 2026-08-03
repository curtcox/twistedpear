/**
 * Pure delivery-receipt poll loop for LXMF opportunistic/propagated sends.
 * Time arrives only via event.at; adapters schedule from timer intents,
 * observe receipt status only when the machine emits a probe action, and
 * conclude the Promise shell only via resolve actions.
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
import type { Event, Intent, StepFn } from "@twistedpear/effects";

/** Mirrors reticulum PacketReceiptStatus values used by the poll loop. */
export const ReceiptPollStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  CULLED: 0xff
} as const;
export type ReceiptPollStatusValue = (typeof ReceiptPollStatus)[keyof typeof ReceiptPollStatus];
export const DELIVERY_RECEIPT_POLL_INTERVAL_MS = 10;
export const DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS = 500;
export const DELIVERY_RECEIPT_POLL_TIMER_ID = stryMutAct_9fa48("5302") ? "" : (stryCov_9fa48("5302"), "delivery-poll");
export interface DeliveryReceiptPollState {
  readonly armed: boolean;
  readonly deadlineMs: number;
  readonly receiptStatus: ReceiptPollStatusValue;
  readonly concluded: boolean;
}
export type DeliveryReceiptPollEvent = Event | {
  readonly kind: "poll/arm";
  readonly at: number;
  readonly timeoutMs: number;
} | {
  readonly kind: "poll/receipt-status";
  readonly status: ReceiptPollStatusValue;
  readonly at: number;
};
export type DeliveryReceiptPollAction = {
  readonly kind: "probe";
} | {
  readonly kind: "resolve";
  readonly status: ReceiptPollStatusValue;
};
export interface DeliveryReceiptPollStepResult {
  readonly state: DeliveryReceiptPollState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeliveryReceiptPollAction[];
}
export function initialDeliveryReceiptPollState(): DeliveryReceiptPollState {
  if (stryMutAct_9fa48("5303")) {
    {}
  } else {
    stryCov_9fa48("5303");
    return stryMutAct_9fa48("5304") ? {} : (stryCov_9fa48("5304"), {
      armed: stryMutAct_9fa48("5305") ? true : (stryCov_9fa48("5305"), false),
      deadlineMs: 0,
      receiptStatus: ReceiptPollStatus.SENT,
      concluded: stryMutAct_9fa48("5306") ? true : (stryCov_9fa48("5306"), false)
    });
  }
}
export function isTerminalReceiptStatus(status: ReceiptPollStatusValue): boolean {
  if (stryMutAct_9fa48("5307")) {
    {}
  } else {
    stryCov_9fa48("5307");
    return stryMutAct_9fa48("5310") ? status === ReceiptPollStatus.DELIVERED && status === ReceiptPollStatus.FAILED : stryMutAct_9fa48("5309") ? false : stryMutAct_9fa48("5308") ? true : (stryCov_9fa48("5308", "5309", "5310"), (stryMutAct_9fa48("5312") ? status !== ReceiptPollStatus.DELIVERED : stryMutAct_9fa48("5311") ? false : (stryCov_9fa48("5311", "5312"), status === ReceiptPollStatus.DELIVERED)) || (stryMutAct_9fa48("5314") ? status !== ReceiptPollStatus.FAILED : stryMutAct_9fa48("5313") ? false : (stryCov_9fa48("5313", "5314"), status === ReceiptPollStatus.FAILED)));
  }
}

/** Whether the delivery-receipt poll should keep probing. */
export function shouldContinueDeliveryReceiptPoll(concluded: boolean): boolean {
  if (stryMutAct_9fa48("5315")) {
    {}
  } else {
    stryCov_9fa48("5315");
    return stryMutAct_9fa48("5316") ? concluded : (stryCov_9fa48("5316"), !concluded);
  }
}
export const stepDeliveryReceiptPoll: StepFn<DeliveryReceiptPollState> = (state, event) => {
  if (stryMutAct_9fa48("5317")) {
    {}
  } else {
    stryCov_9fa48("5317");
    const result = stepDeliveryReceiptPollInner(state, event as DeliveryReceiptPollEvent);
    return stryMutAct_9fa48("5318") ? {} : (stryCov_9fa48("5318"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepDeliveryReceiptPollWithActions(state: DeliveryReceiptPollState, event: DeliveryReceiptPollEvent): DeliveryReceiptPollStepResult {
  if (stryMutAct_9fa48("5319")) {
    {}
  } else {
    stryCov_9fa48("5319");
    return stepDeliveryReceiptPollInner(state, event);
  }
}
function stepDeliveryReceiptPollInner(state: DeliveryReceiptPollState, event: DeliveryReceiptPollEvent): DeliveryReceiptPollStepResult {
  if (stryMutAct_9fa48("5320")) {
    {}
  } else {
    stryCov_9fa48("5320");
    if (stryMutAct_9fa48("5323") ? event.kind !== "poll/arm" : stryMutAct_9fa48("5322") ? false : stryMutAct_9fa48("5321") ? true : (stryCov_9fa48("5321", "5322", "5323"), event.kind === (stryMutAct_9fa48("5324") ? "" : (stryCov_9fa48("5324"), "poll/arm")))) {
      if (stryMutAct_9fa48("5325")) {
        {}
      } else {
        stryCov_9fa48("5325");
        return stryMutAct_9fa48("5326") ? {} : (stryCov_9fa48("5326"), {
          state: stryMutAct_9fa48("5327") ? {} : (stryCov_9fa48("5327"), {
            armed: stryMutAct_9fa48("5328") ? false : (stryCov_9fa48("5328"), true),
            deadlineMs: stryMutAct_9fa48("5329") ? event.at - event.timeoutMs : (stryCov_9fa48("5329"), event.at + event.timeoutMs),
            receiptStatus: ReceiptPollStatus.SENT,
            concluded: stryMutAct_9fa48("5330") ? true : (stryCov_9fa48("5330"), false)
          }),
          intents: stryMutAct_9fa48("5331") ? ["Stryker was here"] : (stryCov_9fa48("5331"), []),
          actions: stryMutAct_9fa48("5332") ? [] : (stryCov_9fa48("5332"), [stryMutAct_9fa48("5333") ? {} : (stryCov_9fa48("5333"), {
            kind: stryMutAct_9fa48("5334") ? "" : (stryCov_9fa48("5334"), "probe")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("5337") ? event.kind !== "poll/receipt-status" : stryMutAct_9fa48("5336") ? false : stryMutAct_9fa48("5335") ? true : (stryCov_9fa48("5335", "5336", "5337"), event.kind === (stryMutAct_9fa48("5338") ? "" : (stryCov_9fa48("5338"), "poll/receipt-status")))) {
      if (stryMutAct_9fa48("5339")) {
        {}
      } else {
        stryCov_9fa48("5339");
        if (stryMutAct_9fa48("5342") ? !state.armed && state.concluded : stryMutAct_9fa48("5341") ? false : stryMutAct_9fa48("5340") ? true : (stryCov_9fa48("5340", "5341", "5342"), (stryMutAct_9fa48("5343") ? state.armed : (stryCov_9fa48("5343"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("5344")) {
            {}
          } else {
            stryCov_9fa48("5344");
            return stryMutAct_9fa48("5345") ? {} : (stryCov_9fa48("5345"), {
              state,
              intents: stryMutAct_9fa48("5346") ? ["Stryker was here"] : (stryCov_9fa48("5346"), []),
              actions: stryMutAct_9fa48("5347") ? ["Stryker was here"] : (stryCov_9fa48("5347"), [])
            });
          }
        }
        if (stryMutAct_9fa48("5349") ? false : stryMutAct_9fa48("5348") ? true : (stryCov_9fa48("5348", "5349"), isTerminalReceiptStatus(event.status))) {
          if (stryMutAct_9fa48("5350")) {
            {}
          } else {
            stryCov_9fa48("5350");
            return stryMutAct_9fa48("5351") ? {} : (stryCov_9fa48("5351"), {
              state: stryMutAct_9fa48("5352") ? {} : (stryCov_9fa48("5352"), {
                ...state,
                receiptStatus: event.status,
                concluded: stryMutAct_9fa48("5353") ? false : (stryCov_9fa48("5353"), true)
              }),
              intents: stryMutAct_9fa48("5354") ? [] : (stryCov_9fa48("5354"), [stryMutAct_9fa48("5355") ? {} : (stryCov_9fa48("5355"), {
                kind: stryMutAct_9fa48("5356") ? "" : (stryCov_9fa48("5356"), "timer/cancel"),
                timer: stryMutAct_9fa48("5357") ? {} : (stryCov_9fa48("5357"), {
                  id: DELIVERY_RECEIPT_POLL_TIMER_ID
                })
              })]),
              actions: stryMutAct_9fa48("5358") ? [] : (stryCov_9fa48("5358"), [stryMutAct_9fa48("5359") ? {} : (stryCov_9fa48("5359"), {
                kind: stryMutAct_9fa48("5360") ? "" : (stryCov_9fa48("5360"), "resolve"),
                status: event.status
              })])
            });
          }
        }
        if (stryMutAct_9fa48("5364") ? event.at < state.deadlineMs : stryMutAct_9fa48("5363") ? event.at > state.deadlineMs : stryMutAct_9fa48("5362") ? false : stryMutAct_9fa48("5361") ? true : (stryCov_9fa48("5361", "5362", "5363", "5364"), event.at >= state.deadlineMs)) {
          if (stryMutAct_9fa48("5365")) {
            {}
          } else {
            stryCov_9fa48("5365");
            return stryMutAct_9fa48("5366") ? {} : (stryCov_9fa48("5366"), {
              state: stryMutAct_9fa48("5367") ? {} : (stryCov_9fa48("5367"), {
                ...state,
                receiptStatus: event.status,
                concluded: stryMutAct_9fa48("5368") ? false : (stryCov_9fa48("5368"), true)
              }),
              intents: stryMutAct_9fa48("5369") ? [] : (stryCov_9fa48("5369"), [stryMutAct_9fa48("5370") ? {} : (stryCov_9fa48("5370"), {
                kind: stryMutAct_9fa48("5371") ? "" : (stryCov_9fa48("5371"), "timer/cancel"),
                timer: stryMutAct_9fa48("5372") ? {} : (stryCov_9fa48("5372"), {
                  id: DELIVERY_RECEIPT_POLL_TIMER_ID
                })
              })]),
              actions: stryMutAct_9fa48("5373") ? [] : (stryCov_9fa48("5373"), [stryMutAct_9fa48("5374") ? {} : (stryCov_9fa48("5374"), {
                kind: stryMutAct_9fa48("5375") ? "" : (stryCov_9fa48("5375"), "resolve"),
                status: event.status
              })])
            });
          }
        }
        return stryMutAct_9fa48("5376") ? {} : (stryCov_9fa48("5376"), {
          state: stryMutAct_9fa48("5377") ? {} : (stryCov_9fa48("5377"), {
            ...state,
            receiptStatus: event.status
          }),
          intents: stryMutAct_9fa48("5378") ? [] : (stryCov_9fa48("5378"), [stryMutAct_9fa48("5379") ? {} : (stryCov_9fa48("5379"), {
            kind: stryMutAct_9fa48("5380") ? "" : (stryCov_9fa48("5380"), "timer/set"),
            timer: stryMutAct_9fa48("5381") ? {} : (stryCov_9fa48("5381"), {
              id: DELIVERY_RECEIPT_POLL_TIMER_ID,
              delayMs: DELIVERY_RECEIPT_POLL_INTERVAL_MS
            })
          })]),
          actions: stryMutAct_9fa48("5382") ? ["Stryker was here"] : (stryCov_9fa48("5382"), [])
        });
      }
    }
    if (stryMutAct_9fa48("5385") ? event.kind === "timer/fired" || event.id === DELIVERY_RECEIPT_POLL_TIMER_ID : stryMutAct_9fa48("5384") ? false : stryMutAct_9fa48("5383") ? true : (stryCov_9fa48("5383", "5384", "5385"), (stryMutAct_9fa48("5387") ? event.kind !== "timer/fired" : stryMutAct_9fa48("5386") ? true : (stryCov_9fa48("5386", "5387"), event.kind === (stryMutAct_9fa48("5388") ? "" : (stryCov_9fa48("5388"), "timer/fired")))) && (stryMutAct_9fa48("5390") ? event.id !== DELIVERY_RECEIPT_POLL_TIMER_ID : stryMutAct_9fa48("5389") ? true : (stryCov_9fa48("5389", "5390"), event.id === DELIVERY_RECEIPT_POLL_TIMER_ID)))) {
      if (stryMutAct_9fa48("5391")) {
        {}
      } else {
        stryCov_9fa48("5391");
        if (stryMutAct_9fa48("5394") ? !state.armed && state.concluded : stryMutAct_9fa48("5393") ? false : stryMutAct_9fa48("5392") ? true : (stryCov_9fa48("5392", "5393", "5394"), (stryMutAct_9fa48("5395") ? state.armed : (stryCov_9fa48("5395"), !state.armed)) || state.concluded)) {
          if (stryMutAct_9fa48("5396")) {
            {}
          } else {
            stryCov_9fa48("5396");
            return stryMutAct_9fa48("5397") ? {} : (stryCov_9fa48("5397"), {
              state,
              intents: stryMutAct_9fa48("5398") ? ["Stryker was here"] : (stryCov_9fa48("5398"), []),
              actions: stryMutAct_9fa48("5399") ? ["Stryker was here"] : (stryCov_9fa48("5399"), [])
            });
          }
        }
        return stryMutAct_9fa48("5400") ? {} : (stryCov_9fa48("5400"), {
          state,
          intents: stryMutAct_9fa48("5401") ? ["Stryker was here"] : (stryCov_9fa48("5401"), []),
          actions: stryMutAct_9fa48("5402") ? [] : (stryCov_9fa48("5402"), [stryMutAct_9fa48("5403") ? {} : (stryCov_9fa48("5403"), {
            kind: stryMutAct_9fa48("5404") ? "" : (stryCov_9fa48("5404"), "probe")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5405") ? {} : (stryCov_9fa48("5405"), {
      state,
      intents: stryMutAct_9fa48("5406") ? ["Stryker was here"] : (stryCov_9fa48("5406"), []),
      actions: stryMutAct_9fa48("5407") ? ["Stryker was here"] : (stryCov_9fa48("5407"), [])
    });
  }
}