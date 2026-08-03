// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { GrantStore } from "../../../packages/miniapp-runtime/src/capabilities";
import { HOST_API_VERSION } from "../../../packages/miniapp-runtime/src/host-api";
import { MiniappHost } from "../../../packages/miniapp-runtime/src/host";
import { WebSandboxBackend } from "../../../packages/miniapp-runtime/src/sandbox/web";
import { KvStorageBeeBackend } from "../../../packages/miniapp-runtime/src/services/storage-bee-kv";
import type { WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import { COOKBOOK_FIXTURES } from "virtual:cookbook-fixtures";
import { PagesPeerChrome } from "./peer-chrome.ts";
import { PeerChromePanel } from "./peer-chrome-ui.tsx";
import { createPagesPeerSessionManager } from "./peer-session.ts";

type Fixture = (typeof COOKBOOK_FIXTURES)[number];

class MemoryStore {
  private readonly values = new Map<string, Uint8Array>();

  async get(key: string) {
    return this.values.get(key)?.slice() ?? null;
  }

  async set(key: string, value: Uint8Array) {
    this.values.set(key, value.slice());
  }

  async delete(key: string) {
    this.values.delete(key);
  }

  async list(prefix: string) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

const store = new MemoryStore();
const cas = new Map<string, Uint8Array>();
const encoder = new TextEncoder();

function demoModelReply(messages: ReadonlyArray<{ readonly content: string }>) {
  const system = messages[0]?.content ?? "";
  const user = messages.at(-1)?.content ?? "";
  if (system.includes("JSON array")) {
    return JSON.stringify([
      { label: "Name", type: "text" },
      { label: "Party size", type: "number" },
      { label: "Checked in", type: "switch" }
    ]);
  }
  if (system.includes("single JSON object")) {
    return JSON.stringify({
      title: "Demo field note",
      location: "Browser demo",
      severity: "low",
      summary: user.slice(0, 120) || "Sample note"
    });
  }
  if (system.includes("Translate")) return `Demo translation: ${user.replace(/^Into [^:]+:\s*/, "")}`;
  return "This is a deterministic browser-demo response from the local sample adapter.";
}

function createDemoHost(
  onTree: (tree: WidgetTree | null) => void,
  peerChrome: PagesPeerChrome
) {
  const bee = new KvStorageBeeBackend(store);
  return new MiniappHost({
    backend: new WebSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    beeBackend: bee,
    presenceBackend: {
      snapshot: async () => ({ onlineInterfaces: 1, preferredInterface: "web-demo", peers: 1 })
    },
    hostInfoBackend: {
      info: async () => ({
        platform: "web",
        hostVersion: "pages-demo",
        hostApiVersion: HOST_API_VERSION,
        roles: { transport: false, seeder: false, propagation: false },
        interfaceTypes: ["web-demo"],
        quotas: {
          kvQuotaBytes: 1024 * 1024,
          seedStorageUsedBytes: null,
          seedStorageQuotaBytes: null,
          memoryBytes: null
        }
      })
    },
    aiBackend: {
      chat: async (_appId, request) => ({
        message: { role: "assistant", content: demoModelReply(request.messages) },
        model: "pages-demo",
        usage: null
      }),
      stream: async function* (_appId, request) {
        yield { delta: demoModelReply(request.messages), model: "pages-demo", usage: null };
      },
      embed: async (_appId, request) => ({
        vectors: request.inputs.map((input) => [input.length || 1, 1]),
        model: "pages-demo",
        usage: null
      })
    },
    resourceBackend: {
      fetch: async () => encoder.encode("Resource fetched by the browser demo adapter.")
    },
    casBackend: {
      put: async (_appId, content) => {
        const t256 = `demo${String(cas.size + 1).padStart(90, "0")}`;
        cas.set(t256, content.slice());
        return { t256, size: content.length };
      },
      get: async (_appId, t256) => cas.get(t256)?.slice() ?? null
    },
    confirmationChannel: { confirm: async () => ({ approved: true }) },
    peerSessionManager: createPagesPeerSessionManager(peerChrome),
    appsBackend: {
      package: async (_appId, request) => {
        const size = encoder.encode(JSON.stringify(request.manifest)).length;
        return { packageHash: "pages-demo", size, t256: `demo${"0".repeat(90)}` };
      },
      publish: async (_appId, request) => ({ t256: request.t256, driveKey: "pages-demo", version: "1" }),
      install: async () => ({ appId: "pages-demo", version: "1.0.0", trusted: false }),
      preview: async () => ({ launched: true }),
      stopPreview: async () => {}
    },
    callbacks: {
      onWidgetTree: (tree) => onTree(tree),
      onLifecycle: () => undefined
    }
  });
}

function fixtureFromLocation(): Fixture {
  const requested = new URLSearchParams(window.location.search).get("app");
  return COOKBOOK_FIXTURES.find((fixture) => fixture.slug === requested) ?? COOKBOOK_FIXTURES[0];
}

function App() {
  const [selected, setSelected] = useState<Fixture>(fixtureFromLocation);
  const [tree, setTree] = useState<WidgetTree | null>(null);
  const [status, setStatus] = useState("Starting…");
  const hostRef = useRef<MiniappHost | null>(null);
  const peerChrome = useMemo(() => new PagesPeerChrome(), []);

  useEffect(() => {
    let active = true;
    const start = async () => {
      setTree(null);
      setStatus("Starting the browser sandbox…");
      await hostRef.current?.stop("switch-app");
      const host = createDemoHost((next) => {
        if (active) {
          setTree(next);
          setStatus("Running the real cookbook bundle in the web sandbox");
        }
      }, peerChrome);
      hostRef.current = host;
      await host.setGrants(selected.name, selected.publisherPublicKey, selected.capabilities, selected.capabilities);
      await host.launch(
        {
          name: selected.name,
          version: selected.version,
          entry: selected.entry,
          capabilities: selected.capabilities,
          publisherPublicKey: selected.publisherPublicKey
        },
        encoder.encode(selected.bundle)
      );
    };
    void start().catch((error) => active && setStatus(`Could not start: ${String(error)}`));
    return () => {
      active = false;
    };
  }, [selected, peerChrome]);

  const choose = (fixture: Fixture) => {
    window.history.replaceState({}, "", `?app=${encodeURIComponent(fixture.slug)}`);
    setSelected(fixture);
  };

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>TWISTEDPEAR COOKBOOK</Text>
        <Text style={styles.title}>React Native Web samples</Text>
        <Text style={styles.intro}>
          These pages run each sample's real bundle and render its widget tree with React Native Web.
          Network, model, package, and device services use a deterministic in-browser demo adapter.
          Peer connection uses the static-web registry (Manual/QR/Audio + WebRTC; BLE, LP2P, and automatic
          Reticulum remain unavailable on ordinary pages).
        </Text>
      </View>
      <View style={styles.layout}>
        <View style={styles.navigation}>
          {COOKBOOK_FIXTURES.map((fixture) => (
            <Pressable
              accessibilityRole="link"
              key={fixture.slug}
              onPress={() => choose(fixture)}
              style={[styles.navItem, fixture.slug === selected.slug ? styles.navItemActive : undefined]}
            >
              <Text style={styles.navLabel}>{fixture.title}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.demo}>
          <Text testID="cookbook-sample-title" style={styles.demoTitle}>{selected.title}</Text>
          <Text style={styles.capabilities}>
            {selected.capabilities.length === 0 ? "No capabilities" : selected.capabilities.join(" · ")}
          </Text>
          <Text
            accessibilityRole="link"
            href={selected.cookbookHref}
            testID="cookbook-sample-recipe-link"
            style={styles.cookbookLink}
          >
            Read the cookbook recipe →
          </Text>
          <View style={styles.status}>
            <Text testID="cookbook-sample-status" style={styles.statusText}>{status}</Text>
          </View>
          <View style={styles.device}>
            {tree === null ? (
              <Text style={styles.loading}>Waiting for the first render…</Text>
            ) : (
              <MiniappWidgetTree
                tree={tree}
                assets={selected.assets}
                onEvent={(nodeId, event, value) => void hostRef.current?.handleUiEvent(nodeId, event, value)}
                readDocument={(documentId) => hostRef.current?.workspace.read(selected.name, documentId) ?? Promise.resolve("")}
              />
            )}
            <PeerChromePanel chrome={peerChrome} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { minHeight: "100vh", backgroundColor: "#07111b", padding: 24, color: "#eff7ff" },
  header: { width: "100%", maxWidth: 1180, marginHorizontal: "auto", marginBottom: 24 },
  eyebrow: { color: "#67e8c7", fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#f7fbff", fontSize: 36, fontWeight: "700", marginTop: 8 },
  intro: { color: "#a9b8c8", fontSize: 16, lineHeight: 24, maxWidth: 820, marginTop: 10 },
  layout: { width: "100%", maxWidth: 1180, marginHorizontal: "auto", flexDirection: "row", gap: 24, alignItems: "flex-start" },
  navigation: { width: 250, backgroundColor: "#0d1b29", borderRadius: 16, padding: 10, gap: 3 },
  navItem: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9 },
  navItemActive: { backgroundColor: "#16463f" },
  navLabel: { color: "#d6e1eb", fontSize: 14 },
  demo: { flex: 1, minWidth: 0 },
  demoTitle: { color: "#f7fbff", fontSize: 27, fontWeight: "700" },
  capabilities: { color: "#67e8c7", fontSize: 12, marginTop: 6 },
  cookbookLink: { color: "#8ecbff", fontSize: 14, marginTop: 10, textDecorationLine: "underline" },
  status: { backgroundColor: "#102334", borderRadius: 8, padding: 9, marginVertical: 12 },
  statusText: { color: "#a9c1d5", fontSize: 12 },
  device: { position: "relative", backgroundColor: "#111b26", borderColor: "#2b3d4f", borderWidth: 1, borderRadius: 20, minHeight: 560, padding: 18, overflow: "hidden" },
  loading: { color: "#9aa7b8" }
});

const root = document.getElementById("root");
if (root !== null) createRoot(root).render(<App />);
