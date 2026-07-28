import { describe, expect, it, vi } from "vitest";
import { bytesToHex } from "@twistedpear/reticulum-ts";
import {
  FreenetClient,
  FreenetClientContractBackend
} from "../src/index.js";

describe("FreenetClientContractBackend", () => {
  it("round-trips hex get/put/update against a FreenetClient stand-in", async () => {
    const states = new Map<string, Uint8Array>();
    const updates: Array<{ codeField?: Uint8Array }> = [];
    const client = {
      async put(source: { wasm: Uint8Array; parameters: Uint8Array }, state: Uint8Array) {
        const { key } = FreenetClient.deriveKey(source);
        states.set(bytesToHex(key), Uint8Array.from(state));
        return key;
      },
      async get(key: Uint8Array) {
        const keyHex = bytesToHex(key);
        const state = states.get(keyHex);
        if (state === undefined) throw new Error("missing");
        return { key, codeHash: new Uint8Array(32), state };
      },
      async update(
        key: Uint8Array,
        _codeHash: Uint8Array,
        state: Uint8Array,
        options: { codeField?: Uint8Array } = {}
      ) {
        updates.push(options);
        states.set(bytesToHex(key), Uint8Array.from(state));
      },
      close: vi.fn()
    } as unknown as FreenetClient;

    const backend = new FreenetClientContractBackend({ client });
    const put = await backend.put({
      wasmHex: "0061736d",
      parametersHex: "01",
      stateHex: "aa"
    });
    expect(put.keyHex).toHaveLength(64);

    const got = await backend.get(put.keyHex);
    expect(got).toEqual({ keyHex: put.keyHex, stateHex: "aa" });

    await backend.update({
      keyHex: put.keyHex,
      codeHashHex: "00".repeat(32),
      stateHex: "bb"
    });
    expect(await backend.get(put.keyHex)).toEqual({
      keyHex: put.keyHex,
      stateHex: "bb"
    });
    expect(updates[0]?.codeField).toEqual(Uint8Array.from([0, 97, 115, 109]));

    expect(await backend.get("ff".repeat(32))).toBeNull();
    await backend.close();
    expect(client.close).not.toHaveBeenCalled();
  });
});
