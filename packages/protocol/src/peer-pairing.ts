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
  if (event.kind === "cancel") return cancelPairing(state);
  if (event.kind === "time") return expirePairing(state, event.now);
  if (state.phase === "idle") return startPairing(event);
  if (answerMatchesOffer(state, event))
    return { ...state, phase: "confirming" };
  if (confirmMatchesSession(state, event))
    return { ...state, phase: "connected" };
  return { ...state, phase: "rejected", error: "invalid pairing transition" };
}

function cancelPairing(state: PeerPairingState): PeerPairingState {
  return state.phase === "connected" || state.phase === "cancelled"
    ? state
    : { ...state, phase: "cancelled" };
}

function expirePairing(state: PeerPairingState, now: number): PeerPairingState {
  const live =
    state.expiresAt !== null &&
    now >= state.expiresAt &&
    !["connected", "cancelled", "rejected"].includes(state.phase);
  return live
    ? { ...state, phase: "expired", error: "invitation expired" }
    : state;
}

function startPairing(event: PeerPairingEvent): PeerPairingState {
  if (event.kind === "offer") {
    return {
      phase: "offering",
      sessionId: event.sessionId,
      service: event.service,
      expiresAt: event.expiresAt,
      error: null,
    };
  }
  if (event.kind === "accept") {
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
  }
  return {
    ...initialPeerPairingState(),
    phase: "rejected",
    error: "invalid pairing transition",
  };
}

function answerMatchesOffer(
  state: PeerPairingState,
  event: PeerPairingEvent,
): boolean {
  return (
    state.phase === "offering" &&
    event.kind === "answer" &&
    event.sessionId === state.sessionId
  );
}

function confirmMatchesSession(
  state: PeerPairingState,
  event: PeerPairingEvent,
): boolean {
  return (
    (state.phase === "answering" || state.phase === "confirming") &&
    event.kind === "confirm" &&
    event.sessionId === state.sessionId
  );
}
