import { Pressable, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { type WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import {
  ActionButton,
  DEFAULT_PASSPHRASE,
  HostConfirmationModal,
  PeerChromeModal,
  Row,
  formatBytes,
  styles,
} from "./app-web-shared.js";
import type { useWebHarnessController } from "./app-web-controller.js";
export type WebHarnessScope = ReturnType<typeof useWebHarnessController>;

function WebHarnessTitle() {
  return (
    <>
      <Text style={styles.title}>TwistedPear Web Host</Text>
      <Text style={styles.subtitle}>
        Reticulum leaf peer in the browser (Phase W — leaf host)
      </Text>
    </>
  );
}

export function WebHarnessViewPart1({ scope }: { scope: WebHarnessScope }) {
  return (
    <>
      <WebHarnessViewPart1Block0 scope={scope} />
      <WebHarnessViewPart1Block1 scope={scope} />
      <WebHarnessViewPart1Block2 scope={scope} />
      <WebHarnessViewPart1Block3 scope={scope} />
      <WebHarnessViewPart1Block4 scope={scope} />
      <WebHarnessViewPart1Block5 scope={scope} />
      <WebHarnessViewPart1Block6 scope={scope} />
    </>
  );
}
function WebHarnessViewPart1Block0({ scope }: { scope: WebHarnessScope }) {
  const { hostModal, sendToWorker, setHostModal } = scope;
  return (
    <>
      <StatusBar style="auto" />
      {hostModal !== null ? (
        <HostConfirmationModal
          modal={hostModal}
          onClose={() => setHostModal(null)}
          onConfirmResponse={(approved) => {
            if (hostModal.kind !== "confirm") {
              return;
            }

            sendToWorker({
              type: "confirm-response",
              token: hostModal.request.token,
              approved,
            });
            setHostModal(null);
          }}
          onLaunchConfirm={(accept, grants) => {
            if (hostModal.kind !== "launch") {
              return;
            }

            sendToWorker({
              type: "launch-confirm",
              token: hostModal.review.token,
              accept,
              ...(grants === undefined ? {} : { grants }),
            });
            setHostModal(null);
          }}
          onInstallConfirm={(accept, grants) => {
            if (hostModal.kind !== "install") {
              return;
            }

            sendToWorker({
              type: "install-confirm",
              token: hostModal.review.token,
              accept,
              ...(grants === undefined ? {} : { grants }),
            });
            setHostModal(null);
          }}
          onGrantToggle={(capabilityId, granted) => {
            if (hostModal.kind !== "launch" && hostModal.kind !== "install") {
              return;
            }

            const next = granted
              ? [...hostModal.grants, capabilityId]
              : hostModal.grants.filter((entry) => entry !== capabilityId);
            setHostModal({ ...hostModal, grants: next });
          }}
        />
      ) : null}
    </>
  );
}
function WebHarnessViewPart1Block1({ scope }: { scope: WebHarnessScope }) {
  const { peerModal, performPeerAudio, sendToWorker, setPeerModal } = scope;
  return (
    <>
      {peerModal !== null ? (
        <PeerChromeModal
          modal={peerModal}
          onInput={(input) =>
            peerModal.kind === "exchange" &&
            setPeerModal({ ...peerModal, input })
          }
          onCancel={() => {
            sendToWorker({
              type: "peer-chrome-response",
              token: peerModal.request.token,
              accepted: false,
              approved: false,
            });
            setPeerModal(null);
          }}
          onContinue={() => {
            if (peerModal.kind === "confirm")
              sendToWorker({
                type: "peer-chrome-response",
                token: peerModal.request.token,
                approved: true,
              });
            else if (
              peerModal.request.type === "peer-audio-transmit" ||
              peerModal.request.type === "peer-audio-receive"
            )
              void performPeerAudio(peerModal.request);
            else
              sendToWorker({
                type: "peer-chrome-response",
                token: peerModal.request.token,
                accepted: true,
                ...(peerModal.input.trim()
                  ? { code: peerModal.input.trim() }
                  : {}),
              });
            setPeerModal(null);
          }}
        />
      ) : null}
    </>
  );
}
function WebHarnessViewPart1Block2({ scope }: { scope: WebHarnessScope }) {
  const { deviceState, sendToWorker, sessionInvites, status } = scope;
  return (
    <>
      {sessionInvites.some((invite) => invite.phase === "pending") ? (
        <View testID="session-invite-banner" style={styles.deviceActiveBanner}>
          <Text style={styles.deviceActiveBannerTitle}>
            Incoming call invitation
          </Text>
          {sessionInvites
            .filter((invite) => invite.phase === "pending")
            .map((invite) => (
              <View key={invite.id} style={styles.deviceActiveBannerRow}>
                <Text style={styles.deviceActiveBannerText}>
                  {invite.verifiedPeerLabel} wants to start{" "}
                  {invite.requestedClasses.join(" + ")} in {invite.appId}
                </Text>
                <Pressable
                  testID={`session-invite-accept-${invite.id}`}
                  style={styles.dangerButton}
                  onPress={() =>
                    sendToWorker({
                      type: "session-invite-accept",
                      id: invite.id,
                    })
                  }
                >
                  <Text style={styles.buttonLabel}>Accept</Text>
                </Pressable>
                <Pressable
                  testID={`session-invite-decline-${invite.id}`}
                  style={styles.dangerButton}
                  onPress={() =>
                    sendToWorker({
                      type: "session-invite-decline",
                      id: invite.id,
                    })
                  }
                >
                  <Text style={styles.buttonLabel}>Decline</Text>
                </Pressable>
              </View>
            ))}
        </View>
      ) : null}
      {deviceState !== null &&
      (deviceState.indicators.length > 0 ||
        deviceState.shareOffers.length > 0) ? (
        <View
          testID="device-active-banner"
          style={[
            styles.deviceActiveBanner,
            status.miniappRunning ? styles.deviceActiveBannerPinned : null,
          ]}
        >
          <Text style={styles.deviceActiveBannerTitle}>Active device use</Text>
          {deviceState.indicators.map((indicator) => (
            <View key={indicator.handle} style={styles.deviceActiveBannerRow}>
              <Text style={styles.deviceActiveBannerText}>
                {indicator.appId} · {indicator.class}:{indicator.tier} ·{" "}
                {indicator.destination} — {indicator.purpose}
              </Text>
              <Pressable
                style={styles.dangerButton}
                onPress={() =>
                  sendToWorker({
                    type: "device-kill-session",
                    handle: indicator.handle,
                  })
                }
              >
                <Text style={styles.buttonLabel}>Stop</Text>
              </Pressable>
            </View>
          ))}
          {deviceState.shareOffers.map((offer) => (
            <View key={offer.id} style={styles.deviceActiveBannerRow}>
              <Text style={styles.deviceActiveBannerText}>
                {offer.appId} · sharing {offer.classId}:{offer.tierId} with{" "}
                {offer.displayLabel}
              </Text>
              <Pressable
                testID="device-stop-sharing"
                style={styles.dangerButton}
                onPress={() =>
                  sendToWorker({
                    type: "device-revoke-share",
                    appId: offer.appId,
                    id: offer.id,
                  })
                }
              >
                <Text style={styles.buttonLabel}>Stop sharing</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
function WebHarnessViewPart1Block3({ scope }: { scope: WebHarnessScope }) {
  const {
    gatewayUrl,
    promptPwaInstall,
    pwaInstallAvailability,
    sendToWorker,
    status,
    storageQuota,
    webSerialAvailable,
    wsEnabled,
  } = scope;
  return (
    <>
      <WebHarnessTitle />
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Install app (PWA)</Text>
        <Text style={styles.muted}>
          Offline app-shell via service worker. Chromium can offer an install
          prompt after the shell is ready.
        </Text>
        <Text testID="pwa-install-status">
          Install status:{" "}
          {pwaInstallAvailability === "deferred"
            ? "ready"
            : pwaInstallAvailability === "installed"
              ? "installed / standalone"
              : "waiting for browser criteria"}
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="pwa-install"
            label="Install TwistedPear"
            onPress={() => {
              void promptPwaInstall();
            }}
            disabled={pwaInstallAvailability !== "deferred"}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text>Core worker: {status.running ? "running" : "stopped"}</Text>
        <Text>Gateway link: {status.linkOnline ? "online" : "offline"}</Text>
        <Text>Crypto: {status.cryptoProvider}</Text>
        <Text>Announces seen: {status.announcesSeen}</Text>
        <Text>Online interfaces: {status.onlineInterfaces}</Text>
        <Text>Identity: {status.identityHash ?? "none"}</Text>
        <Text>Persisted: {status.identityPersisted ? "yes" : "no"}</Text>
        <Text>Gateway: {status.gatewayUrl ?? gatewayUrl}</Text>
        <Text>Installed packages: {status.installedPackages}</Text>
        <Text>Package storage: {formatBytes(status.storageUsedBytes)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Browser storage (W-S4)</Text>
        <Text style={styles.muted}>
          Package archives in OPFS (IndexedDB fallback) · CAS blobs in IndexedDB
          · quota from <Text style={styles.mono}>navigator.storage</Text>.
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton
            label="Refresh quota"
            onPress={() => sendToWorker({ type: "refresh-storage" })}
          />
        </View>
        {storageQuota === null ? (
          <Text style={styles.muted}>Quota not loaded yet.</Text>
        ) : (
          <>
            <Text>Archive backend: {storageQuota.archiveBackend}</Text>
            <Text>Persisted: {storageQuota.persisted ? "yes" : "no"}</Text>
            <Text>
              Package quota: {formatBytes(storageQuota.packageUsedBytes)} /{" "}
              {formatBytes(storageQuota.packageQuotaBytes)}
            </Text>
            <Text>
              Browser estimate: {formatBytes(storageQuota.usageBytes)} /{" "}
              {formatBytes(storageQuota.quotaBytes)}
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Relay &amp; Interfaces</Text>
        <Text style={styles.muted}>
          Browser hosts are leaf peers and never forward other peers&apos;
          traffic. Configure relaying on the gateway node.
        </Text>
        {(
          [
            "tcp",
            "websocket",
            "auto",
            "i2p",
            "rnode",
            "bluetooth",
            "optical",
            "acoustic",
            "ntfy",
            "freenet",
          ] as const
        ).map((kind) => (
          <Text key={`web-relay-${kind}`} style={styles.muted}>
            {kind}:{" "}
            {kind === "websocket"
              ? wsEnabled
                ? status.linkOnline
                  ? "leaf link online"
                  : "leaf link offline"
                : "disabled"
              : kind === "rnode"
                ? webSerialAvailable
                  ? "leaf-only"
                  : "unsupported"
                : "unsupported for relay"}
          </Text>
        ))}
      </View>
    </>
  );
}
function WebHarnessViewPart1Block4({ scope }: { scope: WebHarnessScope }) {
  const {
    connectWebSerialRnode,
    gatewayUrl,
    ntfyToken,
    ntfyUrl,
    pushGatewayConfig,
    rnodeEnabled,
    setGatewayUrl,
    setNtfyToken,
    setNtfyUrl,
    setRnodeEnabled,
    setSharedToken,
    setWsEnabled,
    sharedToken,
    status,
    webSerialAvailable,
    wsEnabled,
  } = scope;
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Gateway</Text>
        <Text style={styles.muted}>
          Connect through a node with `--ws-listen` (same origin when using
          `--serve-web`).
        </Text>
        <TextInput
          style={styles.input}
          value={gatewayUrl}
          onChangeText={setGatewayUrl}
          autoCapitalize="none"
          placeholder="ws://127.0.0.1:9480"
        />
        <TextInput
          style={styles.input}
          value={sharedToken}
          onChangeText={setSharedToken}
          autoCapitalize="none"
          placeholder="Shared token (optional)"
        />
        <View style={styles.buttonRow}>
          <ActionButton label="Apply gateway" onPress={pushGatewayConfig} />
        </View>
        <Row
          testID="ws-gateway-switch"
          label="WS gateway"
          value={wsEnabled}
          onChange={setWsEnabled}
        />
        <Text style={styles.sectionTitle}>Optional ntfy rendezvous</Text>
        <Text style={styles.muted}>
          Invitation payloads are end-to-end encrypted. The configured server
          still observes random topics, timing, and IP metadata.
        </Text>
        <TextInput
          style={styles.input}
          value={ntfyUrl}
          onChangeText={setNtfyUrl}
          autoCapitalize="none"
          placeholder="https://ntfy.example/"
        />
        <TextInput
          style={styles.input}
          value={ntfyToken}
          onChangeText={setNtfyToken}
          autoCapitalize="none"
          secureTextEntry
          placeholder="Bearer token (optional)"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>RNode (WebSerial)</Text>
        <Text style={styles.muted}>
          Chromium-only stretch path: connect a USB RNode via the Web Serial API
          (no gateway required for the radio).
        </Text>
        <Text>
          RNode:{" "}
          {status.rnodeConnected
            ? `connected (${status.rnodeDeviceName ?? "webserial"})`
            : status.rnodeEnabled
              ? "waiting for serial"
              : "offline"}
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="webserial-connect"
            label="Connect Web Serial"
            onPress={() => {
              void connectWebSerialRnode();
            }}
            disabled={!webSerialAvailable}
          />
        </View>
        <Row
          testID="rnode-switch"
          label="RNode interface"
          value={rnodeEnabled}
          onChange={setRnodeEnabled}
          disabled={!webSerialAvailable}
        />
        {!webSerialAvailable ? (
          <Text style={styles.muted}>
            Web Serial API is unavailable in this browser.
          </Text>
        ) : null}
      </View>
    </>
  );
}
function WebHarnessViewPart1Block5({ scope }: { scope: WebHarnessScope }) {
  const { appendLog, deviceState, sendToWorker } = scope;
  return (
    <>
      <View style={styles.card}>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="create-identity"
            label="Create identity"
            onPress={() => sendToWorker({ type: "create-identity" })}
          />
          <ActionButton
            label="Reset identity"
            onPress={() => sendToWorker({ type: "reset-identity" })}
          />
        </View>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="seed-share-offer"
            label="Seed share offer"
            onPress={() => {
              sendToWorker({
                type: "device-test-seed-share",
                appId: "line-check",
                displayLabel: "Ana",
                classId: "microphone",
                ttlMs: 15 * 60_000,
              });
              appendLog("Seeded share offer for chrome probe");
            }}
          />
          <ActionButton
            testID="seed-share-offer-short"
            label="Seed short share"
            onPress={() => {
              sendToWorker({
                type: "device-test-seed-share",
                appId: "line-check",
                displayLabel: "Ana",
                classId: "microphone",
                ttlMs: 3_000,
              });
              appendLog("Seeded short-TTL share offer");
            }}
          />
        </View>
        <Text style={styles.muted}>
          Identity keys are encrypted in IndexedDB under passphrase `
          {DEFAULT_PASSPHRASE}` (dev harness only).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Hardware access</Text>
        <Row
          testID="device-remote-enabled"
          label="Allow remote device acquisition"
          value={deviceState?.remoteAcquisitionEnabled === true}
          onChange={(enabled) =>
            sendToWorker({ type: "device-set-remote", enabled })
          }
        />
        {deviceState === null || deviceState.inventory.length === 0 ? (
          <Text style={styles.muted}>No device classes reported yet.</Text>
        ) : (
          deviceState.inventory.map((entry) => {
            const disabled = new Set(deviceState.disabledClasses);
            return (
              <View key={entry.class} style={styles.deviceRow}>
                <Text style={styles.deviceLabel}>{entry.class}</Text>
                <Text style={styles.deviceMeta}>{entry.availability}</Text>
                <Row
                  label="Allowed"
                  value={!disabled.has(entry.class)}
                  onChange={(allowed) =>
                    sendToWorker({
                      type: "device-set-class-disabled",
                      classId: entry.class,
                      disabled: !allowed,
                    })
                  }
                />
              </View>
            );
          })
        )}
        <Text style={styles.sectionTitle}>Live sessions</Text>
        {deviceState === null || deviceState.sessions.length === 0 ? (
          <Text style={styles.muted}>No live device sessions.</Text>
        ) : (
          deviceState.sessions.map((session) => (
            <View key={session.handle} style={styles.deviceRow}>
              <Text style={styles.deviceLabel}>
                {session.classId}:{session.tierId}
              </Text>
              <Text style={styles.deviceMeta}>
                {session.appId} · {session.destination}
              </Text>
              <Pressable
                style={styles.dangerButton}
                onPress={() =>
                  sendToWorker({
                    type: "device-kill-session",
                    handle: session.handle,
                  })
                }
              >
                <Text style={styles.buttonLabel}>Kill</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
    </>
  );
}
function WebHarnessViewPart1Block6({ scope }: { scope: WebHarnessScope }) {
  const {
    developerMode,
    deviceState,
    miniappRuntime,
    readWorkspaceDocument,
    sendToWorker,
    setDeveloperMode,
  } = scope;
  return (
    <>
      <View style={styles.card}>
        <ActionButton
          label="Refresh devices"
          onPress={() => sendToWorker({ type: "device-list" })}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mini-app runtime (W2)</Text>
        <Text style={styles.muted}>
          Sandbox runs in an opaque-origin iframe on the main thread; broker and
          lifecycle stay in the core worker.
        </Text>
        <Row
          testID="developer-mode-switch"
          label="Developer mode"
          value={developerMode}
          onChange={setDeveloperMode}
        />
        <View style={styles.buttonRow}>
          <ActionButton
            testID="dev-side-load-hello"
            label="Dev: load hello"
            onPress={() => sendToWorker({ type: "dev-side-load-hello" })}
          />
          <ActionButton
            label="Stop mini-app"
            onPress={() => sendToWorker({ type: "stop-miniapp" })}
          />
        </View>
        <Text>
          Runtime: {miniappRuntime?.state ?? "stopped"}
          {miniappRuntime?.appId
            ? ` · ${miniappRuntime.appId}@${miniappRuntime.version ?? "?"}`
            : ""}
        </Text>
        {miniappRuntime?.widgetTree ? (
          <View testID="miniapp-live-tree">
            <MiniappWidgetTree
              tree={miniappRuntime.widgetTree as WidgetTree}
              readDocument={readWorkspaceDocument}
              deviceSessions={deviceState?.sessions ?? []}
              onEvent={(nodeId, event, value) => {
                sendToWorker({
                  type: "miniapp-ui-event",
                  nodeId,
                  event,
                  ...(value === undefined ? {} : { value }),
                });
              }}
            />
          </View>
        ) : (
          <Text style={styles.muted}>No live mini-app widget tree yet.</Text>
        )}
      </View>
    </>
  );
}
