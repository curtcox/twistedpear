// @ts-nocheck
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { Image,Platform,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View } from "react-native";
import qrcodeModule from "qrcode-generator";
import { decodePeerQrRgba } from "@twistedpear/peer-discovery";
import { decodePeerAudioFskStream,encodePeerAudioFsk } from "@twistedpear/protocol";
import { StatusBar } from "expo-status-bar";
import { validateWidgetTree,type WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import { createWebCoreBridge } from "./host/web-core-bridge";
import { createPwaInstallController,type PwaInstallAvailability } from "./host/web-pwa-install";
import { webSerialSupported } from "./host/web-serial-relay";
import type { AnnounceEntry,CapabilityGrantView,ConfirmationKind,HostConfirmationRequestView,HostToWorkletMessage,Install256tResultView,InstallProgress,InstallReviewRequestView,InstalledPackageView,LaunchReviewCapabilityView,LaunchReviewRequestView,MiniappRuntimeView,TrustedPublisherView,WebStorageQuotaView,WorkletStatus,WorkletToHostMessage,DeviceStateView,SessionInviteView } from "./worklet/protocol";
import { ActionButton, CONFIRM_KIND_TITLES, DEFAULT_PASSPHRASE, HostConfirmationModal, MAX_ANNOUNCES, PeerChromeModal, Row, audioHex, audioUnhex, chatWidgetTree, defaultGatewayUrl, formatBytes, handleWebMediaCodecRequest, helloWidgetTree, initialStatus, outboundWebRtcMediaBytes, playInboundAudioFrame, playPeerAudio, recordPeerAudio, styles, webBytesToHex, webDecodeOpus, webEncodeOpus, webHexToBytes } from "./app-web-shared.js";
import type { useWebHarnessController } from "./app-web-controller.js";
import { WebHarnessViewPart1 } from "./app-web-view-part-1.js";
import { WebHarnessViewPart2 } from "./app-web-view-part-2.js";
type Scope = ReturnType<typeof useWebHarnessController>;
export function HarnessView({ scope }: { scope: Scope }) {
  const { status, setStatus, announces, setAnnounces, logLines, setLogLines, gatewayUrl, setGatewayUrl, sharedToken, setSharedToken, ntfyUrl, setNtfyUrl, ntfyToken, setNtfyToken, wsEnabled, setWsEnabled, rnodeEnabled, setRnodeEnabled, webSerialAvailable, previewTree, setPreviewTree, lastWidgetEvent, setLastWidgetEvent, storageQuota, setStorageQuota, installed, setInstalled, selectedInstalledAppId, setSelectedInstalledAppId, grantCapabilities, setGrantCapabilities, miniappRuntime, setMiniappRuntime, developerMode, setDeveloperMode, hostModal, setHostModal, peerModal, setPeerModal, install256tInput, setInstall256tInput, installProgress, setInstallProgress, trustedPublishers, setTrustedPublishers, trustIdentityInput, setTrustIdentityInput, trustLabelInput, setTrustLabelInput, hostIdentity256t, setHostIdentity256t, deviceState, setDeviceState, sessionInvites, setSessionInvites, pwaInstallAvailability, setPwaInstallAvailability, pwaInstallRef, peerRtcRef, previewOptions, bridgeRef, workspaceReadCounterRef, crossDeviceCounterRef, pendingCrossDeviceRef, pendingWorkspaceReadsRef, appendLog, sendToWorker, readWorkspaceDocument, handleWorkerMessage, ensureBridge, pushGatewayConfig, performPeerAudio, connectWebSerialRnode, promptPwaInstall } = scope;
  return (
    <View style={styles.container}>
      <WebHarnessViewPart1 scope={scope} />
      <WebHarnessViewPart2 scope={scope} />
    </View>
  );
}
