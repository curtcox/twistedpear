/** DOM widget renderer — mirrors harness-mobile MiniappWidgetTree contract. */

export function renderWidgetTree(root, container, onEvent, options = {}) {
  container.replaceChildren();
  if (!root?.root) {
    container.textContent = "No widget tree";
    return;
  }

  container.appendChild(renderNode(root.root, onEvent, options));
}

function renderNode(node, onEvent, options = {}) {
  const style = node.style ?? {};

  switch (node.type) {
    case "view": {
      const element = document.createElement("div");
      element.className = "widget-view";
      applyStyle(element, style);
      for (const child of node.children ?? []) {
        element.appendChild(renderNode(child, onEvent, options));
      }
      return element;
    }
    case "text": {
      const element = document.createElement("p");
      element.textContent = String(node.props?.value ?? "");
      applyStyle(element, style);
      return element;
    }
    case "button": {
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
    case "text-input": {
      const element = document.createElement("input");
      element.className = "widget-input";
      element.value = String(node.props?.value ?? "");
      element.placeholder = String(node.props?.placeholder ?? "");
      applyStyle(element, style);
      element.addEventListener("input", () => {
        const event = node.props?.event;
        if (typeof event === "string") {
          onEvent?.(node.id, event, element.value);
        }
      });
      return element;
    }
    case "switch": {
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
    case "scroll": {
      const element = document.createElement("div");
      element.className = "widget-scroll";
      element.dataset.testid = node.id;
      element.style.overflow = "auto";
      const offset = typeof node.props?.scrollOffset === "number" ? node.props.scrollOffset : 0;
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
    case "divider": {
      const element = document.createElement("hr");
      element.className = "widget-divider";
      return element;
    }
    case "spacer": {
      const element = document.createElement("div");
      element.className = "widget-spacer";
      return element;
    }
    case "progress": {
      const element = document.createElement("progress");
      element.className = "widget-progress";
      element.max = 1;
      const value = Number(node.props?.value ?? 0);
      element.value = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
      element.setAttribute("aria-label", `Progress ${Math.round(element.value * 100)}%`);
      applyStyle(element, style);
      return element;
    }
    case "list": {
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
    case "image": {
      const element = document.createElement("p");
      element.className = "widget-muted";
      element.textContent = `Image: ${String(node.props?.asset ?? "")}`;
      return element;
    }
    case "code-editor": {
      const element = document.createElement("textarea");
      element.className = "widget-input widget-code-editor";
      element.spellcheck = false;
      element.readOnly = Boolean(node.props?.readOnly);
      const documentId = String(node.props?.documentId ?? "");
      element.dataset.documentId = documentId;
      applyStyle(element, style);

      // Content-by-reference: the tree carries only a documentId; the host
      // resolves file content itself, so app state stays in the workspace.
      if (typeof options.readDocument === "function" && documentId.length > 0) {
        void options.readDocument(documentId).then(
          (content) => {
            if (typeof content === "string" && document.activeElement !== element) {
              element.value = content;
            }
          },
          () => {
            element.placeholder = `Unable to load ${documentId}`;
          }
        );
      }

      let debounce = null;
      element.addEventListener("input", () => {
        const event = node.props?.event;
        if (typeof event !== "string") {
          return;
        }

        if (debounce !== null) {
          clearTimeout(debounce);
        }
        debounce = setTimeout(() => {
          debounce = null;
          onEvent?.(node.id, event, { documentId, text: element.value });
        }, 300);
      });
      return element;
    }
    case "qr-code": {
      const element = document.createElement("figure");
      element.className = "widget-qr";
      const value = String(node.props?.value ?? "");
      const qrFactory = globalThis.qrcode;
      if (typeof qrFactory === "function") {
        try {
          const qr = qrFactory(0, "M");
          qr.addData(value);
          qr.make();
          const svgHost = document.createElement("div");
          svgHost.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
          const svg = svgHost.firstElementChild;
          if (svg !== null) {
            const size = typeof node.props?.size === "number" ? node.props.size : 192;
            svg.setAttribute("width", String(size));
            svg.setAttribute("height", String(size));
            element.appendChild(svg);
          }
        } catch {
          // fall through to the copyable string below
        }
      }

      const text = document.createElement("figcaption");
      text.className = "widget-qr-value";
      text.textContent = value;
      element.appendChild(text);

      if (typeof node.props?.caption === "string") {
        const caption = document.createElement("p");
        caption.className = "widget-muted";
        caption.textContent = node.props.caption;
        element.appendChild(caption);
      }
      return element;
    }
    default: {
      const element = document.createElement("p");
      element.className = "widget-muted";
      element.textContent = `Unsupported node: ${node.type}`;
      return element;
    }
  }
}

function applyStyle(element, style) {
  if (style.display !== undefined) {
    element.style.display = style.display;
  }

  if (style.flexDirection !== undefined) {
    element.style.flexDirection = style.flexDirection;
  }

  if (style.alignItems !== undefined) {
    element.style.alignItems = style.alignItems;
  }

  if (style.justifyContent !== undefined) {
    element.style.justifyContent = style.justifyContent;
  }

  if (style.padding !== undefined) {
    element.style.padding = `${style.padding}px`;
  }

  if (style.gap !== undefined) {
    element.style.gap = `${style.gap}px`;
  }

  if (style.margin !== undefined) {
    element.style.margin = `${style.margin}px`;
  }

  if (style.width !== undefined) {
    element.style.width = typeof style.width === "number" ? `${style.width}px` : style.width;
  }

  if (style.height !== undefined) {
    element.style.height = typeof style.height === "number" ? `${style.height}px` : style.height;
  }

  if (style.backgroundColor !== undefined) {
    element.style.backgroundColor = style.backgroundColor;
  }

  if (style.color !== undefined) {
    element.style.color = style.color;
  }

  if (style.fontSize !== undefined) {
    element.style.fontSize = `${style.fontSize}px`;
  }

  if (style.fontWeight !== undefined) {
    element.style.fontWeight = String(style.fontWeight);
  }
}
