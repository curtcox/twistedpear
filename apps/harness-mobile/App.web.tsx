import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { validateWidgetTree, type WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import { createWebCoreBridge } from "./host/web-core-bridge";
import {
  createPwaInstallController,
  type PwaInstallAvailability
} from "./host/web-pwa-install";
import { webSerialSupported } from "./host/web-serial-relay";
import type {
  AnnounceEntry,
  CapabilityGrantView,
  ConfirmationKind,
  HostConfirmationRequestView,
  HostToWorkletMessage,
  Install256tResultView,
  InstallProgress,
  InstallReviewRequestView,
  InstalledPackageView,
  LaunchReviewCapabilityView,
  LaunchReviewRequestView,
  MiniappRuntimeView,
  TrustedPublisherView,
  WebStorageQuotaView,
  WorkletStatus,
  WorkletToHostMessage
} from "./worklet/protocol";

const DEFAULT_PASSPHRASE = "harness-web-dev";
const MAX_ANNOUNCES = 50;

const helloWidgetTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      { id: "title", type: "text", props: { value: "Hello" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "go", type: "button", props: { label: "Tap me", event: "hello.tap" } }
    ]
  }
});

const chatWidgetTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Chat" }, style: { fontSize: 20, fontWeight: "bold" } },
      {
        id: "peer-input",
        type: "text-input",
        props: { value: "", placeholder: "Peer app id", event: "chat.peer" }
      },
      { id: "send", type: "button", props: { label: "Send hello", event: "chat.send" } },
      {
        id: "inbox-scroll",
        type: "scroll",
        children: [{ id: "inbox", type: "text", props: { value: "No messages yet" } }]
      }
    ]
  }
});

const initialStatus: WorkletStatus = {
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
  gatewayUrl: null
};

function defaultGatewayUrl(): string {
  const location = (globalThis as { location?: { protocol: string; host: string } }).location;
  if (location === undefined) {
    return "ws://127.0.0.1:9480";
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}`;
}

export default function App() {
  const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [announces, setAnnounces] = useState<ReadonlyArray<AnnounceEntry>>([]);
  const [logLines, setLogLines] = useState<ReadonlyArray<string>>([
    "Web leaf host ready. Configure the gateway URL, create an identity, then enable the WS gateway."
  ]);
  const [gatewayUrl, setGatewayUrl] = useState(defaultGatewayUrl());
  const [sharedToken, setSharedToken] = useState("");
  const [wsEnabled, setWsEnabled] = useState(false);
  const [rnodeEnabled, setRnodeEnabled] = useState(false);
  const [webSerialAvailable] = useState(() => webSerialSupported());
  const [previewTree, setPreviewTree] = useState<WidgetTree>(helloWidgetTree);
  const [lastWidgetEvent, setLastWidgetEvent] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<WebStorageQuotaView | null>(null);
  const [installed, setInstalled] = useState<ReadonlyArray<InstalledPackageView>>([]);
  const [selectedInstalledAppId, setSelectedInstalledAppId] = useState<string | null>(null);
  const [grantCapabilities, setGrantCapabilities] = useState<ReadonlyArray<CapabilityGrantView>>([]);
  const [miniappRuntime, setMiniappRuntime] = useState<MiniappRuntimeView | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const [hostModal, setHostModal] = useState<
    | { readonly kind: "confirm"; readonly request: HostConfirmationRequestView }
    | {
        readonly kind: "launch";
        readonly review: LaunchReviewRequestView;
        readonly grants: ReadonlyArray<string>;
      }
    | {
        readonly kind: "install";
        readonly review: InstallReviewRequestView;
        readonly grants: ReadonlyArray<string>;
      }
    | null
  >(null);
  const [install256tInput, setInstall256tInput] = useState("");
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [trustedPublishers, setTrustedPublishers] = useState<ReadonlyArray<TrustedPublisherView>>([]);
  const [trustIdentityInput, setTrustIdentityInput] = useState("");
  const [trustLabelInput, setTrustLabelInput] = useState("");
  const [hostIdentity256t, setHostIdentity256t] = useState<string | null>(null);
  const [pwaInstallAvailability, setPwaInstallAvailability] = useState<PwaInstallAvailability>("unavailable");
  const pwaInstallRef = useRef<ReturnType<typeof createPwaInstallController> | null>(null);

  const previewOptions = useMemo(
    () =>
      [
        { id: "hello", label: "Hello", tree: helloWidgetTree },
        { id: "chat", label: "Chat panel", tree: chatWidgetTree }
      ] as const,
    []
  );

  const bridgeRef = useRef<ReturnType<typeof createWebCoreBridge> | null>(null);

  const appendLog = useCallback((line: string) => {
    setLogLines((current) => [...current.slice(-200), line]);
  }, []);

  const sendToWorker = useCallback((message: HostToWorkletMessage) => {
    bridgeRef.current?.send(message);
  }, []);

  const handleWorkerMessage = useCallback(
    (message: WorkletToHostMessage) => {
      if (message.type === "status") {
        setStatus(message.status);
        return;
      }

      if (message.type === "log") {
        appendLog(message.line);
        return;
      }

      if (message.type === "announce") {
        setAnnounces((current) => [message.entry, ...current].slice(0, MAX_ANNOUNCES));
        return;
      }

      if (message.type === "storage-quota") {
        setStorageQuota(message.quota);
        return;
      }

      if (message.type === "installed") {
        setInstalled(message.packages);
        return;
      }

      if (message.type === "grants") {
        setGrantCapabilities(message.capabilities);
        return;
      }

      if (message.type === "miniapp-runtime") {
        setMiniappRuntime(message.runtime);
        return;
      }

      if (message.type === "miniapp-log") {
        appendLog(`[miniapp] ${message.line}`);
        return;
      }

      if (message.type === "confirm-request") {
        setHostModal({
          kind: "confirm",
          request: {
            token: message.token,
            kind: message.kind,
            appId: message.appId,
            publisherPublicKey: message.publisherPublicKey,
            summary: message.summary
          }
        });
        return;
      }

      if (message.type === "launch-review") {
        setHostModal({
          kind: "launch",
          review: {
            token: message.token,
            appId: message.appId,
            publisherPublicKey: message.publisherPublicKey,
            version: message.version,
            capabilities: message.capabilities
          },
          grants: message.capabilities.filter((capability) => capability.granted).map((capability) => capability.id)
        });
        return;
      }

      if (message.type === "install-review") {
        setHostModal({
          kind: "install",
          review: {
            token: message.token,
            appId: message.appId,
            version: message.version,
            publisherPublicKey: message.publisherPublicKey,
            trusted: message.trusted,
            trustedLabel: message.trustedLabel,
            capabilities: message.capabilities
          },
          grants: []
        });
        return;
      }

      if (message.type === "install-progress") {
        setInstallProgress(message.progress);
        return;
      }

      if (message.type === "install-256t-result") {
        const result = message as Install256tResultView;
        if (result.ok) {
          appendLog(`Installed ${result.appId} v${result.version} (trusted: ${result.trusted ? "yes" : "no"})`);
        } else {
          appendLog(`256t install failed: ${result.error ?? "unknown error"}`);
        }
        return;
      }

      if (message.type === "trust") {
        setTrustedPublishers(message.entries);
        return;
      }

      if (message.type === "trust-identity") {
        setHostIdentity256t(message.identity256t);
        return;
      }
    },
    [appendLog]
  );

  const ensureBridge = useCallback(() => {
    if (bridgeRef.current !== null) {
      return bridgeRef.current;
    }

    const bridge = createWebCoreBridge();
    bridge.setMessageHandler(handleWorkerMessage);
    bridge.worklet.start("/web-core.worker.js");
    bridgeRef.current = bridge;
    return bridge;
  }, [handleWorkerMessage]);

  const pushGatewayConfig = useCallback(() => {
    ensureBridge();
    sendToWorker({
      type: "start",
      targetHost: "127.0.0.1",
      targetPort: 9480,
      gatewayUrl,
      identityPassphrase: DEFAULT_PASSPHRASE,
      ...(sharedToken.trim().length === 0 ? {} : { sharedToken: sharedToken.trim() })
    });
  }, [ensureBridge, gatewayUrl, sendToWorker, sharedToken]);

  useEffect(() => {
    ensureBridge();
    pushGatewayConfig();
  }, [ensureBridge, pushGatewayConfig]);

  useEffect(() => {
    ensureBridge();
    sendToWorker({ type: "refresh-storage" });
    sendToWorker({ type: "list-installed" });
    sendToWorker({ type: "trust-list" });
  }, [ensureBridge, sendToWorker]);

  useEffect(() => {
    ensureBridge();
    sendToWorker({ type: "set-developer-mode", enabled: developerMode });
  }, [developerMode, ensureBridge, sendToWorker]);

  useEffect(() => {
    ensureBridge();
    sendToWorker({
      type: "set-interfaces",
      tcp: wsEnabled,
      auto: false,
      ble: false,
      rnode: rnodeEnabled
    });
  }, [ensureBridge, sendToWorker, wsEnabled, rnodeEnabled]);

  const connectWebSerialRnode = useCallback(async () => {
    try {
      const bridge = ensureBridge();
      await bridge.requestWebSerialPort();
      setRnodeEnabled(true);
      appendLog("Web Serial port opened; enable RNode to bring the interface online.");
    } catch (error) {
      appendLog(`Web Serial connect failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [appendLog, ensureBridge]);

  useEffect(
    () => () => {
      bridgeRef.current?.stop();
      bridgeRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const controller = createPwaInstallController();
    pwaInstallRef.current = controller;
    const unsubscribe = controller.subscribe(setPwaInstallAvailability);
    return () => {
      unsubscribe();
      controller.dispose();
      pwaInstallRef.current = null;
    };
  }, []);

  const promptPwaInstall = useCallback(async () => {
    const outcome = await pwaInstallRef.current?.promptInstall();
    if (outcome === null || outcome === undefined) {
      appendLog("Install prompt unavailable in this browser session.");
      return;
    }

    appendLog(outcome === "accepted" ? "PWA install accepted." : "PWA install dismissed.");
  }, [appendLog]);

  return (
    <View style={styles.container}>
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
              approved
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
              ...(grants === undefined ? {} : { grants })
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
              ...(grants === undefined ? {} : { grants })
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
      <Text style={styles.title}>TwistedPear Web Host</Text>
      <Text style={styles.subtitle}>Reticulum leaf peer in the browser (Phase W — leaf host)</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Install app (PWA)</Text>
        <Text style={styles.muted}>
          Offline app-shell via service worker. Chromium can offer an install prompt after the shell is ready.
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
          Package archives in OPFS (IndexedDB fallback) · CAS blobs in IndexedDB · quota from{" "}
          <Text style={styles.mono}>navigator.storage</Text>.
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Refresh quota" onPress={() => sendToWorker({ type: "refresh-storage" })} />
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
              Browser estimate: {formatBytes(storageQuota.usageBytes)} / {formatBytes(storageQuota.quotaBytes)}
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Gateway</Text>
        <Text style={styles.muted}>Connect through a node with `--ws-listen` (same origin when using `--serve-web`).</Text>
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
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>RNode (WebSerial)</Text>
        <Text style={styles.muted}>
          Chromium-only stretch path: connect a USB RNode via the Web Serial API (no gateway required for the radio).
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
          <Text style={styles.muted}>Web Serial API is unavailable in this browser.</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="create-identity"
            label="Create identity"
            onPress={() => sendToWorker({ type: "create-identity" })}
          />
          <ActionButton label="Reset identity" onPress={() => sendToWorker({ type: "reset-identity" })} />
        </View>
        <Text style={styles.muted}>
          Identity keys are encrypted in IndexedDB under passphrase `{DEFAULT_PASSPHRASE}` (dev harness only).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mini-app runtime (W2)</Text>
        <Text style={styles.muted}>
          Sandbox runs in an opaque-origin iframe on the main thread; broker and lifecycle stay in the core worker.
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
          {miniappRuntime?.appId ? ` · ${miniappRuntime.appId}@${miniappRuntime.version ?? "?"}` : ""}
        </Text>
        {miniappRuntime?.widgetTree ? (
          <View testID="miniapp-live-tree">
            <MiniappWidgetTree
              tree={miniappRuntime.widgetTree as WidgetTree}
              onEvent={(nodeId, event, value) => {
                sendToWorker({
                  type: "miniapp-ui-event",
                  nodeId,
                  event,
                  ...(value === undefined ? {} : { value })
                });
              }}
            />
          </View>
        ) : (
          <Text style={styles.muted}>No live mini-app widget tree yet.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Install from 256t (W3)</Text>
        <Text style={styles.muted}>
          Paste or scan a 94-character package id. The host waits for a CAS locator announce, fetches over Reticulum
          Resource, then shows capability review before installing into OPFS/IndexedDB.
        </Text>
        <TextInput
          testID="install-256t-input"
          style={styles.input}
          value={install256tInput}
          onChangeText={setInstall256tInput}
          autoCapitalize="none"
          placeholder="94-character 256t id"
        />
        <View style={styles.buttonRow}>
          <ActionButton
            testID="install-256t"
            label="Install from 256t"
            onPress={() => {
              const trimmed = install256tInput.trim();
              if (trimmed.length === 0) {
                return;
              }

              setInstallProgress(null);
              sendToWorker({ type: "install-from-256t", t256: trimmed });
            }}
          />
        </View>
        {installProgress !== null ? (
          <Text testID="install-progress" style={styles.muted}>
            Install {installProgress.appId}: {installProgress.phase}
            {installProgress.totalBytes > 0
              ? ` · ${formatBytes(installProgress.bytesReceived)} / ${formatBytes(installProgress.totalBytes)}`
              : ""}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Publisher trust (W3)</Text>
        <Text style={styles.muted}>
          Import a publisher identity string (94-character inline 256t) to mark installs from that key as trusted in the
          review UI.
        </Text>
        <TextInput
          testID="trust-identity-input"
          style={styles.input}
          value={trustIdentityInput}
          onChangeText={setTrustIdentityInput}
          autoCapitalize="none"
          placeholder="Publisher identity 256t"
        />
        <TextInput
          testID="trust-label-input"
          style={styles.input}
          value={trustLabelInput}
          onChangeText={setTrustLabelInput}
          placeholder="Label (e.g. Alice)"
        />
        <View style={styles.buttonRow}>
          <ActionButton
            testID="trust-add"
            label="Trust publisher"
            onPress={() => {
              const identityString = trustIdentityInput.trim();
              if (identityString.length === 0) {
                return;
              }

              sendToWorker({
                type: "trust-add",
                identityString,
                label: trustLabelInput.trim() || "Unnamed publisher",
                source: "paste"
              });
              setTrustIdentityInput("");
            }}
          />
          <ActionButton
            testID="trust-show"
            label="Show my identity"
            onPress={() => sendToWorker({ type: "trust-show" })}
          />
          <ActionButton label="Refresh trust" onPress={() => sendToWorker({ type: "trust-list" })} />
        </View>
        {hostIdentity256t !== null ? (
          <Text testID="trust-identity-view" style={styles.mono}>
            Host identity: {hostIdentity256t}
          </Text>
        ) : null}
        {trustedPublishers.length === 0 ? (
          <Text style={styles.muted}>No trusted publishers yet.</Text>
        ) : (
          trustedPublishers.map((entry) => (
            <View key={entry.publisherPublicKey} style={styles.packageRow}>
              <Text style={styles.packageTitle}>
                {entry.label} · {entry.publisherPublicKey.slice(0, 16)}…
              </Text>
              <ActionButton
                label="Remove"
                onPress={() => sendToWorker({ type: "trust-remove", publisherPublicKey: entry.publisherPublicKey })}
              />
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Installed packages</Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Refresh" onPress={() => sendToWorker({ type: "list-installed" })} />
        </View>
        {installed.length === 0 ? (
          <Text style={styles.muted}>No packages installed yet.</Text>
        ) : (
          installed.map((pkg) => (
            <View key={`${pkg.appId}-${pkg.version}`} style={styles.packageRow}>
              <Pressable
                testID={`installed-${pkg.appId}`}
                onPress={() => {
                  setSelectedInstalledAppId(pkg.appId);
                  sendToWorker({
                    type: "get-grants",
                    appId: pkg.appId,
                    publisherPublicKey: pkg.publisherPublicKey ?? "",
                    declaredCapabilities: pkg.capabilities ?? []
                  });
                }}
              >
                <Text style={styles.packageTitle}>
                  {pkg.appId}@{pkg.version}
                </Text>
              </Pressable>
              <ActionButton
                label="Launch"
                onPress={() => sendToWorker({ type: "launch-miniapp", appId: pkg.appId })}
              />
            </View>
          ))
        )}
        {selectedInstalledAppId !== null && grantCapabilities.length > 0 ? (
          <>
            <Text style={styles.muted}>Grants for {selectedInstalledAppId}</Text>
            {grantCapabilities
              .filter((capability) => capability.declared)
              .map((capability) => (
                <Row
                  key={capability.id}
                  testID={`grant-${capability.id}`}
                  label={capability.id}
                  value={capability.granted}
                  onChange={(granted) => {
                    const selected = installed.find((pkg) => pkg.appId === selectedInstalledAppId);
                    if (selected === undefined) {
                      return;
                    }

                    const nextGranted = grantCapabilities
                      .filter((entry) => entry.declared && (entry.id === capability.id ? granted : entry.granted))
                      .map((entry) => entry.id);
                    sendToWorker({
                      type: "set-grants",
                      appId: selected.appId,
                      publisherPublicKey: selected.publisherPublicKey ?? "",
                      declaredCapabilities: selected.capabilities ?? [],
                      grantedCapabilities: nextGranted
                    });
                  }}
                />
              ))}
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Widget preview (W-S3)</Text>
        <Text style={styles.muted}>
          Shared `@twistedpear/widget-renderer-rn` via react-native-web — same renderer as mobile harness.
        </Text>
        <View style={styles.buttonRow}>
          {previewOptions.map((option) => (
            <ActionButton
              key={option.id}
              testID={`widget-preview-${option.id}`}
              label={option.label}
              onPress={() => setPreviewTree(option.tree)}
            />
          ))}
        </View>
        <MiniappWidgetTree
          tree={previewTree}
          onEvent={(nodeId, event, value) => {
            const detail =
              value === undefined ? `${nodeId}:${event}` : `${nodeId}:${event}:${JSON.stringify(value)}`;
            setLastWidgetEvent(detail);
          }}
        />
        <Text testID="widget-last-event" style={styles.muted}>
          Last event: {lastWidgetEvent ?? "none"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Unavailable on web</Text>
        <Text style={styles.muted}>AutoInterface / multicast / Bonjour — not available in browser tabs.</Text>
        <Text style={styles.muted}>BLE — requires native host bridges.</Text>
        <Text style={styles.muted}>
          USB RNode on web uses Web Serial (Chromium); native Android/iOS USB paths stay on mobile harness.
        </Text>
        <Text style={styles.muted}>
          Hyperdrive install uses gateway `/bulk-fetch` (Hyperswarm on the node); DHT relay remains experimental
          fallback. Resource + 256t install always supported.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Announce browser</Text>
        {announces.length === 0 ? (
          <Text style={styles.muted}>No announces received yet.</Text>
        ) : (
          announces.slice(0, 8).map((entry) => (
            <Text key={`${entry.destinationHash}-${entry.receivedAt}`} style={styles.announceLine}>
              {entry.destinationHash.slice(0, 16)}… · {entry.hops} hop{entry.hops === 1 ? "" : "s"}
            </Text>
          ))
        )}
      </View>

      <ScrollView style={styles.log}>
        {logLines.map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

function formatBytes(value: number | null): string {
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

function Row({
  label,
  value,
  onChange,
  testID,
  disabled = false
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
      <Switch testID={testID} value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  testID,
  disabled = false
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly testID?: string;
  readonly disabled?: boolean;
}) {
  return (
    <Pressable testID={testID} style={[styles.button, disabled ? styles.buttonDisabled : null]} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const CONFIRM_KIND_TITLES: Readonly<Record<ConfirmationKind, string>> = {
  package: "Package and sign an app?",
  publish: "Publish an app to other users?",
  install: "Install an app?",
  preview: "Preview an app in the host sandbox?",
  "trust-import": "Trust a new publisher?"
};

function HostConfirmationModal({
  modal,
  onClose,
  onConfirmResponse,
  onLaunchConfirm,
  onInstallConfirm,
  onGrantToggle
}: {
  readonly modal:
    | { readonly kind: "confirm"; readonly request: HostConfirmationRequestView }
    | {
        readonly kind: "launch";
        readonly review: LaunchReviewRequestView;
        readonly grants: ReadonlyArray<string>;
      }
    | {
        readonly kind: "install";
        readonly review: InstallReviewRequestView;
        readonly grants: ReadonlyArray<string>;
      };
  readonly onClose: () => void;
  readonly onConfirmResponse: (approved: boolean) => void;
  readonly onLaunchConfirm: (accept: boolean, grants?: ReadonlyArray<string>) => void;
  readonly onInstallConfirm: (accept: boolean, grants?: ReadonlyArray<string>) => void;
  readonly onGrantToggle: (capabilityId: string, granted: boolean) => void;
}) {
  const title =
    modal.kind === "confirm"
      ? (CONFIRM_KIND_TITLES[modal.request.kind] ?? `Confirm ${modal.request.kind}?`)
      : modal.kind === "install"
        ? modal.review.trusted
          ? `Install ${modal.review.appId} v${modal.review.version} from trusted publisher "${modal.review.trustedLabel ?? "?"}"?`
          : `Install ${modal.review.appId} v${modal.review.version} from UNTRUSTED publisher?`
        : `Run ${modal.review.appId} v${modal.review.version}?`;

  const fingerprint =
    modal.kind === "confirm" ? modal.request.publisherPublicKey : modal.review.publisherPublicKey;

  const capabilities =
    modal.kind === "confirm" ? null : modal.review.capabilities;

  return (
    <View testID="host-confirmation-modal" style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.muted}>Publisher key: {fingerprint}</Text>
        {modal.kind === "confirm" ? (
          <>
            <Text style={styles.muted}>Requested by: {modal.request.appId}</Text>
            {Object.entries(modal.request.summary).map(([label, value]) => (
              <Text key={label} style={styles.muted}>
                {label}: {value}
              </Text>
            ))}
            <View style={styles.buttonRow}>
              <ActionButton
                testID="host-confirm-deny"
                label="Deny"
                onPress={() => onConfirmResponse(false)}
              />
              <ActionButton
                testID="host-confirm-approve"
                label="Approve"
                onPress={() => onConfirmResponse(true)}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.muted}>Capabilities requested: {capabilities?.length ?? 0}</Text>
            {capabilities?.map((capability: LaunchReviewCapabilityView) => (
              <Row
                key={capability.id}
                testID={modal.kind === "install" ? `install-grant-${capability.id}` : `launch-grant-${capability.id}`}
                label={capability.id}
                value={modal.grants.includes(capability.id)}
                onChange={(granted) => onGrantToggle(capability.id, granted)}
              />
            ))}
            <View style={styles.buttonRow}>
              {modal.kind === "install" ? (
                <>
                  <ActionButton
                    testID="host-install-cancel"
                    label="Cancel"
                    onPress={() => onInstallConfirm(false)}
                  />
                  <ActionButton
                    testID="host-install-approve"
                    label="Install"
                    onPress={() => onInstallConfirm(true, modal.grants)}
                  />
                </>
              ) : (
                <>
                  <ActionButton testID="host-launch-cancel" label="Cancel" onPress={() => onLaunchConfirm(false)} />
                  <ActionButton
                    testID="host-launch-run"
                    label="Run"
                    onPress={() => onLaunchConfirm(true, modal.grants)}
                  />
                </>
              )}
            </View>
          </>
        )}
        <ActionButton label="Dismiss" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101418",
    paddingTop: Platform.OS === "web" ? 24 : 64,
    paddingHorizontal: 20
  },
  title: {
    color: "#f4f7fb",
    fontSize: 24,
    fontWeight: "700"
  },
  subtitle: {
    color: "#9aa7b8",
    marginBottom: 16
  },
  card: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8
  },
  sectionTitle: {
    color: "#f4f7fb",
    fontWeight: "600",
    marginBottom: 4
  },
  muted: {
    color: "#9aa7b8",
    fontSize: 13
  },
  mono: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo"
  },
  announceLine: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 11
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLabel: {
    color: "#f4f7fb"
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4
  },
  input: {
    backgroundColor: "#0f141b",
    color: "#f4f7fb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13
  },
  button: {
    backgroundColor: "#2b3645",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buttonDisabled: {
    opacity: 0.45
  },
  buttonLabel: {
    color: "#f4f7fb",
    fontSize: 13
  },
  packageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  packageTitle: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 12
  },
  log: {
    flex: 1,
    backgroundColor: "#0b0f14",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 24
  },
  logLine: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 12,
    marginBottom: 6
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
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 20,
    gap: 10
  },
  modalTitle: {
    color: "#f4f7fb",
    fontSize: 18,
    fontWeight: "700"
  }
});
