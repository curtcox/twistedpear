import { Text, View } from "react-native";
import type {
  HostConfirmationRequestView,
  LaunchReviewCapabilityView,
  LaunchReviewRequestView,
  InstallReviewRequestView,
} from "./worklet/protocol";
import {
  ActionButton,
  CONFIRM_KIND_TITLES,
  Row,
  styles,
} from "./app-web-shared-ui.js";

export function HostConfirmationModal({
  modal,
  onClose,
  onConfirmResponse,
  onLaunchConfirm,
  onInstallConfirm,
  onGrantToggle,
}: {
  readonly modal:
    | {
        readonly kind: "confirm";
        readonly request: HostConfirmationRequestView;
      }
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
  readonly onLaunchConfirm: (
    accept: boolean,
    grants?: ReadonlyArray<string>,
  ) => void;
  readonly onInstallConfirm: (
    accept: boolean,
    grants?: ReadonlyArray<string>,
  ) => void;
  readonly onGrantToggle: (capabilityId: string, granted: boolean) => void;
}) {
  if (modal.kind === "confirm") {
    return (
      <HostConfirmKindBody
        modal={modal}
        onClose={onClose}
        onConfirmResponse={onConfirmResponse}
      />
    );
  }
  return (
    <HostReviewKindBody
      modal={modal}
      onClose={onClose}
      onLaunchConfirm={onLaunchConfirm}
      onInstallConfirm={onInstallConfirm}
      onGrantToggle={onGrantToggle}
    />
  );
}

function HostConfirmKindBody({
  modal,
  onClose,
  onConfirmResponse,
}: {
  modal: {
    readonly kind: "confirm";
    readonly request: HostConfirmationRequestView;
  };
  onClose: () => void;
  onConfirmResponse: (approved: boolean) => void;
}) {
  const title = CONFIRM_KIND_TITLES[modal.request.kind];
  return (
    <View testID="host-confirmation-modal" style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.muted}>
          Publisher key: {modal.request.publisherPublicKey}
        </Text>
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
        <ActionButton label="Dismiss" onPress={onClose} />
      </View>
    </View>
  );
}

function HostReviewKindBody({
  modal,
  onClose,
  onLaunchConfirm,
  onInstallConfirm,
  onGrantToggle,
}: {
  modal:
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
  onClose: () => void;
  onLaunchConfirm: (accept: boolean, grants?: ReadonlyArray<string>) => void;
  onInstallConfirm: (accept: boolean, grants?: ReadonlyArray<string>) => void;
  onGrantToggle: (capabilityId: string, granted: boolean) => void;
}) {
  const title =
    modal.kind === "install"
      ? modal.review.trusted
        ? `Install ${modal.review.appId} v${modal.review.version} from trusted publisher "${modal.review.trustedLabel ?? "?"}"?`
        : `Install ${modal.review.appId} v${modal.review.version} from UNTRUSTED publisher?`
      : `Run ${modal.review.appId} v${modal.review.version}?`;
  return (
    <View testID="host-confirmation-modal" style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.muted}>
          Publisher key: {modal.review.publisherPublicKey}
        </Text>
        {modal.review.riskTier !== undefined ? (
          <Text style={styles.muted}>Risk tier: {modal.review.riskTier}</Text>
        ) : null}
        <Text style={styles.muted}>
          Capabilities requested: {modal.review.capabilities.length}
        </Text>
        {modal.review.capabilities.map(
          (capability: LaunchReviewCapabilityView) => (
            <View key={capability.id}>
              <Row
                testID={
                  modal.kind === "install"
                    ? `install-grant-${capability.id}`
                    : `launch-grant-${capability.id}`
                }
                label={
                  capability.optional === true
                    ? `${capability.id} (optional)`
                    : capability.id
                }
                value={modal.grants.includes(capability.id)}
                onChange={(granted) => onGrantToggle(capability.id, granted)}
              />
              {capability.riskClass !== undefined ? (
                <Text style={styles.muted}>{capability.riskClass}</Text>
              ) : null}
              {capability.scopeLabel !== undefined ? (
                <Text style={styles.muted}>{capability.scopeLabel}</Text>
              ) : null}
              {capability.expiresAt !== null ? (
                <Text style={styles.muted}>
                  Expires{" "}
                  {new Date(capability.expiresAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Text>
              ) : null}
            </View>
          ),
        )}
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
              <ActionButton
                testID="host-launch-cancel"
                label="Cancel"
                onPress={() => onLaunchConfirm(false)}
              />
              <ActionButton
                testID="host-launch-run"
                label="Run"
                onPress={() => onLaunchConfirm(true, modal.grants)}
              />
            </>
          )}
        </View>
        <ActionButton label="Dismiss" onPress={onClose} />
      </View>
    </View>
  );
}
