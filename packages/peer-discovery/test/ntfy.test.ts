import { describe, expect, it } from "vitest";
import {
  encodePeerInvitation,
  type PeerInvitation,
} from "@twistedpear/protocol";
import {
  decodeNtfyRendezvousSecret,
  decryptNtfyRendezvousMessage,
  encodeNtfyRendezvousSecret,
  encryptNtfyRendezvousMessage,
  NtfyRendezvousClient,
  NtfyPeerDiscoveryAdapter,
  type NtfyRendezvousSecret,
} from "../src/index.js";

const now = 1_900_000_000_000;
const bytes = (length: number, seed: number) =>
  Uint8Array.from({ length }, (_, index) => (seed + index) & 255);
const secret: NtfyRendezvousSecret = {
  topic: bytes(16, 3),
  key: bytes(32, 40),
};

function invitation(role: "offer" | "answer" = "offer"): Uint8Array {
  const value: PeerInvitation = {
    version: 1,
    sessionId: bytes(16, 1),
    service: "peer-link",
    role,
    peerEphemeralKey: bytes(32, 2),
    identityProof: bytes(64, 4),
    candidates: [{ kind: "reticulum", value: bytes(16, 7) }],
    display: "Test peer",
    issuedAt: now - 1_000,
    expiresAt: now + 60_000,
    capabilities: ["reticulum"],
    signature: bytes(64, 8),
  };
  return encodePeerInvitation(value);
}

function ntfyAdapter(options: {
  readonly role: "offer" | "answer";
  readonly envelope: Uint8Array;
  readonly sessionId: string;
}) {
  const published: Uint8Array[] = [];
  let requested = "";
  const adapter = new NtfyPeerDiscoveryAdapter({
    client: {
      async createSecret() {
        return secret;
      },
      async publish(_secret: NtfyRendezvousSecret, envelope: Uint8Array) {
        published.push(envelope);
      },
      async poll() {
        return [
          {
            id: bytes(16, 1),
            role: options.role,
            expiresAt: now + 60_000,
            envelope: options.envelope,
          },
        ];
      },
    },
    createSessionId: () => options.sessionId,
    now: () => now,
    channel: {
      async availability() {
        return { state: "available" };
      },
      async presentCode(_session, code) {
        requested = code;
      },
      async requestCode() {
        return requested;
      },
      async cancel() {},
    },
  });
  return {
    adapter,
    published,
    requestedCode(value?: string) {
      if (value !== undefined) requested = value;
      return requested;
    },
  };
}

describe("encrypted ntfy rendezvous", () => {
  it("round-trips checksummed secrets and authenticated invitations", () => {
    expect(
      decodeNtfyRendezvousSecret(encodeNtfyRendezvousSecret(secret)),
    ).toEqual(secret);
    const packet = encryptNtfyRendezvousMessage(
      secret,
      invitation(),
      bytes(16, 90),
      bytes(24, 110),
      now,
    );
    const decoded = decryptNtfyRendezvousMessage(secret, packet, now);
    expect(decoded.role).toBe("offer");
    expect(decoded.envelope).toEqual(invitation());
    expect(() =>
      decryptNtfyRendezvousMessage(
        { ...secret, key: bytes(32, 99) },
        packet,
        now,
      ),
    ).toThrow(/authentication failed/);
  });

  it("creates compact checksummed TPN2 codes while decoding legacy TPN1 codes", async () => {
    const client = new NtfyRendezvousClient({
      baseUrl: "https://ntfy.example.test",
      entropy: async (length) => bytes(length, 17),
    });
    const generated = await client.createSecret();
    const shortCode = encodeNtfyRendezvousSecret(generated);
    const legacyCode = encodeNtfyRendezvousSecret(secret);
    expect(shortCode).toMatch(/^TPN2-[A-Z2-7-]+$/);
    expect(shortCode.length).toBeLessThan(legacyCode.length);
    expect(decodeNtfyRendezvousSecret(shortCode)).toEqual(generated);
    expect(legacyCode).toMatch(/^TPN1-/);
    expect(decodeNtfyRendezvousSecret(legacyCode)).toEqual(secret);
    expect(() =>
      decodeNtfyRendezvousSecret(`${shortCode.slice(0, -1)}A`),
    ).toThrow(/checksum/);
    expect(() =>
      encodeNtfyRendezvousSecret({ topic: bytes(8, 1), key: bytes(32, 2) }),
    ).toThrow(/16-byte topic/);
    expect(() =>
      encryptNtfyRendezvousMessage(
        secret,
        invitation(),
        bytes(8, 90),
        bytes(24, 110),
        now,
      ),
    ).toThrow(/message id or nonce/);
  });

  it("uses bearer headers, keeps secrets out of URLs, and rejects replayed cached messages", async () => {
    const stored: string[] = [];
    const requests: Array<{ url: string; authorization: string | null }> = [];
    let entropySeed = 10;
    const fakeFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      requests.push({ url, authorization: headers.get("authorization") });
      if (init?.method === "POST") {
        stored.push(String(init.body));
        return new Response("ok", { status: 200 });
      }
      const body = stored
        .map((message) => JSON.stringify({ event: "message", message }))
        .join("\n");
      return new Response(body, { status: 200 });
    };
    const client = new NtfyRendezvousClient({
      baseUrl: "https://ntfy.example.test/root",
      bearerToken: "host-secret",
      fetch: fakeFetch,
      entropy: async (length) => bytes(length, entropySeed++),
      now: () => now,
    });
    await client.publish(secret, invitation());
    expect(await client.poll(secret)).toHaveLength(1);
    expect(await client.poll(secret)).toHaveLength(0);
    expect(
      requests.every(
        (request) => request.authorization === "Bearer host-secret",
      ),
    ).toBe(true);
    expect(
      requests.every(
        (request) =>
          !request.url.includes("host-secret") &&
          !request.url.includes(encodeNtfyRendezvousSecret(secret)),
      ),
    ).toBe(true);
    expect(stored[0]).not.toContain("peer-link");
  });

  it("rejects expired packets and non-HTTPS remote servers", () => {
    const packet = encryptNtfyRendezvousMessage(
      secret,
      invitation(),
      bytes(16, 1),
      bytes(24, 2),
      now,
    );
    expect(() =>
      decryptNtfyRendezvousMessage(secret, packet, now + 60_001),
    ).toThrow(/Expired/);
    expect(
      () =>
        new NtfyRendezvousClient({
          baseUrl: "http://ntfy.example.test",
          entropy: async (length) => bytes(length, 1),
        }),
    ).toThrow(/HTTPS/);
  });
});

describe("encrypted ntfy rendezvous adapters", () => {
  it("adapts encrypted polling to the offer contract", async () => {
    const offerEnvelope = invitation("offer");
    const { adapter, published, requestedCode } = ntfyAdapter({
      role: "answer",
      envelope: invitation("answer"),
      sessionId: "ntfy-session",
    });
    const events = [];
    for await (const event of adapter.offer(offerEnvelope, {
      timeoutMs: 1_000,
    }))
      events.push(event);
    expect(events.map((event) => event.kind)).toEqual(["ready", "invitation"]);
    expect(published).toEqual([offerEnvelope]);
    expect(requestedCode()).toMatch(/^TPN1-/);
  });

  it("adapts encrypted polling to the accept contract", async () => {
    const offerEnvelope = invitation("offer");
    const answerEnvelope = invitation("answer");
    const { adapter, published, requestedCode } = ntfyAdapter({
      role: "offer",
      envelope: offerEnvelope,
      sessionId: "join-session",
    });
    requestedCode(encodeNtfyRendezvousSecret(secret));
    const inbound = [];
    for await (const event of adapter.accept({
      service: "peer-link",
      timeoutMs: 1_000,
    }))
      inbound.push(event);
    expect(inbound[0]).toMatchObject({
      kind: "invitation",
      envelope: offerEnvelope,
    });
    await adapter.answer({ id: "join-session", kind: "ntfy" }, answerEnvelope);
    expect(published.at(-1)).toEqual(answerEnvelope);
  });
});

describe("ntfy rendezvous transport failures", () => {
  it("maps browser CORS and offline fetch rejections to actionable adapter errors", async () => {
    const client = new NtfyRendezvousClient({
      baseUrl: "https://ntfy.example.test",
      entropy: async (length) => bytes(length, 21),
      now: () => now,
      // A CORS-blocked or offline browser fetch rejects with a bare TypeError.
      fetch: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await expect(client.publish(secret, invitation())).rejects.toMatchObject({
      code: "UNAVAILABLE",
      message: expect.stringMatching(/cross-origin policy/),
    });
    await expect(client.poll(secret)).rejects.toMatchObject({
      code: "UNAVAILABLE",
    });
  });
});
