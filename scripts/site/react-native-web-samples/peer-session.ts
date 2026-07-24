import {
  AudioPeerDiscoveryAdapter,
  CryptoPeerPairingBackend,
  InvitationPairingDriver,
  ManualPeerDiscoveryAdapter,
  PeerDiscoveryRegistry,
  PeerSessionManager,
  QrPeerDiscoveryAdapter,
  UnavailablePeerDiscoveryAdapter,
  WebRtcRouteController
} from "../../../packages/peer-discovery/src/index.ts";
import { Identity, PureCryptoProvider, bytesToHex } from "../../../packages/reticulum-ts/src/web.ts";
import { PagesPeerChrome } from "./peer-chrome.ts";

export function createPagesPeerSessionManager(chrome: PagesPeerChrome): PeerSessionManager {
  const provider = new PureCryptoProvider();
  const identity = new Identity(provider);
  const webrtc = new WebRtcRouteController();
  const createSessionId = () => bytesToHex(provider.randomBytes(8));
  const registry = new PeerDiscoveryRegistry();

  registry.register(new ManualPeerDiscoveryAdapter({ channel: chrome.manual, createSessionId }));
  registry.register(new QrPeerDiscoveryAdapter({ channel: chrome.qr, createSessionId }));
  registry.register(
    new UnavailablePeerDiscoveryAdapter("reticulum", {
      state: "offline",
      reason: "Automatic Reticulum rendezvous requires a connected gateway or RNode; use QR/manual for signaling"
    })
  );
  registry.register(new AudioPeerDiscoveryAdapter({ channel: chrome.audio, createSessionId }));
  registry.register(
    new UnavailablePeerDiscoveryAdapter("bluetooth", {
      state: "unsupported",
      reason: "Ordinary web pages cannot advertise as BLE peripherals"
    })
  );
  registry.register(
    new UnavailablePeerDiscoveryAdapter("ntfy", {
      state: "offline",
      reason: "No ntfy rendezvous server is configured"
    })
  );
  registry.register(
    new UnavailablePeerDiscoveryAdapter("local-peer-to-peer", {
      state: "unsupported",
      reason: "This browser does not implement LP2PRequest/LP2PReceiver"
    })
  );

  const backend = new CryptoPeerPairingBackend({
    identity: {
      publicKey: identity.getPublicKey(),
      async sign(payload) {
        return identity.sign(payload);
      },
      async verify(publicKey, payload, signature) {
        const remote = Identity.fromPublicKey(provider, publicKey);
        return remote !== null && remote.validate(signature, payload);
      }
    },
    displayLabel: `TwistedPear Pages ${bytesToHex(identity.hash).slice(0, 8)}`,
    capabilities: ["webrtc"],
    entropy: async (length) => provider.randomBytes(length),
    candidates: (request, context) => webrtc.candidates(request, context),
    confirm: (peer, request) => chrome.confirm(peer, request),
    establish: (context, peer, adapter) => webrtc.establish(context, peer, adapter)
  });

  return new PeerSessionManager(registry, new InvitationPairingDriver({ backend }));
}
