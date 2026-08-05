// In-repo reference machines for the SPEC-MACHINE gate: the protocol echo
// leaf driven by a tape that exercises its whole event domain. External
// machine modules follow this exact export shape.
import { initialEchoState, stepEcho } from "../../packages/protocol/dist/echo.js";

const text = (value) => new TextEncoder().encode(value);

export const machines = {
  echo: {
    initial: initialEchoState,
    step: stepEcho,
    tape: [
      { kind: "start", at: 0 },
      { kind: "transport/recv", channel: "echo", source: "b", payload: text("Hi"), at: 1 },
      { kind: "transport/recv", channel: "echo", source: "c", payload: text("echo:Hi"), at: 2 },
      { kind: "timer/fired", id: "ack:b:0", at: 11 },
      { kind: "tick", at: 20 }
    ]
  }
};
