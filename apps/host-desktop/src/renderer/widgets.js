/** DOM widget renderer — mirrors harness-mobile MiniappWidgetTree contract. */

export function renderWidgetTree(root, container, onEvent, options = {}) {
  container.replaceChildren();
  if (!root?.root) {
    container.textContent = "No widget tree";
    return;
  }

  container.appendChild(renderNode(root.root, onEvent, options));
}

function renderViewNode(node, onEvent, options, style) {
  const element = document.createElement("div");
  element.className = "widget-view";
  applyStyle(element, style);
  for (const child of node.children ?? []) {
    element.appendChild(renderNode(child, onEvent, options));
  }
  return element;
}

function renderTextNode(node, onEvent, options, style) {
  const element = document.createElement("p");
  element.textContent = String(node.props?.value ?? "");
  applyStyle(element, style);
  return element;
}

function renderButtonNode(node, onEvent, options, style) {
  const element = document.createElement("button");
  element.className = "widget-button";
  element.textContent = String(node.props?.label ?? "Button");
  applyStyle(element, style);
  element.addEventListener("click", () => {
    const event = node.props?.event;
    if (typeof event === "string") {
      onEvent?.(node.id, event);
    }
  });
  return element;
}

function applyTextInputKeyboard(element, node) {
  element.type = node.props?.secure === true ? "password" : "text";
  if (node.props?.keyboard === "numeric") element.inputMode = "numeric";
  if (node.props?.keyboard === "email") element.type = "email";
  if (node.props?.keyboard === "url") element.type = "url";
}

function renderTextInputNode(node, onEvent, options, style) {
  const element = document.createElement(
    node.props?.multiline === true ? "textarea" : "input",
  );
  element.className = "widget-input";
  if (element instanceof HTMLInputElement) {
    applyTextInputKeyboard(element, node);
  }
  element.value = String(node.props?.value ?? "");
  if ("placeholder" in element) {
    element.placeholder = String(node.props?.placeholder ?? "");
  }
  applyStyle(element, style);
  bindStringValueEvent(element, node, onEvent, "input");
  return element;
}

function bindStringValueEvent(element, node, onEvent, domEvent) {
  element.addEventListener(domEvent, () => {
    const event = node.props?.event;
    if (typeof event === "string") {
      onEvent?.(node.id, event, element.value);
    }
  });
}

function renderSelectNode(node, onEvent, options, style) {
  const element = document.createElement("select");
  element.className = "widget-input";
  const items = Array.isArray(node.props?.options) ? node.props.options : [];
  for (const option of items) {
    const item = document.createElement("option");
    item.value = String(option);
    item.textContent = String(option);
    element.appendChild(item);
  }
  element.value = String(node.props?.value ?? "");
  applyStyle(element, style);
  bindStringValueEvent(element, node, onEvent, "change");
  return element;
}

function renderSliderNode(node, onEvent, options, style) {
  const element = document.createElement("input");
  element.type = "range";
  element.min = String(node.props?.min ?? 0);
  element.max = String(node.props?.max ?? 100);
  if (typeof node.props?.step === "number") {
    element.step = String(node.props.step);
  }
  element.value = String(node.props?.value ?? 0);
  applyStyle(element, style);
  element.addEventListener("input", () => {
    const event = node.props?.event;
    if (typeof event === "string") {
      onEvent?.(node.id, event, Number(element.value));
    }
  });
  return element;
}

function renderDateNode(node, onEvent, options, style) {
  const element = document.createElement("input");
  element.type = "date";
  element.value = String(node.props?.value ?? "");
  applyStyle(element, style);
  bindStringValueEvent(element, node, onEvent, "change");
  return element;
}

function renderSwitchNode(node, onEvent) {
  const element = document.createElement("input");
  element.type = "checkbox";
  element.checked = Boolean(node.props?.value);
  element.addEventListener("change", () => {
    const event = node.props?.event;
    if (typeof event === "string") {
      onEvent?.(node.id, event, element.checked);
    }
  });
  return element;
}

function renderScrollNode(node, onEvent, options, style) {
  const element = document.createElement("div");
  element.className = "widget-scroll";
  element.dataset.testid = node.id;
  element.style.overflow = "auto";
  const offset =
    typeof node.props?.scrollOffset === "number" ? node.props.scrollOffset : 0;
  if (offset > 0) {
    element.scrollTop = offset;
  }
  element.addEventListener("scroll", () => {
    const event = node.props?.event;
    if (typeof event === "string") {
      onEvent?.(node.id, event, { y: element.scrollTop });
    }
  });
  applyStyle(element, style);
  for (const child of node.children ?? []) {
    element.appendChild(renderNode(child, onEvent, options));
  }
  return element;
}

function renderDividerNode() {
  const element = document.createElement("hr");
  element.className = "widget-divider";
  return element;
}

function renderSpacerNode() {
  const element = document.createElement("div");
  element.className = "widget-spacer";
  return element;
}

function renderProgressNode(node, onEvent, options, style) {
  const element = document.createElement("progress");
  element.className = "widget-progress";
  element.max = 1;
  const value = Number(node.props?.value ?? 0);
  element.value = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  element.setAttribute(
    "aria-label",
    `Progress ${Math.round(element.value * 100)}%`,
  );
  applyStyle(element, style);
  return element;
}

function renderListNode(node, onEvent, options, style) {
  const element = document.createElement("div");
  applyStyle(element, style);
  for (const item of Array.isArray(node.props?.items) ? node.props.items : []) {
    const row = document.createElement("p");
    row.className = "widget-muted";
    row.textContent = typeof item === "string" ? item : JSON.stringify(item);
    element.appendChild(row);
  }
  for (const child of node.children ?? []) {
    element.appendChild(renderNode(child, onEvent, options));
  }
  return element;
}

function renderImageNode(node, onEvent, options, style) {
  const assetName = String(node.props?.asset ?? "");
  const svg = options.assets?.[assetName];
  const alt = typeof node.props?.alt === "string" ? node.props.alt : assetName;
  if (typeof svg === "string") {
    const element = document.createElement("img");
    element.className = "widget-image";
    element.alt = alt;
    element.src = `data:image/svg+xml,${encodeURIComponent(svg)}`;
    applyStyle(element, style);
    return element;
  }
  // No asset supplied for this name: fall back to a readable placeholder.
  const element = document.createElement("p");
  element.className = "widget-muted";
  element.textContent = `Image: ${assetName}`;
  return element;
}

function loadCodeEditorContent(element, options, documentId, setBaseline) {
  if (typeof options.readDocument !== "function" || documentId.length === 0) {
    return;
  }
  // Content-by-reference: the tree carries only a documentId; the host
  // resolves file content itself, so app state stays in the workspace.
  void options.readDocument(documentId).then(
    (content) => {
      if (typeof content === "string" && document.activeElement !== element) {
        element.value = content;
        setBaseline(content);
      }
    },
    () => {
      element.placeholder = `Unable to load ${documentId}`;
    },
  );
}

function bindCodeEditorInput(element, node, onEvent, documentId, state) {
  element.addEventListener("input", () => {
    const event = node.props?.event;
    if (typeof event !== "string") {
      return;
    }
    if (state.debounce !== null) {
      clearTimeout(state.debounce);
    }
    state.debounce = setTimeout(() => {
      state.debounce = null;
      const next = element.value;
      const edit = minimalTextEdit(state.baseline, next);
      if (edit !== null) {
        onEvent?.(node.id, event, {
          documentId,
          baseLength: state.baseline.length,
          edits: [edit],
        });
        state.baseline = next;
      }
    }, 300);
  });
}

function renderCodeEditorNode(node, onEvent, options, style) {
  const element = document.createElement("textarea");
  element.className = "widget-input widget-code-editor";
  element.spellcheck = false;
  element.readOnly = Boolean(node.props?.readOnly);
  const documentId = String(node.props?.documentId ?? "");
  element.dataset.documentId = documentId;
  applyStyle(element, style);
  const state = { baseline: "", debounce: null };
  loadCodeEditorContent(element, options, documentId, (content) => {
    state.baseline = content;
  });
  bindCodeEditorInput(element, node, onEvent, documentId, state);
  return element;
}

function renderQrCodeGraphic(element, node) {
  const value = String(node.props?.value ?? "");
  const qrFactory = globalThis.qrcode;
  if (typeof qrFactory !== "function") return;
  try {
    const qr = qrFactory(0, "M");
    qr.addData(value);
    qr.make();
    const svgHost = document.createElement("div");
    svgHost.innerHTML = qr.createSvgTag({
      cellSize: 4,
      margin: 8,
      scalable: true,
    });
    const svg = svgHost.firstElementChild;
    if (svg === null) return;
    const size = typeof node.props?.size === "number" ? node.props.size : 192;
    svg.setAttribute("width", String(size));
    svg.setAttribute("height", String(size));
    element.appendChild(svg);
  } catch {
    // fall through to the copyable string below
  }
}

function renderQrCodeNode(node) {
  const element = document.createElement("figure");
  element.className = "widget-qr";
  renderQrCodeGraphic(element, node);

  const text = document.createElement("figcaption");
  text.className = "widget-qr-value";
  text.textContent = String(node.props?.value ?? "");
  element.appendChild(text);

  if (typeof node.props?.caption === "string") {
    const caption = document.createElement("p");
    caption.className = "widget-muted";
    caption.textContent = node.props.caption;
    element.appendChild(caption);
  }
  return element;
}

function renderUnsupportedNode(node) {
  const element = document.createElement("p");
  element.className = "widget-muted";
  element.textContent = `Unsupported node: ${node.type}`;
  return element;
}

const NODE_RENDERERS = {
  view: renderViewNode,
  text: renderTextNode,
  button: renderButtonNode,
  "text-input": renderTextInputNode,
  select: renderSelectNode,
  slider: renderSliderNode,
  date: renderDateNode,
  switch: (node, onEvent) => renderSwitchNode(node, onEvent),
  scroll: renderScrollNode,
  divider: renderDividerNode,
  spacer: renderSpacerNode,
  progress: renderProgressNode,
  list: renderListNode,
  image: renderImageNode,
  "code-editor": renderCodeEditorNode,
  "qr-code": (node) => renderQrCodeNode(node),
  "camera-preview": (node, onEvent, options) =>
    renderPreviewSurface(node, options),
  "audio-meter": (node, onEvent, options) => renderPreviewSurface(node, options),
  waveform: (node, onEvent, options) => renderPreviewSurface(node, options),
  "map-preview": (node, onEvent, options) => renderPreviewSurface(node, options),
  "remote-video": (node, onEvent, options) => renderPreviewSurface(node, options),
};

function renderNode(node, onEvent, options = {}) {
  const style = node.style ?? {};
  const renderer = NODE_RENDERERS[node.type] ?? renderUnsupportedNode;
  return renderer(node, onEvent, options, style);
}

/**
 * Host-owned preview surfaces. The sandbox never receives pixels/samples —
 * only an opaque session handle for layout.
 */
function renderCameraPreview(shell, node, live) {
  if (live?.classId !== "camera") return;
  const video = document.createElement("video");
  video.className = "widget-preview-media";
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  shell.appendChild(video);
  if (typeof navigator?.mediaDevices?.getUserMedia !== "function") return;
  void navigator.mediaDevices
    .getUserMedia({ video: true, audio: false })
    .then((stream) => {
      video.srcObject = stream;
      video.dataset.previewStream = "1";
    })
    .catch(() => {
      const note = document.createElement("p");
      note.className = "widget-muted";
      note.textContent = "Camera preview unavailable";
      shell.appendChild(note);
    });
}

function renderMeterPreview(shell) {
  const meter = document.createElement("div");
  meter.className = "widget-preview-meter";
  meter.setAttribute("aria-hidden", "true");
  shell.appendChild(meter);
}

function renderMapPreview(shell, node, live) {
  if (live?.classId !== "location") return;
  const map = document.createElement("p");
  map.className = "widget-muted";
  map.textContent = `Host map preview (zoom ${String(node.props?.zoom ?? 12)}) — coordinates stay in host chrome`;
  shell.appendChild(map);
}

function renderRemoteVideoPreview(shell, node) {
  const remote = document.createElement("p");
  remote.className = "widget-muted";
  remote.textContent = `Remote video shell · peer=${String(node.props?.peer ?? "—")}`;
  shell.appendChild(remote);
}

const PREVIEW_RENDERERS = {
  "camera-preview": renderCameraPreview,
  "audio-meter": renderMeterPreview,
  waveform: renderMeterPreview,
  "map-preview": renderMapPreview,
  "remote-video": renderRemoteVideoPreview,
};

function renderPreviewSurface(node, options = {}) {
  const session = String(node.props?.session ?? "");
  const sessions = Array.isArray(options.deviceSessions)
    ? options.deviceSessions
    : [];
  const live = sessions.find((entry) => entry.handle === session);
  const shell = document.createElement("div");
  shell.className = "widget-preview-surface";
  shell.dataset.testid = node.id;
  applyStyle(shell, node.style ?? {});

  const title = document.createElement("p");
  title.className = "widget-muted";
  title.textContent = live
    ? `${node.type} · ${live.classId}:${live.tierId} · ${live.appId}`
    : `${node.type} · waiting for session`;
  shell.appendChild(title);

  const renderer = PREVIEW_RENDERERS[node.type];
  if (renderer) renderer(shell, node, live);

  return shell;
}

function minimalTextEdit(before, after) {
  if (before === after) return null;
  let start = 0;
  while (
    start < before.length &&
    start < after.length &&
    before[start] === after[start]
  )
    start += 1;
  let beforeEnd = before.length;
  let afterEnd = after.length;
  while (
    beforeEnd > start &&
    afterEnd > start &&
    before[beforeEnd - 1] === after[afterEnd - 1]
  ) {
    beforeEnd -= 1;
    afterEnd -= 1;
  }
  return { start, end: beforeEnd, text: after.slice(start, afterEnd) };
}

const STYLE_APPLIERS = {
  display: (element, value) => {
    element.style.display = value;
  },
  flexDirection: (element, value) => {
    element.style.flexDirection = value;
  },
  alignItems: (element, value) => {
    element.style.alignItems = value;
  },
  justifyContent: (element, value) => {
    element.style.justifyContent = value;
  },
  padding: (element, value) => {
    element.style.padding = `${value}px`;
  },
  gap: (element, value) => {
    element.style.gap = `${value}px`;
  },
  margin: (element, value) => {
    element.style.margin = `${value}px`;
  },
  width: (element, value) => {
    element.style.width = typeof value === "number" ? `${value}px` : value;
  },
  height: (element, value) => {
    element.style.height = typeof value === "number" ? `${value}px` : value;
  },
  backgroundColor: (element, value) => {
    element.style.backgroundColor = value;
  },
  color: (element, value) => {
    element.style.color = value;
  },
  fontSize: (element, value) => {
    element.style.fontSize = `${value}px`;
  },
  fontWeight: (element, value) => {
    element.style.fontWeight = String(value);
  },
};

function applyStyle(element, style) {
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined) continue;
    const apply = STYLE_APPLIERS[key];
    if (apply) apply(element, value);
  }
}
