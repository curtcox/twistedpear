import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  hasUsbSerialPermission,
  getUsbSerialCapability,
  requestUsbSerialPermission,
} from "@twistedpear/usb-serial";
import { ActionButton, Row, styles } from "./app-native-shared.js";
import type { useNativeHarnessController } from "./app-native-controller.js";
export type NativeHarnessScope = ReturnType<typeof useNativeHarnessController>;

export function NativeHarnessViewPart3({
  scope,
}: {
  scope: NativeHarnessScope;
}) {
  return (
    <>
      <NativeHardwareAccessCard scope={scope} />
      <NativeInstall256tCard scope={scope} />
      <NativePublisherTrustCard scope={scope} />
      <NativeAppCatalogCard scope={scope} />
      <NativeAnnounceBrowserCard scope={scope} />
    </>
  );
}

function NativeHardwareAccessCard({ scope }: { scope: NativeHarnessScope }) {
  const { deviceState, sendToWorklet } = scope;
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Hardware access</Text>
        <Row
          testID="device-remote-enabled"
          label="Allow remote device acquisition"
          value={deviceState?.remoteAcquisitionEnabled === true}
          onChange={(enabled) =>
            sendToWorklet({ type: "device-set-remote", enabled })
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
                    sendToWorklet({
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
                  sendToWorklet({
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
        <ActionButton
          label="Refresh devices"
          onPress={() => sendToWorklet({ type: "device-list" })}
        />
      </View>
      <NativeUsbSerialCard scope={scope} />
    </>
  );
}

function NativeUsbSerialCard({ scope }: { scope: NativeHarnessScope }) {
  const { usbDevices, selectedUsbDeviceId, setSelectedUsbDeviceId, appendLog } =
    scope;
  return (
    <>
      {getUsbSerialCapability().supported ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>USB serial devices</Text>
          {usbDevices.length === 0 ? (
            <Text style={styles.muted}>No CDC ACM USB devices attached.</Text>
          ) : (
            usbDevices.map((device) => (
              <Pressable
                key={device.deviceId}
                style={[
                  styles.deviceRow,
                  selectedUsbDeviceId === device.deviceId
                    ? styles.deviceRowSelected
                    : null,
                ]}
                onPress={() => {
                  void (async () => {
                    if (
                      !device.hasPermission &&
                      !hasUsbSerialPermission(device.deviceId)
                    ) {
                      const granted = await requestUsbSerialPermission(
                        device.deviceId,
                      );
                      if (!granted) {
                        appendLog(
                          `USB permission denied for device ${device.deviceId}`,
                        );
                        return;
                      }
                    }

                    setSelectedUsbDeviceId(device.deviceId);
                    appendLog(
                      `Selected USB device ${device.deviceId} (${device.vendorId.toString(16)}:${device.productId.toString(16)})`,
                    );
                  })();
                }}
              >
                <Text style={styles.deviceLabel}>
                  {device.deviceName ?? `usb-${device.deviceId}`} ·{" "}
                  {device.isCdcAcm ? "CDC ACM" : "unknown"}
                </Text>
                <Text style={styles.deviceMeta}>
                  {device.hasPermission
                    ? "permission granted"
                    : "tap to request permission"}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : Platform.OS === "ios" ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>USB serial devices</Text>
          <Text style={styles.muted}>
            USB serial is unsupported on iOS. RNode paths use BLE.
          </Text>
        </View>
      ) : null}
    </>
  );
}

function NativeInstall256tCard({ scope }: { scope: NativeHarnessScope }) {
  const { install256tInput, setInstall256tInput, sendToWorklet } = scope;
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Install from 256t</Text>
        <TextInput
          testID="install-256t-input"
          style={styles.input}
          value={install256tInput}
          onChangeText={setInstall256tInput}
          autoCapitalize="none"
          placeholder="94-character package 256t"
        />
        <ActionButton
          testID="install-256t"
          label="Resolve and install"
          onPress={() => {
            const t256 = install256tInput.trim();
            if (t256.length > 0)
              sendToWorklet({ type: "install-from-256t", t256 });
          }}
        />
      </View>
    </>
  );
}

function NativePublisherTrustCard({ scope }: { scope: NativeHarnessScope }) {
  const {
    trustIdentityInput,
    setTrustIdentityInput,
    trustLabelInput,
    setTrustLabelInput,
    trustedPublishers,
    hostIdentity256t,
    sendToWorklet,
  } = scope;
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Publisher trust</Text>
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
          placeholder="Publisher label"
        />
        <View style={styles.row}>
          <ActionButton
            testID="trust-add"
            label="Trust publisher"
            onPress={() => {
              const identityString = trustIdentityInput.trim();
              if (identityString.length === 0) return;
              sendToWorklet({
                type: "trust-add",
                identityString,
                label: trustLabelInput.trim() || "Unnamed publisher",
                source: "paste",
              });
            }}
          />
          <ActionButton
            testID="trust-show"
            label="Show my identity"
            onPress={() => sendToWorklet({ type: "trust-show" })}
          />
        </View>
        {hostIdentity256t !== null ? (
          <Text testID="trust-identity-view" style={styles.muted}>
            {hostIdentity256t}
          </Text>
        ) : null}
        {trustedPublishers.map((entry) => (
          <Text key={entry.publisherPublicKey} style={styles.muted}>
            {entry.label} · {entry.publisherPublicKey.slice(0, 16)}…
          </Text>
        ))}
      </View>
    </>
  );
}

function NativeAppCatalogCard({ scope }: { scope: NativeHarnessScope }) {
  const {
    status,
    catalog,
    installProgress,
    selectedCatalogAppId,
    setSelectedCatalogAppId,
    sendToWorklet,
  } = scope;
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>App catalog</Text>
        <Text style={styles.muted}>
          {status.catalogEntries} discovered · {status.installedPackages}{" "}
          installed · {Math.round(status.storageUsedBytes / 1024)} KiB used
        </Text>
        {catalog.length === 0 ? (
          <Text style={styles.muted}>No apps in catalog yet.</Text>
        ) : (
          catalog.slice(0, 6).map((entry) => (
            <View key={entry.appId} style={styles.catalogRow}>
              <Pressable
                style={{ flex: 1 }}
                onPress={() => setSelectedCatalogAppId(entry.appId)}
              >
                <Text style={styles.catalogName}>{entry.name}</Text>
                <Text style={styles.muted}>
                  v{entry.version} · {Math.round(entry.packageSize / 1024)} KiB
                  · {entry.publisherPublicKey.slice(0, 12)}…
                </Text>
                <Text style={styles.muted}>
                  drive {entry.driveKey.slice(0, 12)}… ·{" "}
                  {entry.resourceAvailable ? "Resource + DHT" : "DHT only"}
                </Text>
              </Pressable>
              <Pressable
                testID={`install-${entry.appId}`}
                style={styles.smallButton}
                onPress={() =>
                  sendToWorklet({ type: "install-app", appId: entry.appId })
                }
              >
                <Text style={styles.buttonLabel}>Install</Text>
              </Pressable>
            </View>
          ))
        )}
        {selectedCatalogAppId !== null
          ? (() => {
              const detail = catalog.find(
                (entry) => entry.appId === selectedCatalogAppId,
              );
              if (detail === undefined) {
                return null;
              }

              return (
                <View style={styles.detailCard}>
                  <Text style={styles.catalogName}>{detail.name}</Text>
                  <Text style={styles.muted}>appId {detail.appId}</Text>
                  <Text style={styles.muted}>version {detail.version}</Text>
                  <Text style={styles.muted}>
                    hash {detail.packageHash.slice(0, 24)}…
                  </Text>
                  <Text style={styles.muted}>drive {detail.driveKey}</Text>
                  <Text style={styles.muted}>
                    publisher {detail.publisherPublicKey.slice(0, 32)}…
                  </Text>
                  <View style={styles.detailActions}>
                    <Pressable
                      testID={`install-dht-${detail.appId}`}
                      style={styles.smallButton}
                      onPress={() =>
                        sendToWorklet({
                          type: "install-app",
                          appId: detail.appId,
                          forcePath: "hyperdrive",
                        })
                      }
                    >
                      <Text style={styles.buttonLabel}>DHT</Text>
                    </Pressable>
                    {detail.resourceAvailable ? (
                      <Pressable
                        testID={`install-resource-${detail.appId}`}
                        style={styles.smallButton}
                        onPress={() =>
                          sendToWorklet({
                            type: "install-app",
                            appId: detail.appId,
                            forcePath: "resource",
                          })
                        }
                      >
                        <Text style={styles.buttonLabel}>Resource</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })()
          : null}
        {installProgress !== null ? (
          <Text testID="install-progress" style={styles.muted}>
            Install {installProgress.appId}: {installProgress.phase}
            {installProgress.verified ? " ✓ verified" : ""}
            {installProgress.path !== null
              ? ` via ${installProgress.path}`
              : ""}
          </Text>
        ) : null}
        <ActionButton
          label="Refresh catalog"
          onPress={() => sendToWorklet({ type: "list-catalog" })}
        />
      </View>
      <NativeInstalledPackagesCard scope={scope} />
    </>
  );
}

function NativeInstalledPackagesCard({ scope }: { scope: NativeHarnessScope }) {
  const {
    installed,
    selectedInstalledAppId,
    setSelectedInstalledAppId,
    grantCapabilities,
    sendToWorklet,
  } = scope;
  return (
    <View style={styles.card}>
      {installed.length > 0
        ? installed.map((pkg) => (
            <View key={pkg.appId} style={styles.catalogRow}>
              <Pressable
                testID={`installed-${pkg.appId}`}
                style={{ flex: 1 }}
                onPress={() => {
                  setSelectedInstalledAppId(pkg.appId);
                  sendToWorklet({
                    type: "get-grants",
                    appId: pkg.appId,
                    publisherPublicKey: pkg.publisherPublicKey ?? "",
                    declaredCapabilities: pkg.capabilities ?? [],
                  });
                }}
              >
                <Text style={styles.catalogName}>
                  {pkg.appId} {pkg.activeVersion === pkg.version ? "✓" : ""}
                </Text>
                <Text style={styles.muted}>
                  active v{pkg.activeVersion} · {pkg.packageHash.slice(0, 12)}…
                </Text>
              </Pressable>
              <Pressable
                testID={`launch-${pkg.appId}`}
                style={styles.smallButton}
                onPress={() =>
                  sendToWorklet({ type: "launch-miniapp", appId: pkg.appId })
                }
              >
                <Text style={styles.buttonLabel}>Launch</Text>
              </Pressable>
              {pkg.rollbackAvailable ? (
                <Pressable
                  testID={`rollback-${pkg.appId}`}
                  style={styles.smallButton}
                  onPress={() =>
                    sendToWorklet({
                      type: "rollback-package",
                      appId: pkg.appId,
                    })
                  }
                >
                  <Text style={styles.buttonLabel}>Rollback</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.smallButton}
                onPress={() =>
                  sendToWorklet({
                    type: "delete-package",
                    appId: pkg.appId,
                    version: pkg.activeVersion,
                  })
                }
              >
                <Text style={styles.buttonLabel}>Delete</Text>
              </Pressable>
            </View>
          ))
        : null}
      {selectedInstalledAppId !== null && grantCapabilities.length > 0 ? (
        <View style={styles.detailCard}>
          <Text style={styles.catalogName}>
            Grants for {selectedInstalledAppId}
          </Text>
          {grantCapabilities
            .filter((cap) => cap.declared)
            .map((cap) => (
              <View key={cap.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{cap.id}</Text>
                  <Text style={styles.muted}>{cap.description}</Text>
                </View>
                <Switch
                  testID={`grant-${cap.id.replace(/:/g, "-")}`}
                  value={cap.granted}
                  onValueChange={(granted) => {
                    const pkg = installed.find(
                      (entry) => entry.appId === selectedInstalledAppId,
                    );
                    if (pkg === undefined) {
                      return;
                    }

                    const next = grantCapabilities
                      .filter(
                        (entry) =>
                          entry.declared &&
                          (entry.id === cap.id ? granted : entry.granted),
                      )
                      .map((entry) => entry.id);
                    sendToWorklet({
                      type: "set-grants",
                      appId: pkg.appId,
                      publisherPublicKey: pkg.publisherPublicKey ?? "",
                      declaredCapabilities: pkg.capabilities ?? [],
                      grantedCapabilities: next,
                    });
                  }}
                />
              </View>
            ))}
        </View>
      ) : null}
    </View>
  );
}

function NativeAnnounceBrowserCard({ scope }: { scope: NativeHarnessScope }) {
  const { announces } = scope;
  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Announce browser</Text>
        {announces.length === 0 ? (
          <Text style={styles.muted}>No announces received yet.</Text>
        ) : (
          announces.slice(0, 8).map((entry) => (
            <Text
              key={`${entry.destinationHash}-${entry.receivedAt}`}
              style={styles.announceLine}
            >
              {entry.destinationHash.slice(0, 16)}… · {entry.hops} hop
              {entry.hops === 1 ? "" : "s"}
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
    </>
  );
}
