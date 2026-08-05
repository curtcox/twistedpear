import { describe, expect, it } from "vitest";
import { announceBurst } from "../src/announce-burst.js";

describe("announceBurst", () => {
  it("runs N announce calls and counts successes", async () => {
    let calls = 0;
    const result = await announceBurst(async () => {
      calls += 1;
      if (calls === 2) {
        throw new Error("boom");
      }
    }, 4);
    expect(calls).toBe(4);
    expect(result).toEqual({ sent: 3, failed: 1 });
  });

  it("clamps count into 1..64", async () => {
    let calls = 0;
    await announceBurst(async () => {
      calls += 1;
    }, 0);
    expect(calls).toBe(1);
  });
});
