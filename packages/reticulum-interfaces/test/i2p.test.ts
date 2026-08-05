import { describe, expect, it } from "vitest";
import { PureCryptoProvider, nodeRuntime } from "@twistedpear/reticulum-ts";
import { SamClient } from "../src/i2p.js";

describe("SAM client parsing", () => {
  it("parses SESSION CREATE responses", async () => {
    const runtime = createMockRuntime([
      [
        "HELLO REPLY RESULT=OK VERSION=3.3\n",
        "SESSION STATUS RESULT=OK DESTINATION=abc123 PRIVATE_KEY=def456\n",
      ],
    ]);

    const client = new SamClient({
      runtime,
      host: "127.0.0.1",
      port: 7656,
      sessionName: "test",
    });
    const session = await client.ensureSession();

    expect(session.destination).toBe("abc123");
    expect(session.privateKey).toBe("def456");
  });

  it("upgrades the SAM command socket into the connected stream", async () => {
    const runtime = createMockRuntime([
      [
        "HELLO REPLY RESULT=OK VERSION=3.3\n",
        "SESSION STATUS RESULT=OK DESTINATION=local PRIVATE_KEY=key\n",
      ],
      [
        "HELLO REPLY RESULT=OK VERSION=3.3\n",
        "STREAM STATUS RESULT=OK\npayload",
      ],
    ]);

    const client = new SamClient({
      runtime,
      host: "127.0.0.1",
      port: 7656,
      sessionName: "test",
    });
    await client.ensureSession();
    const connection = await client.connectStream("peer-destination");

    const first = await connection.readable[Symbol.asyncIterator]().next();
    expect(new TextDecoder().decode(first.value)).toBe("payload");
    await connection.close();
  });

  it("reuses an existing session without reconnecting", async () => {
    let connectCount = 0;
    const runtime = createMockRuntime(
      [
        [
          "HELLO REPLY RESULT=OK VERSION=3.3\n",
          "SESSION STATUS RESULT=OK DESTINATION=abc123 PRIVATE_KEY=def456\n",
        ],
      ],
      () => {
        connectCount += 1;
      },
    );

    const client = new SamClient({
      runtime,
      host: "127.0.0.1",
      port: 7656,
      sessionName: "test",
    });
    await client.ensureSession();
    await client.ensureSession();

    expect(connectCount).toBe(1);
  });
});

function createMockRuntime(
  responses: ReadonlyArray<ReadonlyArray<string>>,
  onConnect?: () => void,
): ReturnType<typeof nodeRuntime> {
  const base = nodeRuntime();
  let responseIndex = 0;

  return {
    ...base,
    tcp: {
      ...base.tcp,
      async connect() {
        onConnect?.();
        const response = responses[responseIndex] ?? [];
        responseIndex += 1;

        return {
          async write() {},
          async close() {},
          readable: (async function* () {
            for (const line of response) {
              yield new TextEncoder().encode(line);
            }
          })(),
        };
      },
    },
  };
}
