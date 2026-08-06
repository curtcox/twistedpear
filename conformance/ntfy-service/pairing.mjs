/**
 * Two real hosts pairing over a live ntfy rendezvous server.
 *
 * Both sides use the shipping crypto pairing backend and the shipping ntfy
 * adapter; only the trusted-chrome channel is stubbed, because in production a
 * person reads the short code from one host and types it into the other.
 */
import { webcrypto } from "node:crypto";
import {
  CryptoPeerPairingBackend,
  InvitationPairingDriver,
  NtfyPeerDiscoveryAdapter,
} from "../../packages/peer-discovery/dist/index.js";

const entropy = async (length) =>
  webcrypto.getRandomValues(new Uint8Array(length));

/** Carries the rendezvous short code between the two hosts, as a person would. */
export class CodeCourier {
  constructor() {
    this.code = null;
  }
  present(code) {
    this.code = code;
  }
  async wait(timeoutMs = 30_000) {
    const deadline = Date.now() + timeoutMs;
    while (this.code === null) {
      if (Date.now() > deadline)
        throw new Error("no rendezvous code was presented");
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    return this.code;
  }
}

function channel(courier) {
  return {
    async availability() {
      return { state: "available" };
    },
    async presentCode(_session, code) {
      courier.present(code);
    },
    async requestCode() {
      return courier.wait();
    },
    async cancel() {},
  };
}

const ED25519 = { name: "Ed25519" };

async function backend(label, confirmations) {
  const keys = await webcrypto.subtle.generateKey(ED25519, true, [
    "sign",
    "verify",
  ]);
  return new CryptoPeerPairingBackend({
    identity: {
      publicKey: new Uint8Array(
        await webcrypto.subtle.exportKey("raw", keys.publicKey),
      ),
      async sign(payload) {
        return new Uint8Array(
          await webcrypto.subtle.sign(ED25519, keys.privateKey, payload),
        );
      },
      async verify(publicKey, payload, signature) {
        try {
          const remote = await webcrypto.subtle.importKey(
            "raw",
            publicKey,
            ED25519,
            true,
            ["verify"],
          );
          return await webcrypto.subtle.verify(
            ED25519,
            remote,
            signature,
            payload,
          );
        } catch {
          return false;
        }
      },
    },
    displayLabel: label,
    capabilities: ["reticulum"],
    entropy,
    async candidates() {
      return [{ kind: "reticulum", value: new Uint8Array(16).fill(7) }];
    },
    async confirm(peer, request) {
      confirmations.push({
        host: label,
        peer: peer.displayLabel,
        purpose: request.purpose,
        words: [...peer.matchingWords],
      });
      return true;
    },
    async establish(_context, peer, adapter) {
      return {
        authenticated: true,
        confirmed: true,
        fingerprint: peer.fingerprint,
        displayLabel: peer.displayLabel,
        rendezvous: adapter.kind,
        dataPlane: peer.dataPlane,
      };
    },
  });
}

/** A freshly signed offer envelope, produced by the shipping pairing backend. */
export async function signedOfferEnvelope(service = "peer-link") {
  const probe = await backend("Probe", []);
  const offer = await probe.createOffer({
    service,
    purpose: "Publish a signed offer",
    mechanisms: ["ntfy"],
    timeoutMs: 30_000,
  });
  return offer.envelope;
}

export function ntfyAdapter(client, courier, role) {
  return new NtfyPeerDiscoveryAdapter({
    client,
    channel: channel(courier),
    createSessionId: () => `ntfy-${role}-${Date.now()}`,
    pollIntervalMs: 200,
  });
}

/**
 * Runs a full offer → answer → SAS confirmation → established-route pairing
 * through the supplied live clients.
 *
 * @param {{ offerClient: unknown, joinClient: unknown, service?: string,
 *   timeoutMs?: number, courier?: CodeCourier }} options
 */
export async function pairOverNtfy(options) {
  const courier = options.courier ?? new CodeCourier();
  const confirmations = [];
  const request = {
    service: options.service ?? "peer-link",
    purpose: "Pair over a disposable ntfy server",
    mechanisms: ["ntfy"],
    timeoutMs: options.timeoutMs ?? 30_000,
  };
  const offering = new InvitationPairingDriver({
    backend: await backend("Alice", confirmations),
  });
  const joining = new InvitationPairingDriver({
    backend: await backend("Bob", confirmations),
  });
  const [alice, bob] = await Promise.all([
    offering.request(
      ntfyAdapter(options.offerClient, courier, "offer"),
      request,
    ),
    joining.listen(ntfyAdapter(options.joinClient, courier, "join"), request),
  ]);
  return { alice, bob, confirmations, code: courier.code };
}
