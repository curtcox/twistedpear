/**
 * Example leaf protocol machine: echo with optional delayed ack.
 * Lives here to prove the step/intent pattern and feed determinism tests.
 */
import type { Event, Intent, StepResult } from "@twistedpear/effects";

export interface EchoState {
  readonly inbox: readonly string[];
  readonly pendingAcks: readonly string[];
}

export function initialEchoState(): EchoState {
  return { inbox: [], pendingAcks: [] };
}

export function stepEcho(
  state: EchoState,
  event: Event,
): StepResult<EchoState> {
  if (event.kind === "start") {
    return { state, intents: [] };
  }

  if (event.kind === "transport/recv") {
    const text = decodeUtf8(event.payload);
    // Ignore our own echo replies to avoid a multi-node feedback loop.
    if (text.startsWith("echo:")) {
      return {
        state: { ...state, inbox: [...state.inbox, text] },
        intents: [],
      };
    }
    const ackId = `ack:${event.source}:${state.inbox.length}`;
    const intents: Intent[] = [
      {
        kind: "transport/send",
        send: {
          channel: event.channel,
          destination: event.source,
          payload: encodeUtf8(`echo:${text}`),
        },
      },
      {
        kind: "timer/set",
        timer: { id: ackId, delayMs: 10 },
      },
    ];
    return {
      state: {
        inbox: [...state.inbox, text],
        pendingAcks: [...state.pendingAcks, ackId],
      },
      intents,
    };
  }

  if (event.kind === "timer/fired") {
    const pendingAcks = state.pendingAcks.filter((id) => id !== event.id);
    return {
      state: { ...state, pendingAcks },
      intents: [
        {
          kind: "log",
          level: "debug",
          message: `ack-complete:${event.id}`,
        },
      ],
    };
  }

  return { state, intents: [] };
}

function encodeUtf8(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) {
    out[i] = text.charCodeAt(i) & 0xff;
  }
  return out;
}

function decodeUtf8(bytes: Uint8Array): string {
  let text = "";
  for (const b of bytes) {
    text += String.fromCharCode(b);
  }
  return text;
}
