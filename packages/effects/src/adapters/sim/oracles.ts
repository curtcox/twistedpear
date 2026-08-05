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

export function grantCoverageOracle<S>(
  project: (state: S, node: NodeId) => GrantCoverageView,
): Oracle<S> {
  return {
    name: "grant-coverage",
    check(world) {
      const live = new Set<string>();
      const stored: Array<{ node: NodeId; blob: string }> = [];
      for (const [node, state] of world.nodes) {
        const view = project(state, node);
        for (const blob of view.liveGrantBlobIds) live.add(blob);
        for (const blob of view.storedBlobIds) stored.push({ node, blob });
      }
      const uncovered = stored.filter(({ blob }) => !live.has(blob));
      return uncovered.length === 0
        ? null
        : {
            oracle: "grant-coverage",
            message: `stored blobs lack a live grant: ${uncovered.map(({ blob }) => blob).join(", ")}`,
            nodes: [...new Set(uncovered.map(({ node }) => node))],
            details: { blobIds: uncovered.map(({ blob }) => blob) },
          };
    },
  };
}

export interface GrantIdentity {
  readonly id: string;
  /** A stable description of the authority represented by this grant. */
  readonly fingerprint: string;
}

export function idUniquenessOracle<S>(
  grants: (state: S, node: NodeId) => readonly GrantIdentity[],
): Oracle<S> {
  return {
    name: "id-uniqueness",
    check(world) {
      const seen = new Map<string, { fingerprint: string; node: NodeId }>();
      for (const [node, state] of world.nodes) {
        for (const grant of grants(state, node)) {
          const prior = seen.get(grant.id);
          if (prior !== undefined && prior.fingerprint !== grant.fingerprint) {
            return {
              oracle: "id-uniqueness",
              message: `distinct grants share id ${grant.id}`,
              nodes: [prior.node, node],
              details: {
                id: grant.id,
                fingerprints: [prior.fingerprint, grant.fingerprint],
              },
            };
          }
          seen.set(grant.id, { fingerprint: grant.fingerprint, node });
        }
      }
      return null;
    },
  };
}

export interface GrantAuthorization {
  readonly id: string;
  readonly revokedAt?: InstantMs;
  readonly accessTimes: readonly InstantMs[];
}

export function revocationMonotonicityOracle<S>(
  grants: (state: S, node: NodeId) => readonly GrantAuthorization[],
): Oracle<S> {
  return {
    name: "revocation-monotonicity",
    check(world) {
      for (const [node, state] of world.nodes) {
        for (const grant of grants(state, node)) {
          if (grant.revokedAt === undefined) continue;
          const accessAt = grant.accessTimes.find(
            (at) => at > grant.revokedAt!,
          );
          if (accessAt !== undefined) {
            return {
              oracle: "revocation-monotonicity",
              message: `revoked grant ${grant.id} authorized access at ${accessAt}`,
              nodes: [node],
              details: {
                grantId: grant.id,
                revokedAt: grant.revokedAt,
                accessAt,
              },
            };
          }
        }
      }
      return null;
    },
  };
}
