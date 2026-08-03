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
import type { InstantMs, Intent, NodeId } from "../../types.js";
import type { TraceEntry } from "../../trace.js";
export interface Violation {
  readonly oracle: string;
  readonly message: string;
  readonly nodes?: readonly NodeId[];
  readonly details?: Readonly<Record<string, unknown>>;
}
export interface WorldView<S> {
  readonly at: InstantMs;
  readonly nodes: ReadonlyMap<NodeId, S>;
  readonly trace: readonly TraceEntry[];
  readonly intents: readonly Intent[];
}
export interface Oracle<S> {
  readonly name: string;
  readonly check: (world: WorldView<S>) => Violation | null;
}
export interface GrantCoverageView {
  readonly storedBlobIds: readonly string[];
  readonly liveGrantBlobIds: readonly string[];
}
export function grantCoverageOracle<S>(project: (state: S, node: NodeId) => GrantCoverageView): Oracle<S> {
  if (stryMutAct_9fa48("832")) {
    {}
  } else {
    stryCov_9fa48("832");
    return stryMutAct_9fa48("833") ? {} : (stryCov_9fa48("833"), {
      name: stryMutAct_9fa48("834") ? "" : (stryCov_9fa48("834"), "grant-coverage"),
      check(world) {
        if (stryMutAct_9fa48("835")) {
          {}
        } else {
          stryCov_9fa48("835");
          const live = new Set<string>();
          const stored: Array<{
            node: NodeId;
            blob: string;
          }> = stryMutAct_9fa48("836") ? ["Stryker was here"] : (stryCov_9fa48("836"), []);
          for (const [node, state] of world.nodes) {
            if (stryMutAct_9fa48("837")) {
              {}
            } else {
              stryCov_9fa48("837");
              const view = project(state, node);
              for (const blob of view.liveGrantBlobIds) live.add(blob);
              for (const blob of view.storedBlobIds) stored.push(stryMutAct_9fa48("838") ? {} : (stryCov_9fa48("838"), {
                node,
                blob
              }));
            }
          }
          const uncovered = stryMutAct_9fa48("839") ? stored : (stryCov_9fa48("839"), stored.filter(stryMutAct_9fa48("840") ? () => undefined : (stryCov_9fa48("840"), ({
            blob
          }) => stryMutAct_9fa48("841") ? live.has(blob) : (stryCov_9fa48("841"), !live.has(blob)))));
          return (stryMutAct_9fa48("844") ? uncovered.length !== 0 : stryMutAct_9fa48("843") ? false : stryMutAct_9fa48("842") ? true : (stryCov_9fa48("842", "843", "844"), uncovered.length === 0)) ? null : stryMutAct_9fa48("845") ? {} : (stryCov_9fa48("845"), {
            oracle: stryMutAct_9fa48("846") ? "" : (stryCov_9fa48("846"), "grant-coverage"),
            message: stryMutAct_9fa48("847") ? `` : (stryCov_9fa48("847"), `stored blobs lack a live grant: ${uncovered.map(stryMutAct_9fa48("848") ? () => undefined : (stryCov_9fa48("848"), ({
              blob
            }) => blob)).join(stryMutAct_9fa48("849") ? "" : (stryCov_9fa48("849"), ", "))}`),
            nodes: stryMutAct_9fa48("850") ? [] : (stryCov_9fa48("850"), [...new Set(uncovered.map(stryMutAct_9fa48("851") ? () => undefined : (stryCov_9fa48("851"), ({
              node
            }) => node)))]),
            details: stryMutAct_9fa48("852") ? {} : (stryCov_9fa48("852"), {
              blobIds: uncovered.map(stryMutAct_9fa48("853") ? () => undefined : (stryCov_9fa48("853"), ({
                blob
              }) => blob))
            })
          });
        }
      }
    });
  }
}
export interface GrantIdentity {
  readonly id: string;
  /** A stable description of the authority represented by this grant. */
  readonly fingerprint: string;
}
export function idUniquenessOracle<S>(grants: (state: S, node: NodeId) => readonly GrantIdentity[]): Oracle<S> {
  if (stryMutAct_9fa48("854")) {
    {}
  } else {
    stryCov_9fa48("854");
    return stryMutAct_9fa48("855") ? {} : (stryCov_9fa48("855"), {
      name: stryMutAct_9fa48("856") ? "" : (stryCov_9fa48("856"), "id-uniqueness"),
      check(world) {
        if (stryMutAct_9fa48("857")) {
          {}
        } else {
          stryCov_9fa48("857");
          const seen = new Map<string, {
            fingerprint: string;
            node: NodeId;
          }>();
          for (const [node, state] of world.nodes) {
            if (stryMutAct_9fa48("858")) {
              {}
            } else {
              stryCov_9fa48("858");
              for (const grant of grants(state, node)) {
                if (stryMutAct_9fa48("859")) {
                  {}
                } else {
                  stryCov_9fa48("859");
                  const prior = seen.get(grant.id);
                  if (stryMutAct_9fa48("862") ? prior !== undefined || prior.fingerprint !== grant.fingerprint : stryMutAct_9fa48("861") ? false : stryMutAct_9fa48("860") ? true : (stryCov_9fa48("860", "861", "862"), (stryMutAct_9fa48("864") ? prior === undefined : stryMutAct_9fa48("863") ? true : (stryCov_9fa48("863", "864"), prior !== undefined)) && (stryMutAct_9fa48("866") ? prior.fingerprint === grant.fingerprint : stryMutAct_9fa48("865") ? true : (stryCov_9fa48("865", "866"), prior.fingerprint !== grant.fingerprint)))) {
                    if (stryMutAct_9fa48("867")) {
                      {}
                    } else {
                      stryCov_9fa48("867");
                      return stryMutAct_9fa48("868") ? {} : (stryCov_9fa48("868"), {
                        oracle: stryMutAct_9fa48("869") ? "" : (stryCov_9fa48("869"), "id-uniqueness"),
                        message: stryMutAct_9fa48("870") ? `` : (stryCov_9fa48("870"), `distinct grants share id ${grant.id}`),
                        nodes: stryMutAct_9fa48("871") ? [] : (stryCov_9fa48("871"), [prior.node, node]),
                        details: stryMutAct_9fa48("872") ? {} : (stryCov_9fa48("872"), {
                          id: grant.id,
                          fingerprints: stryMutAct_9fa48("873") ? [] : (stryCov_9fa48("873"), [prior.fingerprint, grant.fingerprint])
                        })
                      });
                    }
                  }
                  seen.set(grant.id, stryMutAct_9fa48("874") ? {} : (stryCov_9fa48("874"), {
                    fingerprint: grant.fingerprint,
                    node
                  }));
                }
              }
            }
          }
          return null;
        }
      }
    });
  }
}
export interface GrantAuthorization {
  readonly id: string;
  readonly revokedAt?: InstantMs;
  readonly accessTimes: readonly InstantMs[];
}
export function revocationMonotonicityOracle<S>(grants: (state: S, node: NodeId) => readonly GrantAuthorization[]): Oracle<S> {
  if (stryMutAct_9fa48("875")) {
    {}
  } else {
    stryCov_9fa48("875");
    return stryMutAct_9fa48("876") ? {} : (stryCov_9fa48("876"), {
      name: stryMutAct_9fa48("877") ? "" : (stryCov_9fa48("877"), "revocation-monotonicity"),
      check(world) {
        if (stryMutAct_9fa48("878")) {
          {}
        } else {
          stryCov_9fa48("878");
          for (const [node, state] of world.nodes) {
            if (stryMutAct_9fa48("879")) {
              {}
            } else {
              stryCov_9fa48("879");
              for (const grant of grants(state, node)) {
                if (stryMutAct_9fa48("880")) {
                  {}
                } else {
                  stryCov_9fa48("880");
                  if (stryMutAct_9fa48("883") ? grant.revokedAt !== undefined : stryMutAct_9fa48("882") ? false : stryMutAct_9fa48("881") ? true : (stryCov_9fa48("881", "882", "883"), grant.revokedAt === undefined)) continue;
                  const accessAt = grant.accessTimes.find(stryMutAct_9fa48("884") ? () => undefined : (stryCov_9fa48("884"), at => stryMutAct_9fa48("888") ? at <= grant.revokedAt! : stryMutAct_9fa48("887") ? at >= grant.revokedAt! : stryMutAct_9fa48("886") ? false : stryMutAct_9fa48("885") ? true : (stryCov_9fa48("885", "886", "887", "888"), at > grant.revokedAt!)));
                  if (stryMutAct_9fa48("891") ? accessAt === undefined : stryMutAct_9fa48("890") ? false : stryMutAct_9fa48("889") ? true : (stryCov_9fa48("889", "890", "891"), accessAt !== undefined)) {
                    if (stryMutAct_9fa48("892")) {
                      {}
                    } else {
                      stryCov_9fa48("892");
                      return stryMutAct_9fa48("893") ? {} : (stryCov_9fa48("893"), {
                        oracle: stryMutAct_9fa48("894") ? "" : (stryCov_9fa48("894"), "revocation-monotonicity"),
                        message: stryMutAct_9fa48("895") ? `` : (stryCov_9fa48("895"), `revoked grant ${grant.id} authorized access at ${accessAt}`),
                        nodes: stryMutAct_9fa48("896") ? [] : (stryCov_9fa48("896"), [node]),
                        details: stryMutAct_9fa48("897") ? {} : (stryCov_9fa48("897"), {
                          grantId: grant.id,
                          revokedAt: grant.revokedAt,
                          accessAt
                        })
                      });
                    }
                  }
                }
              }
            }
          }
          return null;
        }
      }
    });
  }
}