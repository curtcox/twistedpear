import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ConfirmationRequest } from "../../../packages/miniapp-runtime/src/confirm.ts";
import { confirmationTitle } from "../browser-host/confirmation.ts";
import type { StorageFallbackReason } from "../browser-host/store.ts";

function storageMessage(reason: StorageFallbackReason | null): string | null {
  if (reason === "quota") {
    return "Browser storage is full; edits stay in this tab only and will be lost on reload.";
  }
  if (reason === "blocked") {
    return "Browser storage is blocked; edits stay in this tab only and will be lost on reload.";
  }
  return null;
}

export function EditorHeader(props: {
  readonly storageReason: StorageFallbackReason | null;
  readonly status: string;
  readonly shareHref: string | null;
  readonly shareTooLong: boolean;
  readonly onShare: () => void;
  readonly onReset: () => void;
  readonly onDownload: () => void;
}) {
  const warning = storageMessage(props.storageReason);
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>TWISTEDPEAR</Text>
      <Text accessibilityRole="header" style={styles.title}>
        Mini-app editor
      </Text>
      <Text style={styles.intro}>
        DevStudio running in this tab — no install, no account, no server. Package and
        publish stay stubs; there is no Reticulum network on GitHub Pages.
      </Text>
      {warning !== null ? (
        <Text testID="editor-storage-warning" style={styles.warning}>
          {warning}
        </Text>
      ) : null}
      <View style={styles.actions}>
        <HeaderButton testID="editor-share" label="Copy share link" onPress={props.onShare} />
        <HeaderButton testID="editor-download" label="Download workspace" onPress={props.onDownload} />
        <HeaderButton testID="editor-reset" label="Reset workspace" onPress={props.onReset} />
      </View>
      {props.shareTooLong ? (
        <Text testID="editor-share-too-long" style={styles.warning}>
          This workspace is too large for a share link. Download it instead.
        </Text>
      ) : null}
      {props.shareHref !== null ? (
        <Text testID="editor-share-href" style={styles.shareHref}>
          {props.shareHref}
        </Text>
      ) : null}
      <View style={styles.status}>
        <Text testID="editor-status" style={styles.statusText}>
          {props.status}
        </Text>
      </View>
    </View>
  );
}

function HeaderButton(props: {
  readonly testID: string;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={props.label}
      testID={props.testID}
      onPress={props.onPress}
      style={styles.headerButton}
    >
      <Text style={styles.headerButtonLabel}>{props.label}</Text>
    </Pressable>
  );
}

export function ConfirmDialog(props: {
  readonly request: ConfirmationRequest | null;
  readonly title?: string;
  readonly body?: string;
  readonly confirmLabel?: string;
  readonly onApprove: () => void;
  readonly onDeny: () => void;
}) {
  const previousFocus = useRef<Element | null>(null);
  const open = props.request !== null || props.title !== undefined;

  useEffect(() => {
    if (!open) return undefined;
    previousFocus.current = document.activeElement;
    const node = document.querySelector<HTMLElement>('[data-testid="host-confirm-approve"]');
    node?.focus();
    return () => {
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus();
      }
    };
  }, [open]);

  if (!open) return null;
  const title =
    props.title ??
    (props.request !== null ? confirmationTitle(props.request) : "Confirm?");
  const rows =
    props.request === null
      ? []
      : [
          ["Requested by", props.request.appId],
          ...Object.entries(props.request.summary),
        ];

  return (
    <View
      accessibilityRole="none"
      style={styles.modalRoot}
      // RNW doesn't map role=dialog; the native DOM attributes are set below.
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-confirm-title"
        data-testid="host-confirm-dialog"
        className="editor-dialog"
      >
        <Text nativeID="editor-confirm-title" style={styles.dialogTitle}>
          {title}
        </Text>
        {props.body !== undefined ? (
          <Text style={styles.dialogBody}>{props.body}</Text>
        ) : null}
        {rows.map(([label, value]) => (
          <Text key={label} style={styles.dialogRow}>
            {label}: {value}
          </Text>
        ))}
        <View style={styles.dialogActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={props.confirmLabel ?? "Approve"}
            testID="host-confirm-approve"
            onPress={props.onApprove}
            style={styles.approve}
          >
            <Text style={styles.approveLabel}>{props.confirmLabel ?? "Approve"}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Deny"
            testID="host-confirm-deny"
            onPress={props.onDeny}
            style={styles.deny}
          >
            <Text style={styles.denyLabel}>Cancel</Text>
          </Pressable>
        </View>
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { width: "100%", maxWidth: 1180, marginHorizontal: "auto", marginBottom: 16 },
  eyebrow: { color: "#67e8c7", fontSize: 12, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#f7fbff", fontSize: 32, fontWeight: "700", marginTop: 8 },
  intro: { color: "#a9b8c8", fontSize: 16, lineHeight: 24, maxWidth: 820, marginTop: 10 },
  warning: { color: "#fbbf24", fontSize: 14, marginTop: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  headerButton: {
    backgroundColor: "#16463f",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonLabel: { color: "#d6e1eb", fontSize: 14 },
  shareHref: { color: "#8ecbff", fontSize: 12, marginTop: 8 },
  status: { backgroundColor: "#102334", borderRadius: 8, padding: 9, marginTop: 12 },
  statusText: { color: "#a9c1d5", fontSize: 12 },
  modalRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
    padding: 24,
  },
  dialogTitle: { color: "#f7fbff", fontSize: 20, fontWeight: "700", marginBottom: 12 },
  dialogBody: { color: "#d6e1eb", fontSize: 14, lineHeight: 20, marginBottom: 12 },
  dialogRow: { color: "#a9c1d5", fontSize: 13, marginBottom: 4 },
  dialogActions: { flexDirection: "row", gap: 8, marginTop: 16 },
  approve: { backgroundColor: "#67e8c7", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  approveLabel: { color: "#07111b", fontWeight: "700" },
  deny: { backgroundColor: "#1f3344", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  denyLabel: { color: "#d6e1eb" },
});
