/** Wire Settings panel controls to the desktop worklet. */
export function bindSettingsPanel(scope) {
  const {
    host,
    settingDeveloper,
    settingPropagation,
    settingTcp,
    settingAuto,
    settingRnodePort,
    settingRelayMode,
    settingTcpDirection,
    settingAutoDirection,
    settingRnodeDirection,
    settingAiUrl,
    settingAiKey,
    settingAiModel,
    settingAiEmbeddingModel,
    settingFreenet,
    settingFreenetUrl,
    settingFreenetToken,
    settingFreenetInterface,
    settingFreenetRendezvous,
    settingFreenetDirection,
    joinCommunityNetwork,
    applyInterfaceSettings,
  } = scope;

  settingDeveloper?.addEventListener("change", () => {
    host.send({
      type: "set-developer-mode",
      enabled: settingDeveloper.checked,
    });
  });

  settingPropagation?.addEventListener("change", () => {
    host.send({ type: "set-propagation", enabled: settingPropagation.checked });
  });

  joinCommunityNetwork?.addEventListener("click", () => {
    if (settingTcp) settingTcp.checked = true;
    host.send({ type: "join-community-network" });
  });

  for (const element of [settingTcp, settingAuto, settingRnodePort]) {
    element?.addEventListener("change", applyInterfaceSettings);
  }

  const applyRelaySettings = () => {
    const relay = {
      mode: settingRelayMode?.value ?? "off",
      directions: {
        tcp: settingTcpDirection?.value ?? "both",
        auto: settingAutoDirection?.value ?? "both",
        rnode: settingRnodeDirection?.value ?? "both",
      },
    };
    localStorage.setItem("tp-relay-config", JSON.stringify(relay));
    host.send({ type: "set-relay-config", ...relay });
  };
  try {
    const savedRelay = JSON.parse(
      localStorage.getItem("tp-relay-config") ?? "{}",
    );
    if (
      settingRelayMode &&
      ["off", "bridge", "transport-node"].includes(savedRelay.mode)
    ) {
      settingRelayMode.value = savedRelay.mode;
    }
    for (const [element, kind] of [
      [settingTcpDirection, "tcp"],
      [settingAutoDirection, "auto"],
      [settingRnodeDirection, "rnode"],
    ]) {
      const value = savedRelay.directions?.[kind];
      if (element && ["tx", "rx", "both"].includes(value))
        element.value = value;
    }
  } catch {
    // Ignore malformed local relay settings.
  }
  for (const element of [
    settingRelayMode,
    settingTcpDirection,
    settingAutoDirection,
    settingRnodeDirection,
  ]) {
    element?.addEventListener("change", applyRelaySettings);
  }
  applyRelaySettings();

  const applyAiSettings = () => {
    const config = {
      baseUrl: settingAiUrl?.value.trim() ?? "",
      apiKey: settingAiKey?.value.trim() ?? "",
      model: settingAiModel?.value.trim() ?? "",
      embeddingModel: settingAiEmbeddingModel?.value.trim() ?? "",
    };
    localStorage.setItem(
      "tp-ai-config",
      JSON.stringify({
        baseUrl: config.baseUrl,
        model: config.model,
        embeddingModel: config.embeddingModel,
      }),
    );
    host.send({
      type: "set-ai-config",
      config: config.baseUrl && config.apiKey ? config : null,
    });
  };

  try {
    const savedAi = JSON.parse(localStorage.getItem("tp-ai-config") ?? "{}");
    if (settingAiUrl && savedAi.baseUrl) settingAiUrl.value = savedAi.baseUrl;
    if (settingAiModel && savedAi.model) settingAiModel.value = savedAi.model;
    if (settingAiEmbeddingModel && savedAi.embeddingModel)
      settingAiEmbeddingModel.value = savedAi.embeddingModel;
  } catch {
    // ignore malformed saved settings
  }

  for (const element of [
    settingAiUrl,
    settingAiKey,
    settingAiModel,
    settingAiEmbeddingModel,
  ]) {
    element?.addEventListener("change", applyAiSettings);
  }

  const applyFreenetSettings = () => {
    const enabled = settingFreenet?.checked === true;
    const interfaceEnabled = settingFreenetInterface?.checked === true;
    const url = settingFreenetUrl?.value.trim() ?? "";
    const authToken = settingFreenetToken?.value.trim() ?? "";
    const rendezvousHex = settingFreenetRendezvous?.value.trim() ?? "";
    const localDirection = settingFreenetDirection?.value === "1" ? 1 : 0;
    localStorage.setItem(
      "tp-freenet-config",
      JSON.stringify({
        enabled,
        interfaceEnabled,
        url: url.length > 0 ? url : undefined,
        rendezvousHex: rendezvousHex.length > 0 ? rendezvousHex : undefined,
        localDirection,
      }),
    );
    host.send({
      type: "set-freenet-config",
      enabled,
      interfaceEnabled,
      url: url.length > 0 ? url : null,
      ...(authToken.length > 0 ? { authToken } : {}),
      ...(rendezvousHex.length > 0 ? { rendezvousHex } : {}),
      localDirection,
    });
  };

  try {
    const savedFreenet = JSON.parse(
      localStorage.getItem("tp-freenet-config") ?? "{}",
    );
    if (settingFreenet && typeof savedFreenet.enabled === "boolean")
      settingFreenet.checked = savedFreenet.enabled;
    if (
      settingFreenetInterface &&
      typeof savedFreenet.interfaceEnabled === "boolean"
    ) {
      settingFreenetInterface.checked = savedFreenet.interfaceEnabled;
    }
    if (settingFreenetUrl && typeof savedFreenet.url === "string")
      settingFreenetUrl.value = savedFreenet.url;
    if (
      settingFreenetRendezvous &&
      typeof savedFreenet.rendezvousHex === "string"
    ) {
      settingFreenetRendezvous.value = savedFreenet.rendezvousHex;
    }
    if (settingFreenetDirection) {
      settingFreenetDirection.value =
        savedFreenet.localDirection === 1 ? "1" : "0";
    }
  } catch {
    // ignore malformed saved settings
  }

  for (const element of [
    settingFreenet,
    settingFreenetUrl,
    settingFreenetToken,
    settingFreenetInterface,
    settingFreenetRendezvous,
    settingFreenetDirection,
  ]) {
    element?.addEventListener("change", applyFreenetSettings);
  }

  if (
    settingFreenet?.checked === true ||
    settingFreenetInterface?.checked === true
  ) {
    applyFreenetSettings();
  }
}
