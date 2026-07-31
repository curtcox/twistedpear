import { describe, expect, it } from "vitest";
import { peers, probe } from "../src/links.js";
import { setMiniappHostTransport } from "../src/rpc.js";

describe("links SDK", () => {
  it("uses distinct observe and probe capabilities", async () => {
    const calls: Array<{ method: string; capability?: string }> = [];
    setMiniappHostTransport({
      async request(call) {
        calls.push({ method: call.method, capability: call.capability });
        return {
          id: call.id,
          ok: true,
          result: call.method === "peers" ? [] : {
            goodputBps: 1,
            rttMs: 1,
            jitterMs: 0,
            lossRatio: 0,
            mtu: 1,
            source: "probed",
            samples: 1,
            confidence: "medium"
          }
        };
      }
    });
    await peers();
    await probe({ id: "opaque" });
    expect(calls).toEqual([
      { method: "peers", capability: "link:observe" },
      { method: "probe", capability: "link:probe" }
    ]);
  });
});
