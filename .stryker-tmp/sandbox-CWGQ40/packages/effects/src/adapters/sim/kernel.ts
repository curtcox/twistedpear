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
import type { Event, Intent, NodeId, StepFn } from "../../types.js";
import { hashTrace, type TraceEntry } from "../../trace.js";
import { SimClock } from "./clock.js";
import { Xoshiro128StarStar } from "./entropy.js";
import { SimStore } from "./store.js";
import { SimTimers } from "./timers.js";
import { SimTransport, type DeliveryModel } from "./transport.js";
import type { LinkConfig } from "./transport-classes.js";
import type { HistoryRecorder, RecordedHistory } from "./recorder.js";
import { snapshotConfig } from "./recorder.js";
import type { Oracle, Violation, WorldView } from "./oracles.js";
export interface SimNodeConfig<S> {
  readonly id: NodeId;
  /** Stable registry key used when replaying an on-disk history. */
  readonly machine?: string;
  readonly initial: S;
  readonly step: StepFn<S>;
}
export interface SimKernelConfig<S> {
  readonly seed: number;
  readonly startMs?: number;
  readonly nodes: readonly SimNodeConfig<S>[];
  readonly delivery?: DeliveryModel;
  readonly links?: readonly LinkConfig[];
  /** Salt mixed into the transport RNG only — schedule fuzz without changing protocol seed. */
  readonly interleaveSalt?: number;
  readonly oracles?: readonly Oracle<S>[];
  readonly recorder?: HistoryRecorder<S>;
}
export class OracleViolation extends Error {
  constructor(readonly violation: Violation, readonly history: RecordedHistory, readonly historyPath?: string) {
    super(violation.message);
    this.name = stryMutAct_9fa48("615") ? "" : (stryCov_9fa48("615"), "OracleViolation");
  }
}
export class EffectWithoutIntentError extends Error {
  constructor(message: string) {
    if (stryMutAct_9fa48("616")) {
      {}
    } else {
      stryCov_9fa48("616");
      super(message);
      this.name = stryMutAct_9fa48("617") ? "" : (stryCov_9fa48("617"), "EffectWithoutIntentError");
    }
  }
}
interface NodeRuntime<S> {
  readonly id: NodeId;
  state: S;
  readonly step: StepFn<S>;
  readonly timers: SimTimers;
  readonly store: SimStore;
  readonly entropy: Xoshiro128StarStar;
}

/**
 * Simulator kernel: the only holder of virtual time, entropy, transport, and
 * storage. Asserts every externally visible action was produced via an intent.
 */
export class SimKernel<S> {
  readonly clock: SimClock;
  readonly transport: SimTransport;
  private readonly nodes = new Map<NodeId, NodeRuntime<S>>();
  private readonly trace: TraceEntry[] = stryMutAct_9fa48("618") ? ["Stryker was here"] : (stryCov_9fa48("618"), []);
  private readonly intentLog: Intent[] = stryMutAct_9fa48("619") ? ["Stryker was here"] : (stryCov_9fa48("619"), []);
  private readonly seed: number;
  private readonly config: SimKernelConfig<S>;
  constructor(config: SimKernelConfig<S>) {
    if (stryMutAct_9fa48("620")) {
      {}
    } else {
      stryCov_9fa48("620");
      this.config = config;
      this.seed = config.seed;
      this.clock = new SimClock(stryMutAct_9fa48("621") ? config.startMs && 0 : (stryCov_9fa48("621"), config.startMs ?? 0));
      const transportEntropy = new Xoshiro128StarStar((config.seed ^ (stryMutAct_9fa48("622") ? config.interleaveSalt && 0 : (stryCov_9fa48("622"), config.interleaveSalt ?? 0))) >>> 0);
      const rng = stryMutAct_9fa48("623") ? () => undefined : (stryCov_9fa48("623"), (() => {
        const rng = (): number => stryMutAct_9fa48("624") ? transportEntropy.randomBytes(4)[0]! * 256 : (stryCov_9fa48("624"), transportEntropy.randomBytes(4)[0]! / 256);
        return rng;
      })());
      this.transport = new SimTransport(stryMutAct_9fa48("625") ? {} : (stryCov_9fa48("625"), {
        ...((stryMutAct_9fa48("628") ? config.delivery !== undefined : stryMutAct_9fa48("627") ? false : stryMutAct_9fa48("626") ? true : (stryCov_9fa48("626", "627", "628"), config.delivery === undefined)) ? {} : stryMutAct_9fa48("629") ? {} : (stryCov_9fa48("629"), {
          delivery: config.delivery
        })),
        ...((stryMutAct_9fa48("632") ? config.links !== undefined : stryMutAct_9fa48("631") ? false : stryMutAct_9fa48("630") ? true : (stryCov_9fa48("630", "631", "632"), config.links === undefined)) ? {} : stryMutAct_9fa48("633") ? {} : (stryCov_9fa48("633"), {
          links: config.links
        }))
      }), rng);
      for (const node of config.nodes) {
        if (stryMutAct_9fa48("634")) {
          {}
        } else {
          stryCov_9fa48("634");
          const entropy = new Xoshiro128StarStar((config.seed ^ hashNodeId(node.id)) >>> 0);
          this.nodes.set(node.id, stryMutAct_9fa48("635") ? {} : (stryCov_9fa48("635"), {
            id: node.id,
            state: node.initial,
            step: node.step,
            timers: new SimTimers(this.clock),
            store: new SimStore(),
            entropy
          }));
        }
      }
    }
  }
  getTrace(): readonly TraceEntry[] {
    if (stryMutAct_9fa48("636")) {
      {}
    } else {
      stryCov_9fa48("636");
      return this.trace;
    }
  }
  getTraceHash(): string {
    if (stryMutAct_9fa48("637")) {
      {}
    } else {
      stryCov_9fa48("637");
      return hashTrace(this.trace);
    }
  }
  getIntentLog(): readonly Intent[] {
    if (stryMutAct_9fa48("638")) {
      {}
    } else {
      stryCov_9fa48("638");
      return this.intentLog;
    }
  }
  getNodeState(id: NodeId): S {
    if (stryMutAct_9fa48("639")) {
      {}
    } else {
      stryCov_9fa48("639");
      const node = this.requireNode(id);
      return node.state;
    }
  }
  getWorldView(): WorldView<S> {
    if (stryMutAct_9fa48("640")) {
      {}
    } else {
      stryCov_9fa48("640");
      return stryMutAct_9fa48("641") ? {} : (stryCov_9fa48("641"), {
        at: this.clock.now(),
        nodes: new Map((stryMutAct_9fa48("642") ? [] : (stryCov_9fa48("642"), [...this.nodes])).map(stryMutAct_9fa48("643") ? () => undefined : (stryCov_9fa48("643"), ([id, node]) => stryMutAct_9fa48("644") ? [] : (stryCov_9fa48("644"), [id, node.state])))),
        trace: this.trace,
        intents: this.intentLog
      });
    }
  }
  getHistory(violation?: Violation): RecordedHistory<S> {
    if (stryMutAct_9fa48("645")) {
      {}
    } else {
      stryCov_9fa48("645");
      return stryMutAct_9fa48("646") ? {} : (stryCov_9fa48("646"), {
        version: 1,
        config: snapshotConfig(this.config),
        trace: stryMutAct_9fa48("647") ? [] : (stryCov_9fa48("647"), [...this.trace]),
        ...((stryMutAct_9fa48("650") ? violation !== undefined : stryMutAct_9fa48("649") ? false : stryMutAct_9fa48("648") ? true : (stryCov_9fa48("648", "649", "650"), violation === undefined)) ? {} : stryMutAct_9fa48("651") ? {} : (stryCov_9fa48("651"), {
          violation
        }))
      });
    }
  }
  recordHistory(): string | undefined {
    if (stryMutAct_9fa48("652")) {
      {}
    } else {
      stryCov_9fa48("652");
      return stryMutAct_9fa48("653") ? this.config.recorder.record(this.getHistory()) : (stryCov_9fa48("653"), this.config.recorder?.record(this.getHistory()));
    }
  }
  entropyFor(id: NodeId): Xoshiro128StarStar {
    if (stryMutAct_9fa48("654")) {
      {}
    } else {
      stryCov_9fa48("654");
      return this.requireNode(id).entropy;
    }
  }

  /** Deliver an external event to a node and process cascading store replies. */
  inject(nodeId: NodeId, event: Event): void {
    if (stryMutAct_9fa48("655")) {
      {}
    } else {
      stryCov_9fa48("655");
      this.dispatch(nodeId, event);
    }
  }
  start(): void {
    if (stryMutAct_9fa48("656")) {
      {}
    } else {
      stryCov_9fa48("656");
      const at = this.clock.now();
      for (const id of stryMutAct_9fa48("657") ? [...this.nodes.keys()] : (stryCov_9fa48("657"), (stryMutAct_9fa48("658") ? [] : (stryCov_9fa48("658"), [...this.nodes.keys()])).sort())) {
        if (stryMutAct_9fa48("659")) {
          {}
        } else {
          stryCov_9fa48("659");
          this.dispatch(id, stryMutAct_9fa48("660") ? {} : (stryCov_9fa48("660"), {
            kind: stryMutAct_9fa48("661") ? "" : (stryCov_9fa48("661"), "start"),
            at
          }));
        }
      }
    }
  }

  /**
   * Advance virtual time to `target` (or the next scheduled effect if earlier),
   * delivering due timers and transport messages in deterministic order.
   */
  advanceTo(target: number): void {
    if (stryMutAct_9fa48("662")) {
      {}
    } else {
      stryCov_9fa48("662");
      let guard = 0;
      while (stryMutAct_9fa48("665") ? guard >= 100_000 : stryMutAct_9fa48("664") ? guard <= 100_000 : stryMutAct_9fa48("663") ? false : (stryCov_9fa48("663", "664", "665"), guard < 100_000)) {
        if (stryMutAct_9fa48("666")) {
          {}
        } else {
          stryCov_9fa48("666");
          stryMutAct_9fa48("667") ? guard -= 1 : (stryCov_9fa48("667"), guard += 1);
          const next = this.nextScheduledAt();
          if (stryMutAct_9fa48("670") ? next === undefined && next > target : stryMutAct_9fa48("669") ? false : stryMutAct_9fa48("668") ? true : (stryCov_9fa48("668", "669", "670"), (stryMutAct_9fa48("672") ? next !== undefined : stryMutAct_9fa48("671") ? false : (stryCov_9fa48("671", "672"), next === undefined)) || (stryMutAct_9fa48("675") ? next <= target : stryMutAct_9fa48("674") ? next >= target : stryMutAct_9fa48("673") ? false : (stryCov_9fa48("673", "674", "675"), next > target)))) {
            if (stryMutAct_9fa48("676")) {
              {}
            } else {
              stryCov_9fa48("676");
              this.clock.set(target);
              this.trace.push(stryMutAct_9fa48("677") ? {} : (stryCov_9fa48("677"), {
                t: stryMutAct_9fa48("678") ? "" : (stryCov_9fa48("678"), "advance"),
                at: target
              }));
              return;
            }
          }
          this.clock.set(next);
          this.trace.push(stryMutAct_9fa48("679") ? {} : (stryCov_9fa48("679"), {
            t: stryMutAct_9fa48("680") ? "" : (stryCov_9fa48("680"), "advance"),
            at: next
          }));
          this.deliverDue(next);
        }
      }
      throw new Error(stryMutAct_9fa48("681") ? "" : (stryCov_9fa48("681"), "SimKernel.advanceTo exceeded iteration guard"));
    }
  }

  /** Run until no timers or in-flight messages remain, capped by `until`. */
  runUntilIdle(until: number): void {
    if (stryMutAct_9fa48("682")) {
      {}
    } else {
      stryCov_9fa48("682");
      let guard = 0;
      while (stryMutAct_9fa48("685") ? guard >= 100_000 : stryMutAct_9fa48("684") ? guard <= 100_000 : stryMutAct_9fa48("683") ? false : (stryCov_9fa48("683", "684", "685"), guard < 100_000)) {
        if (stryMutAct_9fa48("686")) {
          {}
        } else {
          stryCov_9fa48("686");
          stryMutAct_9fa48("687") ? guard -= 1 : (stryCov_9fa48("687"), guard += 1);
          const next = this.nextScheduledAt();
          if (stryMutAct_9fa48("690") ? next === undefined && next > until : stryMutAct_9fa48("689") ? false : stryMutAct_9fa48("688") ? true : (stryCov_9fa48("688", "689", "690"), (stryMutAct_9fa48("692") ? next !== undefined : stryMutAct_9fa48("691") ? false : (stryCov_9fa48("691", "692"), next === undefined)) || (stryMutAct_9fa48("695") ? next <= until : stryMutAct_9fa48("694") ? next >= until : stryMutAct_9fa48("693") ? false : (stryCov_9fa48("693", "694", "695"), next > until)))) {
            if (stryMutAct_9fa48("696")) {
              {}
            } else {
              stryCov_9fa48("696");
              return;
            }
          }
          this.advanceTo(next);
        }
      }
      throw new Error(stryMutAct_9fa48("697") ? "" : (stryCov_9fa48("697"), "SimKernel.runUntilIdle exceeded iteration guard"));
    }
  }
  private nextScheduledAt(): number | undefined {
    if (stryMutAct_9fa48("698")) {
      {}
    } else {
      stryCov_9fa48("698");
      let soonest: number | undefined;
      for (const node of this.nodes.values()) {
        if (stryMutAct_9fa48("699")) {
          {}
        } else {
          stryCov_9fa48("699");
          const t = node.timers.nextFireAt();
          if (stryMutAct_9fa48("702") ? t !== undefined || soonest === undefined || t < soonest : stryMutAct_9fa48("701") ? false : stryMutAct_9fa48("700") ? true : (stryCov_9fa48("700", "701", "702"), (stryMutAct_9fa48("704") ? t === undefined : stryMutAct_9fa48("703") ? true : (stryCov_9fa48("703", "704"), t !== undefined)) && (stryMutAct_9fa48("706") ? soonest === undefined && t < soonest : stryMutAct_9fa48("705") ? true : (stryCov_9fa48("705", "706"), (stryMutAct_9fa48("708") ? soonest !== undefined : stryMutAct_9fa48("707") ? false : (stryCov_9fa48("707", "708"), soonest === undefined)) || (stryMutAct_9fa48("711") ? t >= soonest : stryMutAct_9fa48("710") ? t <= soonest : stryMutAct_9fa48("709") ? false : (stryCov_9fa48("709", "710", "711"), t < soonest)))))) {
            if (stryMutAct_9fa48("712")) {
              {}
            } else {
              stryCov_9fa48("712");
              soonest = t;
            }
          }
        }
      }
      const d = this.transport.nextDeliverAt();
      if (stryMutAct_9fa48("715") ? d !== undefined || soonest === undefined || d < soonest : stryMutAct_9fa48("714") ? false : stryMutAct_9fa48("713") ? true : (stryCov_9fa48("713", "714", "715"), (stryMutAct_9fa48("717") ? d === undefined : stryMutAct_9fa48("716") ? true : (stryCov_9fa48("716", "717"), d !== undefined)) && (stryMutAct_9fa48("719") ? soonest === undefined && d < soonest : stryMutAct_9fa48("718") ? true : (stryCov_9fa48("718", "719"), (stryMutAct_9fa48("721") ? soonest !== undefined : stryMutAct_9fa48("720") ? false : (stryCov_9fa48("720", "721"), soonest === undefined)) || (stryMutAct_9fa48("724") ? d >= soonest : stryMutAct_9fa48("723") ? d <= soonest : stryMutAct_9fa48("722") ? false : (stryCov_9fa48("722", "723", "724"), d < soonest)))))) {
        if (stryMutAct_9fa48("725")) {
          {}
        } else {
          stryCov_9fa48("725");
          soonest = d;
        }
      }
      return soonest;
    }
  }
  private deliverDue(at: number): void {
    if (stryMutAct_9fa48("726")) {
      {}
    } else {
      stryCov_9fa48("726");
      const nodeIds = stryMutAct_9fa48("727") ? [...this.nodes.keys()] : (stryCov_9fa48("727"), (stryMutAct_9fa48("728") ? [] : (stryCov_9fa48("728"), [...this.nodes.keys()])).sort());
      for (const id of nodeIds) {
        if (stryMutAct_9fa48("729")) {
          {}
        } else {
          stryCov_9fa48("729");
          const node = this.requireNode(id);
          for (const timerId of node.timers.dueAt(at)) {
            if (stryMutAct_9fa48("730")) {
              {}
            } else {
              stryCov_9fa48("730");
              this.dispatch(id, stryMutAct_9fa48("731") ? {} : (stryCov_9fa48("731"), {
                kind: stryMutAct_9fa48("732") ? "" : (stryCov_9fa48("732"), "timer/fired"),
                id: timerId,
                at
              }));
            }
          }
        }
      }
      for (const msg of this.transport.deliverDue(at)) {
        if (stryMutAct_9fa48("733")) {
          {}
        } else {
          stryCov_9fa48("733");
          if (stryMutAct_9fa48("736") ? false : stryMutAct_9fa48("735") ? true : stryMutAct_9fa48("734") ? this.nodes.has(msg.destination) : (stryCov_9fa48("734", "735", "736"), !this.nodes.has(msg.destination))) {
            if (stryMutAct_9fa48("737")) {
              {}
            } else {
              stryCov_9fa48("737");
              throw new EffectWithoutIntentError(stryMutAct_9fa48("738") ? `` : (stryCov_9fa48("738"), `transport delivery to unknown node ${msg.destination} without matching topology`));
            }
          }
          this.dispatch(msg.destination, stryMutAct_9fa48("739") ? {} : (stryCov_9fa48("739"), {
            kind: stryMutAct_9fa48("740") ? "" : (stryCov_9fa48("740"), "transport/recv"),
            channel: msg.channel,
            source: msg.source,
            payload: msg.payload,
            at
          }));
        }
      }
    }
  }
  private dispatch(nodeId: NodeId, event: Event): void {
    if (stryMutAct_9fa48("741")) {
      {}
    } else {
      stryCov_9fa48("741");
      const node = this.requireNode(nodeId);
      this.trace.push(stryMutAct_9fa48("742") ? {} : (stryCov_9fa48("742"), {
        t: stryMutAct_9fa48("743") ? "" : (stryCov_9fa48("743"), "event"),
        node: nodeId,
        event
      }));
      const result = node.step(node.state, event);
      node.state = result.state;
      for (const intent of result.intents) {
        if (stryMutAct_9fa48("744")) {
          {}
        } else {
          stryCov_9fa48("744");
          this.recordIntent(nodeId, intent);
          this.applyIntent(node, intent);
        }
      }
      this.checkOracles();
    }
  }
  private checkOracles(): void {
    if (stryMutAct_9fa48("745")) {
      {}
    } else {
      stryCov_9fa48("745");
      if (stryMutAct_9fa48("748") ? this.config.oracles !== undefined : stryMutAct_9fa48("747") ? false : stryMutAct_9fa48("746") ? true : (stryCov_9fa48("746", "747", "748"), this.config.oracles === undefined)) return;
      const world = this.getWorldView();
      for (const oracle of this.config.oracles) {
        if (stryMutAct_9fa48("749")) {
          {}
        } else {
          stryCov_9fa48("749");
          const violation = oracle.check(world);
          if (stryMutAct_9fa48("752") ? violation === null : stryMutAct_9fa48("751") ? false : stryMutAct_9fa48("750") ? true : (stryCov_9fa48("750", "751", "752"), violation !== null)) {
            if (stryMutAct_9fa48("753")) {
              {}
            } else {
              stryCov_9fa48("753");
              const history = this.getHistory(violation);
              const path = stryMutAct_9fa48("754") ? this.config.recorder.record(history) : (stryCov_9fa48("754"), this.config.recorder?.record(history));
              throw new OracleViolation(violation, history, path);
            }
          }
        }
      }
    }
  }
  private recordIntent(nodeId: NodeId, intent: Intent): void {
    if (stryMutAct_9fa48("755")) {
      {}
    } else {
      stryCov_9fa48("755");
      this.intentLog.push(intent);
      this.trace.push(stryMutAct_9fa48("756") ? {} : (stryCov_9fa48("756"), {
        t: stryMutAct_9fa48("757") ? "" : (stryCov_9fa48("757"), "intent"),
        node: nodeId,
        intent
      }));
    }
  }
  private applyIntent(node: NodeRuntime<S>, intent: Intent): void {
    if (stryMutAct_9fa48("758")) {
      {}
    } else {
      stryCov_9fa48("758");
      if (stryMutAct_9fa48("761") ? intent.kind !== "need_entropy" : stryMutAct_9fa48("760") ? false : stryMutAct_9fa48("759") ? true : (stryCov_9fa48("759", "760", "761"), intent.kind === (stryMutAct_9fa48("762") ? "" : (stryCov_9fa48("762"), "need_entropy")))) {
        if (stryMutAct_9fa48("763")) {
          {}
        } else {
          stryCov_9fa48("763");
          if (stryMutAct_9fa48("766") ? !Number.isSafeInteger(intent.nbytes) && intent.nbytes < 0 : stryMutAct_9fa48("765") ? false : stryMutAct_9fa48("764") ? true : (stryCov_9fa48("764", "765", "766"), (stryMutAct_9fa48("767") ? Number.isSafeInteger(intent.nbytes) : (stryCov_9fa48("767"), !Number.isSafeInteger(intent.nbytes))) || (stryMutAct_9fa48("770") ? intent.nbytes >= 0 : stryMutAct_9fa48("769") ? intent.nbytes <= 0 : stryMutAct_9fa48("768") ? false : (stryCov_9fa48("768", "769", "770"), intent.nbytes < 0)))) {
            if (stryMutAct_9fa48("771")) {
              {}
            } else {
              stryCov_9fa48("771");
              throw new EffectWithoutIntentError(stryMutAct_9fa48("772") ? `` : (stryCov_9fa48("772"), `invalid entropy byte count: ${intent.nbytes}`));
            }
          }
          this.dispatch(node.id, stryMutAct_9fa48("773") ? {} : (stryCov_9fa48("773"), {
            kind: stryMutAct_9fa48("774") ? "" : (stryCov_9fa48("774"), "entropy"),
            bytes: node.entropy.randomBytes(intent.nbytes)
          }));
          return;
        }
      }
      if (stryMutAct_9fa48("777") ? intent.kind !== "transport/adversary" : stryMutAct_9fa48("776") ? false : stryMutAct_9fa48("775") ? true : (stryCov_9fa48("775", "776", "777"), intent.kind === (stryMutAct_9fa48("778") ? "" : (stryCov_9fa48("778"), "transport/adversary")))) {
        if (stryMutAct_9fa48("779")) {
          {}
        } else {
          stryCov_9fa48("779");
          this.transport.applyAdversary(intent.action, node.id, this.clock.now());
          return;
        }
      }
      if (stryMutAct_9fa48("782") ? intent.kind === "timer/set" && intent.kind === "timer/cancel" : stryMutAct_9fa48("781") ? false : stryMutAct_9fa48("780") ? true : (stryCov_9fa48("780", "781", "782"), (stryMutAct_9fa48("784") ? intent.kind !== "timer/set" : stryMutAct_9fa48("783") ? false : (stryCov_9fa48("783", "784"), intent.kind === (stryMutAct_9fa48("785") ? "" : (stryCov_9fa48("785"), "timer/set")))) || (stryMutAct_9fa48("787") ? intent.kind !== "timer/cancel" : stryMutAct_9fa48("786") ? false : (stryCov_9fa48("786", "787"), intent.kind === (stryMutAct_9fa48("788") ? "" : (stryCov_9fa48("788"), "timer/cancel")))))) {
        if (stryMutAct_9fa48("789")) {
          {}
        } else {
          stryCov_9fa48("789");
          node.timers.applyIntent(intent);
          return;
        }
      }
      if (stryMutAct_9fa48("792") ? intent.kind !== "transport/send" : stryMutAct_9fa48("791") ? false : stryMutAct_9fa48("790") ? true : (stryCov_9fa48("790", "791", "792"), intent.kind === (stryMutAct_9fa48("793") ? "" : (stryCov_9fa48("793"), "transport/send")))) {
        if (stryMutAct_9fa48("794")) {
          {}
        } else {
          stryCov_9fa48("794");
          this.transport.applySend(intent, node.id, this.clock.now());
          return;
        }
      }
      if (stryMutAct_9fa48("797") ? (intent.kind === "store/read" || intent.kind === "store/write") && intent.kind === "store/delete" : stryMutAct_9fa48("796") ? false : stryMutAct_9fa48("795") ? true : (stryCov_9fa48("795", "796", "797"), (stryMutAct_9fa48("799") ? intent.kind === "store/read" && intent.kind === "store/write" : stryMutAct_9fa48("798") ? false : (stryCov_9fa48("798", "799"), (stryMutAct_9fa48("801") ? intent.kind !== "store/read" : stryMutAct_9fa48("800") ? false : (stryCov_9fa48("800", "801"), intent.kind === (stryMutAct_9fa48("802") ? "" : (stryCov_9fa48("802"), "store/read")))) || (stryMutAct_9fa48("804") ? intent.kind !== "store/write" : stryMutAct_9fa48("803") ? false : (stryCov_9fa48("803", "804"), intent.kind === (stryMutAct_9fa48("805") ? "" : (stryCov_9fa48("805"), "store/write")))))) || (stryMutAct_9fa48("807") ? intent.kind !== "store/delete" : stryMutAct_9fa48("806") ? false : (stryCov_9fa48("806", "807"), intent.kind === (stryMutAct_9fa48("808") ? "" : (stryCov_9fa48("808"), "store/delete")))))) {
        if (stryMutAct_9fa48("809")) {
          {}
        } else {
          stryCov_9fa48("809");
          const events = node.store.applyIntent(intent);
          for (const ev of events) {
            if (stryMutAct_9fa48("810")) {
              {}
            } else {
              stryCov_9fa48("810");
              this.dispatch(node.id, ev);
            }
          }
          return;
        }
      }
      if (stryMutAct_9fa48("813") ? intent.kind !== "log" : stryMutAct_9fa48("812") ? false : stryMutAct_9fa48("811") ? true : (stryCov_9fa48("811", "812", "813"), intent.kind === (stryMutAct_9fa48("814") ? "" : (stryCov_9fa48("814"), "log")))) {
        if (stryMutAct_9fa48("815")) {
          {}
        } else {
          stryCov_9fa48("815");
          return;
        }
      }
      throw new EffectWithoutIntentError(stryMutAct_9fa48("816") ? `` : (stryCov_9fa48("816"), `unhandled intent kind: ${(intent as Intent).kind}`));
    }
  }
  private requireNode(id: NodeId): NodeRuntime<S> {
    if (stryMutAct_9fa48("817")) {
      {}
    } else {
      stryCov_9fa48("817");
      const node = this.nodes.get(id);
      if (stryMutAct_9fa48("820") ? node !== undefined : stryMutAct_9fa48("819") ? false : stryMutAct_9fa48("818") ? true : (stryCov_9fa48("818", "819", "820"), node === undefined)) {
        if (stryMutAct_9fa48("821")) {
          {}
        } else {
          stryCov_9fa48("821");
          throw new Error(stryMutAct_9fa48("822") ? `` : (stryCov_9fa48("822"), `unknown node: ${id}`));
        }
      }
      return node;
    }
  }
}
function hashNodeId(id: string): number {
  if (stryMutAct_9fa48("823")) {
    {}
  } else {
    stryCov_9fa48("823");
    let h = 0x811c9dc5;
    for (let i = 0; stryMutAct_9fa48("826") ? i >= id.length : stryMutAct_9fa48("825") ? i <= id.length : stryMutAct_9fa48("824") ? false : (stryCov_9fa48("824", "825", "826"), i < id.length); stryMutAct_9fa48("827") ? i -= 1 : (stryCov_9fa48("827"), i += 1)) {
      if (stryMutAct_9fa48("828")) {
        {}
      } else {
        stryCov_9fa48("828");
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
      }
    }
    return h >>> 0;
  }
}

/** Convenience: run the same scenario twice and return both trace hashes. */
export function doubleRunHashes<S>(config: SimKernelConfig<S>): {
  readonly a: string;
  readonly b: string;
} {
  if (stryMutAct_9fa48("829")) {
    {}
  } else {
    stryCov_9fa48("829");
    const run = (): string => {
      if (stryMutAct_9fa48("830")) {
        {}
      } else {
        stryCov_9fa48("830");
        const kernel = new SimKernel(config);
        kernel.start();
        kernel.runUntilIdle(1_000_000);
        return kernel.getTraceHash();
      }
    };
    return stryMutAct_9fa48("831") ? {} : (stryCov_9fa48("831"), {
      a: run(),
      b: run()
    });
  }
}