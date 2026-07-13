import { describe, expect, it } from "vitest";
import { msgpackPackUInt } from "../src/msgpack-core.js";
import {
  LXMF_PEER_ERROR_NO_ACCESS,
  LXMF_PEER_ERROR_NO_IDENTITY,
  decodeLxmfPeerError
} from "../src/lxmf-peer-error.js";

describe("protocol lxmf peer error", () => {
  it("decodes known peer errors", () => {
    expect(decodeLxmfPeerError(msgpackPackUInt(LXMF_PEER_ERROR_NO_IDENTITY))).toBe(
      LXMF_PEER_ERROR_NO_IDENTITY
    );
    expect(decodeLxmfPeerError(msgpackPackUInt(LXMF_PEER_ERROR_NO_ACCESS))).toBe(
      LXMF_PEER_ERROR_NO_ACCESS
    );
  });

  it("ignores unrelated integers and malformed payloads", () => {
    expect(decodeLxmfPeerError(msgpackPackUInt(1))).toBeNull();
    expect(decodeLxmfPeerError(new Uint8Array([0xff]))).toBeNull();
  });
});
