import { beforeEach, describe, expect, it } from "vitest";
import type { BrokerRequest } from "@twistedpear/miniapp-runtime";
import { setMiniappHostTransport } from "../src/rpc.js";
import * as device from "../src/device.js";

const calls: BrokerRequest[] = [];
let respond: (request: BrokerRequest) => {
  ok: boolean;
  result?: unknown;
} = () => ({ ok: true, result: null });

beforeEach(() => {
  calls.length = 0;
  respond = () => ({ ok: true, result: null });
  setMiniappHostTransport({
    request(request) {
      calls.push(request);
      const reply = respond(request);
      return Promise.resolve({ id: request.id, ...reply } as never);
    },
  });
});

const SESSION = { handle: "session-1" } as device.DeviceSession;

describe("device discovery", () => {
  it("asks for the inventory and diagnostics with presence", async () => {
    respond = () => ({ ok: true, result: [] });

    await device.inventory();
    await device.diagnostics();

    expect(calls.map((call) => call.method)).toEqual([
      "inventory",
      "diagnostics",
    ]);
    expect(calls.every((call) => call.namespace === "device")).toBe(true);
    expect(calls.every((call) => call.capability === "presence")).toBe(true);
  });
});

describe("device sessions", () => {
  it("opens a session with the caller's request", async () => {
    const request = { kind: "torch" } as never;
    respond = () => ({ ok: true, result: SESSION });

    expect(await device.open(request)).toEqual(SESSION);
    expect(calls[0]?.payload).toEqual(request);
  });

  it("accepts either a session object or a bare handle", async () => {
    await device.close(SESSION);
    await device.close("session-2");
    await device.read(SESSION);
    await device.read("session-2");
    await device.write(SESSION, { kind: "torch", on: true });
    await device.write("session-2", { kind: "torch", on: false });

    expect(
      calls.map((call) => (call.payload as { handle: string }).handle),
    ).toEqual([
      "session-1",
      "session-2",
      "session-1",
      "session-2",
      "session-1",
      "session-2",
    ]);
    expect(calls[4]?.payload).toEqual({
      handle: "session-1",
      command: { kind: "torch", on: true },
    });
  });
});

describe("device streams", () => {
  it("opens and closes streams by handle or descriptor", async () => {
    const streamSession = { handle: "stream-1" } as device.DeviceStreamSession;
    respond = () => ({ ok: true, result: streamSession });

    await device.stream(SESSION, "peer-1", { encoding: "raw" });
    await device.stream("session-2", "peer-2");
    await device.closeStream(streamSession);
    await device.closeStream("stream-2");

    expect(calls[0]?.payload).toEqual({
      handle: "session-1",
      peer: "peer-1",
      constraints: { encoding: "raw" },
    });
    expect(calls[1]?.payload).toEqual({
      handle: "session-2",
      peer: "peer-2",
      constraints: undefined,
    });
    expect(calls.slice(2).map((call) => call.payload)).toEqual([
      { handle: "stream-1" },
      { handle: "stream-2" },
    ]);
  });

  it("lists app-owned streams under the stream capability", async () => {
    respond = () => ({ ok: true, result: [] });

    expect(await device.streams()).toEqual([]);
    expect(calls[0]?.capability).toBe("device:stream");
  });

  it("yields offers across successive incoming batches", async () => {
    const batches = [
      { cursor: "c1", offers: [{ id: "offer-1" }] },
      { cursor: "c2", offers: [{ id: "offer-2" }, { id: "offer-3" }] },
    ];
    let index = 0;
    respond = () => ({ ok: true, result: batches[index++] ?? batches[1] });

    const seen: string[] = [];
    for await (const offer of device.incoming()) {
      seen.push(offer.id);
      if (seen.length === 3) break;
    }

    expect(seen).toEqual(["offer-1", "offer-2", "offer-3"]);
    expect(calls[0]?.payload).toEqual({ cursor: undefined });
    expect(calls[1]?.payload).toEqual({ cursor: "c1" });
  });

  it("accepts and declines offers by id or descriptor", async () => {
    const sink = { kind: "buffer" } as never;

    await device.accept({ id: "offer-1" } as never, sink);
    await device.accept("offer-2", sink);
    await device.decline({ id: "offer-3" } as never, "busy");
    await device.decline("offer-4");

    expect(calls.map((call) => call.payload)).toEqual([
      { offerId: "offer-1", sink },
      { offerId: "offer-2", sink },
      { offerId: "offer-3", reason: "busy" },
      { offerId: "offer-4", reason: undefined },
    ]);
  });
});

describe("device share offers", () => {
  it("reads offers under the share-policy capability", async () => {
    respond = () => ({ ok: true, result: [] });

    await device.shareOffers();

    expect(calls[0]?.capability).toBe("device:share-policy:read");
  });

  it("requests an offer with only the app's purpose text", async () => {
    respond = () => ({ ok: true, result: null });

    expect(await device.requestShareOffer("Share the camera")).toBeNull();
    expect(calls[0]?.payload).toEqual({ purpose: "Share the camera" });
  });

  it("unwraps the revocation result", async () => {
    respond = () => ({ ok: true, result: { revoked: true } });

    expect(await device.revokeShareOffer("offer-1")).toBe(true);
    expect(calls[0]?.payload).toEqual({ id: "offer-1" });
  });
});

describe("device errors", () => {
  it("re-labels broker failures as device errors", async () => {
    respond = () => ({
      ok: false,
      error: { code: "CONSENT_REQUIRED", message: "user declined" },
    });

    const error = await device
      .open({ kind: "camera" } as never)
      .catch((thrown: unknown) => thrown);

    expect(error).toBeInstanceOf(device.DeviceError);
    expect(error).toMatchObject({
      code: "CONSENT_REQUIRED",
      message: "user declined",
      name: "DeviceError",
    });
  });

  it("passes through failures that are not broker errors", async () => {
    setMiniappHostTransport({
      request() {
        return Promise.reject(new Error("transport closed"));
      },
    });

    const error = await device.inventory().catch((thrown: unknown) => thrown);

    expect(error).not.toBeInstanceOf(device.DeviceError);
    expect(error).toMatchObject({ message: "transport closed" });
  });
});
