/**
 * Which handbook chapter each applet lives under.
 *
 * Shared by conformance/handbook (Node) and conformance/web-handbook (bundled
 * for the browser). Both walk every applet in the generated catalog and throw
 * on an applet with no chapter, so the two copies this replaces had to stay in
 * step by hand — and did not: the web one silently fell four applets behind.
 */
export const APPLET_CHAPTER = {
  "host-info": "difference-matrix",
  "relay-status": "difference-matrix",
  "identity-hash": "sdk-identity",
  "presence-snapshot": "sdk-presence",
  "storage-kv": "sdk-storage-kv",
  "storage-hyperbee": "sdk-storage-hyperbee",
  "lxmf-roundtrip": "sdk-lxmf",
  "announce-loop": "sdk-announce",
  "resource-fetch": "sdk-resource-fetch",
  "workspace-rw": "sdk-workspace",
  "share-cas": "sdk-share-cas",
  "peer-handle-isolation": "sdk-capabilities",
  "freenet-contract-read": "sdk-capabilities",
  "apps-package-preview": "sdk-apps-package",
  "apps-publish-install": "sdk-apps-publish",
  "apps-update": "sdk-apps-update",
  "ai-chat": "sdk-ai-chat",
  "widget-gallery": "sdk-widget-gallery",
  "device-inventory": "device-gated-probes",
  "ble-peer": "device-gated-probes",
  "rnode-serial": "device-gated-probes",
  "multicast-auto": "device-gated-probes",
  "camera-qr-scan": "device-gated-probes",
};
