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
import type { Event, NodeId } from "../../types.js";
import { serializeTrace, type TraceEntry } from "../../trace.js";
import type { SimKernelConfig } from "./kernel.js";
import type { Violation } from "./oracles.js";
export interface RecordedNode<S> {
  readonly id: NodeId;
  readonly machine?: string;
  readonly initial: S;
}
export interface RecordedKernelConfig<S> {
  readonly seed: number;
  readonly startMs: number;
  readonly nodes: readonly RecordedNode<S>[];
  readonly delivery?: SimKernelConfig<S>["delivery"];
  readonly links?: SimKernelConfig<S>["links"];
  readonly interleaveSalt?: number;
}
export interface RecordedHistory<S = unknown> {
  readonly version: 1;
  readonly config: RecordedKernelConfig<S>;
  readonly trace: readonly TraceEntry[];
  readonly violation?: Violation;
}
export interface HistoryRecorder<S> {
  record(history: RecordedHistory<S>): string | undefined;
}
export class MemoryHistoryRecorder<S> implements HistoryRecorder<S> {
  readonly histories: RecordedHistory<S>[] = stryMutAct_9fa48("898") ? ["Stryker was here"] : (stryCov_9fa48("898"), []);
  record(history: RecordedHistory<S>): undefined {
    if (stryMutAct_9fa48("899")) {
      {}
    } else {
      stryCov_9fa48("899");
      this.histories.push(history);
      return undefined;
    }
  }
}
export type WriteTextFile = (path: string, contents: string) => void;

/** On-disk recorder with injected filesystem IO, keeping the sim core portable. */
export class FileHistoryRecorder<S> implements HistoryRecorder<S> {
  constructor(private readonly directory: string, private readonly writeTextFile: WriteTextFile) {}
  record(history: RecordedHistory<S>): string {
    if (stryMutAct_9fa48("900")) {
      {}
    } else {
      stryCov_9fa48("900");
      const oracle = sanitize(stryMutAct_9fa48("901") ? history.violation?.oracle && "history" : (stryCov_9fa48("901"), (stryMutAct_9fa48("902") ? history.violation.oracle : (stryCov_9fa48("902"), history.violation?.oracle)) ?? (stryMutAct_9fa48("903") ? "" : (stryCov_9fa48("903"), "history"))));
      const path = stryMutAct_9fa48("904") ? `` : (stryCov_9fa48("904"), `${this.directory}/sim-${history.config.seed}-${oracle}-${history.trace.length}.json`);
      this.writeTextFile(path, serializeHistory(history));
      return path;
    }
  }
}
export function snapshotConfig<S>(config: SimKernelConfig<S>): RecordedKernelConfig<S> {
  if (stryMutAct_9fa48("905")) {
    {}
  } else {
    stryCov_9fa48("905");
    return stryMutAct_9fa48("906") ? {} : (stryCov_9fa48("906"), {
      seed: config.seed,
      startMs: stryMutAct_9fa48("907") ? config.startMs && 0 : (stryCov_9fa48("907"), config.startMs ?? 0),
      nodes: config.nodes.map(stryMutAct_9fa48("908") ? () => undefined : (stryCov_9fa48("908"), node => stryMutAct_9fa48("909") ? {} : (stryCov_9fa48("909"), {
        id: node.id,
        ...((stryMutAct_9fa48("912") ? node.machine !== undefined : stryMutAct_9fa48("911") ? false : stryMutAct_9fa48("910") ? true : (stryCov_9fa48("910", "911", "912"), node.machine === undefined)) ? {} : stryMutAct_9fa48("913") ? {} : (stryCov_9fa48("913"), {
          machine: node.machine
        })),
        initial: node.initial
      }))),
      ...((stryMutAct_9fa48("916") ? config.delivery !== undefined : stryMutAct_9fa48("915") ? false : stryMutAct_9fa48("914") ? true : (stryCov_9fa48("914", "915", "916"), config.delivery === undefined)) ? {} : stryMutAct_9fa48("917") ? {} : (stryCov_9fa48("917"), {
        delivery: config.delivery
      })),
      ...((stryMutAct_9fa48("920") ? config.links !== undefined : stryMutAct_9fa48("919") ? false : stryMutAct_9fa48("918") ? true : (stryCov_9fa48("918", "919", "920"), config.links === undefined)) ? {} : stryMutAct_9fa48("921") ? {} : (stryCov_9fa48("921"), {
        links: config.links
      })),
      ...((stryMutAct_9fa48("924") ? config.interleaveSalt !== undefined : stryMutAct_9fa48("923") ? false : stryMutAct_9fa48("922") ? true : (stryCov_9fa48("922", "923", "924"), config.interleaveSalt === undefined)) ? {} : stryMutAct_9fa48("925") ? {} : (stryCov_9fa48("925"), {
        interleaveSalt: config.interleaveSalt
      }))
    });
  }
}
export function serializeHistory<S>(history: RecordedHistory<S>): string {
  if (stryMutAct_9fa48("926")) {
    {}
  } else {
    stryCov_9fa48("926");
    return JSON.stringify(history, (_key, value: unknown) => {
      if (stryMutAct_9fa48("927")) {
        {}
      } else {
        stryCov_9fa48("927");
        if (stryMutAct_9fa48("929") ? false : stryMutAct_9fa48("928") ? true : (stryCov_9fa48("928", "929"), value instanceof Uint8Array)) return stryMutAct_9fa48("930") ? {} : (stryCov_9fa48("930"), {
          $bytes: bytesToHex(value)
        });
        if (stryMutAct_9fa48("932") ? false : stryMutAct_9fa48("931") ? true : (stryCov_9fa48("931", "932"), value instanceof Map)) return stryMutAct_9fa48("933") ? {} : (stryCov_9fa48("933"), {
          $map: stryMutAct_9fa48("934") ? [] : (stryCov_9fa48("934"), [...value.entries()])
        });
        return value;
      }
    });
  }
}
export function parseHistory<S = unknown>(text: string): RecordedHistory<S> {
  if (stryMutAct_9fa48("935")) {
    {}
  } else {
    stryCov_9fa48("935");
    const value = JSON.parse(text, (_key, item: unknown) => {
      if (isRecord(item) && typeof item.$bytes === "string") return hexToBytes(item.$bytes);
      if (isRecord(item) && Array.isArray(item.$map)) return new Map(item.$map as Array<[unknown, unknown]>);
      return item;
    }) as RecordedHistory<S>;
    if (stryMutAct_9fa48("938") ? (value.version !== 1 || !Array.isArray(value.trace)) && value.config === undefined : stryMutAct_9fa48("937") ? false : stryMutAct_9fa48("936") ? true : (stryCov_9fa48("936", "937", "938"), (stryMutAct_9fa48("940") ? value.version !== 1 && !Array.isArray(value.trace) : stryMutAct_9fa48("939") ? false : (stryCov_9fa48("939", "940"), (stryMutAct_9fa48("942") ? value.version === 1 : stryMutAct_9fa48("941") ? false : (stryCov_9fa48("941", "942"), value.version !== 1)) || (stryMutAct_9fa48("943") ? Array.isArray(value.trace) : (stryCov_9fa48("943"), !Array.isArray(value.trace))))) || (stryMutAct_9fa48("945") ? value.config !== undefined : stryMutAct_9fa48("944") ? false : (stryCov_9fa48("944", "945"), value.config === undefined)))) {
      if (stryMutAct_9fa48("946")) {
        {}
      } else {
        stryCov_9fa48("946");
        throw new Error(stryMutAct_9fa48("947") ? "" : (stryCov_9fa48("947"), "invalid simulation history"));
      }
    }
    return value;
  }
}
export function historyEvents(history: RecordedHistory): readonly {
  node: NodeId;
  event: Event;
}[] {
  if (stryMutAct_9fa48("948")) {
    {}
  } else {
    stryCov_9fa48("948");
    return history.trace.flatMap(stryMutAct_9fa48("949") ? () => undefined : (stryCov_9fa48("949"), entry => (stryMutAct_9fa48("952") ? entry.t !== "event" : stryMutAct_9fa48("951") ? false : stryMutAct_9fa48("950") ? true : (stryCov_9fa48("950", "951", "952"), entry.t === (stryMutAct_9fa48("953") ? "" : (stryCov_9fa48("953"), "event")))) ? stryMutAct_9fa48("954") ? [] : (stryCov_9fa48("954"), [stryMutAct_9fa48("955") ? {} : (stryCov_9fa48("955"), {
      node: entry.node,
      event: entry.event
    })]) : stryMutAct_9fa48("956") ? ["Stryker was here"] : (stryCov_9fa48("956"), [])));
  }
}

// Ensure trace serialization remains exercised beside the richer history format.
export function traceBody(history: RecordedHistory): string {
  if (stryMutAct_9fa48("957")) {
    {}
  } else {
    stryCov_9fa48("957");
    return serializeTrace(history.trace);
  }
}
function sanitize(value: string): string {
  if (stryMutAct_9fa48("958")) {
    {}
  } else {
    stryCov_9fa48("958");
    return value.replace(stryMutAct_9fa48("959") ? /[a-zA-Z0-9_-]/g : (stryCov_9fa48("959"), /[^a-zA-Z0-9_-]/g), stryMutAct_9fa48("960") ? "" : (stryCov_9fa48("960"), "-"));
  }
}
function bytesToHex(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("961")) {
    {}
  } else {
    stryCov_9fa48("961");
    return (stryMutAct_9fa48("962") ? [] : (stryCov_9fa48("962"), [...bytes])).map(stryMutAct_9fa48("963") ? () => undefined : (stryCov_9fa48("963"), byte => byte.toString(16).padStart(2, stryMutAct_9fa48("964") ? "" : (stryCov_9fa48("964"), "0")))).join(stryMutAct_9fa48("965") ? "Stryker was here!" : (stryCov_9fa48("965"), ""));
  }
}
function hexToBytes(hex: string): Uint8Array {
  if (stryMutAct_9fa48("966")) {
    {}
  } else {
    stryCov_9fa48("966");
    if (stryMutAct_9fa48("969") ? hex.length % 2 !== 0 && /[^0-9a-f]/i.test(hex) : stryMutAct_9fa48("968") ? false : stryMutAct_9fa48("967") ? true : (stryCov_9fa48("967", "968", "969"), (stryMutAct_9fa48("971") ? hex.length % 2 === 0 : stryMutAct_9fa48("970") ? false : (stryCov_9fa48("970", "971"), (stryMutAct_9fa48("972") ? hex.length * 2 : (stryCov_9fa48("972"), hex.length % 2)) !== 0)) || (stryMutAct_9fa48("973") ? /[0-9a-f]/i : (stryCov_9fa48("973"), /[^0-9a-f]/i)).test(hex))) throw new Error(stryMutAct_9fa48("974") ? "" : (stryCov_9fa48("974"), "invalid byte encoding"));
    const out = new Uint8Array(stryMutAct_9fa48("975") ? hex.length * 2 : (stryCov_9fa48("975"), hex.length / 2));
    for (let i = 0; stryMutAct_9fa48("978") ? i >= out.length : stryMutAct_9fa48("977") ? i <= out.length : stryMutAct_9fa48("976") ? false : (stryCov_9fa48("976", "977", "978"), i < out.length); stryMutAct_9fa48("979") ? i -= 1 : (stryCov_9fa48("979"), i += 1)) out[i] = Number.parseInt(stryMutAct_9fa48("980") ? hex : (stryCov_9fa48("980"), hex.slice(stryMutAct_9fa48("981") ? i / 2 : (stryCov_9fa48("981"), i * 2), stryMutAct_9fa48("982") ? i * 2 - 2 : (stryCov_9fa48("982"), (stryMutAct_9fa48("983") ? i / 2 : (stryCov_9fa48("983"), i * 2)) + 2))), 16);
    return out;
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  if (stryMutAct_9fa48("984")) {
    {}
  } else {
    stryCov_9fa48("984");
    return stryMutAct_9fa48("987") ? typeof value === "object" || value !== null : stryMutAct_9fa48("986") ? false : stryMutAct_9fa48("985") ? true : (stryCov_9fa48("985", "986", "987"), (stryMutAct_9fa48("989") ? typeof value !== "object" : stryMutAct_9fa48("988") ? true : (stryCov_9fa48("988", "989"), typeof value === (stryMutAct_9fa48("990") ? "" : (stryCov_9fa48("990"), "object")))) && (stryMutAct_9fa48("992") ? value === null : stryMutAct_9fa48("991") ? true : (stryCov_9fa48("991", "992"), value !== null)));
  }
}