import { describe, expect, it } from "vitest";
import { decodeMessages, encodeMessage } from "../src/protocol.js";
import { defaultHostConfig } from "../src/types.js";

describe("host-core protocol", () => {
  it("round-trips newline-delimited JSON", () => {
    const encoded = encodeMessage({ type: "log", line: "hello" });
    const parsed = decodeMessages(encoded);
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.messages[0]).toEqual({ type: "log", line: "hello" });
  });
});

describe("host-core config", () => {
  it("defaults desktop roles with transport and seeder on", () => {
    const config = defaultHostConfig();
    expect(config.roles.transport).toBe(true);
    expect(config.roles.seeder).toBe(true);
  });
});
