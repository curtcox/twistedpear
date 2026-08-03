// @ts-nocheck
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  KISS_CMD_DETECT,
  KISS_CMD_FW_VERSION,
  KISS_CMD_PLATFORM,
  KISS_CMD_RADIO_STATE,
  KISS_DETECT_RESP,
  KISS_RADIO_STATE_ON,
  createKissDecodeState,
  decodeKissFrames,
  encodeDetectRequest,
  encodeKissFrame,
  encodeRadioStateAsk
} from "../src/rnode/kiss.js";

const transcripts = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "../../../conformance/vectors/rnode-kiss-transcripts.json"),
    "utf8"
  )
) as {
  sessions: ReadonlyArray<{
    name: string;
    hostToDevice: string;
    deviceToHost: string;
  }>;
};

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

describe("RNode KISS golden transcripts", () => {
  it("matches reference detect request encoding", () => {
    const session = transcripts.sessions.find((entry) => entry.name === "detect-handshake");
    expect(session).toBeDefined();
    expect(Buffer.from(encodeDetectRequest()).toString("hex")).toBe(session!.hostToDevice);
  });

  it("matches reference radio-state ask encoding", () => {
    const session = transcripts.sessions.find((entry) => entry.name === "radio-state-query");
    expect(session).toBeDefined();
    expect(Buffer.from(encodeRadioStateAsk()).toString("hex")).toBe(session!.hostToDevice);
  });

  for (const session of transcripts.sessions) {
    it(`decodes ${session.name} device response`, () => {
      const decoded = decodeKissFrames(hexToBytes(session.deviceToHost), createKissDecodeState());
      expect(decoded.frames.length).toBeGreaterThan(0);

      if (session.name === "detect-handshake") {
        expect(decoded.frames[0]?.command).toBe(KISS_CMD_DETECT);
        expect(decoded.frames[0]?.payload[0]).toBe(KISS_DETECT_RESP);
      }

      if (session.name === "radio-state-query") {
        expect(decoded.frames[0]?.command).toBe(KISS_CMD_RADIO_STATE);
        expect(decoded.frames[0]?.payload[0]).toBe(KISS_RADIO_STATE_ON);
      }

      if (session.name === "firmware-version") {
        expect(decoded.frames[0]?.command).toBe(KISS_CMD_FW_VERSION);
        expect(new TextDecoder().decode(decoded.frames[0]?.payload ?? new Uint8Array())).toBe("1.4.0");
      }

      if (session.name === "platform-query") {
        expect(decoded.frames[0]?.command).toBe(KISS_CMD_PLATFORM);
        expect(decoded.frames[0]?.payload[0]).toBe(0x01);
      }

      if (session.name === "data-frame-roundtrip") {
        expect(decoded.frames[0]?.command).toBe(0x00);
        expect(new TextDecoder().decode(decoded.frames[0]?.payload ?? new Uint8Array())).toBe("reticulum");
      }
    });
  }

  it("round-trips data frame encoding against transcript", () => {
    const payload = new TextEncoder().encode("reticulum");
    const frame = encodeKissFrame(0x00, payload);
    expect(Buffer.from(frame).toString("hex")).toBe("c0007265746963756c756dc0");
  });
});
