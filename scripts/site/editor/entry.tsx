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
  const session = useEditorSession();
  return (
    <View style={styles.page}>
      <EditorHeader
        storageReason={session.storageReason}
        status={session.status}
        shareHref={session.shareHref}
        shareTooLong={session.shareOverflow}
        onShare={() => void session.onShare()}
        onReset={() => session.setChromePrompt({ kind: "reset" })}
        onDownload={() => void session.onDownload()}
      />
      <EditorPanes
        tree={session.tree}
        previewTree={session.previewTree}
        hostRef={session.hostRef}
        previewRef={session.previewRef}
      />
      <PeerChromePanel chrome={session.peerChrome} />
      <ConfirmDialog
        request={session.hostPending?.request ?? null}
        onApprove={() => session.confirmation.respond(true)}
        onDeny={() => session.confirmation.respond(false)}
      />
      <EditorChromeDialogs session={session} />
    </View>
  );
}

function useEditorSession() {
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
  useEffect(
    () =>
      startEditorHost({
        confirmation: confirmation.channel,
        guidaClient,
        hostRef,
        peerChrome,
        previewRef,
        setChromePrompt,
        setPreviewTree,
        setStatus,
        setStorageReason,
        setTree,
        storeRef,
      }),
    [confirmation, guidaClient, peerChrome],
  );

  return {
    chromePrompt,
    confirmation,
    hostPending,
    hostRef,
    onDownload: () => downloadWorkspace(hostRef.current, setStatus),
    onShare: () =>
      shareWorkspace(hostRef.current, setShareHref, setShareOverflow, setStatus),
    peerChrome,
    previewRef,
    previewTree,
    setChromePrompt,
    setPreviewTree,
    setStatus,
    shareHref,
    shareOverflow,
    status,
    storageReason,
    storeRef,
    tree,
  };
}

function startEditorHost(opts: {
  confirmation: ReturnType<typeof createConfirmationController>["channel"];
  guidaClient: ReturnType<typeof createGuidaWorkerClient>;
  hostRef: React.RefObject<MiniappHost | null>;
  peerChrome: PagesPeerChrome;
  previewRef: React.RefObject<PreviewSlot | null>;
  setChromePrompt: (prompt: ChromePrompt | null) => void;
  setPreviewTree: (tree: WidgetTree | null) => void;
  setStatus: (status: string) => void;
  setStorageReason: (reason: StorageFallbackReason | null) => void;
  setTree: (tree: WidgetTree | null) => void;
  storeRef: React.MutableRefObject<LocalStorageStore | null>;
}) {
  let active = true;
  void bootEditor(opts, () => active).catch(
    (error) => active && opts.setStatus(`Could not start: ${String(error)}`),
  );
  return () => {
    active = false;
  };
}

async function bootEditor(
  opts: Parameters<typeof startEditorHost>[0],
  isActive: () => boolean,
) {
  const store = new LocalStorageStore((reason) => opts.setStorageReason(reason));
  opts.storeRef.current = store;
  const blocked = store.probe();
  if (blocked !== null) opts.setStorageReason(blocked);
  const hostHolder: { current: MiniappHost | null } = { current: null };
  const host = createDemoHost({
    store,
    peerChrome: opts.peerChrome,
    onTree: (next) => {
      if (isActive()) {
        opts.setTree(next);
        opts.setStatus("DevStudio is running in the browser sandbox");
      }
    },
    confirmationChannel: opts.confirmation,
    appsBackend: createEditorAppsBackend({
      getHost: () => {
        if (hostHolder.current === null) throw new Error("host is not ready");
        return hostHolder.current;
      },
      loadWorklet: async () => opts.guidaClient,
      previewRef: opts.previewRef,
      onPreviewTree: (next) => {
        if (isActive()) opts.setPreviewTree(next);
      },
    }),
    includeDemoAi: false,
  });
  hostHolder.current = host;
  opts.hostRef.current = host;
  await applyInitialWorkspace(host, opts.setChromePrompt);
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
}

async function shareWorkspace(
  host: MiniappHost | null,
  setShareHref: (href: string | null) => void,
  setShareOverflow: (overflow: boolean) => void,
  setStatus: (status: string) => void,
) {
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
}

async function downloadWorkspace(
  host: MiniappHost | null,
  setStatus: (status: string) => void,
) {
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
}

function EditorChromeDialogs(props: { session: ReturnType<typeof useEditorSession> }) {
  const { session } = props;
  if (session.chromePrompt?.kind === "reset") {
    return (
      <ConfirmDialog
        request={null}
        title="Reset this workspace?"
        body="This discards stored project files, grants, and editor state in this browser."
        confirmLabel="Reset"
        onApprove={() =>
          void resetWorkspace(
            session.storeRef.current,
            session.hostRef.current,
            session.setChromePrompt,
            session.setPreviewTree,
            session.setStatus,
          )
        }
        onDeny={() => session.setChromePrompt(null)}
      />
    );
  }
  if (session.chromePrompt?.kind === "share") {
    const files = session.chromePrompt.files;
    return (
      <ConfirmDialog
        request={null}
        title="Open shared workspace?"
        body="The share link will be added as project files. It will not delete other projects, but matching paths will be replaced."
        confirmLabel="Open"
        onApprove={() =>
          void acceptShare(session.hostRef.current, files, session.setChromePrompt, session.setStatus)
        }
        onDeny={() => session.setChromePrompt(null)}
      />
    );
  }
  return null;
}

function EditorPanes(props: {
  tree: WidgetTree | null;
  previewTree: WidgetTree | null;
  hostRef: React.RefObject<MiniappHost | null>;
  previewRef: React.RefObject<PreviewSlot | null>;
}) {
  return (
      <View style={styles.layout}>
        <View testID="editor-studio" style={styles.pane}>
          <Text style={styles.paneTitle}>DevStudio</Text>
          {props.tree === null ? (
            <Text style={styles.loading}>Starting DevStudio…</Text>
          ) : (
            <MiniappWidgetTree
              tree={props.tree}
              onEvent={(nodeId, event, value) => void props.hostRef.current?.handleUiEvent(nodeId, event, value)}
              readDocument={(documentId) =>
                props.hostRef.current?.workspace.read(DEVSTUDIO_APP_ID, documentId) ?? Promise.resolve("")
              }
            />
          )}
        </View>
        <View testID="editor-preview" style={styles.pane}>
          <Text style={styles.paneTitle}>Preview</Text>
          {props.previewTree === null ? (
            <Text style={styles.loading}>Not running — press Preview in DevStudio.</Text>
          ) : (
            <MiniappWidgetTree
              tree={props.previewTree}
              onEvent={createPreviewEventHandler(props.previewRef)}
              readDocument={async (documentId) => {
                const preview = props.previewRef.current;
                const appId = preview?.host.snapshot().appId;
                if (preview === undefined || appId === null || appId === undefined) return "";
                return preview.host.workspace.read(appId, documentId);
              }}
            />
          )}
        </View>
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
