/**
 * Desktop host message handlers for the mini-app host: launches, grants,
 * limits, developer side-loading, and renderer replies.
 */
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";

export function createMiniappMessageHandlers(deps) {
  const {
    runtime,
    send,
    log,
    hostReplyChannel,
    webRtcRouteListeners,
    webRtcRoutePending,
    refuseStoreAction,
    shouldRefuseDeveloperMode,
  } = deps;
  const ensureMiniappHost = (...args) => deps.ensureMiniappHost(...args);
  const ensureCatalog = (...args) => deps.ensureCatalog(...args);
  const ensureDevChannel = (...args) => deps.ensureDevChannel(...args);

  const handleSetDeveloperMode = async (message) => {
    if (shouldRefuseDeveloperMode(message.enabled)) {
      log("Developer mode refused in store posture variant");
      ensureMiniappHost().setDeveloperMode(false);
      return;
    }

    ensureMiniappHost().setDeveloperMode(message.enabled);
    log(`Developer mode ${message.enabled ? "enabled" : "disabled"}`);
    return;
  };

  const handleGetGrants = async (message) => {
    await ensureMiniappHost().getGrants(
      message.appId,
      message.publisherPublicKey,
      message.declaredCapabilities,
    );
    return;
  };

  const handleSetGrants = async (message) => {
    await ensureMiniappHost().setGrants(
      message.appId,
      message.publisherPublicKey,
      message.declaredCapabilities,
      message.grantedCapabilities,
    );
    log(`Saved grants for ${message.appId}`);
    return;
  };

  const handleRevokeGrant = async (message) => {
    await ensureMiniappHost().revokeGrant(
      message.appId,
      message.publisherPublicKey,
      message.capability,
      message.declaredCapabilities,
    );
    log(`Revoked ${message.capability} for ${message.appId}`);
    return;
  };

  const handleLaunchMiniapp = async (message) => {
    const { installedStore: installed } = ensureCatalog();
    try {
      await ensureMiniappHost().launch(installed, runtime, message.appId);
      log(`Launched mini-app ${message.appId}`);
    } catch (error) {
      log(
        `Launch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleStopMiniapp = async (message) => {
    await ensureMiniappHost().stop(message.reason ?? "stopped");
    log(`Stopped mini-app${message.reason ? ` (${message.reason})` : ""}`);
    return;
  };

  const handleConfirmResponse = async (message) => {
    if (!hostReplyChannel.resolveReply(message)) {
      log(
        `Orphan host reply ${message.type} token=${typeof message.token === "string" ? message.token.slice(0, 12) : "?"}`,
      );
    }
    return;
  };

  const handlePeerWebrtcData = async (message) => {
    const listeners = webRtcRouteListeners.get(message.sessionId);
    const payload = hexToBytes(message.dataHex);
    if (listeners === undefined || listeners.size === 0) {
      const pending = webRtcRoutePending.get(message.sessionId) ?? [];
      pending.push(payload);
      if (pending.length > 16) pending.shift();
      webRtcRoutePending.set(message.sessionId, pending);
    } else {
      for (const listener of listeners) listener(payload);
    }
    return;
  };

  const handleStopPreviewMiniapp = async (message) => {
    await ensureMiniappHost().stopPreview();
    return;
  };

  const handleSetLimits = async (message) => {
    try {
      ensureMiniappHost().setLimits(message.appId, message.limits);
      log(`Updated resource limits for ${message.appId}`);
    } catch (error) {
      log(
        `Set limits failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleGetLimits = async (message) => {
    ensureMiniappHost().getLimits(message.appId);
    return;
  };

  const handleWorkspaceRead = async (message) => {
    try {
      const content = await ensureMiniappHost().readWorkspaceFile(
        message.documentId,
      );
      send({
        type: "workspace-file",
        token: message.token,
        documentId: message.documentId,
        content,
      });
    } catch (error) {
      send({
        type: "workspace-file",
        token: message.token,
        documentId: message.documentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  };

  const handleSetAiConfig = async (message) => {
    ensureMiniappHost().setAiConfig(message.config ?? null);
    log("AI configuration updated");
    return;
  };

  const handleSuspendMiniapp = async (message) => {
    await ensureMiniappHost().suspend();
    return;
  };

  const handleResumeMiniapp = async (message) => {
    await ensureMiniappHost().resume();
    return;
  };

  const handleMiniappUiEvent = async (message) => {
    try {
      if (message.slot === "preview") {
        await ensureMiniappHost().handlePreviewUiEvent(
          message.nodeId,
          message.event,
          message.value,
        );
      } else {
        await ensureMiniappHost().handleUiEvent(
          message.nodeId,
          message.event,
          message.value,
        );
      }
    } catch (error) {
      log(
        `UI event failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleDevSideLoad = async (message) => {
    if (refuseStoreAction("Dev side-load")) {
      return;
    }

    try {
      await ensureMiniappHost().devSideLoad(
        message.manifest,
        hexToBytes(message.bundleHex),
      );
      log(`Dev side-loaded ${message.manifest.name ?? "mini-app"}`);
    } catch (error) {
      log(
        `Dev side-load failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleConnectDevChannel = async (message) => {
    if (refuseStoreAction("Dev channel")) {
      return;
    }

    try {
      await ensureDevChannel().connect(message.host, message.port);
    } catch (error) {
      send({
        type: "dev-channel",
        state: "error",
        detail: error instanceof Error ? error.message : String(error),
      });
      log(
        `Dev channel connect failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleDisconnectDevChannel = async (message) => {
    await ensureDevChannel().disconnect();
    return;
  };

  return {
    handlers: {
      "set-developer-mode": handleSetDeveloperMode,
      "get-grants": handleGetGrants,
      "set-grants": handleSetGrants,
      "revoke-grant": handleRevokeGrant,
      "launch-miniapp": handleLaunchMiniapp,
      "stop-miniapp": handleStopMiniapp,
      "confirm-response": handleConfirmResponse,
      "launch-confirm": handleConfirmResponse,
      "install-confirm": handleConfirmResponse,
      "peer-chrome-response": handleConfirmResponse,
      "device-bridge-response": handleConfirmResponse,
      "media-codec-response": handleConfirmResponse,
      "media-opus-play-response": handleConfirmResponse,
      "peer-webrtc-data": handlePeerWebrtcData,
      "stop-preview-miniapp": handleStopPreviewMiniapp,
      "set-limits": handleSetLimits,
      "get-limits": handleGetLimits,
      "workspace-read": handleWorkspaceRead,
      "set-ai-config": handleSetAiConfig,
      "suspend-miniapp": handleSuspendMiniapp,
      "resume-miniapp": handleResumeMiniapp,
      "miniapp-ui-event": handleMiniappUiEvent,
      "dev-side-load": handleDevSideLoad,
      "connect-dev-channel": handleConnectDevChannel,
      "disconnect-dev-channel": handleDisconnectDevChannel,
    },
  };
}
