/**
 * W-S3 browser spike: render golden widget trees with react-native-web.
 * Bundled for Playwright; reports status on window.__WEB_WIDGET__.
 */
// @ts-nocheck


import React from "react";
import { createRoot } from "react-dom/client";
import { validateWidgetTree } from "../../packages/miniapp-runtime/dist/ui/validate.js";
import { MiniappWidgetTree } from "../../packages/widget-renderer-rn/dist/index.js";

const helloTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      { id: "title", type: "text", props: { value: "Hello" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "go", type: "button", props: { label: "Tap me", event: "hello.tap" } }
    ]
  }
});

const chatTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Chat" }, style: { fontSize: 20, fontWeight: "bold" } },
      {
        id: "peer-input",
        type: "text-input",
        props: { value: "", placeholder: "Peer app id", event: "chat.peer" }
      },
      { id: "send", type: "button", props: { label: "Send hello", event: "chat.send" } },
      {
        id: "inbox-scroll",
        type: "scroll",
        children: [{ id: "inbox", type: "text", props: { value: "No messages yet" } }]
      },
      {
        id: "actions",
        type: "list",
        children: [
          { id: "list-label", type: "text", props: { value: "List child" } },
          { id: "list-action", type: "button", props: { label: "List action", event: "chat.list" } }
        ]
      }
    ]
  }
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  globalThis.__WEB_WIDGET__ = {
    status: "running",
    hello: null,
    chat: null,
    event: null
  };

  const helloRoot = document.getElementById("hello-root");
  const chatRoot = document.getElementById("chat-root");
  if (helloRoot === null || chatRoot === null) {
    throw new Error("Missing render roots");
  }

  let lastEvent = null;
  createRoot(helloRoot).render(
    React.createElement(MiniappWidgetTree, {
      tree: helloTree,
      onEvent: (nodeId, event) => {
        lastEvent = `${nodeId}:${event}`;
      }
    })
  );

  createRoot(chatRoot).render(React.createElement(MiniappWidgetTree, { tree: chatTree }));

  await sleep(100);

  const helloText = helloRoot.textContent ?? "";
  if (!helloText.includes("Hello") || !helloText.includes("Tap me")) {
    throw new Error(`hello tree render failed: ${JSON.stringify(helloText)}`);
  }

  globalThis.__WEB_WIDGET__.hello = "ok";

  const chatText = chatRoot.textContent ?? "";
  if (!chatText.includes("Chat") || !chatText.includes("Send hello") || !chatText.includes("No messages yet")) {
    throw new Error(`chat tree render failed: ${JSON.stringify(chatText)}`);
  }
  if (!chatText.includes("List child") || !chatText.includes("List action")) {
    throw new Error(`list children render failed: ${JSON.stringify(chatText)}`);
  }

  const peerInput = chatRoot.querySelector("input");
  if (peerInput === null || peerInput.getAttribute("placeholder") !== "Peer app id") {
    throw new Error(`chat peer input placeholder missing: ${peerInput?.getAttribute("placeholder") ?? "no input"}`);
  }

  globalThis.__WEB_WIDGET__.chat = "ok";

  const tapLabel = Array.from(helloRoot.querySelectorAll("*")).find(
    (element) => element.textContent === "Tap me"
  );
  const tapTarget = tapLabel?.closest("[tabindex],button,a,[role='button']") ?? tapLabel?.parentElement;
  if (tapTarget === null || tapTarget === undefined) {
    throw new Error("hello tree button not found");
  }

  tapTarget.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await sleep(50);

  if (lastEvent !== "go:hello.tap") {
    throw new Error(`hello button event mismatch: ${JSON.stringify(lastEvent)}`);
  }

  globalThis.__WEB_WIDGET__.event = "ok";
  globalThis.__WEB_WIDGET__.status = "done";
}

main().catch((error) => {
  globalThis.__WEB_WIDGET__ = {
    status: "error",
    hello: globalThis.__WEB_WIDGET__?.hello ?? null,
    chat: globalThis.__WEB_WIDGET__?.chat ?? null,
    event: globalThis.__WEB_WIDGET__?.event ?? null,
    message: error instanceof Error ? error.message : String(error)
  };
});
