import { useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import qrcodeModule from "qrcode-generator";
import { decodePeerQrRgba } from "@twistedpear/peer-discovery";
import type {
  ConfirmationKind,
  HostConfirmationRequestView,
  LaunchReviewCapabilityView,
  LaunchReviewRequestView,
  InstallReviewRequestView,
  WorkletToHostMessage,
} from "./worklet/protocol";

export const CONFIRM_KIND_TITLES: Readonly<Record<ConfirmationKind, string>> = {
  package: "Package and sign an app?",
  publish: "Publish an app to other users?",
  install: "Install an app?",
  preview: "Preview an app in the host sandbox?",
  "trust-import": "Trust a new publisher?",
  "device-session": "Allow a device session?",
  "device-stream": "Stream a device to a peer?",
  "device-remote-grant": "Let a remote peer use a device on this host?",
  "device-share-offer": "Share a device with this peer?",
  "device-share-revoke": "Stop sharing this device?",
  "link-probe": "Measure this peer link?",
  "freenet-update": "Publish an irreversible Freenet contract update?",
};

export function Row({
  label,
  value,
  onChange,
  testID,
  disabled = false,
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
  readonly testID?: string;
  readonly disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
      />
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  testID,
  disabled = false,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly testID?: string;
  readonly disabled?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function PeerChromeModal({
  modal,
  onInput,
  onCancel,
  onContinue,
}: {
  readonly modal:
    | {
        readonly kind: "exchange";
        readonly request: Extract<
          WorkletToHostMessage,
          {
            type:
              | "peer-manual-present"
              | "peer-manual-enter"
              | "peer-qr-present"
              | "peer-qr-scan"
              | "peer-ntfy-present"
              | "peer-ntfy-enter"
              | "peer-audio-transmit"
              | "peer-audio-receive";
          }
        >;
        readonly input: string;
      }
    | {
        readonly kind: "confirm";
        readonly request: Extract<
          WorkletToHostMessage,
          { type: "peer-confirm-request" }
        >;
      };
  readonly onInput: (value: string) => void;
  readonly onCancel: () => void;
  readonly onContinue: () => void;
}) {
  const [qrFrame, setQrFrame] = useState(0);
  const [cameraStatus, setCameraStatus] = useState("");
  const cameraStopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cameraStopRef.current?.(), []);
  useEffect(() => {
    if (
      modal.kind !== "exchange" ||
      modal.request.type !== "peer-qr-present" ||
      modal.request.codes.length < 2
    ) {
      return undefined;
    }
    const codes = modal.request.codes;
    const timer = setInterval(
      () => setQrFrame((current) => (current + 1) % codes.length),
      750,
    );
    return () => clearInterval(timer);
  }, [modal]);

  if (modal.kind === "confirm") {
    return <PeerConfirmModalBody modal={modal} onCancel={onCancel} onContinue={onContinue} />;
  }
  return (
    <PeerExchangeModalBody
      modal={modal}
      qrFrame={qrFrame}
      cameraStatus={cameraStatus}
      onInput={onInput}
      onCancel={onCancel}
      onContinue={onContinue}
      onStartCamera={() => {
        void startPeerQrCamera(cameraStopRef, setCameraStatus, onInput);
      }}
    />
  );
}

function peerExchangeQrUri(
  modal: PeerExchange,
  qrFrame: number,
): string | null {
  const qrValue =
    modal.request.type === "peer-qr-present"
      ? modal.request.codes[qrFrame]
      : undefined;
  if (qrValue === undefined) return null;
  const qrFactory = qrcodeModule as unknown as (
    typeNumber: number,
    correction: string,
  ) => {
    addData(value: string): void;
    make(): void;
    createDataURL(cellSize: number, margin: number): string;
  };
  const image = qrFactory(0, "M");
  image.addData(qrValue);
  image.make();
  return image.createDataURL(4, 8);
}

type PeerModal = Parameters<typeof PeerChromeModal>[0]["modal"];
type PeerExchange = Extract<PeerModal, { kind: "exchange" }>;
type PeerConfirm = Extract<PeerModal, { kind: "confirm" }>;

async function startPeerQrCamera(
  cameraStopRef: React.MutableRefObject<(() => void) | null>,
  setCameraStatus: (value: string) => void,
  onInput: (value: string) => void,
): Promise<void> {
  const browser = globalThis as unknown as {
    navigator?: {
      mediaDevices?: {
        getUserMedia(
          constraints: unknown,
        ): Promise<{ getTracks(): ReadonlyArray<{ stop(): void }> }>;
      };
    };
    document?: {
      body: { appendChild(node: unknown): void };
      createElement(name: string): any;
    };
    requestAnimationFrame(callback: () => void): void;
  };
  if (
    browser.navigator?.mediaDevices?.getUserMedia === undefined ||
    browser.document === undefined
  ) {
    setCameraStatus(
      "Camera capture is unavailable; paste the full payload instead.",
    );
    return;
  }
  try {
    const stream = await browser.navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    const video = browser.document.createElement("video");
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    video.setAttribute("aria-label", "Peer QR camera preview");
    Object.assign(video.style, {
      position: "fixed",
      right: "24px",
      bottom: "24px",
      width: "240px",
      zIndex: "1000",
      borderRadius: "12px",
    });
    browser.document.body.appendChild(video);
    await video.play();
    const stop = () => {
      stream.getTracks().forEach((track) => track.stop());
      video.remove();
      cameraStopRef.current = null;
    };
    cameraStopRef.current = stop;
    setCameraStatus("Camera active. Hold the peer QR inside the preview.");
    const canvas = browser.document.createElement("canvas");
    const detect = () => {
      if (cameraStopRef.current === null) {
        return;
      }
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context?.drawImage(video, 0, 0);
        const image = context?.getImageData(0, 0, canvas.width, canvas.height);
        const value =
          image === undefined
            ? null
            : decodePeerQrRgba(image.data, canvas.width, canvas.height);
        if (value !== null) {
          onInput(value);
          setCameraStatus("QR payload captured.");
          stop();
          return;
        }
      }
      browser.requestAnimationFrame(detect);
    };
    detect();
  } catch (error) {
    setCameraStatus(
      `Camera unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function PeerConfirmModalBody({
  modal,
  onCancel,
  onContinue,
}: {
  modal: PeerConfirm;
  onCancel: () => void;
  onContinue: () => void;
}) {
  return (
    <View testID="peer-confirmation-modal" style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>Confirm peer connection</Text>
        <Text style={styles.muted}>
          Trusted host chrome · Requested by: {modal.request.appId}
        </Text>
        <Text>Purpose: {modal.request.purpose}</Text>
        <Text>Service: {modal.request.service}</Text>
        <Text>
          Peer label (untrusted claim): {modal.request.peer.displayLabel}
        </Text>
        <Text>Identity fingerprint: {modal.request.peer.fingerprint}</Text>
        <Text>
          Matching words: {modal.request.peer.matchingWords.join(" · ")}
        </Text>
        <Text>Data path: {modal.request.peer.dataPlane}</Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Cancel" onPress={onCancel} />
          <ActionButton label="Connect" onPress={onContinue} />
        </View>
      </View>
    </View>
  );
}

function PeerExchangeModalBody({
  modal,
  qrFrame,
  cameraStatus,
  onInput,
  onCancel,
  onContinue,
  onStartCamera,
}: {
  modal: PeerExchange;
  qrFrame: number;
  cameraStatus: string;
  onInput: (value: string) => void;
  onCancel: () => void;
  onContinue: () => void;
  onStartCamera: () => void;
}) {
  const flags = peerExchangeFlags(modal);
  const qrUri = peerExchangeQrUri(modal, qrFrame);
  return (
    <View testID="peer-exchange-modal" style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{peerExchangeTitle(flags, modal)}</Text>
        <Text style={styles.muted}>{peerExchangeMuted(flags, modal)}</Text>
        <PeerExchangePresentFields modal={modal} qrUri={qrUri} />
        {flags.needsInput ? (
          <TextInput
            testID="peer-code-input"
            multiline
            value={modal.input}
            onChangeText={onInput}
            placeholder={
              flags.ntfy
                ? "Enter the TPN2 lookup code (TPN1 also works)"
                : "Paste the peer's full code"
            }
            style={styles.input}
          />
        ) : null}
        {flags.qr && flags.needsInput ? (
          <>
            <ActionButton label="Start camera" onPress={onStartCamera} />
            <Text style={styles.muted}>{cameraStatus}</Text>
          </>
        ) : null}
        <View style={styles.buttonRow}>
          <ActionButton label="Cancel" onPress={onCancel} />
          <ActionButton
            label={peerExchangeContinueLabel(flags, modal)}
            onPress={onContinue}
          />
        </View>
      </View>
    </View>
  );
}

function peerExchangeFlags(modal: PeerExchange): {
  present: boolean;
  qr: boolean;
  ntfy: boolean;
  audio: boolean;
  needsInput: boolean;
} {
  const type = modal.request.type;
  return {
    present:
      type === "peer-manual-present" ||
      type === "peer-qr-present" ||
      type === "peer-ntfy-present",
    qr: type === "peer-qr-present" || type === "peer-qr-scan",
    ntfy: type === "peer-ntfy-present" || type === "peer-ntfy-enter",
    audio: type === "peer-audio-transmit" || type === "peer-audio-receive",
    needsInput: peerExchangeNeedsInput(modal),
  };
}

function peerExchangeNeedsInput(modal: PeerExchange): boolean {
  const type = modal.request.type;
  if (
    type === "peer-manual-enter" ||
    type === "peer-qr-scan" ||
    type === "peer-ntfy-enter"
  ) {
    return true;
  }
  return "expectsResponse" in modal.request && modal.request.expectsResponse;
}

function peerExchangeTitle(
  flags: ReturnType<typeof peerExchangeFlags>,
  modal: PeerExchange,
): string {
  if (flags.audio) {
    return modal.request.type === "peer-audio-transmit"
      ? "Play an audible peer invitation"
      : "Listen for an audible peer invitation";
  }
  if (flags.ntfy) {
    return flags.present
      ? "Share a private ntfy lookup code"
      : "Enter a private ntfy lookup code";
  }
  if (flags.qr) {
    return flags.present ? "Show peer QR" : "Scan peer QR";
  }
  return flags.present ? "Share peer invitation" : "Enter a peer invitation";
}

function peerExchangeMuted(
  flags: ReturnType<typeof peerExchangeFlags>,
  modal: PeerExchange,
): string {
  if (flags.audio) {
    return "Trusted host chrome. This emits audible FSK tones and requests microphone access only after you continue. No PCM is exposed to the mini-app.";
  }
  if (flags.ntfy) {
    return `Trusted host chrome. ${modal.request.server} can observe a random topic, timing, and IP metadata, but invitation contents are end-to-end encrypted.`;
  }
  return "Trusted host chrome. This is a full serverless code, not a short lookup code.";
}

function peerExchangeContinueLabel(
  flags: ReturnType<typeof peerExchangeFlags>,
  modal: PeerExchange,
): string {
  if (!flags.audio) {
    return flags.needsInput ? "Continue" : "Done";
  }
  if (modal.request.type !== "peer-audio-transmit") {
    return "Start listening";
  }
  return modal.request.expectsResponse ? "Play and listen" : "Play answer";
}

function PeerExchangePresentFields({
  modal,
  qrUri,
}: {
  modal: PeerExchange;
  qrUri: string | null;
}) {
  return (
    <>
      {qrUri !== null ? (
        <Image
          accessibilityLabel="Peer invitation QR"
          source={{ uri: qrUri }}
          style={{ width: 260, height: 260 }}
        />
      ) : null}
      {modal.request.type === "peer-manual-present" ? (
        <TextInput multiline editable={false} value={modal.request.code} style={styles.input} />
      ) : null}
      {modal.request.type === "peer-ntfy-present" ? (
        <TextInput multiline editable={false} value={modal.request.code} style={styles.input} />
      ) : null}
    </>
  );
}


export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101418",
    paddingTop: Platform.OS === "web" ? 24 : 64,
    paddingHorizontal: 20,
  },
  title: {
    color: "#f4f7fb",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9aa7b8",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    color: "#f4f7fb",
    fontWeight: "600",
    marginBottom: 4,
  },
  muted: {
    color: "#9aa7b8",
    fontSize: 13,
  },
  mono: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
  },
  announceLine: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 11,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    color: "#f4f7fb",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#0f141b",
    color: "#f4f7fb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  button: {
    backgroundColor: "#2b3645",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonLabel: {
    color: "#f4f7fb",
    fontSize: 13,
  },
  deviceRow: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#141a22",
    marginBottom: 6,
    gap: 4,
  },
  deviceLabel: {
    color: "#f4f7fb",
    fontSize: 13,
  },
  deviceMeta: {
    color: "#9aa7b8",
    fontSize: 11,
  },
  deviceActiveBanner: {
    backgroundColor: "#3a2410",
    borderBottomWidth: 1,
    borderBottomColor: "#8a5a20",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  deviceActiveBannerPinned: {
    zIndex: 50,
  },
  deviceActiveBannerTitle: {
    color: "#f4e2c4",
    fontWeight: "600",
    fontSize: 13,
  },
  deviceActiveBannerText: {
    color: "#f4e2c4",
    fontSize: 12,
    flex: 1,
  },
  deviceActiveBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dangerButton: {
    backgroundColor: "#7a2430",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  packageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  packageTitle: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 12,
  },
  log: {
    flex: 1,
    backgroundColor: "#0b0f14",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  logLine: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 12,
    marginBottom: 6,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    zIndex: 100,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    color: "#f4f7fb",
    fontSize: 18,
    fontWeight: "700",
  },
});
