/**
 * Multi-peer link session leaf for sim scenarios.
 * Composes establishment + link-watchdog phases without crypto/IO.
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
import { LinkStatus, LinkTeardownReason, initialLinkWatchdogState, stepLinkWatchdogWithActions, type LinkWatchdogAction, type LinkWatchdogState, type LinkStatusValue } from "./link-watchdog.js";
export interface LinkSessionState {
  readonly role: "initiator" | "responder";
  readonly peerId: string;
  readonly status: LinkStatusValue;
  readonly watchdog: LinkWatchdogState;
  readonly established: boolean;
}
export type LinkSessionEvent = Event | {
  readonly kind: "session/request-link";
  readonly at: number;
} | {
  readonly kind: "session/handshake";
  readonly at: number;
} | {
  readonly kind: "session/link-proof";
  readonly at: number;
  readonly rtt: number;
} | {
  readonly kind: "session/inbound";
  readonly at: number;
} | {
  readonly kind: "session/close";
};
export type LinkSessionAction = {
  readonly kind: "send-link-request";
  readonly peerId: string;
} | {
  readonly kind: "send-handshake";
  readonly peerId: string;
} | {
  readonly kind: "send-link-proof";
  readonly peerId: string;
} | LinkWatchdogAction;
export interface LinkSessionStepResult {
  readonly state: LinkSessionState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkSessionAction[];
}
export function initialLinkSessionState(options: {
  readonly role: "initiator" | "responder";
  readonly peerId: string;
  readonly requestTime?: number;
}): LinkSessionState {
  if (stryMutAct_9fa48("17733")) {
    {}
  } else {
    stryCov_9fa48("17733");
    return stryMutAct_9fa48("17734") ? {} : (stryCov_9fa48("17734"), {
      role: options.role,
      peerId: options.peerId,
      status: LinkStatus.PENDING,
      watchdog: initialLinkWatchdogState(stryMutAct_9fa48("17735") ? {} : (stryCov_9fa48("17735"), {
        initiator: stryMutAct_9fa48("17738") ? options.role !== "initiator" : stryMutAct_9fa48("17737") ? false : stryMutAct_9fa48("17736") ? true : (stryCov_9fa48("17736", "17737", "17738"), options.role === (stryMutAct_9fa48("17739") ? "" : (stryCov_9fa48("17739"), "initiator"))),
        requestTime: stryMutAct_9fa48("17740") ? options.requestTime && 0 : (stryCov_9fa48("17740"), options.requestTime ?? 0)
      })),
      established: stryMutAct_9fa48("17741") ? true : (stryCov_9fa48("17741"), false)
    });
  }
}
export const stepLinkSession: StepFn<LinkSessionState> = (state, event) => {
  if (stryMutAct_9fa48("17742")) {
    {}
  } else {
    stryCov_9fa48("17742");
    const result = stepLinkSessionWithActions(state, event as LinkSessionEvent);
    return stryMutAct_9fa48("17743") ? {} : (stryCov_9fa48("17743"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkSessionWithActions(state: LinkSessionState, event: LinkSessionEvent): LinkSessionStepResult {
  if (stryMutAct_9fa48("17744")) {
    {}
  } else {
    stryCov_9fa48("17744");
    if (stryMutAct_9fa48("17747") ? event.kind !== "session/close" : stryMutAct_9fa48("17746") ? false : stryMutAct_9fa48("17745") ? true : (stryCov_9fa48("17745", "17746", "17747"), event.kind === (stryMutAct_9fa48("17748") ? "" : (stryCov_9fa48("17748"), "session/close")))) {
      if (stryMutAct_9fa48("17749")) {
        {}
      } else {
        stryCov_9fa48("17749");
        return stryMutAct_9fa48("17750") ? {} : (stryCov_9fa48("17750"), {
          state: stryMutAct_9fa48("17751") ? {} : (stryCov_9fa48("17751"), {
            ...state,
            status: LinkStatus.CLOSED,
            established: stryMutAct_9fa48("17752") ? true : (stryCov_9fa48("17752"), false),
            watchdog: stryMutAct_9fa48("17753") ? {} : (stryCov_9fa48("17753"), {
              ...state.watchdog,
              status: LinkStatus.CLOSED
            })
          }),
          intents: stryMutAct_9fa48("17754") ? ["Stryker was here"] : (stryCov_9fa48("17754"), []),
          actions: stryMutAct_9fa48("17755") ? [] : (stryCov_9fa48("17755"), [stryMutAct_9fa48("17756") ? {} : (stryCov_9fa48("17756"), {
            kind: stryMutAct_9fa48("17757") ? "" : (stryCov_9fa48("17757"), "close"),
            reason: LinkTeardownReason.INITIATOR_CLOSED
          })])
        });
      }
    }
    if (stryMutAct_9fa48("17760") ? event.kind !== "session/request-link" : stryMutAct_9fa48("17759") ? false : stryMutAct_9fa48("17758") ? true : (stryCov_9fa48("17758", "17759", "17760"), event.kind === (stryMutAct_9fa48("17761") ? "" : (stryCov_9fa48("17761"), "session/request-link")))) {
      if (stryMutAct_9fa48("17762")) {
        {}
      } else {
        stryCov_9fa48("17762");
        if (stryMutAct_9fa48("17765") ? state.role === "initiator" : stryMutAct_9fa48("17764") ? false : stryMutAct_9fa48("17763") ? true : (stryCov_9fa48("17763", "17764", "17765"), state.role !== (stryMutAct_9fa48("17766") ? "" : (stryCov_9fa48("17766"), "initiator")))) {
          if (stryMutAct_9fa48("17767")) {
            {}
          } else {
            stryCov_9fa48("17767");
            return stryMutAct_9fa48("17768") ? {} : (stryCov_9fa48("17768"), {
              state,
              intents: stryMutAct_9fa48("17769") ? ["Stryker was here"] : (stryCov_9fa48("17769"), []),
              actions: stryMutAct_9fa48("17770") ? ["Stryker was here"] : (stryCov_9fa48("17770"), [])
            });
          }
        }
        const watchdog = stepLinkWatchdogWithActions(stryMutAct_9fa48("17771") ? {} : (stryCov_9fa48("17771"), {
          ...state.watchdog,
          requestTime: event.at,
          status: LinkStatus.PENDING
        }), stryMutAct_9fa48("17772") ? {} : (stryCov_9fa48("17772"), {
          kind: stryMutAct_9fa48("17773") ? "" : (stryCov_9fa48("17773"), "link/watchdog-start")
        }));
        return stryMutAct_9fa48("17774") ? {} : (stryCov_9fa48("17774"), {
          state: stryMutAct_9fa48("17775") ? {} : (stryCov_9fa48("17775"), {
            ...state,
            status: LinkStatus.PENDING,
            watchdog: watchdog.state
          }),
          intents: watchdog.intents,
          actions: stryMutAct_9fa48("17776") ? [] : (stryCov_9fa48("17776"), [stryMutAct_9fa48("17777") ? {} : (stryCov_9fa48("17777"), {
            kind: stryMutAct_9fa48("17778") ? "" : (stryCov_9fa48("17778"), "send-link-request"),
            peerId: state.peerId
          })])
        });
      }
    }
    if (stryMutAct_9fa48("17781") ? event.kind !== "session/handshake" : stryMutAct_9fa48("17780") ? false : stryMutAct_9fa48("17779") ? true : (stryCov_9fa48("17779", "17780", "17781"), event.kind === (stryMutAct_9fa48("17782") ? "" : (stryCov_9fa48("17782"), "session/handshake")))) {
      if (stryMutAct_9fa48("17783")) {
        {}
      } else {
        stryCov_9fa48("17783");
        const watchdog = stepLinkWatchdogWithActions(state.watchdog, stryMutAct_9fa48("17784") ? {} : (stryCov_9fa48("17784"), {
          kind: stryMutAct_9fa48("17785") ? "" : (stryCov_9fa48("17785"), "link/status"),
          status: LinkStatus.HANDSHAKE
        }));
        return stryMutAct_9fa48("17786") ? {} : (stryCov_9fa48("17786"), {
          state: stryMutAct_9fa48("17787") ? {} : (stryCov_9fa48("17787"), {
            ...state,
            status: LinkStatus.HANDSHAKE,
            established: stryMutAct_9fa48("17788") ? true : (stryCov_9fa48("17788"), false),
            watchdog: watchdog.state
          }),
          intents: stryMutAct_9fa48("17789") ? ["Stryker was here"] : (stryCov_9fa48("17789"), []),
          actions: stryMutAct_9fa48("17790") ? [] : (stryCov_9fa48("17790"), [stryMutAct_9fa48("17791") ? {} : (stryCov_9fa48("17791"), {
            kind: stryMutAct_9fa48("17792") ? "" : (stryCov_9fa48("17792"), "send-handshake"),
            peerId: state.peerId
          })])
        });
      }
    }
    if (stryMutAct_9fa48("17795") ? event.kind !== "session/link-proof" : stryMutAct_9fa48("17794") ? false : stryMutAct_9fa48("17793") ? true : (stryCov_9fa48("17793", "17794", "17795"), event.kind === (stryMutAct_9fa48("17796") ? "" : (stryCov_9fa48("17796"), "session/link-proof")))) {
      if (stryMutAct_9fa48("17797")) {
        {}
      } else {
        stryCov_9fa48("17797");
        let watchdog = stepLinkWatchdogWithActions(state.watchdog, stryMutAct_9fa48("17798") ? {} : (stryCov_9fa48("17798"), {
          kind: stryMutAct_9fa48("17799") ? "" : (stryCov_9fa48("17799"), "link/status"),
          status: LinkStatus.ACTIVE,
          activatedAt: event.at
        })).state;
        watchdog = stepLinkWatchdogWithActions(watchdog, stryMutAct_9fa48("17800") ? {} : (stryCov_9fa48("17800"), {
          kind: stryMutAct_9fa48("17801") ? "" : (stryCov_9fa48("17801"), "link/rtt-measured"),
          rtt: event.rtt
        })).state;
        watchdog = stepLinkWatchdogWithActions(watchdog, stryMutAct_9fa48("17802") ? {} : (stryCov_9fa48("17802"), {
          kind: stryMutAct_9fa48("17803") ? "" : (stryCov_9fa48("17803"), "link/inbound"),
          at: event.at
        })).state;
        const start = stepLinkWatchdogWithActions(watchdog, stryMutAct_9fa48("17804") ? {} : (stryCov_9fa48("17804"), {
          kind: stryMutAct_9fa48("17805") ? "" : (stryCov_9fa48("17805"), "link/watchdog-start")
        }));
        const actions: LinkSessionAction[] = stryMutAct_9fa48("17806") ? ["Stryker was here"] : (stryCov_9fa48("17806"), []);
        if (stryMutAct_9fa48("17809") ? state.role !== "responder" : stryMutAct_9fa48("17808") ? false : stryMutAct_9fa48("17807") ? true : (stryCov_9fa48("17807", "17808", "17809"), state.role === (stryMutAct_9fa48("17810") ? "" : (stryCov_9fa48("17810"), "responder")))) {
          if (stryMutAct_9fa48("17811")) {
            {}
          } else {
            stryCov_9fa48("17811");
            actions.push(stryMutAct_9fa48("17812") ? {} : (stryCov_9fa48("17812"), {
              kind: stryMutAct_9fa48("17813") ? "" : (stryCov_9fa48("17813"), "send-link-proof"),
              peerId: state.peerId
            }));
          }
        }
        return stryMutAct_9fa48("17814") ? {} : (stryCov_9fa48("17814"), {
          state: stryMutAct_9fa48("17815") ? {} : (stryCov_9fa48("17815"), {
            ...state,
            status: LinkStatus.ACTIVE,
            established: stryMutAct_9fa48("17816") ? false : (stryCov_9fa48("17816"), true),
            watchdog: start.state
          }),
          intents: start.intents,
          actions
        });
      }
    }
    if (stryMutAct_9fa48("17819") ? event.kind !== "session/inbound" : stryMutAct_9fa48("17818") ? false : stryMutAct_9fa48("17817") ? true : (stryCov_9fa48("17817", "17818", "17819"), event.kind === (stryMutAct_9fa48("17820") ? "" : (stryCov_9fa48("17820"), "session/inbound")))) {
      if (stryMutAct_9fa48("17821")) {
        {}
      } else {
        stryCov_9fa48("17821");
        const watchdog = stepLinkWatchdogWithActions(state.watchdog, stryMutAct_9fa48("17822") ? {} : (stryCov_9fa48("17822"), {
          kind: stryMutAct_9fa48("17823") ? "" : (stryCov_9fa48("17823"), "link/inbound"),
          at: event.at
        }));
        return stryMutAct_9fa48("17824") ? {} : (stryCov_9fa48("17824"), {
          state: stryMutAct_9fa48("17825") ? {} : (stryCov_9fa48("17825"), {
            ...state,
            watchdog: watchdog.state
          }),
          intents: stryMutAct_9fa48("17826") ? ["Stryker was here"] : (stryCov_9fa48("17826"), []),
          actions: stryMutAct_9fa48("17827") ? ["Stryker was here"] : (stryCov_9fa48("17827"), [])
        });
      }
    }
    if (stryMutAct_9fa48("17830") ? event.kind === "timer/fired" || event.id === "link-watchdog" : stryMutAct_9fa48("17829") ? false : stryMutAct_9fa48("17828") ? true : (stryCov_9fa48("17828", "17829", "17830"), (stryMutAct_9fa48("17832") ? event.kind !== "timer/fired" : stryMutAct_9fa48("17831") ? true : (stryCov_9fa48("17831", "17832"), event.kind === (stryMutAct_9fa48("17833") ? "" : (stryCov_9fa48("17833"), "timer/fired")))) && (stryMutAct_9fa48("17835") ? event.id !== "link-watchdog" : stryMutAct_9fa48("17834") ? true : (stryCov_9fa48("17834", "17835"), event.id === (stryMutAct_9fa48("17836") ? "" : (stryCov_9fa48("17836"), "link-watchdog")))))) {
      if (stryMutAct_9fa48("17837")) {
        {}
      } else {
        stryCov_9fa48("17837");
        const tick = stepLinkWatchdogWithActions(state.watchdog, event);
        return stryMutAct_9fa48("17838") ? {} : (stryCov_9fa48("17838"), {
          state: stryMutAct_9fa48("17839") ? {} : (stryCov_9fa48("17839"), {
            ...state,
            status: tick.state.status,
            established: stryMutAct_9fa48("17842") ? tick.state.status !== LinkStatus.ACTIVE : stryMutAct_9fa48("17841") ? false : stryMutAct_9fa48("17840") ? true : (stryCov_9fa48("17840", "17841", "17842"), tick.state.status === LinkStatus.ACTIVE),
            watchdog: tick.state
          }),
          intents: tick.intents,
          actions: tick.actions
        });
      }
    }
    if (stryMutAct_9fa48("17845") ? event.kind !== "start" : stryMutAct_9fa48("17844") ? false : stryMutAct_9fa48("17843") ? true : (stryCov_9fa48("17843", "17844", "17845"), event.kind === (stryMutAct_9fa48("17846") ? "" : (stryCov_9fa48("17846"), "start")))) {
      if (stryMutAct_9fa48("17847")) {
        {}
      } else {
        stryCov_9fa48("17847");
        return stryMutAct_9fa48("17848") ? {} : (stryCov_9fa48("17848"), {
          state,
          intents: stryMutAct_9fa48("17849") ? ["Stryker was here"] : (stryCov_9fa48("17849"), []),
          actions: stryMutAct_9fa48("17850") ? ["Stryker was here"] : (stryCov_9fa48("17850"), [])
        });
      }
    }
    return stryMutAct_9fa48("17851") ? {} : (stryCov_9fa48("17851"), {
      state,
      intents: stryMutAct_9fa48("17852") ? ["Stryker was here"] : (stryCov_9fa48("17852"), []),
      actions: stryMutAct_9fa48("17853") ? ["Stryker was here"] : (stryCov_9fa48("17853"), [])
    });
  }
}