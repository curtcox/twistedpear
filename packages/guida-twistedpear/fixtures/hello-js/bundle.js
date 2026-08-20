import { ui } from "@twistedpear/miniapp-sdk";

let taps = 0;

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        { id: "title", type: "text", props: { value: "Hello" }, style: { fontSize: 20, fontWeight: "bold" } },
        { id: "tap", type: "button", props: { label: "Tap me", event: "tap" } },
        { id: "count", type: "text", props: { value: `Taps: ${taps}` } }
      ]
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event !== "tap") return;
  taps += 1;
  await render();
});

await render();
