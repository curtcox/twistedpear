import {
  selectPlane,
  type LinkSupply,
  type StreamPlane,
} from "@twistedpear/protocol";
import {
  LxmfReplicaLink,
  type ReplicaEgressAuth,
} from "./storage-sync-lxmf.js";
import { replicaConvergeSteps, TopicLogStore } from "./storage-sync.js";

/** Replica rounds are probe-shaped and never take the realtime share. */
export const REPLICA_RESERVATION_CLASS = "bulk" as const;
export const DEFAULT_REPLICA_BULK_BPS = 8 * 1024;

export type ReplicaReservationClass = "realtime" | "bulk" | "control";

export interface ReplicaBandwidthReservation {
  readonly class: ReplicaReservationClass;
  readonly bytesPerSecond: number;
  release(): void;
}

export interface ReplicaBandwidthLimiter {
  reserve(
    reservationClass: ReplicaReservationClass,
    bytesPerSecond: number,
  ): ReplicaBandwidthReservation | null;
}

export class ReplicaPlaneError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ReplicaPlaneError";
    this.code = code;
  }
}

export function selectReplicaPlane(
  candidates: ReadonlyArray<LinkSupply>,
): LinkSupply {
  const selected = selectPlane(candidates);
  if (selected === undefined || usableSupply(selected) <= 0) {
    throw new ReplicaPlaneError(
      "REPLICA_PLANE_UNAVAILABLE",
      "No SPEC-STREAM plane has usable supply for a replica round.",
    );
  }
  return selected;
}

export function reserveReplicaBulk(
  limiter: ReplicaBandwidthLimiter,
  bytesPerSecond: number,
): ReplicaBandwidthReservation {
  const reservation = limiter.reserve(
    REPLICA_RESERVATION_CLASS,
    bytesPerSecond,
  );
  if (reservation === null) {
    throw new ReplicaPlaneError(
      "REPLICA_BULK_UNAVAILABLE",
      "Bulk airtime reservation was refused.",
    );
  }
  if (reservation.class !== REPLICA_RESERVATION_CLASS) {
    reservation.release();
    throw new ReplicaPlaneError(
      "REPLICA_REALTIME_FORBIDDEN",
      "Replica rounds cannot reserve realtime.",
    );
  }
  return reservation;
}

/**
 * Two topic logs that pick a SPEC-STREAM plane, reserve bulk airtime, then
 * exchange version-vector diffs. The frame is plane-neutral; the plane is
 * the admission choice. Apps still cannot force a round.
 */
export class PlaneReplicaLink {
  readonly plane: StreamPlane;
  readonly reservationClass = REPLICA_RESERVATION_CLASS;
  private readonly reservation: ReplicaBandwidthReservation;
  private readonly wire: LxmfReplicaLink;

  constructor(
    readonly local: TopicLogStore,
    readonly remote: TopicLogStore,
    readonly topic: string,
    localAuth: ReplicaEgressAuth,
    remoteAuth: ReplicaEgressAuth,
    candidates: ReadonlyArray<LinkSupply>,
    limiter: ReplicaBandwidthLimiter,
    bulkBytesPerSecond: number = DEFAULT_REPLICA_BULK_BPS,
  ) {
    const selected = selectReplicaPlane(candidates);
    this.plane = selected.plane;
    this.reservation = reserveReplicaBulk(limiter, bulkBytesPerSecond);
    try {
      this.wire = new LxmfReplicaLink(
        local,
        remote,
        topic,
        localAuth,
        remoteAuth,
      );
    } catch (error) {
      this.reservation.release();
      throw error;
    }
  }

  round(): number {
    return this.wire.round();
  }

  converge(maxRounds = 8): number {
    return replicaConvergeSteps(
      () => this.round(),
      () => this.converged(),
      maxRounds,
      "plane replica",
    );
  }

  converged(): boolean {
    return this.wire.converged();
  }

  release(): void {
    this.reservation.release();
  }
}

function usableSupply(supply: LinkSupply): number {
  const measured = supply.measuredGoodputBps ?? supply.effectiveBps;
  return Math.max(0, Math.min(measured, supply.headroomBps));
}
