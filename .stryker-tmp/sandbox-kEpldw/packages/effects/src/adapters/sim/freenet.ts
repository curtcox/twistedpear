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
import type { InstantMs } from "../../types.js";
import { SimClock } from "./clock.js";
import { sampleLatency, transportClass, type LatencyDistribution } from "./transport-classes.js";

/** S2 local 1 KiB p95 update→notify on the local-executor path (~89 ms). */
export const SIM_FREENET_DEFAULT_NOTIFY_LATENCY_MS = 89;

/** Policy-aligned continuous bitrate for Freenet-sized contract updates. */
export const SIM_FREENET_DEFAULT_BANDWIDTH_BPS = 90_000;
export interface SimFreenetContractSource {
  readonly wasm: Uint8Array;
  readonly parameters: Uint8Array;
}
export interface SimFreenetContractRecord {
  readonly key: Uint8Array;
  readonly codeHash: Uint8Array;
  readonly state: Uint8Array;
}
export interface SimFreenetNotifyModel {
  /** Fixed notify delay; defaults to instant delivery. */
  readonly latencyMs?: number;
  /** Sampled notify delay; ignored when `latencyMs` is set. */
  readonly latency?: LatencyDistribution;
}
export interface SimFreenetContractHubOptions {
  readonly clock?: SimClock;
  readonly notify?: SimFreenetNotifyModel;
  readonly rng?: () => number;
}
interface PendingNotify {
  readonly deliverAt: InstantMs;
  readonly keyHex: string;
  readonly state: Uint8Array;
}
function bytesToHex(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("477")) {
    {}
  } else {
    stryCov_9fa48("477");
    return (stryMutAct_9fa48("478") ? [] : (stryCov_9fa48("478"), [...bytes])).map(stryMutAct_9fa48("479") ? () => undefined : (stryCov_9fa48("479"), byte => byte.toString(16).padStart(2, stryMutAct_9fa48("480") ? "" : (stryCov_9fa48("480"), "0")))).join(stryMutAct_9fa48("481") ? "Stryker was here!" : (stryCov_9fa48("481"), ""));
  }
}

/**
 * Deterministic 32-byte digest for simulated contract keys.
 * Sim-only — not wire-compatible with Freenet BLAKE3 derivation.
 */
function simDigest(input: Uint8Array, length = 32): Uint8Array {
  if (stryMutAct_9fa48("482")) {
    {}
  } else {
    stryCov_9fa48("482");
    let hash = 0xcbf29ce484222325n;
    for (const byte of input) {
      if (stryMutAct_9fa48("483")) {
        {}
      } else {
        stryCov_9fa48("483");
        hash ^= BigInt(byte);
        hash = (stryMutAct_9fa48("484") ? hash / 0x100000001b3n : (stryCov_9fa48("484"), hash * 0x100000001b3n)) & 0xffffffffffffffffn;
      }
    }
    const out = new Uint8Array(length);
    let value = hash;
    for (let index = 0; stryMutAct_9fa48("487") ? index >= length : stryMutAct_9fa48("486") ? index <= length : stryMutAct_9fa48("485") ? false : (stryCov_9fa48("485", "486", "487"), index < length); stryMutAct_9fa48("488") ? index -= 1 : (stryCov_9fa48("488"), index += 1)) {
      if (stryMutAct_9fa48("489")) {
        {}
      } else {
        stryCov_9fa48("489");
        value = (stryMutAct_9fa48("490") ? value * 0x100000001b3n - BigInt(index) : (stryCov_9fa48("490"), (stryMutAct_9fa48("491") ? value / 0x100000001b3n : (stryCov_9fa48("491"), value * 0x100000001b3n)) + BigInt(index))) & 0xffffffffffffffffn;
        out[index] = Number(value & 0xffn);
      }
    }
    return out;
  }
}
export function simFreenetDeriveKey(source: SimFreenetContractSource): {
  readonly key: Uint8Array;
  readonly codeHash: Uint8Array;
} {
  if (stryMutAct_9fa48("492")) {
    {}
  } else {
    stryCov_9fa48("492");
    const codeHash = simDigest(source.wasm);
    const keyInput = new Uint8Array(stryMutAct_9fa48("493") ? codeHash.length - source.parameters.length : (stryCov_9fa48("493"), codeHash.length + source.parameters.length));
    keyInput.set(codeHash);
    keyInput.set(source.parameters, codeHash.length);
    return stryMutAct_9fa48("494") ? {} : (stryCov_9fa48("494"), {
      key: simDigest(keyInput),
      codeHash
    });
  }
}

/**
 * Shared convergent contract store for deterministic Freenet-path simulation.
 * Multiple clients on one hub model replicated contract state without a live node.
 */
export class SimFreenetContractHub {
  readonly #clock: SimClock | undefined;
  readonly #notify: SimFreenetNotifyModel | undefined;
  readonly #rng: () => number;
  readonly #states = new Map<string, SimFreenetContractRecord>();
  readonly #listeners = new Map<string, Set<(state: Uint8Array) => void>>();
  readonly #pending: PendingNotify[] = stryMutAct_9fa48("495") ? ["Stryker was here"] : (stryCov_9fa48("495"), []);
  #closed = stryMutAct_9fa48("496") ? true : (stryCov_9fa48("496"), false);
  constructor(options: SimFreenetContractHubOptions = {}) {
    if (stryMutAct_9fa48("497")) {
      {}
    } else {
      stryCov_9fa48("497");
      this.#clock = options.clock;
      this.#notify = options.notify;
      this.#rng = stryMutAct_9fa48("498") ? options.rng && (() => 0) : (stryCov_9fa48("498"), options.rng ?? (stryMutAct_9fa48("499") ? () => undefined : (stryCov_9fa48("499"), () => 0)));
    }
  }
  put(source: SimFreenetContractSource, state: Uint8Array): Uint8Array {
    if (stryMutAct_9fa48("500")) {
      {}
    } else {
      stryCov_9fa48("500");
      this.#assertOpen();
      const {
        key,
        codeHash
      } = simFreenetDeriveKey(source);
      const record: SimFreenetContractRecord = stryMutAct_9fa48("501") ? {} : (stryCov_9fa48("501"), {
        key: Uint8Array.from(key),
        codeHash: Uint8Array.from(codeHash),
        state: Uint8Array.from(state)
      });
      this.#states.set(bytesToHex(key), record);
      this.#emit(bytesToHex(key), record.state);
      return key;
    }
  }
  get(key: Uint8Array): SimFreenetContractRecord {
    if (stryMutAct_9fa48("502")) {
      {}
    } else {
      stryCov_9fa48("502");
      this.#assertOpen();
      const record = this.#states.get(bytesToHex(key));
      if (stryMutAct_9fa48("505") ? record !== undefined : stryMutAct_9fa48("504") ? false : stryMutAct_9fa48("503") ? true : (stryCov_9fa48("503", "504", "505"), record === undefined)) {
        if (stryMutAct_9fa48("506")) {
          {}
        } else {
          stryCov_9fa48("506");
          throw new Error(stryMutAct_9fa48("507") ? "" : (stryCov_9fa48("507"), "SimFreenet contract not found"));
        }
      }
      return stryMutAct_9fa48("508") ? {} : (stryCov_9fa48("508"), {
        key: Uint8Array.from(record.key),
        codeHash: Uint8Array.from(record.codeHash),
        state: Uint8Array.from(record.state)
      });
    }
  }
  tryGet(key: Uint8Array): SimFreenetContractRecord | null {
    if (stryMutAct_9fa48("509")) {
      {}
    } else {
      stryCov_9fa48("509");
      try {
        if (stryMutAct_9fa48("510")) {
          {}
        } else {
          stryCov_9fa48("510");
          return this.get(key);
        }
      } catch {
        if (stryMutAct_9fa48("511")) {
          {}
        } else {
          stryCov_9fa48("511");
          return null;
        }
      }
    }
  }
  update(key: Uint8Array, codeHash: Uint8Array, state: Uint8Array): void {
    if (stryMutAct_9fa48("512")) {
      {}
    } else {
      stryCov_9fa48("512");
      this.#assertOpen();
      const keyHex = bytesToHex(key);
      const previous = this.#states.get(keyHex);
      if (stryMutAct_9fa48("515") ? previous !== undefined : stryMutAct_9fa48("514") ? false : stryMutAct_9fa48("513") ? true : (stryCov_9fa48("513", "514", "515"), previous === undefined)) {
        if (stryMutAct_9fa48("516")) {
          {}
        } else {
          stryCov_9fa48("516");
          throw new Error(stryMutAct_9fa48("517") ? "" : (stryCov_9fa48("517"), "SimFreenet contract not found"));
        }
      }
      const record: SimFreenetContractRecord = stryMutAct_9fa48("518") ? {} : (stryCov_9fa48("518"), {
        key: Uint8Array.from(key),
        codeHash: Uint8Array.from(codeHash),
        state: Uint8Array.from(state)
      });
      this.#states.set(keyHex, record);
      this.#emit(keyHex, record.state);
    }
  }
  subscribe(key: Uint8Array, listener: (state: Uint8Array) => void): () => void {
    if (stryMutAct_9fa48("519")) {
      {}
    } else {
      stryCov_9fa48("519");
      this.#assertOpen();
      const keyHex = bytesToHex(key);
      let listeners = this.#listeners.get(keyHex);
      if (stryMutAct_9fa48("522") ? listeners !== undefined : stryMutAct_9fa48("521") ? false : stryMutAct_9fa48("520") ? true : (stryCov_9fa48("520", "521", "522"), listeners === undefined)) {
        if (stryMutAct_9fa48("523")) {
          {}
        } else {
          stryCov_9fa48("523");
          listeners = new Set();
          this.#listeners.set(keyHex, listeners);
        }
      }
      listeners.add(listener);
      return () => {
        if (stryMutAct_9fa48("524")) {
          {}
        } else {
          stryCov_9fa48("524");
          stryMutAct_9fa48("525") ? listeners.delete(listener) : (stryCov_9fa48("525"), listeners?.delete(listener));
          if (stryMutAct_9fa48("528") ? listeners?.size !== 0 : stryMutAct_9fa48("527") ? false : stryMutAct_9fa48("526") ? true : (stryCov_9fa48("526", "527", "528"), (stryMutAct_9fa48("529") ? listeners.size : (stryCov_9fa48("529"), listeners?.size)) === 0)) {
            if (stryMutAct_9fa48("530")) {
              {}
            } else {
              stryCov_9fa48("530");
              this.#listeners.delete(keyHex);
            }
          }
        }
      };
    }
  }
  close(): void {
    if (stryMutAct_9fa48("531")) {
      {}
    } else {
      stryCov_9fa48("531");
      this.#closed = stryMutAct_9fa48("532") ? false : (stryCov_9fa48("532"), true);
      this.#listeners.clear();
      this.#pending.length = 0;
    }
  }
  nextNotifyAt(): InstantMs | undefined {
    if (stryMutAct_9fa48("533")) {
      {}
    } else {
      stryCov_9fa48("533");
      if (stryMutAct_9fa48("536") ? this.#pending.length !== 0 : stryMutAct_9fa48("535") ? false : stryMutAct_9fa48("534") ? true : (stryCov_9fa48("534", "535", "536"), this.#pending.length === 0)) {
        if (stryMutAct_9fa48("537")) {
          {}
        } else {
          stryCov_9fa48("537");
          return undefined;
        }
      }
      return this.#pending.reduce(stryMutAct_9fa48("538") ? () => undefined : (stryCov_9fa48("538"), (earliest, entry) => stryMutAct_9fa48("539") ? Math.max(earliest, entry.deliverAt) : (stryCov_9fa48("539"), Math.min(earliest, entry.deliverAt))), Number.POSITIVE_INFINITY);
    }
  }
  deliverDue(untilMs: InstantMs): number {
    if (stryMutAct_9fa48("540")) {
      {}
    } else {
      stryCov_9fa48("540");
      let delivered = 0;
      stryMutAct_9fa48("541") ? this.#pending : (stryCov_9fa48("541"), this.#pending.sort(stryMutAct_9fa48("542") ? () => undefined : (stryCov_9fa48("542"), (left, right) => stryMutAct_9fa48("543") ? left.deliverAt + right.deliverAt : (stryCov_9fa48("543"), left.deliverAt - right.deliverAt))));
      while (stryMutAct_9fa48("545") ? this.#pending.length > 0 || this.#pending[0]!.deliverAt <= untilMs : stryMutAct_9fa48("544") ? false : (stryCov_9fa48("544", "545"), (stryMutAct_9fa48("548") ? this.#pending.length <= 0 : stryMutAct_9fa48("547") ? this.#pending.length >= 0 : stryMutAct_9fa48("546") ? true : (stryCov_9fa48("546", "547", "548"), this.#pending.length > 0)) && (stryMutAct_9fa48("551") ? this.#pending[0]!.deliverAt > untilMs : stryMutAct_9fa48("550") ? this.#pending[0]!.deliverAt < untilMs : stryMutAct_9fa48("549") ? true : (stryCov_9fa48("549", "550", "551"), this.#pending[0]!.deliverAt <= untilMs)))) {
        if (stryMutAct_9fa48("552")) {
          {}
        } else {
          stryCov_9fa48("552");
          const entry = this.#pending.shift()!;
          const listeners = this.#listeners.get(entry.keyHex);
          if (stryMutAct_9fa48("555") ? listeners !== undefined : stryMutAct_9fa48("554") ? false : stryMutAct_9fa48("553") ? true : (stryCov_9fa48("553", "554", "555"), listeners === undefined)) {
            if (stryMutAct_9fa48("556")) {
              {}
            } else {
              stryCov_9fa48("556");
              continue;
            }
          }
          for (const listener of listeners) {
            if (stryMutAct_9fa48("557")) {
              {}
            } else {
              stryCov_9fa48("557");
              listener(entry.state);
            }
          }
          stryMutAct_9fa48("558") ? delivered -= 1 : (stryCov_9fa48("558"), delivered += 1);
        }
      }
      return delivered;
    }
  }
  snapshot(): ReadonlyMap<string, SimFreenetContractRecord> {
    if (stryMutAct_9fa48("559")) {
      {}
    } else {
      stryCov_9fa48("559");
      return new Map(this.#states);
    }
  }
  #emit(keyHex: string, state: Uint8Array): void {
    if (stryMutAct_9fa48("560")) {
      {}
    } else {
      stryCov_9fa48("560");
      const listeners = this.#listeners.get(keyHex);
      if (stryMutAct_9fa48("563") ? listeners === undefined && listeners.size === 0 : stryMutAct_9fa48("562") ? false : stryMutAct_9fa48("561") ? true : (stryCov_9fa48("561", "562", "563"), (stryMutAct_9fa48("565") ? listeners !== undefined : stryMutAct_9fa48("564") ? false : (stryCov_9fa48("564", "565"), listeners === undefined)) || (stryMutAct_9fa48("567") ? listeners.size !== 0 : stryMutAct_9fa48("566") ? false : (stryCov_9fa48("566", "567"), listeners.size === 0)))) {
        if (stryMutAct_9fa48("568")) {
          {}
        } else {
          stryCov_9fa48("568");
          return;
        }
      }
      const delayMs = this.#notifyDelayMs();
      if (stryMutAct_9fa48("571") ? delayMs <= 0 && this.#clock === undefined : stryMutAct_9fa48("570") ? false : stryMutAct_9fa48("569") ? true : (stryCov_9fa48("569", "570", "571"), (stryMutAct_9fa48("574") ? delayMs > 0 : stryMutAct_9fa48("573") ? delayMs < 0 : stryMutAct_9fa48("572") ? false : (stryCov_9fa48("572", "573", "574"), delayMs <= 0)) || (stryMutAct_9fa48("576") ? this.#clock !== undefined : stryMutAct_9fa48("575") ? false : (stryCov_9fa48("575", "576"), this.#clock === undefined)))) {
        if (stryMutAct_9fa48("577")) {
          {}
        } else {
          stryCov_9fa48("577");
          for (const listener of listeners) {
            if (stryMutAct_9fa48("578")) {
              {}
            } else {
              stryCov_9fa48("578");
              listener(Uint8Array.from(state));
            }
          }
          return;
        }
      }
      this.#pending.push(stryMutAct_9fa48("579") ? {} : (stryCov_9fa48("579"), {
        deliverAt: stryMutAct_9fa48("580") ? this.#clock.now() - delayMs : (stryCov_9fa48("580"), this.#clock.now() + delayMs),
        keyHex,
        state: Uint8Array.from(state)
      }));
    }
  }
  #notifyDelayMs(): number {
    if (stryMutAct_9fa48("581")) {
      {}
    } else {
      stryCov_9fa48("581");
      if (stryMutAct_9fa48("584") ? this.#notify?.latencyMs === undefined : stryMutAct_9fa48("583") ? false : stryMutAct_9fa48("582") ? true : (stryCov_9fa48("582", "583", "584"), (stryMutAct_9fa48("585") ? this.#notify.latencyMs : (stryCov_9fa48("585"), this.#notify?.latencyMs)) !== undefined)) {
        if (stryMutAct_9fa48("586")) {
          {}
        } else {
          stryCov_9fa48("586");
          return stryMutAct_9fa48("587") ? Math.min(0, this.#notify.latencyMs) : (stryCov_9fa48("587"), Math.max(0, this.#notify.latencyMs));
        }
      }
      if (stryMutAct_9fa48("590") ? this.#notify?.latency === undefined : stryMutAct_9fa48("589") ? false : stryMutAct_9fa48("588") ? true : (stryCov_9fa48("588", "589", "590"), (stryMutAct_9fa48("591") ? this.#notify.latency : (stryCov_9fa48("591"), this.#notify?.latency)) !== undefined)) {
        if (stryMutAct_9fa48("592")) {
          {}
        } else {
          stryCov_9fa48("592");
          return sampleLatency(this.#notify.latency, this.#rng);
        }
      }
      return 0;
    }
  }
  #assertOpen(): void {
    if (stryMutAct_9fa48("593")) {
      {}
    } else {
      stryCov_9fa48("593");
      if (stryMutAct_9fa48("595") ? false : stryMutAct_9fa48("594") ? true : (stryCov_9fa48("594", "595"), this.#closed)) {
        if (stryMutAct_9fa48("596")) {
          {}
        } else {
          stryCov_9fa48("596");
          throw new Error(stryMutAct_9fa48("597") ? "" : (stryCov_9fa48("597"), "SimFreenet contract hub is closed"));
        }
      }
    }
  }
}
export interface SimFreenetClientOptions {
  readonly hub?: SimFreenetContractHub;
}

/**
 * Drop-in simulated Freenet client for campaign and bridge tests.
 * Shares contract state through an optional hub (default: private in-memory node).
 */
export class SimFreenetClient {
  readonly #hub: SimFreenetContractHub;
  readonly #ownsHub: boolean;
  constructor(options: SimFreenetClientOptions = {}) {
    if (stryMutAct_9fa48("598")) {
      {}
    } else {
      stryCov_9fa48("598");
      this.#ownsHub = stryMutAct_9fa48("601") ? options.hub !== undefined : stryMutAct_9fa48("600") ? false : stryMutAct_9fa48("599") ? true : (stryCov_9fa48("599", "600", "601"), options.hub === undefined);
      this.#hub = stryMutAct_9fa48("602") ? options.hub && new SimFreenetContractHub() : (stryCov_9fa48("602"), options.hub ?? new SimFreenetContractHub());
    }
  }
  get hub(): SimFreenetContractHub {
    if (stryMutAct_9fa48("603")) {
      {}
    } else {
      stryCov_9fa48("603");
      return this.#hub;
    }
  }
  async put(source: SimFreenetContractSource, state: Uint8Array): Promise<Uint8Array> {
    if (stryMutAct_9fa48("604")) {
      {}
    } else {
      stryCov_9fa48("604");
      return this.#hub.put(source, state);
    }
  }
  async get(key: Uint8Array): Promise<SimFreenetContractRecord> {
    if (stryMutAct_9fa48("605")) {
      {}
    } else {
      stryCov_9fa48("605");
      return this.#hub.get(key);
    }
  }
  async update(key: Uint8Array, codeHash: Uint8Array, state: Uint8Array): Promise<void> {
    if (stryMutAct_9fa48("606")) {
      {}
    } else {
      stryCov_9fa48("606");
      this.#hub.update(key, codeHash, state);
    }
  }
  async subscribe(key: Uint8Array, listener: (state: Uint8Array) => void): Promise<() => void> {
    if (stryMutAct_9fa48("607")) {
      {}
    } else {
      stryCov_9fa48("607");
      return this.#hub.subscribe(key, listener);
    }
  }
  async close(): Promise<void> {
    if (stryMutAct_9fa48("608")) {
      {}
    } else {
      stryCov_9fa48("608");
      if (stryMutAct_9fa48("610") ? false : stryMutAct_9fa48("609") ? true : (stryCov_9fa48("609", "610"), this.#ownsHub)) {
        if (stryMutAct_9fa48("611")) {
          {}
        } else {
          stryCov_9fa48("611");
          this.#hub.close();
        }
      }
    }
  }
  static deriveKey(source: SimFreenetContractSource): {
    readonly key: Uint8Array;
    readonly codeHash: Uint8Array;
  } {
    if (stryMutAct_9fa48("612")) {
      {}
    } else {
      stryCov_9fa48("612");
      return simFreenetDeriveKey(source);
    }
  }
}

/** Transport preset derived from local S2 measurements and F2/F3 policy bitrate. */
export function simFreenetTransportClass() {
  if (stryMutAct_9fa48("613")) {
    {}
  } else {
    stryCov_9fa48("613");
    return transportClass(stryMutAct_9fa48("614") ? "" : (stryCov_9fa48("614"), "freenet"));
  }
}