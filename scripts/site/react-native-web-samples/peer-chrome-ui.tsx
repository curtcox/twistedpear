import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import qrcodeModule from "qrcode-generator";
import { decodePeerQrRgba } from "../../../packages/peer-discovery/src/index.ts";
import type { PagesPeerChrome, PeerChromeModal } from "./peer-chrome.ts";

export function PeerChromePanel({ chrome }: { readonly chrome: PagesPeerChrome }) {
  const [modal, setModal] = useState<PeerChromeModal | null>(chrome.getSnapshot());
  useEffect(() => chrome.subscribe(setModal), [chrome]);
  if (modal === null) return null;
  return (
    <PeerChromeModalView
      modal={modal}
      onInput={(value) => chrome.setInput(value)}
      onCancel={() => chrome.cancel()}
      onContinue={() => void chrome.continueExchange()}
      onConfirm={(approved) => chrome.confirmDecision(approved)}
    />
  );
}

function PeerChromeModalView({
  modal,
  onInput,
  onCancel,
  onContinue,
  onConfirm,
}: {
  readonly modal: PeerChromeModal;
  readonly onInput: (value: string) => void;
  readonly onCancel: () => void;
  readonly onContinue: () => void;
  readonly onConfirm: (approved: boolean) => void;
}) {
  const [qrFrame, setQrFrame] = useState(0);
  const [cameraStatus, setCameraStatus] = useState("");
  const cameraStopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cameraStopRef.current?.(), []);
  useEffect(() => {
    if (
      modal.kind !== "exchange" ||
      modal.exchange !== "qr-present" ||
      (modal.codes?.length ?? 0) < 2
    )
      return undefined;
    const codes = modal.codes ?? [];
    const timer = setInterval(
      () => setQrFrame((current) => (current + 1) % codes.length),
      750,
    );
    return () => clearInterval(timer);
  }, [modal]);

  if (modal.kind === "confirm") {
    return (
      <PeerConfirmCard
        modal={modal}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <PeerExchangeCard
      modal={modal}
      qrFrame={qrFrame}
      cameraStatus={cameraStatus}
      onInput={onInput}
      onCancel={onCancel}
      onContinue={onContinue}
      onStartCamera={() =>
        void startPeerQrCamera({
          onInput,
          setCameraStatus,
          cameraStopRef,
        })
      }
    />
  );
}

function PeerConfirmCard({
  modal,
  onCancel,
  onConfirm,
}: {
  readonly modal: Extract<PeerChromeModal, { kind: "confirm" }>;
  readonly onCancel: () => void;
  readonly onConfirm: (approved: boolean) => void;
}) {
  return (
    <View testID="peer-confirmation-modal" style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Confirm peer connection</Text>
        <Text style={styles.muted}>
          Trusted host chrome · Requested by: {modal.appId}
        </Text>
        <Text style={styles.body}>Purpose: {modal.purpose}</Text>
        <Text style={styles.body}>Service: {modal.service}</Text>
        <Text style={styles.body}>
          Peer label (untrusted claim): {modal.peer.displayLabel}
        </Text>
        <Text style={styles.body}>
          Identity fingerprint: {modal.peer.fingerprint}
        </Text>
        <Text style={styles.body}>
          Matching words: {modal.peer.matchingWords.join(" · ")}
        </Text>
        <Text style={styles.body}>Data path: {modal.peer.dataPlane}</Text>
        <View style={styles.row}>
          <Action label="Cancel" onPress={onCancel} />
          <Action label="Connect" onPress={() => onConfirm(true)} />
        </View>
      </View>
    </View>
  );
}

function PeerExchangeCard({
  modal,
  qrFrame,
  cameraStatus,
  onInput,
  onCancel,
  onContinue,
  onStartCamera,
}: {
  readonly modal: Extract<PeerChromeModal, { kind: "exchange" }>;
  readonly qrFrame: number;
  readonly cameraStatus: string;
  readonly onInput: (value: string) => void;
  readonly onCancel: () => void;
  readonly onContinue: () => void;
  readonly onStartCamera: () => void;
}) {
  const flags = peerExchangeFlags(modal);
  const qrUri = peerQrDataUrl(
    modal.exchange === "qr-present" ? modal.codes?.[qrFrame] : undefined,
  );
  return (
    <View testID="peer-exchange-modal" style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {peerExchangeTitle(flags, modal.exchange)}
        </Text>
        <Text style={styles.muted}>
          {flags.audio
            ? "Trusted host chrome. This emits audible FSK tones and requests microphone access only after you continue. No PCM is exposed to the mini-app."
            : "Trusted host chrome. This is a full serverless code, not a short lookup code."}
        </Text>
        {qrUri !== null ? (
          <Image
            accessibilityLabel="Peer invitation QR"
            source={{ uri: qrUri }}
            style={styles.qr}
          />
        ) : null}
        {modal.exchange === "manual-present" && modal.code !== undefined ? (
          <TextInput
            multiline
            editable={false}
            value={modal.code}
            style={styles.input}
          />
        ) : null}
        {flags.needsInput ? (
          <TextInput
            testID="peer-code-input"
            multiline
            value={modal.input}
            onChangeText={onInput}
            placeholder="Paste the peer's full code"
            style={styles.input}
          />
        ) : null}
        {flags.qr && flags.needsInput ? (
          <>
            <Action label="Start camera" onPress={onStartCamera} />
            <Text style={styles.muted}>{cameraStatus}</Text>
          </>
        ) : null}
        <View style={styles.row}>
          <Action label="Cancel" onPress={onCancel} />
          <Action
            label={peerContinueLabel(flags, modal)}
            onPress={onContinue}
          />
        </View>
      </View>
    </View>
  );
}

function peerExchangeFlags(
  modal: Extract<PeerChromeModal, { kind: "exchange" }>,
): {
  readonly present: boolean;
  readonly qr: boolean;
  readonly audio: boolean;
  readonly needsInput: boolean;
} {
  return {
    present:
      modal.exchange === "manual-present" ||
      modal.exchange === "qr-present" ||
      modal.exchange === "audio-transmit",
    qr: modal.exchange === "qr-present" || modal.exchange === "qr-scan",
    audio:
      modal.exchange === "audio-transmit" || modal.exchange === "audio-receive",
    needsInput:
      modal.exchange === "manual-enter" ||
      modal.exchange === "qr-scan" ||
      modal.expectsResponse,
  };
}

function peerQrDataUrl(qrValue: string | undefined): string | null {
  if (qrValue === undefined) return null;
  const factory = qrcodeModule as unknown as (
    typeNumber: number,
    correction: string,
  ) => {
    addData(value: string): void;
    make(): void;
    createDataURL(cellSize: number, margin: number): string;
  };
  const image = factory(0, "M");
  image.addData(qrValue);
  image.make();
  return image.createDataURL(4, 8);
}

function peerExchangeTitle(
  flags: {
    readonly audio: boolean;
    readonly qr: boolean;
    readonly present: boolean;
  },
  exchange: Extract<PeerChromeModal, { kind: "exchange" }>["exchange"],
): string {
  if (flags.audio) {
    return exchange === "audio-transmit"
      ? "Play an audible peer invitation"
      : "Listen for an audible peer invitation";
  }
  if (flags.qr) return flags.present ? "Show peer QR" : "Scan peer QR";
  return flags.present ? "Share peer invitation" : "Enter a peer invitation";
}

function peerContinueLabel(
  flags: { readonly audio: boolean; readonly needsInput: boolean },
  modal: Extract<PeerChromeModal, { kind: "exchange" }>,
): string {
  if (!flags.audio) return flags.needsInput ? "Continue" : "Done";
  if (modal.exchange !== "audio-transmit") return "Start listening";
  return modal.expectsResponse ? "Play and listen" : "Play answer";
}

async function startPeerQrCamera(input: {
  readonly onInput: (value: string) => void;
  readonly setCameraStatus: (status: string) => void;
  readonly cameraStopRef: { current: (() => void) | null };
}): Promise<void> {
  const browser = globalThis as {
    navigator?: {
      mediaDevices?: {
        getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
      };
    };
    document?: Document;
    requestAnimationFrame(callback: () => void): number;
  };
  if (
    browser.navigator?.mediaDevices?.getUserMedia === undefined ||
    browser.document === undefined
  ) {
    input.setCameraStatus(
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
      input.cameraStopRef.current = null;
    };
    input.cameraStopRef.current = stop;
    input.setCameraStatus("Camera active. Hold the peer QR inside the preview.");
    const canvas = browser.document.createElement("canvas");
    const detect = () => {
      if (input.cameraStopRef.current === null) return;
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
          input.onInput(value);
          input.setCameraStatus("QR payload captured.");
          stop();
          return;
        }
      }
      browser.requestAnimationFrame(detect);
    };
    detect();
  } catch (error) {
    input.setCameraStatus(
      `Camera unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function Action({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(4, 10, 18, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 20
  },
  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#102334",
    borderRadius: 16,
    padding: 18,
    gap: 10
  },
  title: { color: "#f7fbff", fontSize: 20, fontWeight: "700" },
  muted: { color: "#a9b8c8", fontSize: 13, lineHeight: 18 },
  body: { color: "#d6e1eb", fontSize: 14 },
  input: {
    minHeight: 96,
    borderColor: "#2b3d4f",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    color: "#eff7ff",
    backgroundColor: "#0d1b29"
  },
  qr: { width: 260, height: 260, alignSelf: "center" },
  row: { flexDirection: "row", gap: 10, justifyContent: "flex-end", marginTop: 6 },
  button: {
    backgroundColor: "#16463f",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  buttonLabel: { color: "#eff7ff", fontWeight: "600" }
});
