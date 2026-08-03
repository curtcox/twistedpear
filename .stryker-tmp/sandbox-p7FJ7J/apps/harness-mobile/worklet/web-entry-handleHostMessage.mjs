/**
 * Browser core Web Worker (Phase W1/W2). Leaf peer + mini-app runtime via main-thread sandbox relay.
 */
// @ts-nocheck


import { createWebLeafHost } from "../../../packages/host-core/dist/web.js";
import { createHostLxmfDelivery } from "../../../packages/host-core/dist/host-lxmf-delivery.js";
import { createWebPackageStorage } from "../../../packages/host-core/dist/web.js";
import {
  sessionInviteContent,
  SESSION_INVITE_TITLE
} from "../../../packages/host-core/dist/session-invite-carrier.js";
import { encodeDeviceStreamFrame, encodeSessionInviteEnvelope } from "../../../packages/protocol/dist/index.js";
import { LXMessageMethod } from "../../../packages/lxmf-ts/dist/index.js";
import {
  Identity,
  BandwidthLimiter,
  DestinationDirection,
  DestinationType,
  PureCryptoProvider,
  Reticulum,
  bytesToHex,
  hexToBytes,
  hasWebIdentity,
  loadOrCreateWebIdentity,
  persistWebIdentity,
  resetWebIdentity,
  webRuntime
} from "../../../packages/reticulum-ts/dist/web.js";
import { createWebWorkletMiniappHost } from "./web-miniapp-host.mjs";
import { createDelegatedWebRtcMediaPlaneOpener } from "../../../packages/miniapp-runtime/dist/media-stream.js";
import {
  createHostReplyChannel,
  createCrossDeviceTestDriver,
  createHarnessPeerPair,
  createMiniappAnnounceService,
  createStatusTimer
} from "../../../packages/worklet-core/src/index.mjs";
import { createWebInstallService } from "./web-install.mjs";
import { createWebPublishService } from "./web-publish.mjs";
import { createWebSerialPipe } from "./web-serial-pipe.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
  unpackPackage
} from "../../../packages/app-registry/dist/index.js";
import {
  CasStore,
  casRequestAspects,
  encodeCasLocator,
  encodeCasLocatorRequest
} from "../../../packages/cas-256t/dist/index.js";
import { HOST_API_VERSION } from "../../../packages/miniapp-runtime/dist/host-api.js";
import { reviveJsonWireValue } from "../../../packages/miniapp-runtime/dist/sandbox/json-wire.js";
import {
  AudioPeerDiscoveryAdapter,
  CryptoPeerPairingBackend,
  InvitationPairingDriver,
  ManualPeerDiscoveryAdapter,
  meterHostPeerRoute,
  NtfyPeerDiscoveryAdapter,
  NtfyRendezvousClient,
  PeerDiscoveryRegistry,
  PeerSessionManager,
  QrPeerDiscoveryAdapter,
  UnavailablePeerDiscoveryAdapter
} from "../../../packages/peer-discovery/dist/index.js";

export async function handleHostMessageImpl(context, raw) {
    const line = raw.trim();
    if (line.length === 0) {
        return;
    }
    let message;
    try {
        message = JSON.parse(line);
    }
    catch {
        context.log(`Ignored host message: ${line}`);
        return;
    }
    if (message.type === "sandbox-spawned" ||
        message.type === "sandbox-spawn-failed" ||
        message.type === "sandbox-ping-result" ||
        message.type === "sandbox-broker-request") {
        context.handleSandboxHostMessage(message);
        return;
    }
    if (message.type === "serial-data" ||
        message.type === "serial-connect" ||
        message.type === "serial-disconnect" ||
        message.type === "serial-error") {
        context.handleSerialHostMessage(message);
        return;
    }
    if (message.type === "start") {
        if (message.mockAiChat === true) {
            context.mockAiChat = true;
        }
        if (message.mockLocalPublish === true) {
            context.mockLocalPublish = true;
        }
        if (message.gatewayUrl !== undefined) {
            context.webConfig = {
                gatewayUrl: message.gatewayUrl,
                identityPassphrase: message.identityPassphrase ?? context.DEFAULT_PASSPHRASE,
                ...(message.sharedToken === undefined ? {} : { sharedToken: message.sharedToken }),
                ...(message.ntfyUrl === undefined || message.ntfyUrl.trim() === "" ? {} : { ntfyUrl: message.ntfyUrl.trim() }),
                ...(message.ntfyToken === undefined || message.ntfyToken.trim() === "" ? {} : { ntfyToken: message.ntfyToken.trim() })
            };
            context.status.gatewayUrl = message.gatewayUrl;
        }
        await context.refreshIdentityStatus();
        if (context.status.tcpEnabled || context.status.wsEnabled) {
            await context.startHostSession();
        }
        else {
            context.log(`Gateway configured (${context.webConfig.gatewayUrl || "unset"}); enable WS gateway to connect`);
        }
        return;
    }
    if (message.type === "stop") {
        await context.stopHostSession();
        context.log("Web core worker stopped");
        return;
    }
    if (message.type === "create-identity") {
        await context.createIdentity();
        return;
    }
    if (message.type === "import-identity") {
        try {
            await context.importIdentity(message.privateKeyHex);
        }
        catch (error) {
            context.log(`Import identity failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "reset-identity") {
        await context.resetIdentity();
        return;
    }
    if (message.type === "set-interfaces") {
        context.status.tcpEnabled = message.tcp;
        context.status.autoEnabled = message.auto;
        context.status.bleEnabled = message.ble;
        context.status.rnodeEnabled = message.rnode;
        context.pendingRnodeBaudRate = message.rnodeBaudRate ?? 115200;
        context.pushStatus();
        if (message.tcp) {
            await context.startHostSession();
        }
        else {
            await context.stopHostSession();
            context.log("WS gateway disabled");
        }
        await context.applyInterfaceConfig();
        return;
    }
    if (message.type === "confirm-response" || message.type === "launch-confirm" || message.type === "install-confirm" || message.type === "peer-chrome-response" || message.type === "device-bridge-response" || message.type === "media-opus-play-response" || message.type === "media-opus-duplex-response" || message.type === "media-codec-response") {
        context.hostReplyChannel.resolveReply(message);
        return;
    }
    if (message.type === "peer-webrtc-data") {
        const payload = hexToBytes(message.dataHex);
        const listeners = context.webRtcRouteListeners.get(message.sessionId);
        if (listeners === undefined || listeners.size === 0) {
            const pending = context.webRtcRoutePending.get(message.sessionId) ?? [];
            pending.push(payload.slice());
            if (pending.length > 16)
                pending.shift();
            context.webRtcRoutePending.set(message.sessionId, pending);
        }
        else {
            for (const listener of listeners)
                listener(payload.slice());
        }
        return;
    }
    if (message.type === "install-from-256t") {
        try {
            const result = await context.ensureInstallService().installFromT256(message.t256);
            await context.pushInstalledList();
            context.send({ type: "install-256t-result", ok: true, ...result });
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            context.send({ type: "install-256t-result", ok: false, error: detail });
            context.log(`Install from 256t failed: ${detail}`);
        }
        return;
    }
    if (message.type === "cross-device-command") {
        try {
            const cmd = typeof message.command?.cmd === "string" ? message.command.cmd : "";
            const result = cmd === "renderer-ping" ||
                cmd === "peer-pair-start" ||
                cmd === "peer-pair-code-out" ||
                cmd === "peer-pair-code-in" ||
                cmd === "peer-pair-wait" ||
                cmd === "webrtc-open-media" ||
                cmd === "media-opus-duplex" ||
                cmd === "media-opus-play" ||
                cmd === "harness-info" ||
                cmd === "announce" ||
                cmd === "send-invite" ||
                cmd === "accept-invite" ||
                cmd === "invite-state"
                ? await context.handleWebRtcHarnessCommand(message.command)
                : await context.ensureCrossDeviceTestDriver()(message.command);
            context.send({ type: "cross-device-result", token: message.token, ok: true, result });
        }
        catch (error) {
            context.send({
                type: "cross-device-result",
                token: message.token,
                ok: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        return;
    }
    if (message.type === "trust-list") {
        await context.ensureInstallService().pushTrustList();
        return;
    }
    if (message.type === "trust-add") {
        try {
            const publisherPublicKey = decodePublisherIdentity256t(message.identityString);
            await context.ensureInstallService().trustStore.add({
                publisherPublicKey,
                label: message.label ?? "Unnamed publisher",
                addedAt: Date.now(),
                source: message.source ?? "paste"
            });
            context.log(`Trusted publisher ${message.label ?? publisherPublicKey.slice(0, 16)}`);
        }
        catch (error) {
            context.log(`Trust add failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        await context.ensureInstallService().pushTrustList();
        return;
    }
    if (message.type === "trust-remove") {
        await context.ensureInstallService().trustStore.remove(message.publisherPublicKey);
        context.log("Removed trusted publisher");
        await context.ensureInstallService().pushTrustList();
        return;
    }
    if (message.type === "trust-show") {
        if (!(await hasWebIdentity(context.identityOptions()))) {
            context.send({ type: "trust-identity", identity256t: null });
            return;
        }
        const identity = await loadOrCreateWebIdentity(context.cryptoProvider, context.identityOptions());
        context.send({
            type: "trust-identity",
            identity256t: encodePublisherIdentity256t(identity.getPublicKey())
        });
        return;
    }
    if (message.type === "list-catalog" || message.type === "list-installed") {
        const storage = await context.ensurePackageStorage();
        context.send({ type: "catalog", entries: [] });
        context.send({
            type: "installed",
            packages: storage.listInstalled().map((record) => ({
                appId: record.appId,
                version: record.version,
                activeVersion: storage.activeVersion(record.appId) ?? record.version,
                packageHash: record.packageHash,
                installedAt: record.installedAt,
                rollbackAvailable: false,
                capabilities: record.manifest.capabilities,
                publisherPublicKey: record.manifest.publisherPublicKey
            }))
        });
        return;
    }
    if (message.type === "refresh-storage") {
        const quota = await context.refreshStorageStatus();
        context.send({
            type: "storage-quota",
            quota: {
                usageBytes: quota.usageBytes,
                quotaBytes: quota.quotaBytes,
                persisted: quota.persisted,
                packageUsedBytes: quota.packageUsedBytes,
                packageQuotaBytes: quota.packageQuotaBytes,
                archiveBackend: quota.archiveBackend
            }
        });
        return;
    }
    if (message.type === "install-app") {
        const storage = await context.ensurePackageStorage();
        if (message.archiveHex === undefined || message.archiveHex.length === 0) {
            context.log("Web install requires archiveHex or install-from-256t");
            return;
        }
        try {
            const installed = await storage.installArchive(hexToBytes(message.archiveHex));
            context.status.installedPackages = storage.listInstalled().length;
            context.status.storageUsedBytes = storage.getPackageUsedBytes();
            context.pushStatus();
            context.send({
                type: "installed",
                packages: storage.listInstalled().map((record) => ({
                    appId: record.appId,
                    version: record.version,
                    activeVersion: storage.activeVersion(record.appId) ?? record.version,
                    packageHash: record.packageHash,
                    installedAt: record.installedAt,
                    rollbackAvailable: false,
                    capabilities: record.manifest.capabilities,
                    publisherPublicKey: record.manifest.publisherPublicKey
                }))
            });
            context.log(`Installed ${installed.appId} v${installed.version} (${installed.archiveBytes} bytes)`);
        }
        catch (error) {
            context.log(`Install failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "seed-miniapp-kv") {
        await context.ensureMiniappKvStore().set(message.key, hexToBytes(message.valueHex));
        context.log(`Seeded mini-app KV key ${message.key}`);
        return;
    }
    if (message.type === "device-list") {
        try {
            await context.ensureMiniappHost().pushDeviceState();
        }
        catch (error) {
            context.log(`Device list failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "device-set-class-disabled") {
        try {
            await context.ensureMiniappHost().setDeviceClassDisabled(message.classId, message.disabled === true);
        }
        catch (error) {
            context.log(`Device policy update failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "device-set-remote") {
        try {
            await context.ensureMiniappHost().setRemoteAcquisitionEnabled(message.enabled === true);
        }
        catch (error) {
            context.log(`Remote acquisition update failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "device-kill-session") {
        try {
            await context.ensureMiniappHost().forceCloseDeviceSession(message.handle);
        }
        catch (error) {
            context.log(`Device session kill failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "device-revoke-share") {
        await context.ensureMiniappHost().revokeShareOffer(message.appId, message.id);
        return;
    }
    if (message.type === "device-test-seed-share") {
        try {
            const offer = await context.ensureMiniappHost().seedShareOfferForTest({
                appId: message.appId,
                displayLabel: message.displayLabel,
                classId: message.classId,
                ttlMs: message.ttlMs
            });
            context.log(`Seeded share offer ${offer.id} for ${offer.displayLabel}`);
        }
        catch (error) {
            context.log(`Seed share offer failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "session-invite-accept") {
        try {
            await context.ensureMiniappHost().acceptSessionInvite(message.id);
            context.log(`Accepted session invite ${message.id}`);
        }
        catch (error) {
            context.log(`Session invite accept failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "session-invite-decline") {
        try {
            context.ensureMiniappHost().declineSessionInvite(message.id);
            context.log(`Declined session invite ${message.id}`);
        }
        catch (error) {
            context.log(`Session invite decline failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "set-developer-mode") {
        context.ensureMiniappHost().setDeveloperMode(message.enabled);
        context.log(`Developer mode ${message.enabled ? "enabled" : "disabled"}`);
        return;
    }
    if (message.type === "get-grants") {
        await context.ensureMiniappHost().getGrants(message.appId, message.publisherPublicKey, message.declaredCapabilities);
        return;
    }
    if (message.type === "set-grants") {
        await context.ensureMiniappHost().setGrants(message.appId, message.publisherPublicKey, message.declaredCapabilities, message.grantedCapabilities);
        context.log(`Saved grants for ${message.appId}`);
        return;
    }
    if (message.type === "revoke-grant") {
        await context.ensureMiniappHost().revokeGrant(message.appId, message.publisherPublicKey, message.capability, message.declaredCapabilities);
        context.log(`Revoked ${message.capability} for ${message.appId}`);
        return;
    }
    if (message.type === "launch-miniapp") {
        const storage = await context.ensurePackageStorage();
        try {
            await context.ensureMiniappHost().launch(storage, message.appId);
            context.log(`Launched mini-app ${message.appId}`);
        }
        catch (error) {
            context.log(`Launch failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "stop-miniapp") {
        await context.ensureMiniappHost().stop();
        context.log("Stopped mini-app");
        return;
    }
    if (message.type === "suspend-miniapp") {
        await context.ensureMiniappHost().suspend();
        return;
    }
    if (message.type === "resume-miniapp") {
        await context.ensureMiniappHost().resume();
        return;
    }
    if (message.type === "miniapp-ui-event") {
        try {
            await context.ensureMiniappHost().handleUiEvent(message.nodeId, message.event, message.value);
        }
        catch (error) {
            context.log(`UI event failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "workspace-read") {
        try {
            const content = await context.ensureMiniappHost().readWorkspaceFile(message.documentId);
            context.send({ type: "workspace-file", token: message.token, documentId: message.documentId, content });
        }
        catch (error) {
            context.send({
                type: "workspace-file",
                token: message.token,
                documentId: message.documentId,
                error: error instanceof Error ? error.message : String(error)
            });
        }
        return;
    }
    if (message.type === "dev-side-load") {
        try {
            await context.ensureMiniappHost().devSideLoad(message.manifest, hexToBytes(message.bundleHex));
            context.log(`Dev side-loaded ${message.manifest.name ?? "mini-app"}`);
        }
        catch (error) {
            context.log(`Dev side-load failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    if (message.type === "dev-side-load-hello") {
        try {
            context.ensureMiniappHost().setDeveloperMode(true);
            await context.ensureMiniappHost().devSideLoad({
                name: "hello-web",
                version: "0.0.1",
                entry: "bundle.js",
                capabilities: [],
                publisherPublicKey: "dev"
            }, context.helloDevBundle);
            context.log("Dev side-loaded hello-web");
        }
        catch (error) {
            context.log(`Hello dev side-load failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        return;
    }
    context.log(`Web worker: unsupported message ${message.type}`);
}
