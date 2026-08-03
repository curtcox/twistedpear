/** Extracted from link-proof.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS link-request / link-proof signalling and payload layout helpers.
 * Pack / split / signed-material / hashable truncate / signalling encode /
 * mode-MTU decode / proof-payload classify conclusions leave via machine
 * actions (no ad-hoc `packLinkProofData` / `splitLinkProofBody` /
 * `packLinkRequestData` / `splitLinkRequestData` /
 * `linkProofSignedMaterial` / `linkRequestHashablePart` /
 * `encodeLinkSignallingBytes` / `encodeLinkMtuBytes` /
 * `modeFromLinkRequestData` / `modeFromLinkProofData` /
 * `mtuFromLinkRequestData` / `mtuFromLinkProofData` /
 * `classifyLinkProofPayload` reads beside the step).
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
import type { Event, Intent } from "@twistedpear/effects";
export const LINK_PROOF_SIGNATURE_SIZE = 64;
export const LINK_PROOF_PUBLIC_KEY_SIZE = 32;
export const LINK_PROOF_BODY_SIZE = stryMutAct_9fa48("15958") ? LINK_PROOF_SIGNATURE_SIZE - LINK_PROOF_PUBLIC_KEY_SIZE : (stryCov_9fa48("15958"), LINK_PROOF_SIGNATURE_SIZE + LINK_PROOF_PUBLIC_KEY_SIZE);
export const LINK_PROOF_MTU_SIZE = 3;
export const LINK_REQUEST_ECPUB_SIZE = 64;
export const LINK_MTU_BYTEMASK = 0x1fffff;
export const LINK_MODE_BYTEMASK = 0xe0;
export type LinkProofPayloadKind = "body-only" | "body-with-mtu" | "invalid";
export function classifyLinkProofPayload(dataLength: number): LinkProofPayloadKind {
  if (stryMutAct_9fa48("15959")) {
    {}
  } else {
    stryCov_9fa48("15959");
    if (stryMutAct_9fa48("15962") ? dataLength !== LINK_PROOF_BODY_SIZE : stryMutAct_9fa48("15961") ? false : stryMutAct_9fa48("15960") ? true : (stryCov_9fa48("15960", "15961", "15962"), dataLength === LINK_PROOF_BODY_SIZE)) {
      if (stryMutAct_9fa48("15963")) {
        {}
      } else {
        stryCov_9fa48("15963");
        return stryMutAct_9fa48("15964") ? "" : (stryCov_9fa48("15964"), "body-only");
      }
    }
    if (stryMutAct_9fa48("15967") ? dataLength !== LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE : stryMutAct_9fa48("15966") ? false : stryMutAct_9fa48("15965") ? true : (stryCov_9fa48("15965", "15966", "15967"), dataLength === (stryMutAct_9fa48("15968") ? LINK_PROOF_BODY_SIZE - LINK_PROOF_MTU_SIZE : (stryCov_9fa48("15968"), LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE)))) {
      if (stryMutAct_9fa48("15969")) {
        {}
      } else {
        stryCov_9fa48("15969");
        return stryMutAct_9fa48("15970") ? "" : (stryCov_9fa48("15970"), "body-with-mtu");
      }
    }
    return stryMutAct_9fa48("15971") ? "" : (stryCov_9fa48("15971"), "invalid");
  }
}
export interface LinkProofBodyFields {
  readonly signature: Uint8Array;
  readonly peerPublicKey: Uint8Array;
}
export function splitLinkProofBody(data: Uint8Array): LinkProofBodyFields | null {
  if (stryMutAct_9fa48("15972")) {
    {}
  } else {
    stryCov_9fa48("15972");
    if (stryMutAct_9fa48("15976") ? data.length >= LINK_PROOF_BODY_SIZE : stryMutAct_9fa48("15975") ? data.length <= LINK_PROOF_BODY_SIZE : stryMutAct_9fa48("15974") ? false : stryMutAct_9fa48("15973") ? true : (stryCov_9fa48("15973", "15974", "15975", "15976"), data.length < LINK_PROOF_BODY_SIZE)) {
      if (stryMutAct_9fa48("15977")) {
        {}
      } else {
        stryCov_9fa48("15977");
        return null;
      }
    }
    return stryMutAct_9fa48("15978") ? {} : (stryCov_9fa48("15978"), {
      signature: data.subarray(0, LINK_PROOF_SIGNATURE_SIZE),
      peerPublicKey: data.subarray(LINK_PROOF_SIGNATURE_SIZE, stryMutAct_9fa48("15979") ? LINK_PROOF_SIGNATURE_SIZE - LINK_PROOF_PUBLIC_KEY_SIZE : (stryCov_9fa48("15979"), LINK_PROOF_SIGNATURE_SIZE + LINK_PROOF_PUBLIC_KEY_SIZE))
    });
  }
}
export function encodeLinkSignallingBytes(mtu: number, mode: number): Uint8Array {
  if (stryMutAct_9fa48("15980")) {
    {}
  } else {
    stryCov_9fa48("15980");
    const signallingValue = stryMutAct_9fa48("15981") ? (mtu & LINK_MTU_BYTEMASK) - ((mode << 5 & LINK_MODE_BYTEMASK) << 16) : (stryCov_9fa48("15981"), (mtu & LINK_MTU_BYTEMASK) + ((mode << 5 & LINK_MODE_BYTEMASK) << 16));
    const buffer = new ArrayBuffer(4);
    const view = new DataView(buffer);
    view.setUint32(0, signallingValue, stryMutAct_9fa48("15982") ? true : (stryCov_9fa48("15982"), false));
    return new Uint8Array(buffer).subarray(1);
  }
}
export function decodeLinkModeFromSignallingByte(byte: number): number {
  if (stryMutAct_9fa48("15983")) {
    {}
  } else {
    stryCov_9fa48("15983");
    return (byte & LINK_MODE_BYTEMASK) >> 5;
  }
}
export function encodeLinkMtuBytes(mtu: number): Uint8Array {
  if (stryMutAct_9fa48("15984")) {
    {}
  } else {
    stryCov_9fa48("15984");
    const value = mtu & 0xffffff;
    return new Uint8Array(stryMutAct_9fa48("15985") ? [] : (stryCov_9fa48("15985"), [value >> 16 & 0xff, value >> 8 & 0xff, value & 0xff]));
  }
}
export function decodeLinkMtuFromBytes(bytes: Uint8Array): number {
  if (stryMutAct_9fa48("15986")) {
    {}
  } else {
    stryCov_9fa48("15986");
    return (bytes[0]! << 16 | bytes[1]! << 8 | bytes[2]!) & LINK_MTU_BYTEMASK;
  }
}
export function modeFromLinkRequestData(data: Uint8Array, defaultMode: number): number {
  if (stryMutAct_9fa48("15987")) {
    {}
  } else {
    stryCov_9fa48("15987");
    if (stryMutAct_9fa48("15991") ? data.length <= LINK_REQUEST_ECPUB_SIZE : stryMutAct_9fa48("15990") ? data.length >= LINK_REQUEST_ECPUB_SIZE : stryMutAct_9fa48("15989") ? false : stryMutAct_9fa48("15988") ? true : (stryCov_9fa48("15988", "15989", "15990", "15991"), data.length > LINK_REQUEST_ECPUB_SIZE)) {
      if (stryMutAct_9fa48("15992")) {
        {}
      } else {
        stryCov_9fa48("15992");
        return decodeLinkModeFromSignallingByte(data[LINK_REQUEST_ECPUB_SIZE]!);
      }
    }
    return defaultMode;
  }
}
export function mtuFromLinkRequestData(data: Uint8Array): number | null {
  if (stryMutAct_9fa48("15993")) {
    {}
  } else {
    stryCov_9fa48("15993");
    if (stryMutAct_9fa48("15996") ? data.length === LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE : stryMutAct_9fa48("15995") ? false : stryMutAct_9fa48("15994") ? true : (stryCov_9fa48("15994", "15995", "15996"), data.length !== (stryMutAct_9fa48("15997") ? LINK_REQUEST_ECPUB_SIZE - LINK_PROOF_MTU_SIZE : (stryCov_9fa48("15997"), LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE)))) {
      if (stryMutAct_9fa48("15998")) {
        {}
      } else {
        stryCov_9fa48("15998");
        return null;
      }
    }
    return decodeLinkMtuFromBytes(data.subarray(LINK_REQUEST_ECPUB_SIZE));
  }
}
export function modeFromLinkProofData(data: Uint8Array, defaultMode: number): number {
  if (stryMutAct_9fa48("15999")) {
    {}
  } else {
    stryCov_9fa48("15999");
    if (stryMutAct_9fa48("16003") ? data.length <= LINK_PROOF_BODY_SIZE : stryMutAct_9fa48("16002") ? data.length >= LINK_PROOF_BODY_SIZE : stryMutAct_9fa48("16001") ? false : stryMutAct_9fa48("16000") ? true : (stryCov_9fa48("16000", "16001", "16002", "16003"), data.length > LINK_PROOF_BODY_SIZE)) {
      if (stryMutAct_9fa48("16004")) {
        {}
      } else {
        stryCov_9fa48("16004");
        return decodeLinkModeFromSignallingByte(data[LINK_PROOF_BODY_SIZE]!);
      }
    }
    return defaultMode;
  }
}
export function mtuFromLinkProofData(data: Uint8Array): number | null {
  if (stryMutAct_9fa48("16005")) {
    {}
  } else {
    stryCov_9fa48("16005");
    if (stryMutAct_9fa48("16008") ? data.length === LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE : stryMutAct_9fa48("16007") ? false : stryMutAct_9fa48("16006") ? true : (stryCov_9fa48("16006", "16007", "16008"), data.length !== (stryMutAct_9fa48("16009") ? LINK_PROOF_BODY_SIZE - LINK_PROOF_MTU_SIZE : (stryCov_9fa48("16009"), LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE)))) {
      if (stryMutAct_9fa48("16010")) {
        {}
      } else {
        stryCov_9fa48("16010");
        return null;
      }
    }
    return decodeLinkMtuFromBytes(data.subarray(LINK_PROOF_BODY_SIZE, stryMutAct_9fa48("16011") ? LINK_PROOF_BODY_SIZE - LINK_PROOF_MTU_SIZE : (stryCov_9fa48("16011"), LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE)));
  }
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("16012")) {
    {}
  } else {
    stryCov_9fa48("16012");
    const length = parts.reduce(stryMutAct_9fa48("16013") ? () => undefined : (stryCov_9fa48("16013"), (total, part) => stryMutAct_9fa48("16014") ? total - part.length : (stryCov_9fa48("16014"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("16015")) {
        {}
      } else {
        stryCov_9fa48("16015");
        output.set(part, offset);
        stryMutAct_9fa48("16016") ? offset -= part.length : (stryCov_9fa48("16016"), offset += part.length);
      }
    }
    return output;
  }
}

/** Material signed for a link-request proof. */
export function linkProofSignedMaterial(linkId: Uint8Array, publicKey: Uint8Array, ownerSigPublicKey: Uint8Array, signallingBytes: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("16017")) {
    {}
  } else {
    stryCov_9fa48("16017");
    return concatBytes(linkId, publicKey, ownerSigPublicKey, signallingBytes);
  }
}

/** Wire body for a link-request proof packet (optional signalling already appended by caller). */
export function packLinkProofData(signature: Uint8Array, publicKey: Uint8Array, signallingBytes: Uint8Array = new Uint8Array(0)): Uint8Array {
  if (stryMutAct_9fa48("16018")) {
    {}
  } else {
    stryCov_9fa48("16018");
    if (stryMutAct_9fa48("16021") ? signature.length === LINK_PROOF_SIGNATURE_SIZE : stryMutAct_9fa48("16020") ? false : stryMutAct_9fa48("16019") ? true : (stryCov_9fa48("16019", "16020", "16021"), signature.length !== LINK_PROOF_SIGNATURE_SIZE)) {
      if (stryMutAct_9fa48("16022")) {
        {}
      } else {
        stryCov_9fa48("16022");
        throw new Error(stryMutAct_9fa48("16023") ? `` : (stryCov_9fa48("16023"), `link proof signature must be ${LINK_PROOF_SIGNATURE_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("16026") ? publicKey.length === LINK_PROOF_PUBLIC_KEY_SIZE : stryMutAct_9fa48("16025") ? false : stryMutAct_9fa48("16024") ? true : (stryCov_9fa48("16024", "16025", "16026"), publicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE)) {
      if (stryMutAct_9fa48("16027")) {
        {}
      } else {
        stryCov_9fa48("16027");
        throw new Error(stryMutAct_9fa48("16028") ? `` : (stryCov_9fa48("16028"), `link proof public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`));
      }
    }
    return concatBytes(signature, publicKey, signallingBytes);
  }
}
export interface LinkRequestKeyFields {
  readonly publicKey: Uint8Array;
  readonly signaturePublicKey: Uint8Array;
  readonly signallingBytes: Uint8Array;
}

/** Pack initiator link-request payload: X25519 pub || Ed25519 pub || optional signalling. */
export function packLinkRequestData(publicKey: Uint8Array, signaturePublicKey: Uint8Array, signallingBytes: Uint8Array = new Uint8Array(0)): Uint8Array {
  if (stryMutAct_9fa48("16029")) {
    {}
  } else {
    stryCov_9fa48("16029");
    if (stryMutAct_9fa48("16032") ? publicKey.length === LINK_PROOF_PUBLIC_KEY_SIZE : stryMutAct_9fa48("16031") ? false : stryMutAct_9fa48("16030") ? true : (stryCov_9fa48("16030", "16031", "16032"), publicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE)) {
      if (stryMutAct_9fa48("16033")) {
        {}
      } else {
        stryCov_9fa48("16033");
        throw new Error(stryMutAct_9fa48("16034") ? `` : (stryCov_9fa48("16034"), `link request public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`));
      }
    }
    if (stryMutAct_9fa48("16037") ? signaturePublicKey.length === LINK_PROOF_PUBLIC_KEY_SIZE : stryMutAct_9fa48("16036") ? false : stryMutAct_9fa48("16035") ? true : (stryCov_9fa48("16035", "16036", "16037"), signaturePublicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE)) {
      if (stryMutAct_9fa48("16038")) {
        {}
      } else {
        stryCov_9fa48("16038");
        throw new Error(stryMutAct_9fa48("16039") ? `` : (stryCov_9fa48("16039"), `link request signature public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`));
      }
    }
    return concatBytes(publicKey, signaturePublicKey, signallingBytes);
  }
}
export function splitLinkRequestData(data: Uint8Array): LinkRequestKeyFields | null {
  if (stryMutAct_9fa48("16040")) {
    {}
  } else {
    stryCov_9fa48("16040");
    if (stryMutAct_9fa48("16043") ? data.length !== LINK_REQUEST_ECPUB_SIZE || data.length !== LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE : stryMutAct_9fa48("16042") ? false : stryMutAct_9fa48("16041") ? true : (stryCov_9fa48("16041", "16042", "16043"), (stryMutAct_9fa48("16045") ? data.length === LINK_REQUEST_ECPUB_SIZE : stryMutAct_9fa48("16044") ? true : (stryCov_9fa48("16044", "16045"), data.length !== LINK_REQUEST_ECPUB_SIZE)) && (stryMutAct_9fa48("16047") ? data.length === LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE : stryMutAct_9fa48("16046") ? true : (stryCov_9fa48("16046", "16047"), data.length !== (stryMutAct_9fa48("16048") ? LINK_REQUEST_ECPUB_SIZE - LINK_PROOF_MTU_SIZE : (stryCov_9fa48("16048"), LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE)))))) {
      if (stryMutAct_9fa48("16049")) {
        {}
      } else {
        stryCov_9fa48("16049");
        return null;
      }
    }
    return stryMutAct_9fa48("16050") ? {} : (stryCov_9fa48("16050"), {
      publicKey: data.subarray(0, LINK_PROOF_PUBLIC_KEY_SIZE),
      signaturePublicKey: data.subarray(LINK_PROOF_PUBLIC_KEY_SIZE, LINK_REQUEST_ECPUB_SIZE),
      signallingBytes: (stryMutAct_9fa48("16053") ? data.length !== LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE : stryMutAct_9fa48("16052") ? false : stryMutAct_9fa48("16051") ? true : (stryCov_9fa48("16051", "16052", "16053"), data.length === (stryMutAct_9fa48("16054") ? LINK_REQUEST_ECPUB_SIZE - LINK_PROOF_MTU_SIZE : (stryCov_9fa48("16054"), LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE)))) ? data.subarray(LINK_REQUEST_ECPUB_SIZE) : new Uint8Array(0)
    });
  }
}

/** Truncate link-request hashable material when signalling bytes are present. */
export function linkRequestHashablePart(hashablePart: Uint8Array, requestDataLength: number): Uint8Array {
  if (stryMutAct_9fa48("16055")) {
    {}
  } else {
    stryCov_9fa48("16055");
    if (stryMutAct_9fa48("16059") ? requestDataLength > LINK_REQUEST_ECPUB_SIZE : stryMutAct_9fa48("16058") ? requestDataLength < LINK_REQUEST_ECPUB_SIZE : stryMutAct_9fa48("16057") ? false : stryMutAct_9fa48("16056") ? true : (stryCov_9fa48("16056", "16057", "16058", "16059"), requestDataLength <= LINK_REQUEST_ECPUB_SIZE)) {
      if (stryMutAct_9fa48("16060")) {
        {}
      } else {
        stryCov_9fa48("16060");
        return hashablePart;
      }
    }
    const diff = stryMutAct_9fa48("16061") ? requestDataLength + LINK_REQUEST_ECPUB_SIZE : (stryCov_9fa48("16061"), requestDataLength - LINK_REQUEST_ECPUB_SIZE);
    return hashablePart.subarray(0, stryMutAct_9fa48("16062") ? hashablePart.length + diff : (stryCov_9fa48("16062"), hashablePart.length - diff));
  }
}

/**
 * Link-proof pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkProofData`
 * reads beside the step).
 */
export type PackLinkProofDataState = Record<string, never>;
export type PackLinkProofDataEvent = Event | {
  readonly kind: "link-proof/pack-gate";
  readonly signature: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly signallingBytes: Uint8Array;
};
export type PackLinkProofDataAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackLinkProofDataStepResult {
  readonly state: PackLinkProofDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkProofDataAction[];
}
export function initialPackLinkProofDataState(): PackLinkProofDataState {
  if (stryMutAct_9fa48("16063")) {
    {}
  } else {
    stryCov_9fa48("16063");
    return {};
  }
}
export function stepPackLinkProofDataWithActions(state: PackLinkProofDataState, event: PackLinkProofDataEvent): PackLinkProofDataStepResult {
  if (stryMutAct_9fa48("16064")) {
    {}
  } else {
    stryCov_9fa48("16064");
    if (stryMutAct_9fa48("16067") ? event.kind !== "link-proof/pack-gate" : stryMutAct_9fa48("16066") ? false : stryMutAct_9fa48("16065") ? true : (stryCov_9fa48("16065", "16066", "16067"), event.kind === (stryMutAct_9fa48("16068") ? "" : (stryCov_9fa48("16068"), "link-proof/pack-gate")))) {
      if (stryMutAct_9fa48("16069")) {
        {}
      } else {
        stryCov_9fa48("16069");
        return stryMutAct_9fa48("16070") ? {} : (stryCov_9fa48("16070"), {
          state,
          intents: stryMutAct_9fa48("16071") ? ["Stryker was here"] : (stryCov_9fa48("16071"), []),
          actions: stryMutAct_9fa48("16072") ? [] : (stryCov_9fa48("16072"), [stryMutAct_9fa48("16073") ? {} : (stryCov_9fa48("16073"), {
            kind: stryMutAct_9fa48("16074") ? "" : (stryCov_9fa48("16074"), "use-raw"),
            raw: packLinkProofData(event.signature, event.publicKey, event.signallingBytes)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16075") ? {} : (stryCov_9fa48("16075"), {
      state,
      intents: stryMutAct_9fa48("16076") ? ["Stryker was here"] : (stryCov_9fa48("16076"), []),
      actions: stryMutAct_9fa48("16077") ? ["Stryker was here"] : (stryCov_9fa48("16077"), [])
    });
  }
}
export function shouldUsePackLinkProofData(actions: ReadonlyArray<PackLinkProofDataAction>): boolean {
  if (stryMutAct_9fa48("16078")) {
    {}
  } else {
    stryCov_9fa48("16078");
    return stryMutAct_9fa48("16079") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("16079"), actions.some(stryMutAct_9fa48("16080") ? () => undefined : (stryCov_9fa48("16080"), action => stryMutAct_9fa48("16083") ? action.kind !== "use-raw" : stryMutAct_9fa48("16082") ? false : stryMutAct_9fa48("16081") ? true : (stryCov_9fa48("16081", "16082", "16083"), action.kind === (stryMutAct_9fa48("16084") ? "" : (stryCov_9fa48("16084"), "use-raw"))))));
  }
}

/** Extract link-proof pack bytes from step actions; null when no `use-raw`. */
export function packLinkProofDataRawFromActions(actions: ReadonlyArray<PackLinkProofDataAction>): Uint8Array | null {
  if (stryMutAct_9fa48("16085")) {
    {}
  } else {
    stryCov_9fa48("16085");
    const action = actions.find(stryMutAct_9fa48("16086") ? () => undefined : (stryCov_9fa48("16086"), entry => stryMutAct_9fa48("16089") ? entry.kind !== "use-raw" : stryMutAct_9fa48("16088") ? false : stryMutAct_9fa48("16087") ? true : (stryCov_9fa48("16087", "16088", "16089"), entry.kind === (stryMutAct_9fa48("16090") ? "" : (stryCov_9fa48("16090"), "use-raw")))));
    return (stryMutAct_9fa48("16093") ? action?.kind !== "use-raw" : stryMutAct_9fa48("16092") ? false : stryMutAct_9fa48("16091") ? true : (stryCov_9fa48("16091", "16092", "16093"), (stryMutAct_9fa48("16094") ? action.kind : (stryCov_9fa48("16094"), action?.kind)) === (stryMutAct_9fa48("16095") ? "" : (stryCov_9fa48("16095"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Link-proof body split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLinkProofBody`
 * reads beside the step).
 */
export type SplitLinkProofBodyState = Record<string, never>;
export type SplitLinkProofBodyEvent = Event | {
  readonly kind: "link-proof/split-body-gate";
  readonly data: Uint8Array;
};
export type SplitLinkProofBodyAction = {
  readonly kind: "use-fields";
  readonly fields: LinkProofBodyFields;
} | {
  readonly kind: "reject";
};
export interface SplitLinkProofBodyStepResult {
  readonly state: SplitLinkProofBodyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLinkProofBodyAction[];
}
export function initialSplitLinkProofBodyState(): SplitLinkProofBodyState {
  if (stryMutAct_9fa48("16096")) {
    {}
  } else {
    stryCov_9fa48("16096");
    return {};
  }
}
export function stepSplitLinkProofBodyWithActions(state: SplitLinkProofBodyState, event: SplitLinkProofBodyEvent): SplitLinkProofBodyStepResult {
  if (stryMutAct_9fa48("16097")) {
    {}
  } else {
    stryCov_9fa48("16097");
    if (stryMutAct_9fa48("16100") ? event.kind !== "link-proof/split-body-gate" : stryMutAct_9fa48("16099") ? false : stryMutAct_9fa48("16098") ? true : (stryCov_9fa48("16098", "16099", "16100"), event.kind === (stryMutAct_9fa48("16101") ? "" : (stryCov_9fa48("16101"), "link-proof/split-body-gate")))) {
      if (stryMutAct_9fa48("16102")) {
        {}
      } else {
        stryCov_9fa48("16102");
        const fields = splitLinkProofBody(event.data);
        if (stryMutAct_9fa48("16105") ? fields !== null : stryMutAct_9fa48("16104") ? false : stryMutAct_9fa48("16103") ? true : (stryCov_9fa48("16103", "16104", "16105"), fields === null)) {
          if (stryMutAct_9fa48("16106")) {
            {}
          } else {
            stryCov_9fa48("16106");
            return stryMutAct_9fa48("16107") ? {} : (stryCov_9fa48("16107"), {
              state,
              intents: stryMutAct_9fa48("16108") ? ["Stryker was here"] : (stryCov_9fa48("16108"), []),
              actions: stryMutAct_9fa48("16109") ? [] : (stryCov_9fa48("16109"), [stryMutAct_9fa48("16110") ? {} : (stryCov_9fa48("16110"), {
                kind: stryMutAct_9fa48("16111") ? "" : (stryCov_9fa48("16111"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("16112") ? {} : (stryCov_9fa48("16112"), {
          state,
          intents: stryMutAct_9fa48("16113") ? ["Stryker was here"] : (stryCov_9fa48("16113"), []),
          actions: stryMutAct_9fa48("16114") ? [] : (stryCov_9fa48("16114"), [stryMutAct_9fa48("16115") ? {} : (stryCov_9fa48("16115"), {
            kind: stryMutAct_9fa48("16116") ? "" : (stryCov_9fa48("16116"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("16117") ? {} : (stryCov_9fa48("16117"), {
      state,
      intents: stryMutAct_9fa48("16118") ? ["Stryker was here"] : (stryCov_9fa48("16118"), []),
      actions: stryMutAct_9fa48("16119") ? ["Stryker was here"] : (stryCov_9fa48("16119"), [])
    });
  }
}
export function shouldUseSplitLinkProofBody(actions: ReadonlyArray<SplitLinkProofBodyAction>): boolean {
  if (stryMutAct_9fa48("16120")) {
    {}
  } else {
    stryCov_9fa48("16120");
    return stryMutAct_9fa48("16121") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("16121"), actions.some(stryMutAct_9fa48("16122") ? () => undefined : (stryCov_9fa48("16122"), action => stryMutAct_9fa48("16125") ? action.kind !== "use-fields" : stryMutAct_9fa48("16124") ? false : stryMutAct_9fa48("16123") ? true : (stryCov_9fa48("16123", "16124", "16125"), action.kind === (stryMutAct_9fa48("16126") ? "" : (stryCov_9fa48("16126"), "use-fields"))))));
  }
}
export function shouldRejectSplitLinkProofBody(actions: ReadonlyArray<SplitLinkProofBodyAction>): boolean {
  if (stryMutAct_9fa48("16127")) {
    {}
  } else {
    stryCov_9fa48("16127");
    return stryMutAct_9fa48("16128") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("16128"), actions.some(stryMutAct_9fa48("16129") ? () => undefined : (stryCov_9fa48("16129"), action => stryMutAct_9fa48("16132") ? action.kind !== "reject" : stryMutAct_9fa48("16131") ? false : stryMutAct_9fa48("16130") ? true : (stryCov_9fa48("16130", "16131", "16132"), action.kind === (stryMutAct_9fa48("16133") ? "" : (stryCov_9fa48("16133"), "reject"))))));
  }
}

/** Extract split link-proof body fields from step actions; null when no `use-fields`. */
export function linkProofBodyFieldsFromActions(actions: ReadonlyArray<SplitLinkProofBodyAction>): LinkProofBodyFields | null {
  if (stryMutAct_9fa48("16134")) {
    {}
  } else {
    stryCov_9fa48("16134");
    const action = actions.find(stryMutAct_9fa48("16135") ? () => undefined : (stryCov_9fa48("16135"), entry => stryMutAct_9fa48("16138") ? entry.kind !== "use-fields" : stryMutAct_9fa48("16137") ? false : stryMutAct_9fa48("16136") ? true : (stryCov_9fa48("16136", "16137", "16138"), entry.kind === (stryMutAct_9fa48("16139") ? "" : (stryCov_9fa48("16139"), "use-fields")))));
    return (stryMutAct_9fa48("16142") ? action?.kind !== "use-fields" : stryMutAct_9fa48("16141") ? false : stryMutAct_9fa48("16140") ? true : (stryCov_9fa48("16140", "16141", "16142"), (stryMutAct_9fa48("16143") ? action.kind : (stryCov_9fa48("16143"), action?.kind)) === (stryMutAct_9fa48("16144") ? "" : (stryCov_9fa48("16144"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Link-request pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkRequestData`
 * reads beside the step).
 */
export type PackLinkRequestDataState = Record<string, never>;
export type PackLinkRequestDataEvent = Event | {
  readonly kind: "link-request/pack-gate";
  readonly publicKey: Uint8Array;
  readonly signaturePublicKey: Uint8Array;
  readonly signallingBytes: Uint8Array;
};
export type PackLinkRequestDataAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface PackLinkRequestDataStepResult {
  readonly state: PackLinkRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkRequestDataAction[];
}
export function initialPackLinkRequestDataState(): PackLinkRequestDataState {
  if (stryMutAct_9fa48("16145")) {
    {}
  } else {
    stryCov_9fa48("16145");
    return {};
  }
}
export function stepPackLinkRequestDataWithActions(state: PackLinkRequestDataState, event: PackLinkRequestDataEvent): PackLinkRequestDataStepResult {
  if (stryMutAct_9fa48("16146")) {
    {}
  } else {
    stryCov_9fa48("16146");
    if (stryMutAct_9fa48("16149") ? event.kind !== "link-request/pack-gate" : stryMutAct_9fa48("16148") ? false : stryMutAct_9fa48("16147") ? true : (stryCov_9fa48("16147", "16148", "16149"), event.kind === (stryMutAct_9fa48("16150") ? "" : (stryCov_9fa48("16150"), "link-request/pack-gate")))) {
      if (stryMutAct_9fa48("16151")) {
        {}
      } else {
        stryCov_9fa48("16151");
        return stryMutAct_9fa48("16152") ? {} : (stryCov_9fa48("16152"), {
          state,
          intents: stryMutAct_9fa48("16153") ? ["Stryker was here"] : (stryCov_9fa48("16153"), []),
          actions: stryMutAct_9fa48("16154") ? [] : (stryCov_9fa48("16154"), [stryMutAct_9fa48("16155") ? {} : (stryCov_9fa48("16155"), {
            kind: stryMutAct_9fa48("16156") ? "" : (stryCov_9fa48("16156"), "use-raw"),
            raw: packLinkRequestData(event.publicKey, event.signaturePublicKey, event.signallingBytes)
          })])
        });
      }
    }
    return stryMutAct_9fa48("16157") ? {} : (stryCov_9fa48("16157"), {
      state,
      intents: stryMutAct_9fa48("16158") ? ["Stryker was here"] : (stryCov_9fa48("16158"), []),
      actions: stryMutAct_9fa48("16159") ? ["Stryker was here"] : (stryCov_9fa48("16159"), [])
    });
  }
}
export function shouldUsePackLinkRequestData(actions: ReadonlyArray<PackLinkRequestDataAction>): boolean {
  if (stryMutAct_9fa48("16160")) {
    {}
  } else {
    stryCov_9fa48("16160");
    return stryMutAct_9fa48("16161") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("16161"), actions.some(stryMutAct_9fa48("16162") ? () => undefined : (stryCov_9fa48("16162"), action => stryMutAct_9fa48("16165") ? action.kind !== "use-raw" : stryMutAct_9fa48("16164") ? false : stryMutAct_9fa48("16163") ? true : (stryCov_9fa48("16163", "16164", "16165"), action.kind === (stryMutAct_9fa48("16166") ? "" : (stryCov_9fa48("16166"), "use-raw"))))));
  }
}

/** Extract link-request pack bytes from step actions; null when no `use-raw`. */
export function packLinkRequestDataRawFromActions(actions: ReadonlyArray<PackLinkRequestDataAction>): Uint8Array | null {
  if (stryMutAct_9fa48("16167")) {
    {}
  } else {
    stryCov_9fa48("16167");
    const action = actions.find(stryMutAct_9fa48("16168") ? () => undefined : (stryCov_9fa48("16168"), entry => stryMutAct_9fa48("16171") ? entry.kind !== "use-raw" : stryMutAct_9fa48("16170") ? false : stryMutAct_9fa48("16169") ? true : (stryCov_9fa48("16169", "16170", "16171"), entry.kind === (stryMutAct_9fa48("16172") ? "" : (stryCov_9fa48("16172"), "use-raw")))));
    return (stryMutAct_9fa48("16175") ? action?.kind !== "use-raw" : stryMutAct_9fa48("16174") ? false : stryMutAct_9fa48("16173") ? true : (stryCov_9fa48("16173", "16174", "16175"), (stryMutAct_9fa48("16176") ? action.kind : (stryCov_9fa48("16176"), action?.kind)) === (stryMutAct_9fa48("16177") ? "" : (stryCov_9fa48("16177"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Link-request split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLinkRequestData`
 * reads beside the step).
 */
export type SplitLinkRequestDataState = Record<string, never>;
export type SplitLinkRequestDataEvent = Event | {
  readonly kind: "link-request/split-gate";
  readonly data: Uint8Array;
};
export type SplitLinkRequestDataAction = {
  readonly kind: "use-fields";
  readonly fields: LinkRequestKeyFields;
} | {
  readonly kind: "reject";
};
export interface SplitLinkRequestDataStepResult {
  readonly state: SplitLinkRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLinkRequestDataAction[];
}
export function initialSplitLinkRequestDataState(): SplitLinkRequestDataState {
  if (stryMutAct_9fa48("16178")) {
    {}
  } else {
    stryCov_9fa48("16178");
    return {};
  }
}
export function stepSplitLinkRequestDataWithActions(state: SplitLinkRequestDataState, event: SplitLinkRequestDataEvent): SplitLinkRequestDataStepResult {
  if (stryMutAct_9fa48("16179")) {
    {}
  } else {
    stryCov_9fa48("16179");
    if (stryMutAct_9fa48("16182") ? event.kind !== "link-request/split-gate" : stryMutAct_9fa48("16181") ? false : stryMutAct_9fa48("16180") ? true : (stryCov_9fa48("16180", "16181", "16182"), event.kind === (stryMutAct_9fa48("16183") ? "" : (stryCov_9fa48("16183"), "link-request/split-gate")))) {
      if (stryMutAct_9fa48("16184")) {
        {}
      } else {
        stryCov_9fa48("16184");
        const fields = splitLinkRequestData(event.data);
        if (stryMutAct_9fa48("16187") ? fields !== null : stryMutAct_9fa48("16186") ? false : stryMutAct_9fa48("16185") ? true : (stryCov_9fa48("16185", "16186", "16187"), fields === null)) {
          if (stryMutAct_9fa48("16188")) {
            {}
          } else {
            stryCov_9fa48("16188");
            return stryMutAct_9fa48("16189") ? {} : (stryCov_9fa48("16189"), {
              state,
              intents: stryMutAct_9fa48("16190") ? ["Stryker was here"] : (stryCov_9fa48("16190"), []),
              actions: stryMutAct_9fa48("16191") ? [] : (stryCov_9fa48("16191"), [stryMutAct_9fa48("16192") ? {} : (stryCov_9fa48("16192"), {
                kind: stryMutAct_9fa48("16193") ? "" : (stryCov_9fa48("16193"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("16194") ? {} : (stryCov_9fa48("16194"), {
          state,
          intents: stryMutAct_9fa48("16195") ? ["Stryker was here"] : (stryCov_9fa48("16195"), []),
          actions: stryMutAct_9fa48("16196") ? [] : (stryCov_9fa48("16196"), [stryMutAct_9fa48("16197") ? {} : (stryCov_9fa48("16197"), {
            kind: stryMutAct_9fa48("16198") ? "" : (stryCov_9fa48("16198"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("16199") ? {} : (stryCov_9fa48("16199"), {
      state,
      intents: stryMutAct_9fa48("16200") ? ["Stryker was here"] : (stryCov_9fa48("16200"), []),
      actions: stryMutAct_9fa48("16201") ? ["Stryker was here"] : (stryCov_9fa48("16201"), [])
    });
  }
}
export function shouldUseSplitLinkRequestData(actions: ReadonlyArray<SplitLinkRequestDataAction>): boolean {
  if (stryMutAct_9fa48("16202")) {
    {}
  } else {
    stryCov_9fa48("16202");
    return stryMutAct_9fa48("16203") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("16203"), actions.some(stryMutAct_9fa48("16204") ? () => undefined : (stryCov_9fa48("16204"), action => stryMutAct_9fa48("16207") ? action.kind !== "use-fields" : stryMutAct_9fa48("16206") ? false : stryMutAct_9fa48("16205") ? true : (stryCov_9fa48("16205", "16206", "16207"), action.kind === (stryMutAct_9fa48("16208") ? "" : (stryCov_9fa48("16208"), "use-fields"))))));
  }
}
export function shouldRejectSplitLinkRequestData(actions: ReadonlyArray<SplitLinkRequestDataAction>): boolean {
  if (stryMutAct_9fa48("16209")) {
    {}
  } else {
    stryCov_9fa48("16209");
    return stryMutAct_9fa48("16210") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("16210"), actions.some(stryMutAct_9fa48("16211") ? () => undefined : (stryCov_9fa48("16211"), action => stryMutAct_9fa48("16214") ? action.kind !== "reject" : stryMutAct_9fa48("16213") ? false : stryMutAct_9fa48("16212") ? true : (stryCov_9fa48("16212", "16213", "16214"), action.kind === (stryMutAct_9fa48("16215") ? "" : (stryCov_9fa48("16215"), "reject"))))));
  }
}

/** Extract split link-request fields from step actions; null when no `use-fields`. */
export function linkRequestKeyFieldsFromActions(actions: ReadonlyArray<SplitLinkRequestDataAction>): LinkRequestKeyFields | null {
  if (stryMutAct_9fa48("16216")) {
    {}
  } else {
    stryCov_9fa48("16216");
    const action = actions.find(stryMutAct_9fa48("16217") ? () => undefined : (stryCov_9fa48("16217"), entry => stryMutAct_9fa48("16220") ? entry.kind !== "use-fields" : stryMutAct_9fa48("16219") ? false : stryMutAct_9fa48("16218") ? true : (stryCov_9fa48("16218", "16219", "16220"), entry.kind === (stryMutAct_9fa48("16221") ? "" : (stryCov_9fa48("16221"), "use-fields")))));
    return (stryMutAct_9fa48("16224") ? action?.kind !== "use-fields" : stryMutAct_9fa48("16223") ? false : stryMutAct_9fa48("16222") ? true : (stryCov_9fa48("16222", "16223", "16224"), (stryMutAct_9fa48("16225") ? action.kind : (stryCov_9fa48("16225"), action?.kind)) === (stryMutAct_9fa48("16226") ? "" : (stryCov_9fa48("16226"), "use-fields")))) ? action.fields : null;
  }
}