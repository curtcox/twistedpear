export type PeerPairingPhase =
  | "idle"
  | "offering"
  | "answering"
  | "confirming"
  | "connected"
  | "cancelled"
  | "expired"
  | "rejected";
export interface PeerPairingState {
  readonly phase: PeerPairingPhase;
  readonly sessionId: string | null;
  readonly service: string | null;
  readonly expiresAt: number | null;
  readonly error: string | null;
}
export type PeerPairingEvent =
  | {
      readonly kind: "offer";
      readonly sessionId: string;
      readonly service: string;
      readonly expiresAt: number;
    }
  | {
      readonly kind: "accept";
      readonly sessionId: string;
      readonly service: string;
      readonly expiresAt: number;
      readonly replayed: boolean;
    }
  | { readonly kind: "answer"; readonly sessionId: string }
  | { readonly kind: "confirm"; readonly sessionId: string }
  | { readonly kind: "cancel" }
  | { readonly kind: "time"; readonly now: number };
export function initialPeerPairingState(): PeerPairingState {
  return {
    phase: "idle",
    sessionId: null,
    service: null,
    expiresAt: null,
    error: null,
  };
}
export function stepPeerPairing(
  state: PeerPairingState,
  event: PeerPairingEvent,
): PeerPairingState {
  if (event.kind === "cancel")
    return state.phase === "connected" || state.phase === "cancelled"
      ? state
      : { ...state, phase: "cancelled" };
  if (event.kind === "time")
    return state.expiresAt !== null &&
      event.now >= state.expiresAt &&
      !["connected", "cancelled", "rejected"].includes(state.phase)
      ? { ...state, phase: "expired", error: "invitation expired" }
      : state;
  if (state.phase === "idle" && event.kind === "offer")
    return {
      phase: "offering",
      sessionId: event.sessionId,
      service: event.service,
      expiresAt: event.expiresAt,
      error: null,
    };
  if (state.phase === "idle" && event.kind === "accept")
    return event.replayed
      ? {
          phase: "rejected",
          sessionId: event.sessionId,
          service: event.service,
          expiresAt: event.expiresAt,
          error: "invitation replay",
        }
      : {
          phase: "answering",
          sessionId: event.sessionId,
          service: event.service,
          expiresAt: event.expiresAt,
          error: null,
        };
  if (
    state.phase === "offering" &&
    event.kind === "answer" &&
    event.sessionId === state.sessionId
  )
    return { ...state, phase: "confirming" };
  if (
    (state.phase === "answering" || state.phase === "confirming") &&
    event.kind === "confirm" &&
    event.sessionId === state.sessionId
  )
    return { ...state, phase: "connected" };
  return { ...state, phase: "rejected", error: "invalid pairing transition" };
}
