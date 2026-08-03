// @ts-nocheck
import { describe, expect, it } from "vitest";
import { decodePeerQrFrame, framePeerQrPayload, initialPeerQrAssemblyState, stepPeerQrAssembly } from "../src/index.js";

const session = new Uint8Array(16).fill(7);
const payload = Uint8Array.from({ length: 777 }, (_, index) => index & 0xff);

describe("peer QR framing", () => {
  it("matches the fixed binary frame vector", () => {
    const frames = framePeerQrPayload(session, new Uint8Array([1, 2, 3, 4]), 2);
    expect(frames.map((frame) => Buffer.from(frame).toString("hex"))).toEqual([
      "5450515201100000000200020707070707070707070707070707070701027bdd123c",
      "5450515201100001000200020707070707070707070707070707070703043bfb3f5f"
    ]);
  });
  it("reassembles lossless frames in any order and ignores identical duplicates", () => {
    const frames = framePeerQrPayload(session, payload, 100);
    let state = initialPeerQrAssemblyState(10_000);
    const duplicate = stepPeerQrAssembly(state, frames[7]!, 1); state = duplicate.state;
    expect(stepPeerQrAssembly(state, frames[7]!, 2).state.received).toBe(1);
    let complete: Uint8Array | null = null;
    for (const frame of frames.slice(0, 7).reverse()) { const result = stepPeerQrAssembly(state, frame, 3); state = result.state; complete = result.payload; }
    expect(complete).toEqual(payload);
  });

  it("rejects corruption, mixed sessions, conflicting duplicates, and expiry", () => {
    const frames = framePeerQrPayload(session, payload, 100);
    const corrupted = frames[0]!.slice(); corrupted[20] = (corrupted[20] ?? 0) ^ 1;
    expect(() => decodePeerQrFrame(corrupted)).toThrow(/checksum/);
    const started = stepPeerQrAssembly(initialPeerQrAssemblyState(10), frames[0]!, 0).state;
    const other = framePeerQrPayload(new Uint8Array(16).fill(8), payload, 100);
    expect(() => stepPeerQrAssembly(started, other[1]!, 1)).toThrow(/different sessions/);
    const conflicting = framePeerQrPayload(session, new Uint8Array(payload.length).fill(9), 100);
    expect(() => stepPeerQrAssembly(started, conflicting[0]!, 1)).toThrow(/different payload/);
    expect(() => stepPeerQrAssembly(started, frames[1]!, 10)).toThrow(/expired/);
  });

  it("enforces frame and assembled-size budgets", () => {
    expect(() => framePeerQrPayload(session, new Uint8Array(16_385))).toThrow(/budget/);
    expect(() => framePeerQrPayload(session, payload, 257)).toThrow(/chunk size/);
  });
});
