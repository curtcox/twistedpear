/**
 * Pure LXMF propagation download transfer phases.
 * Adapters perform link/request IO; this machine owns phase transitions.
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
import { LINK_AWAIT_DEFAULT_TIMEOUT_MS } from "./link-await.js";

/** Mirrors LXMF/LXMRouter.py propagation transfer states. */
export const PropagationTransferState = {
  IDLE: 0x00,
  PATH_REQUESTED: 0x01,
  LINK_ESTABLISHING: 0x02,
  LINK_ESTABLISHED: 0x03,
  REQUEST_SENT: 0x04,
  RECEIVING: 0x05,
  RESPONSE_RECEIVED: 0x06,
  COMPLETE: 0x07,
  NO_PATH: 0xf0,
  LINK_FAILED: 0xf1,
  TRANSFER_FAILED: 0xf2,
  NO_IDENTITY_RCVD: 0xf3,
  NO_ACCESS: 0xf4,
  FAILED: 0xfe
} as const;
export type PropagationTransferStateValue = (typeof PropagationTransferState)[keyof typeof PropagationTransferState];

/** Mirrors LXMF/LXMPeer.py peer error codes used during /get. */
export const PropagationPeerError = {
  NO_IDENTITY: 0xf0,
  NO_ACCESS: 0xf1,
  TIMEOUT: 0xfe
} as const;
export const PROPAGATION_LINK_TIMEOUT_MS = LINK_AWAIT_DEFAULT_TIMEOUT_MS;
export const PROPAGATION_LINK_TIMER_ID = stryMutAct_9fa48("28316") ? "" : (stryCov_9fa48("28316"), "propagation-link");
export const PROPAGATION_LIST_TIMEOUT_SEC = 10;
export const PROPAGATION_DOWNLOAD_TIMEOUT_SEC = 30;
export const PROPAGATION_HAVES_TIMEOUT_SEC = 10;
export type PropagationTransferAction = {
  readonly kind: "establish-link";
  readonly timeoutMs: number;
} | {
  readonly kind: "resolve-link-wait";
} | {
  readonly kind: "reject-link-wait";
  readonly reason: "timeout";
} | {
  readonly kind: "identify";
} | {
  readonly kind: "request-list";
  readonly timeoutSec: number;
} | {
  readonly kind: "request-download";
  readonly timeoutSec: number;
} | {
  readonly kind: "request-haves-ack";
  readonly timeoutSec: number;
} | {
  readonly kind: "teardown-link";
};
export interface PropagationTransferMachineState {
  readonly phase: PropagationTransferStateValue;
  readonly wantCount: number;
  readonly downloadedCount: number;
}
export type PropagationTransferEvent = Event | {
  readonly kind: "xfer/begin";
} | {
  readonly kind: "xfer/link-timeout";
} | {
  readonly kind: "xfer/link-arrived";
} | {
  readonly kind: "xfer/link-ready";
} | {
  readonly kind: "xfer/list-null";
} | {
  readonly kind: "xfer/list-peer-error";
  readonly code: number;
} | {
  readonly kind: "xfer/list-malformed";
} | {
  readonly kind: "xfer/list-empty";
} | {
  readonly kind: "xfer/list-ready";
  readonly wantCount: number;
} | {
  readonly kind: "xfer/download-null";
} | {
  readonly kind: "xfer/download-malformed";
} | {
  readonly kind: "xfer/download-ready";
  readonly downloadedCount: number;
} | {
  readonly kind: "xfer/haves-acked";
} | {
  readonly kind: "xfer/cancel";
};
export interface PropagationTransferStepResult {
  readonly state: PropagationTransferMachineState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PropagationTransferAction[];
}
export function initialPropagationTransferState(): PropagationTransferMachineState {
  if (stryMutAct_9fa48("28317")) {
    {}
  } else {
    stryCov_9fa48("28317");
    return stryMutAct_9fa48("28318") ? {} : (stryCov_9fa48("28318"), {
      phase: PropagationTransferState.IDLE,
      wantCount: 0,
      downloadedCount: 0
    });
  }
}
export const stepPropagationTransfer: StepFn<PropagationTransferMachineState> = (state, event) => {
  if (stryMutAct_9fa48("28319")) {
    {}
  } else {
    stryCov_9fa48("28319");
    const result = stepPropagationTransferInner(state, event as PropagationTransferEvent);
    return stryMutAct_9fa48("28320") ? {} : (stryCov_9fa48("28320"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPropagationTransferWithActions(state: PropagationTransferMachineState, event: PropagationTransferEvent): PropagationTransferStepResult {
  if (stryMutAct_9fa48("28321")) {
    {}
  } else {
    stryCov_9fa48("28321");
    return stepPropagationTransferInner(state, event);
  }
}
function stepPropagationTransferInner(state: PropagationTransferMachineState, event: PropagationTransferEvent): PropagationTransferStepResult {
  if (stryMutAct_9fa48("28322")) {
    {}
  } else {
    stryCov_9fa48("28322");
    if (stryMutAct_9fa48("28325") ? event.kind !== "xfer/cancel" : stryMutAct_9fa48("28324") ? false : stryMutAct_9fa48("28323") ? true : (stryCov_9fa48("28323", "28324", "28325"), event.kind === (stryMutAct_9fa48("28326") ? "" : (stryCov_9fa48("28326"), "xfer/cancel")))) {
      if (stryMutAct_9fa48("28327")) {
        {}
      } else {
        stryCov_9fa48("28327");
        return stryMutAct_9fa48("28328") ? {} : (stryCov_9fa48("28328"), {
          state: initialPropagationTransferState(),
          intents: stryMutAct_9fa48("28329") ? [] : (stryCov_9fa48("28329"), [stryMutAct_9fa48("28330") ? {} : (stryCov_9fa48("28330"), {
            kind: stryMutAct_9fa48("28331") ? "" : (stryCov_9fa48("28331"), "timer/cancel"),
            timer: stryMutAct_9fa48("28332") ? {} : (stryCov_9fa48("28332"), {
              id: PROPAGATION_LINK_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("28333") ? [] : (stryCov_9fa48("28333"), [stryMutAct_9fa48("28334") ? {} : (stryCov_9fa48("28334"), {
            kind: stryMutAct_9fa48("28335") ? "" : (stryCov_9fa48("28335"), "teardown-link")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28338") ? event.kind !== "xfer/begin" : stryMutAct_9fa48("28337") ? false : stryMutAct_9fa48("28336") ? true : (stryCov_9fa48("28336", "28337", "28338"), event.kind === (stryMutAct_9fa48("28339") ? "" : (stryCov_9fa48("28339"), "xfer/begin")))) {
      if (stryMutAct_9fa48("28340")) {
        {}
      } else {
        stryCov_9fa48("28340");
        return stryMutAct_9fa48("28341") ? {} : (stryCov_9fa48("28341"), {
          state: stryMutAct_9fa48("28342") ? {} : (stryCov_9fa48("28342"), {
            phase: PropagationTransferState.LINK_ESTABLISHING,
            wantCount: 0,
            downloadedCount: 0
          }),
          intents: stryMutAct_9fa48("28343") ? [] : (stryCov_9fa48("28343"), [stryMutAct_9fa48("28344") ? {} : (stryCov_9fa48("28344"), {
            kind: stryMutAct_9fa48("28345") ? "" : (stryCov_9fa48("28345"), "timer/set"),
            timer: stryMutAct_9fa48("28346") ? {} : (stryCov_9fa48("28346"), {
              id: PROPAGATION_LINK_TIMER_ID,
              delayMs: PROPAGATION_LINK_TIMEOUT_MS
            })
          })]),
          actions: stryMutAct_9fa48("28347") ? [] : (stryCov_9fa48("28347"), [stryMutAct_9fa48("28348") ? {} : (stryCov_9fa48("28348"), {
            kind: stryMutAct_9fa48("28349") ? "" : (stryCov_9fa48("28349"), "establish-link"),
            timeoutMs: PROPAGATION_LINK_TIMEOUT_MS
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28352") ? event.kind === "timer/fired" || event.id === PROPAGATION_LINK_TIMER_ID : stryMutAct_9fa48("28351") ? false : stryMutAct_9fa48("28350") ? true : (stryCov_9fa48("28350", "28351", "28352"), (stryMutAct_9fa48("28354") ? event.kind !== "timer/fired" : stryMutAct_9fa48("28353") ? true : (stryCov_9fa48("28353", "28354"), event.kind === (stryMutAct_9fa48("28355") ? "" : (stryCov_9fa48("28355"), "timer/fired")))) && (stryMutAct_9fa48("28357") ? event.id !== PROPAGATION_LINK_TIMER_ID : stryMutAct_9fa48("28356") ? true : (stryCov_9fa48("28356", "28357"), event.id === PROPAGATION_LINK_TIMER_ID)))) {
      if (stryMutAct_9fa48("28358")) {
        {}
      } else {
        stryCov_9fa48("28358");
        if (stryMutAct_9fa48("28361") ? state.phase === PropagationTransferState.LINK_ESTABLISHING : stryMutAct_9fa48("28360") ? false : stryMutAct_9fa48("28359") ? true : (stryCov_9fa48("28359", "28360", "28361"), state.phase !== PropagationTransferState.LINK_ESTABLISHING)) {
          if (stryMutAct_9fa48("28362")) {
            {}
          } else {
            stryCov_9fa48("28362");
            return stryMutAct_9fa48("28363") ? {} : (stryCov_9fa48("28363"), {
              state,
              intents: stryMutAct_9fa48("28364") ? ["Stryker was here"] : (stryCov_9fa48("28364"), []),
              actions: stryMutAct_9fa48("28365") ? ["Stryker was here"] : (stryCov_9fa48("28365"), [])
            });
          }
        }
        return stryMutAct_9fa48("28366") ? {} : (stryCov_9fa48("28366"), {
          state: stryMutAct_9fa48("28367") ? {} : (stryCov_9fa48("28367"), {
            ...state,
            phase: PropagationTransferState.LINK_FAILED
          }),
          intents: stryMutAct_9fa48("28368") ? ["Stryker was here"] : (stryCov_9fa48("28368"), []),
          actions: stryMutAct_9fa48("28369") ? [] : (stryCov_9fa48("28369"), [stryMutAct_9fa48("28370") ? {} : (stryCov_9fa48("28370"), {
            kind: stryMutAct_9fa48("28371") ? "" : (stryCov_9fa48("28371"), "teardown-link")
          }), stryMutAct_9fa48("28372") ? {} : (stryCov_9fa48("28372"), {
            kind: stryMutAct_9fa48("28373") ? "" : (stryCov_9fa48("28373"), "reject-link-wait"),
            reason: stryMutAct_9fa48("28374") ? "" : (stryCov_9fa48("28374"), "timeout")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28377") ? event.kind !== "xfer/link-timeout" : stryMutAct_9fa48("28376") ? false : stryMutAct_9fa48("28375") ? true : (stryCov_9fa48("28375", "28376", "28377"), event.kind === (stryMutAct_9fa48("28378") ? "" : (stryCov_9fa48("28378"), "xfer/link-timeout")))) {
      if (stryMutAct_9fa48("28379")) {
        {}
      } else {
        stryCov_9fa48("28379");
        return stryMutAct_9fa48("28380") ? {} : (stryCov_9fa48("28380"), {
          state: stryMutAct_9fa48("28381") ? {} : (stryCov_9fa48("28381"), {
            ...state,
            phase: PropagationTransferState.LINK_FAILED
          }),
          intents: stryMutAct_9fa48("28382") ? [] : (stryCov_9fa48("28382"), [stryMutAct_9fa48("28383") ? {} : (stryCov_9fa48("28383"), {
            kind: stryMutAct_9fa48("28384") ? "" : (stryCov_9fa48("28384"), "timer/cancel"),
            timer: stryMutAct_9fa48("28385") ? {} : (stryCov_9fa48("28385"), {
              id: PROPAGATION_LINK_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("28386") ? [] : (stryCov_9fa48("28386"), [stryMutAct_9fa48("28387") ? {} : (stryCov_9fa48("28387"), {
            kind: stryMutAct_9fa48("28388") ? "" : (stryCov_9fa48("28388"), "teardown-link")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28391") ? event.kind !== "xfer/link-arrived" : stryMutAct_9fa48("28390") ? false : stryMutAct_9fa48("28389") ? true : (stryCov_9fa48("28389", "28390", "28391"), event.kind === (stryMutAct_9fa48("28392") ? "" : (stryCov_9fa48("28392"), "xfer/link-arrived")))) {
      if (stryMutAct_9fa48("28393")) {
        {}
      } else {
        stryCov_9fa48("28393");
        if (stryMutAct_9fa48("28396") ? state.phase === PropagationTransferState.LINK_ESTABLISHING : stryMutAct_9fa48("28395") ? false : stryMutAct_9fa48("28394") ? true : (stryCov_9fa48("28394", "28395", "28396"), state.phase !== PropagationTransferState.LINK_ESTABLISHING)) {
          if (stryMutAct_9fa48("28397")) {
            {}
          } else {
            stryCov_9fa48("28397");
            return stryMutAct_9fa48("28398") ? {} : (stryCov_9fa48("28398"), {
              state,
              intents: stryMutAct_9fa48("28399") ? ["Stryker was here"] : (stryCov_9fa48("28399"), []),
              actions: stryMutAct_9fa48("28400") ? ["Stryker was here"] : (stryCov_9fa48("28400"), [])
            });
          }
        }
        return stryMutAct_9fa48("28401") ? {} : (stryCov_9fa48("28401"), {
          state,
          intents: stryMutAct_9fa48("28402") ? [] : (stryCov_9fa48("28402"), [stryMutAct_9fa48("28403") ? {} : (stryCov_9fa48("28403"), {
            kind: stryMutAct_9fa48("28404") ? "" : (stryCov_9fa48("28404"), "timer/cancel"),
            timer: stryMutAct_9fa48("28405") ? {} : (stryCov_9fa48("28405"), {
              id: PROPAGATION_LINK_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("28406") ? [] : (stryCov_9fa48("28406"), [stryMutAct_9fa48("28407") ? {} : (stryCov_9fa48("28407"), {
            kind: stryMutAct_9fa48("28408") ? "" : (stryCov_9fa48("28408"), "resolve-link-wait")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28411") ? event.kind !== "xfer/link-ready" : stryMutAct_9fa48("28410") ? false : stryMutAct_9fa48("28409") ? true : (stryCov_9fa48("28409", "28410", "28411"), event.kind === (stryMutAct_9fa48("28412") ? "" : (stryCov_9fa48("28412"), "xfer/link-ready")))) {
      if (stryMutAct_9fa48("28413")) {
        {}
      } else {
        stryCov_9fa48("28413");
        return stryMutAct_9fa48("28414") ? {} : (stryCov_9fa48("28414"), {
          state: stryMutAct_9fa48("28415") ? {} : (stryCov_9fa48("28415"), {
            ...state,
            phase: PropagationTransferState.LINK_ESTABLISHED
          }),
          intents: stryMutAct_9fa48("28416") ? [] : (stryCov_9fa48("28416"), [stryMutAct_9fa48("28417") ? {} : (stryCov_9fa48("28417"), {
            kind: stryMutAct_9fa48("28418") ? "" : (stryCov_9fa48("28418"), "timer/cancel"),
            timer: stryMutAct_9fa48("28419") ? {} : (stryCov_9fa48("28419"), {
              id: PROPAGATION_LINK_TIMER_ID
            })
          })]),
          actions: stryMutAct_9fa48("28420") ? [] : (stryCov_9fa48("28420"), [stryMutAct_9fa48("28421") ? {} : (stryCov_9fa48("28421"), {
            kind: stryMutAct_9fa48("28422") ? "" : (stryCov_9fa48("28422"), "identify")
          }), stryMutAct_9fa48("28423") ? {} : (stryCov_9fa48("28423"), {
            kind: stryMutAct_9fa48("28424") ? "" : (stryCov_9fa48("28424"), "request-list"),
            timeoutSec: PROPAGATION_LIST_TIMEOUT_SEC
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28427") ? event.kind === "xfer/list-null" && event.kind === "xfer/list-malformed" : stryMutAct_9fa48("28426") ? false : stryMutAct_9fa48("28425") ? true : (stryCov_9fa48("28425", "28426", "28427"), (stryMutAct_9fa48("28429") ? event.kind !== "xfer/list-null" : stryMutAct_9fa48("28428") ? false : (stryCov_9fa48("28428", "28429"), event.kind === (stryMutAct_9fa48("28430") ? "" : (stryCov_9fa48("28430"), "xfer/list-null")))) || (stryMutAct_9fa48("28432") ? event.kind !== "xfer/list-malformed" : stryMutAct_9fa48("28431") ? false : (stryCov_9fa48("28431", "28432"), event.kind === (stryMutAct_9fa48("28433") ? "" : (stryCov_9fa48("28433"), "xfer/list-malformed")))))) {
      if (stryMutAct_9fa48("28434")) {
        {}
      } else {
        stryCov_9fa48("28434");
        return stryMutAct_9fa48("28435") ? {} : (stryCov_9fa48("28435"), {
          state: stryMutAct_9fa48("28436") ? {} : (stryCov_9fa48("28436"), {
            ...state,
            phase: PropagationTransferState.TRANSFER_FAILED
          }),
          intents: stryMutAct_9fa48("28437") ? ["Stryker was here"] : (stryCov_9fa48("28437"), []),
          actions: stryMutAct_9fa48("28438") ? ["Stryker was here"] : (stryCov_9fa48("28438"), [])
        });
      }
    }
    if (stryMutAct_9fa48("28441") ? event.kind !== "xfer/list-peer-error" : stryMutAct_9fa48("28440") ? false : stryMutAct_9fa48("28439") ? true : (stryCov_9fa48("28439", "28440", "28441"), event.kind === (stryMutAct_9fa48("28442") ? "" : (stryCov_9fa48("28442"), "xfer/list-peer-error")))) {
      if (stryMutAct_9fa48("28443")) {
        {}
      } else {
        stryCov_9fa48("28443");
        const phase = (stryMutAct_9fa48("28446") ? event.code !== PropagationPeerError.NO_IDENTITY : stryMutAct_9fa48("28445") ? false : stryMutAct_9fa48("28444") ? true : (stryCov_9fa48("28444", "28445", "28446"), event.code === PropagationPeerError.NO_IDENTITY)) ? PropagationTransferState.NO_IDENTITY_RCVD : PropagationTransferState.NO_ACCESS;
        return stryMutAct_9fa48("28447") ? {} : (stryCov_9fa48("28447"), {
          state: stryMutAct_9fa48("28448") ? {} : (stryCov_9fa48("28448"), {
            ...state,
            phase
          }),
          intents: stryMutAct_9fa48("28449") ? ["Stryker was here"] : (stryCov_9fa48("28449"), []),
          actions: stryMutAct_9fa48("28450") ? ["Stryker was here"] : (stryCov_9fa48("28450"), [])
        });
      }
    }
    if (stryMutAct_9fa48("28453") ? event.kind !== "xfer/list-empty" : stryMutAct_9fa48("28452") ? false : stryMutAct_9fa48("28451") ? true : (stryCov_9fa48("28451", "28452", "28453"), event.kind === (stryMutAct_9fa48("28454") ? "" : (stryCov_9fa48("28454"), "xfer/list-empty")))) {
      if (stryMutAct_9fa48("28455")) {
        {}
      } else {
        stryCov_9fa48("28455");
        return stryMutAct_9fa48("28456") ? {} : (stryCov_9fa48("28456"), {
          state: stryMutAct_9fa48("28457") ? {} : (stryCov_9fa48("28457"), {
            ...state,
            phase: PropagationTransferState.COMPLETE,
            wantCount: 0
          }),
          intents: stryMutAct_9fa48("28458") ? ["Stryker was here"] : (stryCov_9fa48("28458"), []),
          actions: stryMutAct_9fa48("28459") ? ["Stryker was here"] : (stryCov_9fa48("28459"), [])
        });
      }
    }
    if (stryMutAct_9fa48("28462") ? event.kind !== "xfer/list-ready" : stryMutAct_9fa48("28461") ? false : stryMutAct_9fa48("28460") ? true : (stryCov_9fa48("28460", "28461", "28462"), event.kind === (stryMutAct_9fa48("28463") ? "" : (stryCov_9fa48("28463"), "xfer/list-ready")))) {
      if (stryMutAct_9fa48("28464")) {
        {}
      } else {
        stryCov_9fa48("28464");
        return stryMutAct_9fa48("28465") ? {} : (stryCov_9fa48("28465"), {
          state: stryMutAct_9fa48("28466") ? {} : (stryCov_9fa48("28466"), {
            ...state,
            phase: PropagationTransferState.REQUEST_SENT,
            wantCount: event.wantCount
          }),
          intents: stryMutAct_9fa48("28467") ? ["Stryker was here"] : (stryCov_9fa48("28467"), []),
          actions: stryMutAct_9fa48("28468") ? [] : (stryCov_9fa48("28468"), [stryMutAct_9fa48("28469") ? {} : (stryCov_9fa48("28469"), {
            kind: stryMutAct_9fa48("28470") ? "" : (stryCov_9fa48("28470"), "request-download"),
            timeoutSec: PROPAGATION_DOWNLOAD_TIMEOUT_SEC
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28473") ? event.kind === "xfer/download-null" && event.kind === "xfer/download-malformed" : stryMutAct_9fa48("28472") ? false : stryMutAct_9fa48("28471") ? true : (stryCov_9fa48("28471", "28472", "28473"), (stryMutAct_9fa48("28475") ? event.kind !== "xfer/download-null" : stryMutAct_9fa48("28474") ? false : (stryCov_9fa48("28474", "28475"), event.kind === (stryMutAct_9fa48("28476") ? "" : (stryCov_9fa48("28476"), "xfer/download-null")))) || (stryMutAct_9fa48("28478") ? event.kind !== "xfer/download-malformed" : stryMutAct_9fa48("28477") ? false : (stryCov_9fa48("28477", "28478"), event.kind === (stryMutAct_9fa48("28479") ? "" : (stryCov_9fa48("28479"), "xfer/download-malformed")))))) {
      if (stryMutAct_9fa48("28480")) {
        {}
      } else {
        stryCov_9fa48("28480");
        return stryMutAct_9fa48("28481") ? {} : (stryCov_9fa48("28481"), {
          state: stryMutAct_9fa48("28482") ? {} : (stryCov_9fa48("28482"), {
            ...state,
            phase: PropagationTransferState.TRANSFER_FAILED
          }),
          intents: stryMutAct_9fa48("28483") ? ["Stryker was here"] : (stryCov_9fa48("28483"), []),
          actions: stryMutAct_9fa48("28484") ? ["Stryker was here"] : (stryCov_9fa48("28484"), [])
        });
      }
    }
    if (stryMutAct_9fa48("28487") ? event.kind !== "xfer/download-ready" : stryMutAct_9fa48("28486") ? false : stryMutAct_9fa48("28485") ? true : (stryCov_9fa48("28485", "28486", "28487"), event.kind === (stryMutAct_9fa48("28488") ? "" : (stryCov_9fa48("28488"), "xfer/download-ready")))) {
      if (stryMutAct_9fa48("28489")) {
        {}
      } else {
        stryCov_9fa48("28489");
        const next: PropagationTransferMachineState = stryMutAct_9fa48("28490") ? {} : (stryCov_9fa48("28490"), {
          ...state,
          phase: PropagationTransferState.RESPONSE_RECEIVED,
          downloadedCount: event.downloadedCount
        });
        if (stryMutAct_9fa48("28494") ? event.downloadedCount > 0 : stryMutAct_9fa48("28493") ? event.downloadedCount < 0 : stryMutAct_9fa48("28492") ? false : stryMutAct_9fa48("28491") ? true : (stryCov_9fa48("28491", "28492", "28493", "28494"), event.downloadedCount <= 0)) {
          if (stryMutAct_9fa48("28495")) {
            {}
          } else {
            stryCov_9fa48("28495");
            return stryMutAct_9fa48("28496") ? {} : (stryCov_9fa48("28496"), {
              state: stryMutAct_9fa48("28497") ? {} : (stryCov_9fa48("28497"), {
                ...next,
                phase: PropagationTransferState.COMPLETE
              }),
              intents: stryMutAct_9fa48("28498") ? ["Stryker was here"] : (stryCov_9fa48("28498"), []),
              actions: stryMutAct_9fa48("28499") ? ["Stryker was here"] : (stryCov_9fa48("28499"), [])
            });
          }
        }
        return stryMutAct_9fa48("28500") ? {} : (stryCov_9fa48("28500"), {
          state: next,
          intents: stryMutAct_9fa48("28501") ? ["Stryker was here"] : (stryCov_9fa48("28501"), []),
          actions: stryMutAct_9fa48("28502") ? [] : (stryCov_9fa48("28502"), [stryMutAct_9fa48("28503") ? {} : (stryCov_9fa48("28503"), {
            kind: stryMutAct_9fa48("28504") ? "" : (stryCov_9fa48("28504"), "request-haves-ack"),
            timeoutSec: PROPAGATION_HAVES_TIMEOUT_SEC
          })])
        });
      }
    }
    if (stryMutAct_9fa48("28507") ? event.kind !== "xfer/haves-acked" : stryMutAct_9fa48("28506") ? false : stryMutAct_9fa48("28505") ? true : (stryCov_9fa48("28505", "28506", "28507"), event.kind === (stryMutAct_9fa48("28508") ? "" : (stryCov_9fa48("28508"), "xfer/haves-acked")))) {
      if (stryMutAct_9fa48("28509")) {
        {}
      } else {
        stryCov_9fa48("28509");
        return stryMutAct_9fa48("28510") ? {} : (stryCov_9fa48("28510"), {
          state: stryMutAct_9fa48("28511") ? {} : (stryCov_9fa48("28511"), {
            ...state,
            phase: PropagationTransferState.COMPLETE
          }),
          intents: stryMutAct_9fa48("28512") ? ["Stryker was here"] : (stryCov_9fa48("28512"), []),
          actions: stryMutAct_9fa48("28513") ? ["Stryker was here"] : (stryCov_9fa48("28513"), [])
        });
      }
    }
    return stryMutAct_9fa48("28514") ? {} : (stryCov_9fa48("28514"), {
      state,
      intents: stryMutAct_9fa48("28515") ? ["Stryker was here"] : (stryCov_9fa48("28515"), []),
      actions: stryMutAct_9fa48("28516") ? ["Stryker was here"] : (stryCov_9fa48("28516"), [])
    });
  }
}

/** Whether a peer list/download response bytes are present for transfer progression. */
export function shouldAcceptPropagationPeerResponse(responsePresent: boolean): boolean {
  if (stryMutAct_9fa48("28517")) {
    {}
  } else {
    stryCov_9fa48("28517");
    return responsePresent;
  }
}

/**
 * Propagation peer-response accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptPropagationPeerResponse` reads beside the step).
 */
export type AcceptPropagationPeerResponseState = Record<string, never>;
export type AcceptPropagationPeerResponseEvent = Event | {
  readonly kind: "propagation-transfer/accept-peer-response-gate";
  readonly responsePresent: boolean;
};
export type AcceptPropagationPeerResponseAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptPropagationPeerResponseStepResult {
  readonly state: AcceptPropagationPeerResponseState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptPropagationPeerResponseAction[];
}
export function initialAcceptPropagationPeerResponseState(): AcceptPropagationPeerResponseState {
  if (stryMutAct_9fa48("28518")) {
    {}
  } else {
    stryCov_9fa48("28518");
    return {};
  }
}
export function stepAcceptPropagationPeerResponseWithActions(state: AcceptPropagationPeerResponseState, event: AcceptPropagationPeerResponseEvent): AcceptPropagationPeerResponseStepResult {
  if (stryMutAct_9fa48("28519")) {
    {}
  } else {
    stryCov_9fa48("28519");
    if (stryMutAct_9fa48("28522") ? event.kind !== "propagation-transfer/accept-peer-response-gate" : stryMutAct_9fa48("28521") ? false : stryMutAct_9fa48("28520") ? true : (stryCov_9fa48("28520", "28521", "28522"), event.kind === (stryMutAct_9fa48("28523") ? "" : (stryCov_9fa48("28523"), "propagation-transfer/accept-peer-response-gate")))) {
      if (stryMutAct_9fa48("28524")) {
        {}
      } else {
        stryCov_9fa48("28524");
        return stryMutAct_9fa48("28525") ? {} : (stryCov_9fa48("28525"), {
          state,
          intents: stryMutAct_9fa48("28526") ? ["Stryker was here"] : (stryCov_9fa48("28526"), []),
          actions: stryMutAct_9fa48("28527") ? [] : (stryCov_9fa48("28527"), [stryMutAct_9fa48("28528") ? {} : (stryCov_9fa48("28528"), {
            kind: shouldAcceptPropagationPeerResponse(event.responsePresent) ? stryMutAct_9fa48("28529") ? "" : (stryCov_9fa48("28529"), "accept") : stryMutAct_9fa48("28530") ? "" : (stryCov_9fa48("28530"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28531") ? {} : (stryCov_9fa48("28531"), {
      state,
      intents: stryMutAct_9fa48("28532") ? ["Stryker was here"] : (stryCov_9fa48("28532"), []),
      actions: stryMutAct_9fa48("28533") ? ["Stryker was here"] : (stryCov_9fa48("28533"), [])
    });
  }
}
export function shouldAcceptPropagationPeerResponseNow(actions: ReadonlyArray<AcceptPropagationPeerResponseAction>): boolean {
  if (stryMutAct_9fa48("28534")) {
    {}
  } else {
    stryCov_9fa48("28534");
    return stryMutAct_9fa48("28535") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("28535"), actions.some(stryMutAct_9fa48("28536") ? () => undefined : (stryCov_9fa48("28536"), action => stryMutAct_9fa48("28539") ? action.kind !== "accept" : stryMutAct_9fa48("28538") ? false : stryMutAct_9fa48("28537") ? true : (stryCov_9fa48("28537", "28538", "28539"), action.kind === (stryMutAct_9fa48("28540") ? "" : (stryCov_9fa48("28540"), "accept"))))));
  }
}
export function shouldSkipAcceptPropagationPeerResponse(actions: ReadonlyArray<AcceptPropagationPeerResponseAction>): boolean {
  if (stryMutAct_9fa48("28541")) {
    {}
  } else {
    stryCov_9fa48("28541");
    return stryMutAct_9fa48("28542") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28542"), actions.some(stryMutAct_9fa48("28543") ? () => undefined : (stryCov_9fa48("28543"), action => stryMutAct_9fa48("28546") ? action.kind !== "skip" : stryMutAct_9fa48("28545") ? false : stryMutAct_9fa48("28544") ? true : (stryCov_9fa48("28544", "28545", "28546"), action.kind === (stryMutAct_9fa48("28547") ? "" : (stryCov_9fa48("28547"), "skip"))))));
  }
}

/** Whether a decoded peer-error code should drive xfer/list-peer-error. */
export function shouldHandlePropagationPeerError(errorPresent: boolean): boolean {
  if (stryMutAct_9fa48("28548")) {
    {}
  } else {
    stryCov_9fa48("28548");
    return errorPresent;
  }
}

/**
 * Propagation peer-error handle gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldHandlePropagationPeerError`
 * reads beside the step).
 */
export type HandlePropagationPeerErrorState = Record<string, never>;
export type HandlePropagationPeerErrorEvent = Event | {
  readonly kind: "propagation-transfer/handle-peer-error-gate";
  readonly errorPresent: boolean;
};
export type HandlePropagationPeerErrorAction = {
  readonly kind: "handle";
} | {
  readonly kind: "skip";
};
export interface HandlePropagationPeerErrorStepResult {
  readonly state: HandlePropagationPeerErrorState;
  readonly intents: readonly Intent[];
  readonly actions: readonly HandlePropagationPeerErrorAction[];
}
export function initialHandlePropagationPeerErrorState(): HandlePropagationPeerErrorState {
  if (stryMutAct_9fa48("28549")) {
    {}
  } else {
    stryCov_9fa48("28549");
    return {};
  }
}
export function stepHandlePropagationPeerErrorWithActions(state: HandlePropagationPeerErrorState, event: HandlePropagationPeerErrorEvent): HandlePropagationPeerErrorStepResult {
  if (stryMutAct_9fa48("28550")) {
    {}
  } else {
    stryCov_9fa48("28550");
    if (stryMutAct_9fa48("28553") ? event.kind !== "propagation-transfer/handle-peer-error-gate" : stryMutAct_9fa48("28552") ? false : stryMutAct_9fa48("28551") ? true : (stryCov_9fa48("28551", "28552", "28553"), event.kind === (stryMutAct_9fa48("28554") ? "" : (stryCov_9fa48("28554"), "propagation-transfer/handle-peer-error-gate")))) {
      if (stryMutAct_9fa48("28555")) {
        {}
      } else {
        stryCov_9fa48("28555");
        return stryMutAct_9fa48("28556") ? {} : (stryCov_9fa48("28556"), {
          state,
          intents: stryMutAct_9fa48("28557") ? ["Stryker was here"] : (stryCov_9fa48("28557"), []),
          actions: stryMutAct_9fa48("28558") ? [] : (stryCov_9fa48("28558"), [stryMutAct_9fa48("28559") ? {} : (stryCov_9fa48("28559"), {
            kind: shouldHandlePropagationPeerError(event.errorPresent) ? stryMutAct_9fa48("28560") ? "" : (stryCov_9fa48("28560"), "handle") : stryMutAct_9fa48("28561") ? "" : (stryCov_9fa48("28561"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28562") ? {} : (stryCov_9fa48("28562"), {
      state,
      intents: stryMutAct_9fa48("28563") ? ["Stryker was here"] : (stryCov_9fa48("28563"), []),
      actions: stryMutAct_9fa48("28564") ? ["Stryker was here"] : (stryCov_9fa48("28564"), [])
    });
  }
}
export function shouldHandlePropagationPeerErrorNow(actions: ReadonlyArray<HandlePropagationPeerErrorAction>): boolean {
  if (stryMutAct_9fa48("28565")) {
    {}
  } else {
    stryCov_9fa48("28565");
    return stryMutAct_9fa48("28566") ? actions.every(action => action.kind === "handle") : (stryCov_9fa48("28566"), actions.some(stryMutAct_9fa48("28567") ? () => undefined : (stryCov_9fa48("28567"), action => stryMutAct_9fa48("28570") ? action.kind !== "handle" : stryMutAct_9fa48("28569") ? false : stryMutAct_9fa48("28568") ? true : (stryCov_9fa48("28568", "28569", "28570"), action.kind === (stryMutAct_9fa48("28571") ? "" : (stryCov_9fa48("28571"), "handle"))))));
  }
}
export function shouldSkipHandlePropagationPeerError(actions: ReadonlyArray<HandlePropagationPeerErrorAction>): boolean {
  if (stryMutAct_9fa48("28572")) {
    {}
  } else {
    stryCov_9fa48("28572");
    return stryMutAct_9fa48("28573") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28573"), actions.some(stryMutAct_9fa48("28574") ? () => undefined : (stryCov_9fa48("28574"), action => stryMutAct_9fa48("28577") ? action.kind !== "skip" : stryMutAct_9fa48("28576") ? false : stryMutAct_9fa48("28575") ? true : (stryCov_9fa48("28575", "28576", "28577"), action.kind === (stryMutAct_9fa48("28578") ? "" : (stryCov_9fa48("28578"), "skip"))))));
  }
}

/** Whether a locally delivered propagation message should be collected. */
export function shouldAcceptPropagationDeliveredMessage(messagePresent: boolean): boolean {
  if (stryMutAct_9fa48("28579")) {
    {}
  } else {
    stryCov_9fa48("28579");
    return messagePresent;
  }
}

/**
 * Propagation delivered-message accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptPropagationDeliveredMessage` reads beside the step).
 */
export type AcceptPropagationDeliveredMessageState = Record<string, never>;
export type AcceptPropagationDeliveredMessageEvent = Event | {
  readonly kind: "propagation-transfer/accept-delivered-message-gate";
  readonly messagePresent: boolean;
};
export type AcceptPropagationDeliveredMessageAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptPropagationDeliveredMessageStepResult {
  readonly state: AcceptPropagationDeliveredMessageState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptPropagationDeliveredMessageAction[];
}
export function initialAcceptPropagationDeliveredMessageState(): AcceptPropagationDeliveredMessageState {
  if (stryMutAct_9fa48("28580")) {
    {}
  } else {
    stryCov_9fa48("28580");
    return {};
  }
}
export function stepAcceptPropagationDeliveredMessageWithActions(state: AcceptPropagationDeliveredMessageState, event: AcceptPropagationDeliveredMessageEvent): AcceptPropagationDeliveredMessageStepResult {
  if (stryMutAct_9fa48("28581")) {
    {}
  } else {
    stryCov_9fa48("28581");
    if (stryMutAct_9fa48("28584") ? event.kind !== "propagation-transfer/accept-delivered-message-gate" : stryMutAct_9fa48("28583") ? false : stryMutAct_9fa48("28582") ? true : (stryCov_9fa48("28582", "28583", "28584"), event.kind === (stryMutAct_9fa48("28585") ? "" : (stryCov_9fa48("28585"), "propagation-transfer/accept-delivered-message-gate")))) {
      if (stryMutAct_9fa48("28586")) {
        {}
      } else {
        stryCov_9fa48("28586");
        return stryMutAct_9fa48("28587") ? {} : (stryCov_9fa48("28587"), {
          state,
          intents: stryMutAct_9fa48("28588") ? ["Stryker was here"] : (stryCov_9fa48("28588"), []),
          actions: stryMutAct_9fa48("28589") ? [] : (stryCov_9fa48("28589"), [stryMutAct_9fa48("28590") ? {} : (stryCov_9fa48("28590"), {
            kind: shouldAcceptPropagationDeliveredMessage(event.messagePresent) ? stryMutAct_9fa48("28591") ? "" : (stryCov_9fa48("28591"), "accept") : stryMutAct_9fa48("28592") ? "" : (stryCov_9fa48("28592"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28593") ? {} : (stryCov_9fa48("28593"), {
      state,
      intents: stryMutAct_9fa48("28594") ? ["Stryker was here"] : (stryCov_9fa48("28594"), []),
      actions: stryMutAct_9fa48("28595") ? ["Stryker was here"] : (stryCov_9fa48("28595"), [])
    });
  }
}
export function shouldAcceptPropagationDeliveredMessageNow(actions: ReadonlyArray<AcceptPropagationDeliveredMessageAction>): boolean {
  if (stryMutAct_9fa48("28596")) {
    {}
  } else {
    stryCov_9fa48("28596");
    return stryMutAct_9fa48("28597") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("28597"), actions.some(stryMutAct_9fa48("28598") ? () => undefined : (stryCov_9fa48("28598"), action => stryMutAct_9fa48("28601") ? action.kind !== "accept" : stryMutAct_9fa48("28600") ? false : stryMutAct_9fa48("28599") ? true : (stryCov_9fa48("28599", "28600", "28601"), action.kind === (stryMutAct_9fa48("28602") ? "" : (stryCov_9fa48("28602"), "accept"))))));
  }
}
export function shouldSkipAcceptPropagationDeliveredMessage(actions: ReadonlyArray<AcceptPropagationDeliveredMessageAction>): boolean {
  if (stryMutAct_9fa48("28603")) {
    {}
  } else {
    stryCov_9fa48("28603");
    return stryMutAct_9fa48("28604") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28604"), actions.some(stryMutAct_9fa48("28605") ? () => undefined : (stryCov_9fa48("28605"), action => stryMutAct_9fa48("28608") ? action.kind !== "skip" : stryMutAct_9fa48("28607") ? false : stryMutAct_9fa48("28606") ? true : (stryCov_9fa48("28606", "28607", "28608"), action.kind === (stryMutAct_9fa48("28609") ? "" : (stryCov_9fa48("28609"), "skip"))))));
  }
}

/** Whether a filtered want-list should complete as empty (xfer/list-empty). */
export function shouldTreatPropagationListAsEmpty(wantCount: number): boolean {
  if (stryMutAct_9fa48("28610")) {
    {}
  } else {
    stryCov_9fa48("28610");
    return stryMutAct_9fa48("28613") ? wantCount !== 0 : stryMutAct_9fa48("28612") ? false : stryMutAct_9fa48("28611") ? true : (stryCov_9fa48("28611", "28612", "28613"), wantCount === 0);
  }
}

/**
 * Propagation list-empty gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTreatPropagationListAsEmpty`
 * reads beside the step).
 */
export type TreatPropagationListAsEmptyState = Record<string, never>;
export type TreatPropagationListAsEmptyEvent = Event | {
  readonly kind: "propagation-transfer/list-as-empty-gate";
  readonly wantCount: number;
};
export type TreatPropagationListAsEmptyAction = {
  readonly kind: "empty";
} | {
  readonly kind: "nonempty";
};
export interface TreatPropagationListAsEmptyStepResult {
  readonly state: TreatPropagationListAsEmptyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TreatPropagationListAsEmptyAction[];
}
export function initialTreatPropagationListAsEmptyState(): TreatPropagationListAsEmptyState {
  if (stryMutAct_9fa48("28614")) {
    {}
  } else {
    stryCov_9fa48("28614");
    return {};
  }
}
export function stepTreatPropagationListAsEmptyWithActions(state: TreatPropagationListAsEmptyState, event: TreatPropagationListAsEmptyEvent): TreatPropagationListAsEmptyStepResult {
  if (stryMutAct_9fa48("28615")) {
    {}
  } else {
    stryCov_9fa48("28615");
    if (stryMutAct_9fa48("28618") ? event.kind !== "propagation-transfer/list-as-empty-gate" : stryMutAct_9fa48("28617") ? false : stryMutAct_9fa48("28616") ? true : (stryCov_9fa48("28616", "28617", "28618"), event.kind === (stryMutAct_9fa48("28619") ? "" : (stryCov_9fa48("28619"), "propagation-transfer/list-as-empty-gate")))) {
      if (stryMutAct_9fa48("28620")) {
        {}
      } else {
        stryCov_9fa48("28620");
        return stryMutAct_9fa48("28621") ? {} : (stryCov_9fa48("28621"), {
          state,
          intents: stryMutAct_9fa48("28622") ? ["Stryker was here"] : (stryCov_9fa48("28622"), []),
          actions: stryMutAct_9fa48("28623") ? [] : (stryCov_9fa48("28623"), [stryMutAct_9fa48("28624") ? {} : (stryCov_9fa48("28624"), {
            kind: shouldTreatPropagationListAsEmpty(event.wantCount) ? stryMutAct_9fa48("28625") ? "" : (stryCov_9fa48("28625"), "empty") : stryMutAct_9fa48("28626") ? "" : (stryCov_9fa48("28626"), "nonempty")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28627") ? {} : (stryCov_9fa48("28627"), {
      state,
      intents: stryMutAct_9fa48("28628") ? ["Stryker was here"] : (stryCov_9fa48("28628"), []),
      actions: stryMutAct_9fa48("28629") ? ["Stryker was here"] : (stryCov_9fa48("28629"), [])
    });
  }
}
export function shouldTreatPropagationListAsEmptyNow(actions: ReadonlyArray<TreatPropagationListAsEmptyAction>): boolean {
  if (stryMutAct_9fa48("28630")) {
    {}
  } else {
    stryCov_9fa48("28630");
    return stryMutAct_9fa48("28631") ? actions.every(action => action.kind === "empty") : (stryCov_9fa48("28631"), actions.some(stryMutAct_9fa48("28632") ? () => undefined : (stryCov_9fa48("28632"), action => stryMutAct_9fa48("28635") ? action.kind !== "empty" : stryMutAct_9fa48("28634") ? false : stryMutAct_9fa48("28633") ? true : (stryCov_9fa48("28633", "28634", "28635"), action.kind === (stryMutAct_9fa48("28636") ? "" : (stryCov_9fa48("28636"), "empty"))))));
  }
}
export function shouldTreatPropagationListAsNonempty(actions: ReadonlyArray<TreatPropagationListAsEmptyAction>): boolean {
  if (stryMutAct_9fa48("28637")) {
    {}
  } else {
    stryCov_9fa48("28637");
    return stryMutAct_9fa48("28638") ? actions.every(action => action.kind === "nonempty") : (stryCov_9fa48("28638"), actions.some(stryMutAct_9fa48("28639") ? () => undefined : (stryCov_9fa48("28639"), action => stryMutAct_9fa48("28642") ? action.kind !== "nonempty" : stryMutAct_9fa48("28641") ? false : stryMutAct_9fa48("28640") ? true : (stryCov_9fa48("28640", "28641", "28642"), action.kind === (stryMutAct_9fa48("28643") ? "" : (stryCov_9fa48("28643"), "nonempty"))))));
  }
}

/** Whether haves-ack request should run after download-ready. */
export function shouldRequestPropagationHavesAck(input: {
  readonly actionIsHavesAck: boolean;
  readonly haveCount: number;
}): boolean {
  if (stryMutAct_9fa48("28644")) {
    {}
  } else {
    stryCov_9fa48("28644");
    return stryMutAct_9fa48("28647") ? input.actionIsHavesAck || input.haveCount > 0 : stryMutAct_9fa48("28646") ? false : stryMutAct_9fa48("28645") ? true : (stryCov_9fa48("28645", "28646", "28647"), input.actionIsHavesAck && (stryMutAct_9fa48("28650") ? input.haveCount <= 0 : stryMutAct_9fa48("28649") ? input.haveCount >= 0 : stryMutAct_9fa48("28648") ? true : (stryCov_9fa48("28648", "28649", "28650"), input.haveCount > 0)));
  }
}

/**
 * Propagation haves-ack request gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRequestPropagationHavesAck`
 * reads beside the step).
 */
export type RequestPropagationHavesAckState = Record<string, never>;
export type RequestPropagationHavesAckEvent = Event | {
  readonly kind: "propagation-transfer/request-haves-ack-gate";
  readonly actionIsHavesAck: boolean;
  readonly haveCount: number;
};
export type RequestPropagationHavesAckAction = {
  readonly kind: "request";
} | {
  readonly kind: "skip";
};
export interface RequestPropagationHavesAckStepResult {
  readonly state: RequestPropagationHavesAckState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RequestPropagationHavesAckAction[];
}
export function initialRequestPropagationHavesAckState(): RequestPropagationHavesAckState {
  if (stryMutAct_9fa48("28651")) {
    {}
  } else {
    stryCov_9fa48("28651");
    return {};
  }
}
export function stepRequestPropagationHavesAckWithActions(state: RequestPropagationHavesAckState, event: RequestPropagationHavesAckEvent): RequestPropagationHavesAckStepResult {
  if (stryMutAct_9fa48("28652")) {
    {}
  } else {
    stryCov_9fa48("28652");
    if (stryMutAct_9fa48("28655") ? event.kind !== "propagation-transfer/request-haves-ack-gate" : stryMutAct_9fa48("28654") ? false : stryMutAct_9fa48("28653") ? true : (stryCov_9fa48("28653", "28654", "28655"), event.kind === (stryMutAct_9fa48("28656") ? "" : (stryCov_9fa48("28656"), "propagation-transfer/request-haves-ack-gate")))) {
      if (stryMutAct_9fa48("28657")) {
        {}
      } else {
        stryCov_9fa48("28657");
        return stryMutAct_9fa48("28658") ? {} : (stryCov_9fa48("28658"), {
          state,
          intents: stryMutAct_9fa48("28659") ? ["Stryker was here"] : (stryCov_9fa48("28659"), []),
          actions: stryMutAct_9fa48("28660") ? [] : (stryCov_9fa48("28660"), [stryMutAct_9fa48("28661") ? {} : (stryCov_9fa48("28661"), {
            kind: shouldRequestPropagationHavesAck(stryMutAct_9fa48("28662") ? {} : (stryCov_9fa48("28662"), {
              actionIsHavesAck: event.actionIsHavesAck,
              haveCount: event.haveCount
            })) ? stryMutAct_9fa48("28663") ? "" : (stryCov_9fa48("28663"), "request") : stryMutAct_9fa48("28664") ? "" : (stryCov_9fa48("28664"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("28665") ? {} : (stryCov_9fa48("28665"), {
      state,
      intents: stryMutAct_9fa48("28666") ? ["Stryker was here"] : (stryCov_9fa48("28666"), []),
      actions: stryMutAct_9fa48("28667") ? ["Stryker was here"] : (stryCov_9fa48("28667"), [])
    });
  }
}
export function shouldRequestPropagationHavesAckNow(actions: ReadonlyArray<RequestPropagationHavesAckAction>): boolean {
  if (stryMutAct_9fa48("28668")) {
    {}
  } else {
    stryCov_9fa48("28668");
    return stryMutAct_9fa48("28669") ? actions.every(action => action.kind === "request") : (stryCov_9fa48("28669"), actions.some(stryMutAct_9fa48("28670") ? () => undefined : (stryCov_9fa48("28670"), action => stryMutAct_9fa48("28673") ? action.kind !== "request" : stryMutAct_9fa48("28672") ? false : stryMutAct_9fa48("28671") ? true : (stryCov_9fa48("28671", "28672", "28673"), action.kind === (stryMutAct_9fa48("28674") ? "" : (stryCov_9fa48("28674"), "request"))))));
  }
}
export function shouldSkipRequestPropagationHavesAck(actions: ReadonlyArray<RequestPropagationHavesAckAction>): boolean {
  if (stryMutAct_9fa48("28675")) {
    {}
  } else {
    stryCov_9fa48("28675");
    return stryMutAct_9fa48("28676") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("28676"), actions.some(stryMutAct_9fa48("28677") ? () => undefined : (stryCov_9fa48("28677"), action => stryMutAct_9fa48("28680") ? action.kind !== "skip" : stryMutAct_9fa48("28679") ? false : stryMutAct_9fa48("28678") ? true : (stryCov_9fa48("28678", "28679", "28680"), action.kind === (stryMutAct_9fa48("28681") ? "" : (stryCov_9fa48("28681"), "skip"))))));
  }
}