/** DOM widget renderer — mirrors harness-mobile MiniappWidgetTree contract. */

export function renderWidgetTree(root, container, onEvent) {
  container.replaceChildren();
  if (!root?.root) {
    container.textContent = "No widget tree";
    return;
  }

  container.appendChild(renderNode(root.root, onEvent));
}

function renderNode(node, onEvent) {
  const style = node.style ?? {};

  switch (node.type) {
    case "view": {
      const element = document.createElement("div");
      element.className = "widget-view";
      applyStyle(element, style);
      for (const child of node.children ?? []) {
        element.appendChild(renderNode(child, onEvent));
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
      applyStyle(element, style);
      for (const child of node.children ?? []) {
        element.appendChild(renderNode(child, onEvent));
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
      const element = document.createElement("p");
      element.textContent = `Progress ${String(node.props?.value ?? 0)}%`;
      return element;
    }
    case "list": {
      const element = document.createElement("div");
      for (const item of Array.isArray(node.props?.items) ? node.props.items : []) {
        const row = document.createElement("p");
        row.className = "widget-muted";
        row.textContent = typeof item === "string" ? item : JSON.stringify(item);
        element.appendChild(row);
      }
      return element;
    }
    case "image": {
      const element = document.createElement("p");
      element.className = "widget-muted";
      element.textContent = `Image: ${String(node.props?.asset ?? "")}`;
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
  if (style.padding !== undefined) {
    element.style.padding = `${style.padding}px`;
  }

  if (style.gap !== undefined) {
    element.style.gap = `${style.gap}px`;
  }

  if (style.fontSize !== undefined) {
    element.style.fontSize = `${style.fontSize}px`;
  }

  if (style.fontWeight !== undefined) {
    element.style.fontWeight = String(style.fontWeight);
  }
}
