/**
 * Pure LXMF outbound message send-state transitions.
 * Adapters perform network IO; this owns state/progress updates only.
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

/** Mirrors LXMF/LXMessage.py message states. */
export const LxmfMessageState = {
  GENERATING: 0x00,
  OUTBOUND: 0x01,
  SENDING: 0x02,
  SENT: 0x04,
  DELIVERED: 0x08,
  REJECTED: 0xfd,
  CANCELLED: 0xfe,
  FAILED: 0xff
} as const;
export type LxmfMessageStateValue = (typeof LxmfMessageState)[keyof typeof LxmfMessageState];
export interface LxmfSendState {
  readonly state: LxmfMessageStateValue;
  readonly progress: number;
}
export type LxmfSendEvent = Event | {
  readonly kind: "lxmf/enqueue";
} | {
  readonly kind: "lxmf/begin-sending";
} | {
  readonly kind: "lxmf/mark-sent";
  readonly progress?: number;
} | {
  readonly kind: "lxmf/mark-delivered";
} | {
  readonly kind: "lxmf/mark-failed";
} | {
  readonly kind: "lxmf/progress";
  readonly progress: number;
} | {
  readonly kind: "lxmf/receipt-result";
  readonly delivered: boolean;
  /** Propagated success lands on SENT; opportunistic on DELIVERED. */
  readonly onDelivered: "sent" | "delivered";
};
export function initialLxmfSendState(state: LxmfMessageStateValue = LxmfMessageState.GENERATING, progress = 0): LxmfSendState {
  if (stryMutAct_9fa48("21464")) {
    {}
  } else {
    stryCov_9fa48("21464");
    return stryMutAct_9fa48("21465") ? {} : (stryCov_9fa48("21465"), {
      state,
      progress
    });
  }
}
export function applyLxmfSendEvent(current: LxmfSendState, event: LxmfSendEvent): LxmfSendState {
  if (stryMutAct_9fa48("21466")) {
    {}
  } else {
    stryCov_9fa48("21466");
    return stepLxmfSendInner(current, event).state;
  }
}
export const stepLxmfSend: StepFn<LxmfSendState> = stryMutAct_9fa48("21467") ? () => undefined : (stryCov_9fa48("21467"), (() => {
  const stepLxmfSend: StepFn<LxmfSendState> = (state, event) => stepLxmfSendInner(state, event as LxmfSendEvent);
  return stepLxmfSend;
})());
function stepLxmfSendInner(state: LxmfSendState, event: LxmfSendEvent): {
  state: LxmfSendState;
  intents: Intent[];
} {
  if (stryMutAct_9fa48("21468")) {
    {}
  } else {
    stryCov_9fa48("21468");
    if (stryMutAct_9fa48("21471") ? event.kind !== "lxmf/enqueue" : stryMutAct_9fa48("21470") ? false : stryMutAct_9fa48("21469") ? true : (stryCov_9fa48("21469", "21470", "21471"), event.kind === (stryMutAct_9fa48("21472") ? "" : (stryCov_9fa48("21472"), "lxmf/enqueue")))) {
      if (stryMutAct_9fa48("21473")) {
        {}
      } else {
        stryCov_9fa48("21473");
        return stryMutAct_9fa48("21474") ? {} : (stryCov_9fa48("21474"), {
          state: stryMutAct_9fa48("21475") ? {} : (stryCov_9fa48("21475"), {
            state: LxmfMessageState.OUTBOUND,
            progress: state.progress
          }),
          intents: stryMutAct_9fa48("21476") ? ["Stryker was here"] : (stryCov_9fa48("21476"), [])
        });
      }
    }
    if (stryMutAct_9fa48("21479") ? event.kind !== "lxmf/begin-sending" : stryMutAct_9fa48("21478") ? false : stryMutAct_9fa48("21477") ? true : (stryCov_9fa48("21477", "21478", "21479"), event.kind === (stryMutAct_9fa48("21480") ? "" : (stryCov_9fa48("21480"), "lxmf/begin-sending")))) {
      if (stryMutAct_9fa48("21481")) {
        {}
      } else {
        stryCov_9fa48("21481");
        return stryMutAct_9fa48("21482") ? {} : (stryCov_9fa48("21482"), {
          state: stryMutAct_9fa48("21483") ? {} : (stryCov_9fa48("21483"), {
            state: LxmfMessageState.SENDING,
            progress: state.progress
          }),
          intents: stryMutAct_9fa48("21484") ? ["Stryker was here"] : (stryCov_9fa48("21484"), [])
        });
      }
    }
    if (stryMutAct_9fa48("21487") ? event.kind !== "lxmf/mark-sent" : stryMutAct_9fa48("21486") ? false : stryMutAct_9fa48("21485") ? true : (stryCov_9fa48("21485", "21486", "21487"), event.kind === (stryMutAct_9fa48("21488") ? "" : (stryCov_9fa48("21488"), "lxmf/mark-sent")))) {
      if (stryMutAct_9fa48("21489")) {
        {}
      } else {
        stryCov_9fa48("21489");
        return stryMutAct_9fa48("21490") ? {} : (stryCov_9fa48("21490"), {
          state: stryMutAct_9fa48("21491") ? {} : (stryCov_9fa48("21491"), {
            state: LxmfMessageState.SENT,
            progress: stryMutAct_9fa48("21492") ? event.progress && 0.5 : (stryCov_9fa48("21492"), event.progress ?? 0.5)
          }),
          intents: stryMutAct_9fa48("21493") ? ["Stryker was here"] : (stryCov_9fa48("21493"), [])
        });
      }
    }
    if (stryMutAct_9fa48("21496") ? event.kind !== "lxmf/mark-delivered" : stryMutAct_9fa48("21495") ? false : stryMutAct_9fa48("21494") ? true : (stryCov_9fa48("21494", "21495", "21496"), event.kind === (stryMutAct_9fa48("21497") ? "" : (stryCov_9fa48("21497"), "lxmf/mark-delivered")))) {
      if (stryMutAct_9fa48("21498")) {
        {}
      } else {
        stryCov_9fa48("21498");
        return stryMutAct_9fa48("21499") ? {} : (stryCov_9fa48("21499"), {
          state: stryMutAct_9fa48("21500") ? {} : (stryCov_9fa48("21500"), {
            state: LxmfMessageState.DELIVERED,
            progress: 1
          }),
          intents: stryMutAct_9fa48("21501") ? ["Stryker was here"] : (stryCov_9fa48("21501"), [])
        });
      }
    }
    if (stryMutAct_9fa48("21504") ? event.kind !== "lxmf/mark-failed" : stryMutAct_9fa48("21503") ? false : stryMutAct_9fa48("21502") ? true : (stryCov_9fa48("21502", "21503", "21504"), event.kind === (stryMutAct_9fa48("21505") ? "" : (stryCov_9fa48("21505"), "lxmf/mark-failed")))) {
      if (stryMutAct_9fa48("21506")) {
        {}
      } else {
        stryCov_9fa48("21506");
        return stryMutAct_9fa48("21507") ? {} : (stryCov_9fa48("21507"), {
          state: stryMutAct_9fa48("21508") ? {} : (stryCov_9fa48("21508"), {
            state: LxmfMessageState.FAILED,
            progress: state.progress
          }),
          intents: stryMutAct_9fa48("21509") ? ["Stryker was here"] : (stryCov_9fa48("21509"), [])
        });
      }
    }
    if (stryMutAct_9fa48("21512") ? event.kind !== "lxmf/progress" : stryMutAct_9fa48("21511") ? false : stryMutAct_9fa48("21510") ? true : (stryCov_9fa48("21510", "21511", "21512"), event.kind === (stryMutAct_9fa48("21513") ? "" : (stryCov_9fa48("21513"), "lxmf/progress")))) {
      if (stryMutAct_9fa48("21514")) {
        {}
      } else {
        stryCov_9fa48("21514");
        return stryMutAct_9fa48("21515") ? {} : (stryCov_9fa48("21515"), {
          state: stryMutAct_9fa48("21516") ? {} : (stryCov_9fa48("21516"), {
            ...state,
            progress: event.progress
          }),
          intents: stryMutAct_9fa48("21517") ? ["Stryker was here"] : (stryCov_9fa48("21517"), [])
        });
      }
    }
    if (stryMutAct_9fa48("21520") ? event.kind !== "lxmf/receipt-result" : stryMutAct_9fa48("21519") ? false : stryMutAct_9fa48("21518") ? true : (stryCov_9fa48("21518", "21519", "21520"), event.kind === (stryMutAct_9fa48("21521") ? "" : (stryCov_9fa48("21521"), "lxmf/receipt-result")))) {
      if (stryMutAct_9fa48("21522")) {
        {}
      } else {
        stryCov_9fa48("21522");
        if (stryMutAct_9fa48("21524") ? false : stryMutAct_9fa48("21523") ? true : (stryCov_9fa48("21523", "21524"), event.delivered)) {
          if (stryMutAct_9fa48("21525")) {
            {}
          } else {
            stryCov_9fa48("21525");
            if (stryMutAct_9fa48("21528") ? event.onDelivered !== "sent" : stryMutAct_9fa48("21527") ? false : stryMutAct_9fa48("21526") ? true : (stryCov_9fa48("21526", "21527", "21528"), event.onDelivered === (stryMutAct_9fa48("21529") ? "" : (stryCov_9fa48("21529"), "sent")))) {
              if (stryMutAct_9fa48("21530")) {
                {}
              } else {
                stryCov_9fa48("21530");
                return stryMutAct_9fa48("21531") ? {} : (stryCov_9fa48("21531"), {
                  state: stryMutAct_9fa48("21532") ? {} : (stryCov_9fa48("21532"), {
                    state: LxmfMessageState.SENT,
                    progress: 1
                  }),
                  intents: stryMutAct_9fa48("21533") ? ["Stryker was here"] : (stryCov_9fa48("21533"), [])
                });
              }
            }
            return stryMutAct_9fa48("21534") ? {} : (stryCov_9fa48("21534"), {
              state: stryMutAct_9fa48("21535") ? {} : (stryCov_9fa48("21535"), {
                state: LxmfMessageState.DELIVERED,
                progress: 1
              }),
              intents: stryMutAct_9fa48("21536") ? ["Stryker was here"] : (stryCov_9fa48("21536"), [])
            });
          }
        }
        return stryMutAct_9fa48("21537") ? {} : (stryCov_9fa48("21537"), {
          state: stryMutAct_9fa48("21538") ? {} : (stryCov_9fa48("21538"), {
            state: LxmfMessageState.FAILED,
            progress: state.progress
          }),
          intents: stryMutAct_9fa48("21539") ? ["Stryker was here"] : (stryCov_9fa48("21539"), [])
        });
      }
    }
    return stryMutAct_9fa48("21540") ? {} : (stryCov_9fa48("21540"), {
      state,
      intents: stryMutAct_9fa48("21541") ? ["Stryker was here"] : (stryCov_9fa48("21541"), [])
    });
  }
}
export type LxmfOutboundSendMode = "opportunistic" | "propagated";
export type LxmfReceiptSendPhase = "after-send" | "after-poll";

/**
 * Maps outbound receipt presence/status into LXMF send-state events.
 * Opportunistic: missing receipt → fail; present → sent; delivered → DELIVERED (else noop).
 * Propagated: after-send → progress; after-poll → receipt-result (SENT on deliver, else FAILED).
 */
/** Whether an LXMF receipt send-outcome event should be applied to send-state. */
export function shouldApplyLxmfReceiptSendState(outcomePresent: boolean): boolean {
  if (stryMutAct_9fa48("21542")) {
    {}
  } else {
    stryCov_9fa48("21542");
    return outcomePresent;
  }
}
export function planLxmfReceiptSendOutcome(input: {
  readonly mode: LxmfOutboundSendMode;
  readonly phase: LxmfReceiptSendPhase;
  readonly receiptPresent: boolean;
  readonly delivered: boolean;
}): LxmfSendEvent | null {
  if (stryMutAct_9fa48("21543")) {
    {}
  } else {
    stryCov_9fa48("21543");
    if (stryMutAct_9fa48("21546") ? input.mode !== "opportunistic" : stryMutAct_9fa48("21545") ? false : stryMutAct_9fa48("21544") ? true : (stryCov_9fa48("21544", "21545", "21546"), input.mode === (stryMutAct_9fa48("21547") ? "" : (stryCov_9fa48("21547"), "opportunistic")))) {
      if (stryMutAct_9fa48("21548")) {
        {}
      } else {
        stryCov_9fa48("21548");
        if (stryMutAct_9fa48("21551") ? input.phase !== "after-send" : stryMutAct_9fa48("21550") ? false : stryMutAct_9fa48("21549") ? true : (stryCov_9fa48("21549", "21550", "21551"), input.phase === (stryMutAct_9fa48("21552") ? "" : (stryCov_9fa48("21552"), "after-send")))) {
          if (stryMutAct_9fa48("21553")) {
            {}
          } else {
            stryCov_9fa48("21553");
            if (stryMutAct_9fa48("21556") ? false : stryMutAct_9fa48("21555") ? true : stryMutAct_9fa48("21554") ? input.receiptPresent : (stryCov_9fa48("21554", "21555", "21556"), !input.receiptPresent)) {
              if (stryMutAct_9fa48("21557")) {
                {}
              } else {
                stryCov_9fa48("21557");
                return stryMutAct_9fa48("21558") ? {} : (stryCov_9fa48("21558"), {
                  kind: stryMutAct_9fa48("21559") ? "" : (stryCov_9fa48("21559"), "lxmf/mark-failed")
                });
              }
            }
            return stryMutAct_9fa48("21560") ? {} : (stryCov_9fa48("21560"), {
              kind: stryMutAct_9fa48("21561") ? "" : (stryCov_9fa48("21561"), "lxmf/mark-sent"),
              progress: 0.5
            });
          }
        }
        if (stryMutAct_9fa48("21563") ? false : stryMutAct_9fa48("21562") ? true : (stryCov_9fa48("21562", "21563"), input.delivered)) {
          if (stryMutAct_9fa48("21564")) {
            {}
          } else {
            stryCov_9fa48("21564");
            return stryMutAct_9fa48("21565") ? {} : (stryCov_9fa48("21565"), {
              kind: stryMutAct_9fa48("21566") ? "" : (stryCov_9fa48("21566"), "lxmf/receipt-result"),
              delivered: stryMutAct_9fa48("21567") ? false : (stryCov_9fa48("21567"), true),
              onDelivered: stryMutAct_9fa48("21568") ? "" : (stryCov_9fa48("21568"), "delivered")
            });
          }
        }
        return null;
      }
    }
    if (stryMutAct_9fa48("21571") ? input.phase !== "after-send" : stryMutAct_9fa48("21570") ? false : stryMutAct_9fa48("21569") ? true : (stryCov_9fa48("21569", "21570", "21571"), input.phase === (stryMutAct_9fa48("21572") ? "" : (stryCov_9fa48("21572"), "after-send")))) {
      if (stryMutAct_9fa48("21573")) {
        {}
      } else {
        stryCov_9fa48("21573");
        return stryMutAct_9fa48("21574") ? {} : (stryCov_9fa48("21574"), {
          kind: stryMutAct_9fa48("21575") ? "" : (stryCov_9fa48("21575"), "lxmf/progress"),
          progress: 0.5
        });
      }
    }
    return stryMutAct_9fa48("21576") ? {} : (stryCov_9fa48("21576"), {
      kind: stryMutAct_9fa48("21577") ? "" : (stryCov_9fa48("21577"), "lxmf/receipt-result"),
      delivered: stryMutAct_9fa48("21580") ? input.receiptPresent || input.delivered : stryMutAct_9fa48("21579") ? false : stryMutAct_9fa48("21578") ? true : (stryCov_9fa48("21578", "21579", "21580"), input.receiptPresent && input.delivered),
      onDelivered: stryMutAct_9fa48("21581") ? "" : (stryCov_9fa48("21581"), "sent")
    });
  }
}

/**
 * Receipt-send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfReceiptSendOutcome`
 * reads beside the step). Nested under {@link stepLxmfReceiptSendWithActions}.
 */
export type LxmfReceiptSendPlanState = Record<string, never>;
export type LxmfReceiptSendPlanEvent = Event | {
  readonly kind: "receipt-send/plan-gate";
  readonly mode: LxmfOutboundSendMode;
  readonly phase: LxmfReceiptSendPhase;
  readonly receiptPresent: boolean;
  readonly delivered: boolean;
};
export type LxmfReceiptSendPlanAction = {
  readonly kind: "apply";
  readonly event: LxmfSendEvent;
} | {
  readonly kind: "skip";
};
export interface LxmfReceiptSendPlanStepResult {
  readonly state: LxmfReceiptSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfReceiptSendPlanAction[];
}
export function initialLxmfReceiptSendPlanState(): LxmfReceiptSendPlanState {
  if (stryMutAct_9fa48("21582")) {
    {}
  } else {
    stryCov_9fa48("21582");
    return {};
  }
}
export function stepLxmfReceiptSendPlanWithActions(state: LxmfReceiptSendPlanState, event: LxmfReceiptSendPlanEvent): LxmfReceiptSendPlanStepResult {
  if (stryMutAct_9fa48("21583")) {
    {}
  } else {
    stryCov_9fa48("21583");
    if (stryMutAct_9fa48("21586") ? event.kind !== "receipt-send/plan-gate" : stryMutAct_9fa48("21585") ? false : stryMutAct_9fa48("21584") ? true : (stryCov_9fa48("21584", "21585", "21586"), event.kind === (stryMutAct_9fa48("21587") ? "" : (stryCov_9fa48("21587"), "receipt-send/plan-gate")))) {
      if (stryMutAct_9fa48("21588")) {
        {}
      } else {
        stryCov_9fa48("21588");
        const outcome = planLxmfReceiptSendOutcome(stryMutAct_9fa48("21589") ? {} : (stryCov_9fa48("21589"), {
          mode: event.mode,
          phase: event.phase,
          receiptPresent: event.receiptPresent,
          delivered: event.delivered
        }));
        if (stryMutAct_9fa48("21592") ? outcome !== null : stryMutAct_9fa48("21591") ? false : stryMutAct_9fa48("21590") ? true : (stryCov_9fa48("21590", "21591", "21592"), outcome === null)) {
          if (stryMutAct_9fa48("21593")) {
            {}
          } else {
            stryCov_9fa48("21593");
            return stryMutAct_9fa48("21594") ? {} : (stryCov_9fa48("21594"), {
              state,
              intents: stryMutAct_9fa48("21595") ? ["Stryker was here"] : (stryCov_9fa48("21595"), []),
              actions: stryMutAct_9fa48("21596") ? [] : (stryCov_9fa48("21596"), [stryMutAct_9fa48("21597") ? {} : (stryCov_9fa48("21597"), {
                kind: stryMutAct_9fa48("21598") ? "" : (stryCov_9fa48("21598"), "skip")
              })])
            });
          }
        }
        return stryMutAct_9fa48("21599") ? {} : (stryCov_9fa48("21599"), {
          state,
          intents: stryMutAct_9fa48("21600") ? ["Stryker was here"] : (stryCov_9fa48("21600"), []),
          actions: stryMutAct_9fa48("21601") ? [] : (stryCov_9fa48("21601"), [stryMutAct_9fa48("21602") ? {} : (stryCov_9fa48("21602"), {
            kind: stryMutAct_9fa48("21603") ? "" : (stryCov_9fa48("21603"), "apply"),
            event: outcome
          })])
        });
      }
    }
    return stryMutAct_9fa48("21604") ? {} : (stryCov_9fa48("21604"), {
      state,
      intents: stryMutAct_9fa48("21605") ? ["Stryker was here"] : (stryCov_9fa48("21605"), []),
      actions: stryMutAct_9fa48("21606") ? ["Stryker was here"] : (stryCov_9fa48("21606"), [])
    });
  }
}

/** Whether plan actions apply a send-state event. */
export function shouldApplyLxmfReceiptSendPlan(actions: ReadonlyArray<LxmfReceiptSendPlanAction>): boolean {
  if (stryMutAct_9fa48("21607")) {
    {}
  } else {
    stryCov_9fa48("21607");
    return stryMutAct_9fa48("21608") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("21608"), actions.some(stryMutAct_9fa48("21609") ? () => undefined : (stryCov_9fa48("21609"), action => stryMutAct_9fa48("21612") ? action.kind !== "apply" : stryMutAct_9fa48("21611") ? false : stryMutAct_9fa48("21610") ? true : (stryCov_9fa48("21610", "21611", "21612"), action.kind === (stryMutAct_9fa48("21613") ? "" : (stryCov_9fa48("21613"), "apply"))))));
  }
}

/** Whether plan actions skip send-state update. */
export function shouldSkipLxmfReceiptSendPlan(actions: ReadonlyArray<LxmfReceiptSendPlanAction>): boolean {
  if (stryMutAct_9fa48("21614")) {
    {}
  } else {
    stryCov_9fa48("21614");
    return stryMutAct_9fa48("21615") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("21615"), actions.some(stryMutAct_9fa48("21616") ? () => undefined : (stryCov_9fa48("21616"), action => stryMutAct_9fa48("21619") ? action.kind !== "skip" : stryMutAct_9fa48("21618") ? false : stryMutAct_9fa48("21617") ? true : (stryCov_9fa48("21617", "21618", "21619"), action.kind === (stryMutAct_9fa48("21620") ? "" : (stryCov_9fa48("21620"), "skip"))))));
  }
}

/** Send-state event from a plan apply action, if present. */
export function lxmfReceiptSendPlanApplyEvent(actions: ReadonlyArray<LxmfReceiptSendPlanAction>): LxmfSendEvent | null {
  if (stryMutAct_9fa48("21621")) {
    {}
  } else {
    stryCov_9fa48("21621");
    for (const action of actions) {
      if (stryMutAct_9fa48("21622")) {
        {}
      } else {
        stryCov_9fa48("21622");
        if (stryMutAct_9fa48("21625") ? action.kind !== "apply" : stryMutAct_9fa48("21624") ? false : stryMutAct_9fa48("21623") ? true : (stryCov_9fa48("21623", "21624", "21625"), action.kind === (stryMutAct_9fa48("21626") ? "" : (stryCov_9fa48("21626"), "apply")))) {
          if (stryMutAct_9fa48("21627")) {
            {}
          } else {
            stryCov_9fa48("21627");
            return action.event;
          }
        }
      }
    }
    return null;
  }
}

/**
 * Receipt → send-state mapping is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfReceiptSendPlanWithActions} (`apply`|`skip`).
 */
export type LxmfReceiptSendState = Record<string, never>;
export type LxmfReceiptSendEvent = Event | {
  readonly kind: "receipt-send/map";
  readonly mode: LxmfOutboundSendMode;
  readonly phase: LxmfReceiptSendPhase;
  readonly receiptPresent: boolean;
  readonly delivered: boolean;
};

/**
 * Adapter applies send-state update or skip only from these actions.
 * Plan nested via {@link stepLxmfReceiptSendPlanWithActions} (`apply`|`skip`).
 */
export type LxmfReceiptSendAction = {
  readonly kind: "apply";
  readonly event: LxmfSendEvent;
} | {
  readonly kind: "skip";
};
export interface LxmfReceiptSendStepResult {
  readonly state: LxmfReceiptSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfReceiptSendAction[];
}
export function initialLxmfReceiptSendState(): LxmfReceiptSendState {
  if (stryMutAct_9fa48("21628")) {
    {}
  } else {
    stryCov_9fa48("21628");
    return {};
  }
}
export const stepLxmfReceiptSend: StepFn<LxmfReceiptSendState> = (state, event) => {
  if (stryMutAct_9fa48("21629")) {
    {}
  } else {
    stryCov_9fa48("21629");
    const result = stepLxmfReceiptSendInner(state, event as LxmfReceiptSendEvent);
    return stryMutAct_9fa48("21630") ? {} : (stryCov_9fa48("21630"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfReceiptSendWithActions(state: LxmfReceiptSendState, event: LxmfReceiptSendEvent): LxmfReceiptSendStepResult {
  if (stryMutAct_9fa48("21631")) {
    {}
  } else {
    stryCov_9fa48("21631");
    return stepLxmfReceiptSendInner(state, event);
  }
}
export function shouldApplyLxmfReceiptSend(actions: ReadonlyArray<LxmfReceiptSendAction>): boolean {
  if (stryMutAct_9fa48("21632")) {
    {}
  } else {
    stryCov_9fa48("21632");
    return stryMutAct_9fa48("21633") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("21633"), actions.some(stryMutAct_9fa48("21634") ? () => undefined : (stryCov_9fa48("21634"), action => stryMutAct_9fa48("21637") ? action.kind !== "apply" : stryMutAct_9fa48("21636") ? false : stryMutAct_9fa48("21635") ? true : (stryCov_9fa48("21635", "21636", "21637"), action.kind === (stryMutAct_9fa48("21638") ? "" : (stryCov_9fa48("21638"), "apply"))))));
  }
}
export function shouldSkipLxmfReceiptSend(actions: ReadonlyArray<LxmfReceiptSendAction>): boolean {
  if (stryMutAct_9fa48("21639")) {
    {}
  } else {
    stryCov_9fa48("21639");
    return stryMutAct_9fa48("21640") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("21640"), actions.some(stryMutAct_9fa48("21641") ? () => undefined : (stryCov_9fa48("21641"), action => stryMutAct_9fa48("21644") ? action.kind !== "skip" : stryMutAct_9fa48("21643") ? false : stryMutAct_9fa48("21642") ? true : (stryCov_9fa48("21642", "21643", "21644"), action.kind === (stryMutAct_9fa48("21645") ? "" : (stryCov_9fa48("21645"), "skip"))))));
  }
}

/** Send-state event from an apply action, if present. */
export function lxmfReceiptSendApplyEvent(actions: ReadonlyArray<LxmfReceiptSendAction>): LxmfSendEvent | null {
  if (stryMutAct_9fa48("21646")) {
    {}
  } else {
    stryCov_9fa48("21646");
    for (const action of actions) {
      if (stryMutAct_9fa48("21647")) {
        {}
      } else {
        stryCov_9fa48("21647");
        if (stryMutAct_9fa48("21650") ? action.kind !== "apply" : stryMutAct_9fa48("21649") ? false : stryMutAct_9fa48("21648") ? true : (stryCov_9fa48("21648", "21649", "21650"), action.kind === (stryMutAct_9fa48("21651") ? "" : (stryCov_9fa48("21651"), "apply")))) {
          if (stryMutAct_9fa48("21652")) {
            {}
          } else {
            stryCov_9fa48("21652");
            return action.event;
          }
        }
      }
    }
    return null;
  }
}
function stepLxmfReceiptSendInner(state: LxmfReceiptSendState, event: LxmfReceiptSendEvent): LxmfReceiptSendStepResult {
  if (stryMutAct_9fa48("21653")) {
    {}
  } else {
    stryCov_9fa48("21653");
    if (stryMutAct_9fa48("21656") ? event.kind !== "receipt-send/map" : stryMutAct_9fa48("21655") ? false : stryMutAct_9fa48("21654") ? true : (stryCov_9fa48("21654", "21655", "21656"), event.kind === (stryMutAct_9fa48("21657") ? "" : (stryCov_9fa48("21657"), "receipt-send/map")))) {
      if (stryMutAct_9fa48("21658")) {
        {}
      } else {
        stryCov_9fa48("21658");
        const planActions = stepLxmfReceiptSendPlanWithActions(initialLxmfReceiptSendPlanState(), stryMutAct_9fa48("21659") ? {} : (stryCov_9fa48("21659"), {
          kind: stryMutAct_9fa48("21660") ? "" : (stryCov_9fa48("21660"), "receipt-send/plan-gate"),
          mode: event.mode,
          phase: event.phase,
          receiptPresent: event.receiptPresent,
          delivered: event.delivered
        })).actions;
        if (stryMutAct_9fa48("21662") ? false : stryMutAct_9fa48("21661") ? true : (stryCov_9fa48("21661", "21662"), shouldSkipLxmfReceiptSendPlan(planActions))) {
          if (stryMutAct_9fa48("21663")) {
            {}
          } else {
            stryCov_9fa48("21663");
            return stryMutAct_9fa48("21664") ? {} : (stryCov_9fa48("21664"), {
              state,
              intents: stryMutAct_9fa48("21665") ? ["Stryker was here"] : (stryCov_9fa48("21665"), []),
              actions: stryMutAct_9fa48("21666") ? [] : (stryCov_9fa48("21666"), [stryMutAct_9fa48("21667") ? {} : (stryCov_9fa48("21667"), {
                kind: stryMutAct_9fa48("21668") ? "" : (stryCov_9fa48("21668"), "skip")
              })])
            });
          }
        }
        const planned = lxmfReceiptSendPlanApplyEvent(planActions);
        if (stryMutAct_9fa48("21671") ? planned !== null : stryMutAct_9fa48("21670") ? false : stryMutAct_9fa48("21669") ? true : (stryCov_9fa48("21669", "21670", "21671"), planned === null)) {
          if (stryMutAct_9fa48("21672")) {
            {}
          } else {
            stryCov_9fa48("21672");
            return stryMutAct_9fa48("21673") ? {} : (stryCov_9fa48("21673"), {
              state,
              intents: stryMutAct_9fa48("21674") ? ["Stryker was here"] : (stryCov_9fa48("21674"), []),
              actions: stryMutAct_9fa48("21675") ? [] : (stryCov_9fa48("21675"), [stryMutAct_9fa48("21676") ? {} : (stryCov_9fa48("21676"), {
                kind: stryMutAct_9fa48("21677") ? "" : (stryCov_9fa48("21677"), "skip")
              })])
            });
          }
        }
        return stryMutAct_9fa48("21678") ? {} : (stryCov_9fa48("21678"), {
          state,
          intents: stryMutAct_9fa48("21679") ? ["Stryker was here"] : (stryCov_9fa48("21679"), []),
          actions: stryMutAct_9fa48("21680") ? [] : (stryCov_9fa48("21680"), [stryMutAct_9fa48("21681") ? {} : (stryCov_9fa48("21681"), {
            kind: stryMutAct_9fa48("21682") ? "" : (stryCov_9fa48("21682"), "apply"),
            event: planned
          })])
        });
      }
    }
    return stryMutAct_9fa48("21683") ? {} : (stryCov_9fa48("21683"), {
      state,
      intents: stryMutAct_9fa48("21684") ? ["Stryker was here"] : (stryCov_9fa48("21684"), []),
      actions: stryMutAct_9fa48("21685") ? ["Stryker was here"] : (stryCov_9fa48("21685"), [])
    });
  }
}