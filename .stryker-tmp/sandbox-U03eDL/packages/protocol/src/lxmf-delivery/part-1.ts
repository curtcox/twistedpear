/** Extracted from lxmf-delivery.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLxmfDelivery` /
 * `canAcceptLxmfPropagationLocalDelivery` /
 * `canUnpackLxmfPropagationLocalIngress` /
 * `shouldAwaitLxmfDeliveryReceipt` / `shouldInvokeLxmfDeliveryCallback`
 * reads beside the step).
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
import { LxmfUnverifiedReason, type LxmfUnverifiedReasonValue } from "../lxmf-fields.js";
export const LxmfDeliveryMethod = {
  OPPORTUNISTIC: 0x01,
  DIRECT: 0x02,
  PROPAGATED: 0x03,
  PAPER: 0x05
} as const;
export type LxmfDeliveryMethodValue = (typeof LxmfDeliveryMethod)[keyof typeof LxmfDeliveryMethod];
export const LxmfDeliveryRepresentation = {
  UNKNOWN: 0x00,
  PACKET: 0x01,
  RESOURCE: 0x02
} as const;
export type LxmfDeliveryRepresentationValue = (typeof LxmfDeliveryRepresentation)[keyof typeof LxmfDeliveryRepresentation];
export const LXMF_DESTINATION_LENGTH = 16;
export const LXMF_SIGNATURE_LENGTH = 64;
export const LXMF_TIMESTAMP_SIZE = 8;
export const LXMF_STRUCT_OVERHEAD = 8;

/** Full LXMF structural overhead (dest×2 + signature + timestamp + struct). */
export const LXMF_OVERHEAD = stryMutAct_9fa48("18914") ? 2 * LXMF_DESTINATION_LENGTH + LXMF_SIGNATURE_LENGTH + LXMF_TIMESTAMP_SIZE - LXMF_STRUCT_OVERHEAD : (stryCov_9fa48("18914"), (stryMutAct_9fa48("18915") ? 2 * LXMF_DESTINATION_LENGTH + LXMF_SIGNATURE_LENGTH - LXMF_TIMESTAMP_SIZE : (stryCov_9fa48("18915"), (stryMutAct_9fa48("18916") ? 2 * LXMF_DESTINATION_LENGTH - LXMF_SIGNATURE_LENGTH : (stryCov_9fa48("18916"), (stryMutAct_9fa48("18917") ? 2 / LXMF_DESTINATION_LENGTH : (stryCov_9fa48("18917"), 2 * LXMF_DESTINATION_LENGTH)) + LXMF_SIGNATURE_LENGTH)) + LXMF_TIMESTAMP_SIZE)) + LXMF_STRUCT_OVERHEAD);

/** Mirrors LXMF encrypted / link packet MDUs. */
export const LXMF_ENCRYPTED_PACKET_MDU = 391;
export const LXMF_LINK_PACKET_MDU = 431;

/**
 * Max opportunistic content that fits an encrypted packet.
 * Opportunistic frames omit one destination hash from the wire envelope.
 */
export const LXMF_ENCRYPTED_PACKET_MAX_CONTENT = stryMutAct_9fa48("18918") ? LXMF_ENCRYPTED_PACKET_MDU - LXMF_OVERHEAD - LXMF_DESTINATION_LENGTH : (stryCov_9fa48("18918"), (stryMutAct_9fa48("18919") ? LXMF_ENCRYPTED_PACKET_MDU + LXMF_OVERHEAD : (stryCov_9fa48("18919"), LXMF_ENCRYPTED_PACKET_MDU - LXMF_OVERHEAD)) + LXMF_DESTINATION_LENGTH);

/** Max direct/propagated content that fits a link packet. */
export const LXMF_LINK_PACKET_MAX_CONTENT = stryMutAct_9fa48("18920") ? LXMF_LINK_PACKET_MDU + LXMF_OVERHEAD : (stryCov_9fa48("18920"), LXMF_LINK_PACKET_MDU - LXMF_OVERHEAD);
export function lxmfContentSizeFromPackedLength(packedLength: number, destinationLength: number = LXMF_DESTINATION_LENGTH, signatureLength: number = LXMF_SIGNATURE_LENGTH, timestampSize: number = LXMF_TIMESTAMP_SIZE, structOverhead: number = LXMF_STRUCT_OVERHEAD): number {
  if (stryMutAct_9fa48("18921")) {
    {}
  } else {
    stryCov_9fa48("18921");
    const payloadLength = stryMutAct_9fa48("18922") ? packedLength + (2 * destinationLength + signatureLength) : (stryCov_9fa48("18922"), packedLength - (stryMutAct_9fa48("18923") ? 2 * destinationLength - signatureLength : (stryCov_9fa48("18923"), (stryMutAct_9fa48("18924") ? 2 / destinationLength : (stryCov_9fa48("18924"), 2 * destinationLength)) + signatureLength)));
    return stryMutAct_9fa48("18925") ? payloadLength - timestampSize + structOverhead : (stryCov_9fa48("18925"), (stryMutAct_9fa48("18926") ? payloadLength + timestampSize : (stryCov_9fa48("18926"), payloadLength - timestampSize)) - structOverhead);
  }
}
export type LxmfDeliveryPlan = {
  readonly kind: "deliver";
  readonly method: LxmfDeliveryMethodValue;
  readonly representation: LxmfDeliveryRepresentationValue;
} | {
  readonly kind: "reject-opportunistic-too-large";
  readonly contentSize: number;
  readonly maxContent: number;
} | {
  readonly kind: "reject-unsupported-method";
  readonly method: number;
};

/**
 * Plan delivery parameters.
 * For PROPAGATED, pass `propagationPackedLength` after the adapter builds the envelope.
 */
export function planLxmfDelivery(input: {
  readonly desiredMethod: number;
  readonly contentSize: number;
  readonly encryptedPacketMaxContent: number;
  readonly linkPacketMaxContent: number;
  readonly propagationPackedLength?: number;
}): LxmfDeliveryPlan {
  if (stryMutAct_9fa48("18927")) {
    {}
  } else {
    stryCov_9fa48("18927");
    const desiredMethod = input.desiredMethod;
    if (stryMutAct_9fa48("18930") ? desiredMethod !== LxmfDeliveryMethod.OPPORTUNISTIC : stryMutAct_9fa48("18929") ? false : stryMutAct_9fa48("18928") ? true : (stryCov_9fa48("18928", "18929", "18930"), desiredMethod === LxmfDeliveryMethod.OPPORTUNISTIC)) {
      if (stryMutAct_9fa48("18931")) {
        {}
      } else {
        stryCov_9fa48("18931");
        if (stryMutAct_9fa48("18935") ? input.contentSize <= input.encryptedPacketMaxContent : stryMutAct_9fa48("18934") ? input.contentSize >= input.encryptedPacketMaxContent : stryMutAct_9fa48("18933") ? false : stryMutAct_9fa48("18932") ? true : (stryCov_9fa48("18932", "18933", "18934", "18935"), input.contentSize > input.encryptedPacketMaxContent)) {
          if (stryMutAct_9fa48("18936")) {
            {}
          } else {
            stryCov_9fa48("18936");
            return stryMutAct_9fa48("18937") ? {} : (stryCov_9fa48("18937"), {
              kind: stryMutAct_9fa48("18938") ? "" : (stryCov_9fa48("18938"), "reject-opportunistic-too-large"),
              contentSize: input.contentSize,
              maxContent: input.encryptedPacketMaxContent
            });
          }
        }
        return stryMutAct_9fa48("18939") ? {} : (stryCov_9fa48("18939"), {
          kind: stryMutAct_9fa48("18940") ? "" : (stryCov_9fa48("18940"), "deliver"),
          method: LxmfDeliveryMethod.OPPORTUNISTIC,
          representation: LxmfDeliveryRepresentation.PACKET
        });
      }
    }
    if (stryMutAct_9fa48("18943") ? desiredMethod !== LxmfDeliveryMethod.DIRECT : stryMutAct_9fa48("18942") ? false : stryMutAct_9fa48("18941") ? true : (stryCov_9fa48("18941", "18942", "18943"), desiredMethod === LxmfDeliveryMethod.DIRECT)) {
      if (stryMutAct_9fa48("18944")) {
        {}
      } else {
        stryCov_9fa48("18944");
        return stryMutAct_9fa48("18945") ? {} : (stryCov_9fa48("18945"), {
          kind: stryMutAct_9fa48("18946") ? "" : (stryCov_9fa48("18946"), "deliver"),
          method: LxmfDeliveryMethod.DIRECT,
          representation: (stryMutAct_9fa48("18950") ? input.contentSize > input.linkPacketMaxContent : stryMutAct_9fa48("18949") ? input.contentSize < input.linkPacketMaxContent : stryMutAct_9fa48("18948") ? false : stryMutAct_9fa48("18947") ? true : (stryCov_9fa48("18947", "18948", "18949", "18950"), input.contentSize <= input.linkPacketMaxContent)) ? LxmfDeliveryRepresentation.PACKET : LxmfDeliveryRepresentation.RESOURCE
        });
      }
    }
    if (stryMutAct_9fa48("18953") ? desiredMethod !== LxmfDeliveryMethod.PROPAGATED : stryMutAct_9fa48("18952") ? false : stryMutAct_9fa48("18951") ? true : (stryCov_9fa48("18951", "18952", "18953"), desiredMethod === LxmfDeliveryMethod.PROPAGATED)) {
      if (stryMutAct_9fa48("18954")) {
        {}
      } else {
        stryCov_9fa48("18954");
        if (stryMutAct_9fa48("18957") ? input.propagationPackedLength !== undefined : stryMutAct_9fa48("18956") ? false : stryMutAct_9fa48("18955") ? true : (stryCov_9fa48("18955", "18956", "18957"), input.propagationPackedLength === undefined)) {
          if (stryMutAct_9fa48("18958")) {
            {}
          } else {
            stryCov_9fa48("18958");
            throw new Error(stryMutAct_9fa48("18959") ? "" : (stryCov_9fa48("18959"), "PROPAGATED delivery planning requires propagationPackedLength"));
          }
        }
        return stryMutAct_9fa48("18960") ? {} : (stryCov_9fa48("18960"), {
          kind: stryMutAct_9fa48("18961") ? "" : (stryCov_9fa48("18961"), "deliver"),
          method: LxmfDeliveryMethod.PROPAGATED,
          representation: (stryMutAct_9fa48("18965") ? input.propagationPackedLength <= input.linkPacketMaxContent : stryMutAct_9fa48("18964") ? input.propagationPackedLength >= input.linkPacketMaxContent : stryMutAct_9fa48("18963") ? false : stryMutAct_9fa48("18962") ? true : (stryCov_9fa48("18962", "18963", "18964", "18965"), input.propagationPackedLength > input.linkPacketMaxContent)) ? LxmfDeliveryRepresentation.RESOURCE : LxmfDeliveryRepresentation.PACKET
        });
      }
    }
    return stryMutAct_9fa48("18966") ? {} : (stryCov_9fa48("18966"), {
      kind: stryMutAct_9fa48("18967") ? "" : (stryCov_9fa48("18967"), "reject-unsupported-method"),
      method: desiredMethod
    });
  }
}

/**
 * Delivery-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfDelivery` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepLxmfDeliveryWithActions}.
 */
export type LxmfDeliveryPlanState = Record<string, never>;
export type LxmfDeliveryPlanEvent = Event | {
  readonly kind: "delivery/plan-gate";
  readonly desiredMethod: number;
  readonly contentSize: number;
  readonly encryptedPacketMaxContent: number;
  readonly linkPacketMaxContent: number;
  readonly propagationPackedLength?: number;
};
export type LxmfDeliveryPlanAction = LxmfDeliveryPlan;
export interface LxmfDeliveryPlanStepResult {
  readonly state: LxmfDeliveryPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliveryPlanAction[];
}
export function initialLxmfDeliveryPlanState(): LxmfDeliveryPlanState {
  if (stryMutAct_9fa48("18968")) {
    {}
  } else {
    stryCov_9fa48("18968");
    return {};
  }
}
export function stepLxmfDeliveryPlanWithActions(state: LxmfDeliveryPlanState, event: LxmfDeliveryPlanEvent): LxmfDeliveryPlanStepResult {
  if (stryMutAct_9fa48("18969")) {
    {}
  } else {
    stryCov_9fa48("18969");
    if (stryMutAct_9fa48("18972") ? event.kind !== "delivery/plan-gate" : stryMutAct_9fa48("18971") ? false : stryMutAct_9fa48("18970") ? true : (stryCov_9fa48("18970", "18971", "18972"), event.kind === (stryMutAct_9fa48("18973") ? "" : (stryCov_9fa48("18973"), "delivery/plan-gate")))) {
      if (stryMutAct_9fa48("18974")) {
        {}
      } else {
        stryCov_9fa48("18974");
        return stryMutAct_9fa48("18975") ? {} : (stryCov_9fa48("18975"), {
          state,
          intents: stryMutAct_9fa48("18976") ? ["Stryker was here"] : (stryCov_9fa48("18976"), []),
          actions: stryMutAct_9fa48("18977") ? [] : (stryCov_9fa48("18977"), [planLxmfDelivery(stryMutAct_9fa48("18978") ? {} : (stryCov_9fa48("18978"), {
            desiredMethod: event.desiredMethod,
            contentSize: event.contentSize,
            encryptedPacketMaxContent: event.encryptedPacketMaxContent,
            linkPacketMaxContent: event.linkPacketMaxContent,
            ...((stryMutAct_9fa48("18981") ? event.propagationPackedLength === undefined : stryMutAct_9fa48("18980") ? false : stryMutAct_9fa48("18979") ? true : (stryCov_9fa48("18979", "18980", "18981"), event.propagationPackedLength !== undefined)) ? stryMutAct_9fa48("18982") ? {} : (stryCov_9fa48("18982"), {
              propagationPackedLength: event.propagationPackedLength
            }) : {})
          }))])
        });
      }
    }
    return stryMutAct_9fa48("18983") ? {} : (stryCov_9fa48("18983"), {
      state,
      intents: stryMutAct_9fa48("18984") ? ["Stryker was here"] : (stryCov_9fa48("18984"), []),
      actions: stryMutAct_9fa48("18985") ? ["Stryker was here"] : (stryCov_9fa48("18985"), [])
    });
  }
}

/** Whether plan actions include deliver (set method + representation). */
export function shouldDeliverLxmfDeliveryPlan(actions: ReadonlyArray<LxmfDeliveryPlanAction>): boolean {
  if (stryMutAct_9fa48("18986")) {
    {}
  } else {
    stryCov_9fa48("18986");
    return stryMutAct_9fa48("18987") ? actions.every(action => action.kind === "deliver") : (stryCov_9fa48("18987"), actions.some(stryMutAct_9fa48("18988") ? () => undefined : (stryCov_9fa48("18988"), action => stryMutAct_9fa48("18991") ? action.kind !== "deliver" : stryMutAct_9fa48("18990") ? false : stryMutAct_9fa48("18989") ? true : (stryCov_9fa48("18989", "18990", "18991"), action.kind === (stryMutAct_9fa48("18992") ? "" : (stryCov_9fa48("18992"), "deliver"))))));
  }
}

/** Whether plan actions reject opportunistic content as too large. */
export function shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(actions: ReadonlyArray<LxmfDeliveryPlanAction>): boolean {
  if (stryMutAct_9fa48("18993")) {
    {}
  } else {
    stryCov_9fa48("18993");
    return stryMutAct_9fa48("18994") ? actions.every(action => action.kind === "reject-opportunistic-too-large") : (stryCov_9fa48("18994"), actions.some(stryMutAct_9fa48("18995") ? () => undefined : (stryCov_9fa48("18995"), action => stryMutAct_9fa48("18998") ? action.kind !== "reject-opportunistic-too-large" : stryMutAct_9fa48("18997") ? false : stryMutAct_9fa48("18996") ? true : (stryCov_9fa48("18996", "18997", "18998"), action.kind === (stryMutAct_9fa48("18999") ? "" : (stryCov_9fa48("18999"), "reject-opportunistic-too-large"))))));
  }
}

/** Whether plan actions reject an unsupported delivery method. */
export function shouldRejectLxmfDeliveryPlanUnsupportedMethod(actions: ReadonlyArray<LxmfDeliveryPlanAction>): boolean {
  if (stryMutAct_9fa48("19000")) {
    {}
  } else {
    stryCov_9fa48("19000");
    return stryMutAct_9fa48("19001") ? actions.every(action => action.kind === "reject-unsupported-method") : (stryCov_9fa48("19001"), actions.some(stryMutAct_9fa48("19002") ? () => undefined : (stryCov_9fa48("19002"), action => stryMutAct_9fa48("19005") ? action.kind !== "reject-unsupported-method" : stryMutAct_9fa48("19004") ? false : stryMutAct_9fa48("19003") ? true : (stryCov_9fa48("19003", "19004", "19005"), action.kind === (stryMutAct_9fa48("19006") ? "" : (stryCov_9fa48("19006"), "reject-unsupported-method"))))));
  }
}

/** Deliver method/representation from a deliver plan action, if present. */
export function lxmfDeliveryPlanDeliverParams(actions: ReadonlyArray<LxmfDeliveryPlanAction>): {
  readonly method: LxmfDeliveryMethodValue;
  readonly representation: LxmfDeliveryRepresentationValue;
} | null {
  if (stryMutAct_9fa48("19007")) {
    {}
  } else {
    stryCov_9fa48("19007");
    for (const action of actions) {
      if (stryMutAct_9fa48("19008")) {
        {}
      } else {
        stryCov_9fa48("19008");
        if (stryMutAct_9fa48("19011") ? action.kind !== "deliver" : stryMutAct_9fa48("19010") ? false : stryMutAct_9fa48("19009") ? true : (stryCov_9fa48("19009", "19010", "19011"), action.kind === (stryMutAct_9fa48("19012") ? "" : (stryCov_9fa48("19012"), "deliver")))) {
          if (stryMutAct_9fa48("19013")) {
            {}
          } else {
            stryCov_9fa48("19013");
            return stryMutAct_9fa48("19014") ? {} : (stryCov_9fa48("19014"), {
              method: action.method,
              representation: action.representation
            });
          }
        }
      }
    }
    return null;
  }
}

/** Size bounds from a reject-opportunistic-too-large plan action, if present. */
export function lxmfDeliveryPlanOpportunisticRejectSizes(actions: ReadonlyArray<LxmfDeliveryPlanAction>): {
  readonly contentSize: number;
  readonly maxContent: number;
} | null {
  if (stryMutAct_9fa48("19015")) {
    {}
  } else {
    stryCov_9fa48("19015");
    for (const action of actions) {
      if (stryMutAct_9fa48("19016")) {
        {}
      } else {
        stryCov_9fa48("19016");
        if (stryMutAct_9fa48("19019") ? action.kind !== "reject-opportunistic-too-large" : stryMutAct_9fa48("19018") ? false : stryMutAct_9fa48("19017") ? true : (stryCov_9fa48("19017", "19018", "19019"), action.kind === (stryMutAct_9fa48("19020") ? "" : (stryCov_9fa48("19020"), "reject-opportunistic-too-large")))) {
          if (stryMutAct_9fa48("19021")) {
            {}
          } else {
            stryCov_9fa48("19021");
            return stryMutAct_9fa48("19022") ? {} : (stryCov_9fa48("19022"), {
              contentSize: action.contentSize,
              maxContent: action.maxContent
            });
          }
        }
      }
    }
    return null;
  }
}

/** Unsupported method from a reject-unsupported-method plan action, if present. */
export function lxmfDeliveryPlanUnsupportedMethod(actions: ReadonlyArray<LxmfDeliveryPlanAction>): number | null {
  if (stryMutAct_9fa48("19023")) {
    {}
  } else {
    stryCov_9fa48("19023");
    for (const action of actions) {
      if (stryMutAct_9fa48("19024")) {
        {}
      } else {
        stryCov_9fa48("19024");
        if (stryMutAct_9fa48("19027") ? action.kind !== "reject-unsupported-method" : stryMutAct_9fa48("19026") ? false : stryMutAct_9fa48("19025") ? true : (stryCov_9fa48("19025", "19026", "19027"), action.kind === (stryMutAct_9fa48("19028") ? "" : (stryCov_9fa48("19028"), "reject-unsupported-method")))) {
          if (stryMutAct_9fa48("19029")) {
            {}
          } else {
            stryCov_9fa48("19029");
            return action.method;
          }
        }
      }
    }
    return null;
  }
}

/** Extract the delivery plan from actions; null when empty. */
export function lxmfDeliveryPlanFromActions(actions: ReadonlyArray<LxmfDeliveryPlanAction>): LxmfDeliveryPlan | null {
  if (stryMutAct_9fa48("19030")) {
    {}
  } else {
    stryCov_9fa48("19030");
    const action = actions.find(stryMutAct_9fa48("19031") ? () => undefined : (stryCov_9fa48("19031"), entry => stryMutAct_9fa48("19034") ? (entry.kind === "deliver" || entry.kind === "reject-opportunistic-too-large") && entry.kind === "reject-unsupported-method" : stryMutAct_9fa48("19033") ? false : stryMutAct_9fa48("19032") ? true : (stryCov_9fa48("19032", "19033", "19034"), (stryMutAct_9fa48("19036") ? entry.kind === "deliver" && entry.kind === "reject-opportunistic-too-large" : stryMutAct_9fa48("19035") ? false : (stryCov_9fa48("19035", "19036"), (stryMutAct_9fa48("19038") ? entry.kind !== "deliver" : stryMutAct_9fa48("19037") ? false : (stryCov_9fa48("19037", "19038"), entry.kind === (stryMutAct_9fa48("19039") ? "" : (stryCov_9fa48("19039"), "deliver")))) || (stryMutAct_9fa48("19041") ? entry.kind !== "reject-opportunistic-too-large" : stryMutAct_9fa48("19040") ? false : (stryCov_9fa48("19040", "19041"), entry.kind === (stryMutAct_9fa48("19042") ? "" : (stryCov_9fa48("19042"), "reject-opportunistic-too-large")))))) || (stryMutAct_9fa48("19044") ? entry.kind !== "reject-unsupported-method" : stryMutAct_9fa48("19043") ? false : (stryCov_9fa48("19043", "19044"), entry.kind === (stryMutAct_9fa48("19045") ? "" : (stryCov_9fa48("19045"), "reject-unsupported-method")))))));
    return stryMutAct_9fa48("19046") ? action && null : (stryCov_9fa48("19046"), action ?? null);
  }
}

/**
 * Delivery planning is event-driven; no durable session fields.
 */
export type LxmfDeliveryState = Record<string, never>;
export type LxmfDeliveryEvent = Event | {
  readonly kind: "delivery/select";
  readonly desiredMethod: number;
  readonly contentSize: number;
  readonly encryptedPacketMaxContent: number;
  readonly linkPacketMaxContent: number;
  readonly propagationPackedLength?: number;
};

/**
 * Adapter applies deliver / reject only from these actions.
 * Plan nested via {@link stepLxmfDeliveryPlanWithActions}
 * (`deliver`|`reject-opportunistic-too-large`|`reject-unsupported-method`).
 */
export type LxmfDeliveryAction = {
  readonly kind: "deliver";
  readonly method: LxmfDeliveryMethodValue;
  readonly representation: LxmfDeliveryRepresentationValue;
} | {
  readonly kind: "reject-opportunistic-too-large";
  readonly contentSize: number;
  readonly maxContent: number;
} | {
  readonly kind: "reject-unsupported-method";
  readonly method: number;
};
export interface LxmfDeliveryStepResult {
  readonly state: LxmfDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDeliveryAction[];
}
export function initialLxmfDeliveryState(): LxmfDeliveryState {
  if (stryMutAct_9fa48("19047")) {
    {}
  } else {
    stryCov_9fa48("19047");
    return {};
  }
}
export const stepLxmfDelivery: StepFn<LxmfDeliveryState> = (state, event) => {
  if (stryMutAct_9fa48("19048")) {
    {}
  } else {
    stryCov_9fa48("19048");
    const result = stepLxmfDeliveryInner(state, event as LxmfDeliveryEvent);
    return stryMutAct_9fa48("19049") ? {} : (stryCov_9fa48("19049"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfDeliveryWithActions(state: LxmfDeliveryState, event: LxmfDeliveryEvent): LxmfDeliveryStepResult {
  if (stryMutAct_9fa48("19050")) {
    {}
  } else {
    stryCov_9fa48("19050");
    return stepLxmfDeliveryInner(state, event);
  }
}

/** Whether step actions include deliver (set method + representation). */
export function shouldDeliverLxmf(actions: ReadonlyArray<LxmfDeliveryAction>): boolean {
  if (stryMutAct_9fa48("19051")) {
    {}
  } else {
    stryCov_9fa48("19051");
    return stryMutAct_9fa48("19052") ? actions.every(action => action.kind === "deliver") : (stryCov_9fa48("19052"), actions.some(stryMutAct_9fa48("19053") ? () => undefined : (stryCov_9fa48("19053"), action => stryMutAct_9fa48("19056") ? action.kind !== "deliver" : stryMutAct_9fa48("19055") ? false : stryMutAct_9fa48("19054") ? true : (stryCov_9fa48("19054", "19055", "19056"), action.kind === (stryMutAct_9fa48("19057") ? "" : (stryCov_9fa48("19057"), "deliver"))))));
  }
}

/** Whether step actions reject opportunistic content as too large. */
export function shouldRejectLxmfOpportunisticTooLarge(actions: ReadonlyArray<LxmfDeliveryAction>): boolean {
  if (stryMutAct_9fa48("19058")) {
    {}
  } else {
    stryCov_9fa48("19058");
    return stryMutAct_9fa48("19059") ? actions.every(action => action.kind === "reject-opportunistic-too-large") : (stryCov_9fa48("19059"), actions.some(stryMutAct_9fa48("19060") ? () => undefined : (stryCov_9fa48("19060"), action => stryMutAct_9fa48("19063") ? action.kind !== "reject-opportunistic-too-large" : stryMutAct_9fa48("19062") ? false : stryMutAct_9fa48("19061") ? true : (stryCov_9fa48("19061", "19062", "19063"), action.kind === (stryMutAct_9fa48("19064") ? "" : (stryCov_9fa48("19064"), "reject-opportunistic-too-large"))))));
  }
}

/** Whether step actions reject an unsupported delivery method. */
export function shouldRejectLxmfUnsupportedMethod(actions: ReadonlyArray<LxmfDeliveryAction>): boolean {
  if (stryMutAct_9fa48("19065")) {
    {}
  } else {
    stryCov_9fa48("19065");
    return stryMutAct_9fa48("19066") ? actions.every(action => action.kind === "reject-unsupported-method") : (stryCov_9fa48("19066"), actions.some(stryMutAct_9fa48("19067") ? () => undefined : (stryCov_9fa48("19067"), action => stryMutAct_9fa48("19070") ? action.kind !== "reject-unsupported-method" : stryMutAct_9fa48("19069") ? false : stryMutAct_9fa48("19068") ? true : (stryCov_9fa48("19068", "19069", "19070"), action.kind === (stryMutAct_9fa48("19071") ? "" : (stryCov_9fa48("19071"), "reject-unsupported-method"))))));
  }
}

/** Deliver method/representation from a deliver action, if present. */
export function lxmfDeliveryDeliverParams(actions: ReadonlyArray<LxmfDeliveryAction>): {
  readonly method: LxmfDeliveryMethodValue;
  readonly representation: LxmfDeliveryRepresentationValue;
} | null {
  if (stryMutAct_9fa48("19072")) {
    {}
  } else {
    stryCov_9fa48("19072");
    for (const action of actions) {
      if (stryMutAct_9fa48("19073")) {
        {}
      } else {
        stryCov_9fa48("19073");
        if (stryMutAct_9fa48("19076") ? action.kind !== "deliver" : stryMutAct_9fa48("19075") ? false : stryMutAct_9fa48("19074") ? true : (stryCov_9fa48("19074", "19075", "19076"), action.kind === (stryMutAct_9fa48("19077") ? "" : (stryCov_9fa48("19077"), "deliver")))) {
          if (stryMutAct_9fa48("19078")) {
            {}
          } else {
            stryCov_9fa48("19078");
            return stryMutAct_9fa48("19079") ? {} : (stryCov_9fa48("19079"), {
              method: action.method,
              representation: action.representation
            });
          }
        }
      }
    }
    return null;
  }
}

/** Size bounds from a reject-opportunistic-too-large action, if present. */
export function lxmfDeliveryOpportunisticRejectSizes(actions: ReadonlyArray<LxmfDeliveryAction>): {
  readonly contentSize: number;
  readonly maxContent: number;
} | null {
  if (stryMutAct_9fa48("19080")) {
    {}
  } else {
    stryCov_9fa48("19080");
    for (const action of actions) {
      if (stryMutAct_9fa48("19081")) {
        {}
      } else {
        stryCov_9fa48("19081");
        if (stryMutAct_9fa48("19084") ? action.kind !== "reject-opportunistic-too-large" : stryMutAct_9fa48("19083") ? false : stryMutAct_9fa48("19082") ? true : (stryCov_9fa48("19082", "19083", "19084"), action.kind === (stryMutAct_9fa48("19085") ? "" : (stryCov_9fa48("19085"), "reject-opportunistic-too-large")))) {
          if (stryMutAct_9fa48("19086")) {
            {}
          } else {
            stryCov_9fa48("19086");
            return stryMutAct_9fa48("19087") ? {} : (stryCov_9fa48("19087"), {
              contentSize: action.contentSize,
              maxContent: action.maxContent
            });
          }
        }
      }
    }
    return null;
  }
}
function stepLxmfDeliveryInner(state: LxmfDeliveryState, event: LxmfDeliveryEvent): LxmfDeliveryStepResult {
  if (stryMutAct_9fa48("19088")) {
    {}
  } else {
    stryCov_9fa48("19088");
    if (stryMutAct_9fa48("19091") ? event.kind !== "delivery/select" : stryMutAct_9fa48("19090") ? false : stryMutAct_9fa48("19089") ? true : (stryCov_9fa48("19089", "19090", "19091"), event.kind === (stryMutAct_9fa48("19092") ? "" : (stryCov_9fa48("19092"), "delivery/select")))) {
      if (stryMutAct_9fa48("19093")) {
        {}
      } else {
        stryCov_9fa48("19093");
        const planActions = stepLxmfDeliveryPlanWithActions(initialLxmfDeliveryPlanState(), stryMutAct_9fa48("19094") ? {} : (stryCov_9fa48("19094"), {
          kind: stryMutAct_9fa48("19095") ? "" : (stryCov_9fa48("19095"), "delivery/plan-gate"),
          desiredMethod: event.desiredMethod,
          contentSize: event.contentSize,
          encryptedPacketMaxContent: event.encryptedPacketMaxContent,
          linkPacketMaxContent: event.linkPacketMaxContent,
          ...((stryMutAct_9fa48("19098") ? event.propagationPackedLength === undefined : stryMutAct_9fa48("19097") ? false : stryMutAct_9fa48("19096") ? true : (stryCov_9fa48("19096", "19097", "19098"), event.propagationPackedLength !== undefined)) ? stryMutAct_9fa48("19099") ? {} : (stryCov_9fa48("19099"), {
            propagationPackedLength: event.propagationPackedLength
          }) : {})
        })).actions;
        if (stryMutAct_9fa48("19101") ? false : stryMutAct_9fa48("19100") ? true : (stryCov_9fa48("19100", "19101"), shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(planActions))) {
          if (stryMutAct_9fa48("19102")) {
            {}
          } else {
            stryCov_9fa48("19102");
            const sizes = lxmfDeliveryPlanOpportunisticRejectSizes(planActions);
            return stryMutAct_9fa48("19103") ? {} : (stryCov_9fa48("19103"), {
              state,
              intents: stryMutAct_9fa48("19104") ? ["Stryker was here"] : (stryCov_9fa48("19104"), []),
              actions: stryMutAct_9fa48("19105") ? [] : (stryCov_9fa48("19105"), [stryMutAct_9fa48("19106") ? {} : (stryCov_9fa48("19106"), {
                kind: stryMutAct_9fa48("19107") ? "" : (stryCov_9fa48("19107"), "reject-opportunistic-too-large"),
                contentSize: stryMutAct_9fa48("19108") ? sizes?.contentSize && 0 : (stryCov_9fa48("19108"), (stryMutAct_9fa48("19109") ? sizes.contentSize : (stryCov_9fa48("19109"), sizes?.contentSize)) ?? 0),
                maxContent: stryMutAct_9fa48("19110") ? sizes?.maxContent && 0 : (stryCov_9fa48("19110"), (stryMutAct_9fa48("19111") ? sizes.maxContent : (stryCov_9fa48("19111"), sizes?.maxContent)) ?? 0)
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19113") ? false : stryMutAct_9fa48("19112") ? true : (stryCov_9fa48("19112", "19113"), shouldRejectLxmfDeliveryPlanUnsupportedMethod(planActions))) {
          if (stryMutAct_9fa48("19114")) {
            {}
          } else {
            stryCov_9fa48("19114");
            return stryMutAct_9fa48("19115") ? {} : (stryCov_9fa48("19115"), {
              state,
              intents: stryMutAct_9fa48("19116") ? ["Stryker was here"] : (stryCov_9fa48("19116"), []),
              actions: stryMutAct_9fa48("19117") ? [] : (stryCov_9fa48("19117"), [stryMutAct_9fa48("19118") ? {} : (stryCov_9fa48("19118"), {
                kind: stryMutAct_9fa48("19119") ? "" : (stryCov_9fa48("19119"), "reject-unsupported-method"),
                method: stryMutAct_9fa48("19120") ? lxmfDeliveryPlanUnsupportedMethod(planActions) && 0 : (stryCov_9fa48("19120"), lxmfDeliveryPlanUnsupportedMethod(planActions) ?? 0)
              })])
            });
          }
        }
        if (stryMutAct_9fa48("19123") ? false : stryMutAct_9fa48("19122") ? true : stryMutAct_9fa48("19121") ? shouldDeliverLxmfDeliveryPlan(planActions) : (stryCov_9fa48("19121", "19122", "19123"), !shouldDeliverLxmfDeliveryPlan(planActions))) {
          if (stryMutAct_9fa48("19124")) {
            {}
          } else {
            stryCov_9fa48("19124");
            return stryMutAct_9fa48("19125") ? {} : (stryCov_9fa48("19125"), {
              state,
              intents: stryMutAct_9fa48("19126") ? ["Stryker was here"] : (stryCov_9fa48("19126"), []),
              actions: stryMutAct_9fa48("19127") ? ["Stryker was here"] : (stryCov_9fa48("19127"), [])
            });
          }
        }
        const params = lxmfDeliveryPlanDeliverParams(planActions);
        return stryMutAct_9fa48("19128") ? {} : (stryCov_9fa48("19128"), {
          state,
          intents: stryMutAct_9fa48("19129") ? ["Stryker was here"] : (stryCov_9fa48("19129"), []),
          actions: stryMutAct_9fa48("19130") ? [] : (stryCov_9fa48("19130"), [stryMutAct_9fa48("19131") ? {} : (stryCov_9fa48("19131"), {
            kind: stryMutAct_9fa48("19132") ? "" : (stryCov_9fa48("19132"), "deliver"),
            method: stryMutAct_9fa48("19133") ? params?.method && LxmfDeliveryMethod.OPPORTUNISTIC : (stryCov_9fa48("19133"), (stryMutAct_9fa48("19134") ? params.method : (stryCov_9fa48("19134"), params?.method)) ?? LxmfDeliveryMethod.OPPORTUNISTIC),
            representation: stryMutAct_9fa48("19135") ? params?.representation && LxmfDeliveryRepresentation.UNKNOWN : (stryCov_9fa48("19135"), (stryMutAct_9fa48("19136") ? params.representation : (stryCov_9fa48("19136"), params?.representation)) ?? LxmfDeliveryRepresentation.UNKNOWN)
          })])
        });
      }
    }
    return stryMutAct_9fa48("19137") ? {} : (stryCov_9fa48("19137"), {
      state,
      intents: stryMutAct_9fa48("19138") ? ["Stryker was here"] : (stryCov_9fa48("19138"), []),
      actions: stryMutAct_9fa48("19139") ? ["Stryker was here"] : (stryCov_9fa48("19139"), [])
    });
  }
}
export type LxMessagePackGate = "ok" | "bad-destination" | "bad-source";

/** Whether LXMessage.pack may proceed given destination/source direction and identity. */
export function planLxMessagePack(input: {
  readonly destinationDirectionOut: boolean;
  readonly sourceDirectionIn: boolean;
  readonly sourceIdentityPresent: boolean;
}): LxMessagePackGate {
  if (stryMutAct_9fa48("19140")) {
    {}
  } else {
    stryCov_9fa48("19140");
    if (stryMutAct_9fa48("19143") ? false : stryMutAct_9fa48("19142") ? true : stryMutAct_9fa48("19141") ? input.destinationDirectionOut : (stryCov_9fa48("19141", "19142", "19143"), !input.destinationDirectionOut)) {
      if (stryMutAct_9fa48("19144")) {
        {}
      } else {
        stryCov_9fa48("19144");
        return stryMutAct_9fa48("19145") ? "" : (stryCov_9fa48("19145"), "bad-destination");
      }
    }
    if (stryMutAct_9fa48("19148") ? !input.sourceDirectionIn && !input.sourceIdentityPresent : stryMutAct_9fa48("19147") ? false : stryMutAct_9fa48("19146") ? true : (stryCov_9fa48("19146", "19147", "19148"), (stryMutAct_9fa48("19149") ? input.sourceDirectionIn : (stryCov_9fa48("19149"), !input.sourceDirectionIn)) || (stryMutAct_9fa48("19150") ? input.sourceIdentityPresent : (stryCov_9fa48("19150"), !input.sourceIdentityPresent)))) {
      if (stryMutAct_9fa48("19151")) {
        {}
      } else {
        stryCov_9fa48("19151");
        return stryMutAct_9fa48("19152") ? "" : (stryCov_9fa48("19152"), "bad-source");
      }
    }
    return stryMutAct_9fa48("19153") ? "" : (stryCov_9fa48("19153"), "ok");
  }
}
export type LxMessagePackPlanEvent = Event | {
  readonly kind: "lxmessage-pack/plan-gate";
  readonly destinationDirectionOut: boolean;
  readonly sourceDirectionIn: boolean;
  readonly sourceIdentityPresent: boolean;
};