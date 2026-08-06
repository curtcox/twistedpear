/**
 * Handbook applet: validate that every widget component type can appear in a tree.
 * Inline mode shares the Handbook sandbox; the runtime re-renders the chapter after.
 */
export async function run(sdk, report) {
  const started = Date.now();
  try {
    await sdk.workspace.write("probes/widget-gallery.txt", "gallery-seed");

    await sdk.ui.render({
      root: {
        id: "gallery-root",
        type: "scroll",
        style: { padding: 8, gap: 6 },
        children: [
          {
            id: "g-view",
            type: "view",
            style: { gap: 4 },
            children: [
              {
                id: "g-text",
                type: "text",
                props: { value: "Widget gallery" },
              },
              {
                id: "g-image",
                type: "image",
                props: { asset: "handbook-icon", alt: "icon" },
              },
              {
                id: "g-button",
                type: "button",
                props: { label: "Ok", event: "hb.gallery.noop" },
              },
              {
                id: "g-input",
                type: "text-input",
                props: {
                  value: "",
                  placeholder: "type",
                  event: "hb.gallery.input",
                },
              },
              {
                id: "g-switch",
                type: "switch",
                props: { value: false, event: "hb.gallery.switch" },
              },
              { id: "g-progress", type: "progress", props: { value: 0.4 } },
              { id: "g-divider", type: "divider" },
              { id: "g-spacer", type: "spacer", props: { size: 8 } },
              {
                id: "g-list",
                type: "list",
                props: { items: ["item-a", "item-b"] },
              },
              {
                id: "g-editor",
                type: "code-editor",
                props: {
                  documentId: "probes/widget-gallery.txt",
                  language: "text",
                  readOnly: true,
                },
              },
              {
                id: "g-qr",
                type: "qr-code",
                props: {
                  value: "handbook-gallery",
                  caption: "gallery",
                  size: 96,
                },
              },
            ],
          },
        ],
      },
    });

    report({
      status: "pass",
      details:
        "Rendered scroll/view/text/image/button/text-input/switch/progress/divider/spacer/list/code-editor/qr-code",
      timings: { ms: Date.now() - started },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const notGranted =
      /CAPABILITY_DENIED|has not been granted|Capability/i.test(message);
    report({
      status: notGranted ? "not-granted" : "fail",
      details: message,
      timings: { ms: Date.now() - started },
    });
  }
}
