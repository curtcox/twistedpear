import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MiniappHost } from "../../../packages/miniapp-runtime/src/host";
import type { WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import { COOKBOOK_FIXTURES } from "virtual:cookbook-fixtures";
import { PagesPeerChrome } from "./peer-chrome.ts";
import { PeerChromePanel } from "./peer-chrome-ui.tsx";
import { MemoryStore } from "../browser-host/store.ts";
import { autoApproveChannel } from "../browser-host/confirmation.ts";
import { createDemoHost } from "../browser-host/demo-host.ts";

type Fixture = (typeof COOKBOOK_FIXTURES)[number];

const store = new MemoryStore();
const encoder = new TextEncoder();

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
      const host = createDemoHost({
        store,
        peerChrome,
        onTree: (next) => {
          if (active) {
            setTree(next);
            setStatus("Running the real cookbook bundle in the web sandbox");
          }
        },
        confirmationChannel: autoApproveChannel,
      });
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
