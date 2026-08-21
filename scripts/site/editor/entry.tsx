import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { StyleSheet, Text, View } from "react-native";
import { MiniappHost } from "../../../packages/miniapp-runtime/src/host";
import type { WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import { EDITOR_SEEDS, DEVSTUDIO_BUNDLE, DEVSTUDIO_MANIFEST } from "virtual:editor-assets";
import { PagesPeerChrome } from "../react-native-web-samples/peer-chrome.ts";
import { PeerChromePanel } from "../react-native-web-samples/peer-chrome-ui.tsx";
import { LocalStorageStore, type StorageFallbackReason } from "../browser-host/store.ts";
import { createConfirmationController, type PendingConfirmation } from "../browser-host/confirmation.ts";
import { createDemoHost } from "../browser-host/demo-host.ts";
import {
  createEditorAppsBackend,
  createPreviewEventHandler,
  type PreviewSlot,
} from "../browser-host/apps-backend.ts";
import { ConfirmDialog, EditorHeader } from "./chrome.tsx";
import { createGuidaWorkerClient } from "./guida-client.ts";
import { decodeWorkspace, encodeWorkspace, shareTooLong, type WorkspaceFileMap } from "./share.ts";
import {
  DEVSTUDIO_APP_ID,
  DEVSTUDIO_PUBLISHER,
  readAllWorkspace,
  workspaceHasFiles,
  writeAllWorkspace,
} from "./workspace.ts";

type Seed = (typeof EDITOR_SEEDS)[number];
type ChromePrompt = { kind: "reset" } | { kind: "share"; files: WorkspaceFileMap };

const encoder = new TextEncoder();
const GRANTED = (DEVSTUDIO_MANIFEST.capabilities as string[]).filter(
  (capability) => capability !== "ai:chat",
);

function seedFromLocation(): Seed {
  const slug = new URLSearchParams(window.location.search).get("app");
  return EDITOR_SEEDS.find((seed) => seed.slug === slug) ?? EDITOR_SEEDS[0];
}

function hashPayload(): string | null {
  const match = /^#w=([^&]*)/.exec(window.location.hash);
  return match === null || match[1] === "" ? null : match[1];
}

function App() {
  const [tree, setTree] = useState<WidgetTree | null>(null);
  const [previewTree, setPreviewTree] = useState<WidgetTree | null>(null);
  const [status, setStatus] = useState("Starting…");
  const [storageReason, setStorageReason] = useState<StorageFallbackReason | null>(null);
  const [hostPending, setHostPending] = useState<PendingConfirmation | null>(null);
  const [chromePrompt, setChromePrompt] = useState<ChromePrompt | null>(null);
  const [shareHref, setShareHref] = useState<string | null>(null);
  const [shareOverflow, setShareOverflow] = useState(false);
  const hostRef = useRef<MiniappHost | null>(null);
  const previewRef = useRef<PreviewSlot | null>(null);
  const storeRef = useRef<LocalStorageStore | null>(null);
  const confirmation = useMemo(() => createConfirmationController(), []);
  const peerChrome = useMemo(() => new PagesPeerChrome(), []);
  const guidaClient = useMemo(
    () => createGuidaWorkerClient((line) => setStatus(line)),
    [],
  );

  useEffect(() => confirmation.subscribe(setHostPending), [confirmation]);

  useEffect(() => {
    let active = true;
    const start = async () => {
      const store = new LocalStorageStore((reason) => setStorageReason(reason));
      storeRef.current = store;
      const blocked = store.probe();
      if (blocked !== null) setStorageReason(blocked);
      const hostHolder: { current: MiniappHost | null } = { current: null };
      const appsBackend = createEditorAppsBackend({
        getHost: () => {
          if (hostHolder.current === null) throw new Error("host is not ready");
          return hostHolder.current;
        },
        loadWorklet: async () => guidaClient,
        previewRef,
        onPreviewTree: (next) => {
          if (active) setPreviewTree(next);
        },
      });
      const host = createDemoHost({
        store,
        peerChrome,
        onTree: (next) => {
          if (active) {
            setTree(next);
            setStatus("DevStudio is running in the browser sandbox");
          }
        },
        confirmationChannel: confirmation.channel,
        appsBackend,
        includeDemoAi: false,
      });
      hostHolder.current = host;
      hostRef.current = host;
      await applyInitialWorkspace(host, setChromePrompt);
      await host.setGrants(
        DEVSTUDIO_MANIFEST.name,
        DEVSTUDIO_PUBLISHER,
        DEVSTUDIO_MANIFEST.capabilities,
        GRANTED,
      );
      await host.launch(
        {
          name: DEVSTUDIO_MANIFEST.name,
          version: DEVSTUDIO_MANIFEST.version,
          entry: DEVSTUDIO_MANIFEST.entry,
          capabilities: DEVSTUDIO_MANIFEST.capabilities,
          publisherPublicKey: DEVSTUDIO_PUBLISHER,
        },
        encoder.encode(DEVSTUDIO_BUNDLE),
      );
    };
    void start().catch((error) => active && setStatus(`Could not start: ${String(error)}`));
    return () => {
      active = false;
    };
  }, [confirmation, guidaClient, peerChrome]);

  const onShare = async () => {
    const host = hostRef.current;
    if (host === null) return;
    try {
      const encoded = await encodeWorkspace(await readAllWorkspace(host));
      if (shareTooLong(encoded)) {
        setShareOverflow(true);
        setShareHref(null);
        setStatus("Workspace is too large for a share link. Download it instead.");
        return;
      }
      setShareOverflow(false);
      const url = `${window.location.pathname}${window.location.search}#w=${encoded}`;
      window.history.replaceState({}, "", url);
      setShareHref(window.location.href);
      await navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
      setStatus("Share link copied.");
    } catch (error) {
      setStatus(`Share failed: ${String(error)}`);
    }
  };

  const onDownload = async () => {
    const host = hostRef.current;
    if (host === null) return;
    const files = await readAllWorkspace(host);
    const blob = new Blob([JSON.stringify(files, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "twistedpear-workspace.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded workspace.json.");
  };

  return (
    <View style={styles.page}>
      <EditorHeader
        storageReason={storageReason}
        status={status}
        shareHref={shareHref}
        shareTooLong={shareOverflow}
        onShare={() => void onShare()}
        onReset={() => setChromePrompt({ kind: "reset" })}
        onDownload={() => void onDownload()}
      />
      <View style={styles.layout}>
        <View testID="editor-studio" style={styles.pane}>
          <Text style={styles.paneTitle}>DevStudio</Text>
          {tree === null ? (
            <Text style={styles.loading}>Starting DevStudio…</Text>
          ) : (
            <MiniappWidgetTree
              tree={tree}
              onEvent={(nodeId, event, value) => void hostRef.current?.handleUiEvent(nodeId, event, value)}
              readDocument={(documentId) =>
                hostRef.current?.workspace.read(DEVSTUDIO_APP_ID, documentId) ?? Promise.resolve("")
              }
            />
          )}
        </View>
        <View testID="editor-preview" style={styles.pane}>
          <Text style={styles.paneTitle}>Preview</Text>
          {previewTree === null ? (
            <Text style={styles.loading}>Not running — press Preview in DevStudio.</Text>
          ) : (
            <MiniappWidgetTree
              tree={previewTree}
              onEvent={createPreviewEventHandler(previewRef)}
              readDocument={async (documentId) => {
                const preview = previewRef.current;
                const appId = preview?.host.snapshot().appId;
                if (preview === undefined || appId === null || appId === undefined) return "";
                return preview.host.workspace.read(appId, documentId);
              }}
            />
          )}
        </View>
      </View>
      <PeerChromePanel chrome={peerChrome} />
      <ConfirmDialog
        request={hostPending?.request ?? null}
        onApprove={() => confirmation.respond(true)}
        onDeny={() => confirmation.respond(false)}
      />
      {chromePrompt?.kind === "reset" ? (
        <ConfirmDialog
          request={null}
          title="Reset this workspace?"
          body="This discards stored project files, grants, and editor state in this browser."
          confirmLabel="Reset"
          onApprove={() => void resetWorkspace(storeRef.current, hostRef.current, setChromePrompt, setPreviewTree, setStatus)}
          onDeny={() => setChromePrompt(null)}
        />
      ) : null}
      {chromePrompt?.kind === "share" ? (
        <ConfirmDialog
          request={null}
          title="Open shared workspace?"
          body="The share link will be added as project files. It will not delete other projects, but matching paths will be replaced."
          confirmLabel="Open"
          onApprove={() => void acceptShare(hostRef.current, chromePrompt.files, setChromePrompt, setStatus)}
          onDeny={() => setChromePrompt(null)}
        />
      ) : null}
    </View>
  );
}

async function applyInitialWorkspace(
  host: MiniappHost,
  setChromePrompt: (prompt: ChromePrompt) => void,
) {
  const encoded = hashPayload();
  const occupied = await workspaceHasFiles(host);
  if (encoded !== null) {
    const files = await decodeWorkspace(encoded);
    if (occupied) {
      setChromePrompt({ kind: "share", files });
      return;
    }
    await writeAllWorkspace(host, files);
    return;
  }
  if (!occupied) {
    await writeAllWorkspace(host, seedFromLocation().files);
  }
}

async function acceptShare(
  host: MiniappHost | null,
  files: WorkspaceFileMap,
  setChromePrompt: (prompt: ChromePrompt | null) => void,
  setStatus: (status: string) => void,
) {
  setChromePrompt(null);
  if (host === null) return;
  await writeAllWorkspace(host, files);
  setStatus("Opened the shared workspace. Reload DevStudio or open the project in the file list.");
}

async function resetWorkspace(
  store: LocalStorageStore | null,
  _host: MiniappHost | null,
  setChromePrompt: (prompt: ChromePrompt | null) => void,
  setPreviewTree: (tree: WidgetTree | null) => void,
  setStatus: (status: string) => void,
) {
  setChromePrompt(null);
  store?.clearNamespace();
  setPreviewTree(null);
  setStatus("Workspace reset. Reloading…");
  const url = new URL(window.location.href);
  url.hash = "";
  window.location.replace(url.toString());
}

const styles = StyleSheet.create({
  page: { minHeight: "100vh", backgroundColor: "#07111b", padding: 24, color: "#eff7ff" },
  layout: {
    width: "100%",
    maxWidth: 1180,
    marginHorizontal: "auto",
    flexDirection: "row",
    gap: 24,
    alignItems: "flex-start",
  },
  pane: {
    flex: 1,
    minWidth: 0,
    backgroundColor: "#111b26",
    borderColor: "#2b3d4f",
    borderWidth: 1,
    borderRadius: 20,
    minHeight: 560,
    padding: 18,
    overflow: "hidden",
  },
  paneTitle: { color: "#67e8c7", fontSize: 12, fontWeight: "700", letterSpacing: 1, marginBottom: 12 },
  loading: { color: "#9aa7b8" },
});

const root = document.getElementById("root");
if (root !== null) createRoot(root).render(<App />);
