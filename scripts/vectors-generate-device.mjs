import { writeFile } from "node:fs/promises";
import { enumerateCells } from "../packages/effects/dist/index.js";
import {
  deviceSessionMachine,
  initialDeviceSessionState,
  stepDeviceSession
} from "../packages/protocol/dist/index.js";

const deviceExamples = {
  open: { kind: "device/open", at: 1, ttlMs: 9 },
  degrade: { kind: "device/degrade", at: 5, rung: 1 },
  restore: { kind: "device/restore", at: 6, rung: 0 },
  close: { kind: "device/close", at: 7 },
  "ttl/expired": { kind: "device/ttl", at: 10 },
  revoke: { kind: "device/revoke", at: 5 }
};

function stateFor(phase) {
  const base = initialDeviceSessionState({
    classId: "location",
    tierId: "coarse",
    appId: "app",
    holder: "app:app",
    openedAt: 0
  });
  const live = phase === "active" || phase === "degraded";
  return {
    ...base,
    phase,
    expiresAt: live ? 10 : null,
    degradationRung: phase === "degraded" ? 1 : 0,
    closedAt: phase === "closed" ? 7 : null,
    revokedAt: phase === "revoked" ? 5 : null
  };
}

const vector = {
  schema: "twistedpear.transition-v1",
  machine: "device-session",
  generatedBy: "scripts/vectors-generate-device.mjs",
  states: deviceSessionMachine.states,
  eventClasses: deviceSessionMachine.events.map((event) => event.name),
  cells: enumerateCells(deviceSessionMachine).map((cell) => {
    const state = stateFor(cell.state);
    const event = deviceExamples[cell.eventClass];
    const result = stepDeviceSession(state, event);
    return {
      state: cell.state,
      eventClass: cell.eventClass,
      event,
      expectedState: result.state,
      expectedIntents: result.intents,
      legal: cell.rows.length > 0
    };
  })
};

await writeFile(
  new URL("../conformance/vectors/device-session.json", import.meta.url),
  `${JSON.stringify(vector, null, 2)}\n`
);
console.log(`device-session.json cells=${vector.cells.length} legal=${vector.cells.filter((c) => c.legal).length}`);
