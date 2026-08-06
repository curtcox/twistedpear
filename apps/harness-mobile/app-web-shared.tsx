import { validateWidgetTree } from "@twistedpear/miniapp-runtime/ui";
import type { WorkletStatus } from "./worklet/protocol";

export {
  audioHex,
  audioUnhex,
  outboundWebRtcMediaBytes,
  playPeerAudio,
  recordPeerAudio,
  webHexToBytes,
  webBytesToHex,
  playInboundAudioFrame,
  handleWebMediaCodecRequest,
  webEncodeOpus,
  webDecodeOpus,
} from "./app-web-shared-audio.js";

export {
  CONFIRM_KIND_TITLES,
  Row,
  ActionButton,
  PeerChromeModal,
  HostConfirmationModal,
  styles,
} from "./app-web-shared-ui.js";

export const DEFAULT_PASSPHRASE = "harness-web-dev";
export const MAX_ANNOUNCES = 50;

export const helloWidgetTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      {
        id: "title",
        type: "text",
        props: { value: "Hello" },
        style: { fontSize: 20, fontWeight: "bold" },
      },
      {
        id: "go",
        type: "button",
        props: { label: "Tap me", event: "hello.tap" },
      },
    ],
  },
});

export const chatWidgetTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      {
        id: "title",
        type: "text",
        props: { value: "Chat" },
        style: { fontSize: 20, fontWeight: "bold" },
      },
      {
        id: "peer-input",
        type: "text-input",
        props: { value: "", placeholder: "Peer app id", event: "chat.peer" },
      },
      {
        id: "send",
        type: "button",
        props: { label: "Send hello", event: "chat.send" },
      },
      {
        id: "inbox-scroll",
        type: "scroll",
        children: [
          { id: "inbox", type: "text", props: { value: "No messages yet" } },
        ],
      },
    ],
  },
});

export const initialStatus: WorkletStatus = {
  running: false,
  linkOnline: false,
  announcesSeen: 0,
  identityHash: null,
  identityPersisted: false,
  tcpEnabled: false,
  autoEnabled: false,
  bleEnabled: false,
  bleConnected: false,
  rnodeEnabled: false,
  rnodeConnected: false,
  rnodeDeviceName: null,
  cryptoProvider: "pure",
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  wsEnabled: false,
  gatewayUrl: null,
};

export function defaultGatewayUrl(): string {
  const location = (
    globalThis as { location?: { protocol: string; host: string } }
  ).location;
  if (location === undefined) {
    return "ws://127.0.0.1:9480";
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}`;
}

export function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "unknown";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KiB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}
