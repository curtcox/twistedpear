import { announce, presence, ui } from "@twistedpear/miniapp-sdk";

// The smallest announce worth sending. Three single-character keys and a bounded
// status code — under 40 bytes on the wire. The pacing matters as much as the size:
// a LoRa interface has a duty cycle, and an app that beacons every ten seconds is an
// app that makes the channel unusable for everyone in range.

const MIN_INTERVAL_MS = 5 * 60 * 1000;
const STATES = ["ok", "busy", "help", "off"];

let state = "ok";
let note = "";
let lastSentAt = 0;
let auto = false;
let timer = null;
let peers = 0;
let status = "";

function payload() {
  // s = state index, n = short note, t = minutes since the hour, for coarse freshness
  return { s: STATES.indexOf(state), n: note.slice(0, 12), t: new Date().getUTCMinutes() };
}

function payloadBytes() {
  return new TextEncoder().encode(JSON.stringify(payload())).length;
}

async function beacon(manual) {
  const since = Date.now() - lastSentAt;
  if (!manual && since < MIN_INTERVAL_MS) return;
  if (manual && since < 30_000) {
    status = "Too soon. Give the channel a rest.";
    return;
  }
  await announce.publish(new TextEncoder().encode(JSON.stringify(payload())), "beacon-lite");
  lastSentAt = Date.now();
  status = `Beaconed ${payloadBytes()} bytes at ${new Date().toLocaleTimeString()}`;
  await render();
}

async function render() {
  try {
    peers = (await presence.snapshot()).peers;
  } catch (error) {
    peers = 0;
  }
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Beacon lite" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "states",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: STATES.map((option) => ({
            id: `state-${option}`,
            type: "button",
            props: { label: option === state ? `● ${option}` : option, event: `bl.state.${option}` }
          }))
        },
        {
          id: "note",
          type: "text-input",
          props: { value: note, placeholder: "12 characters, no more", event: "bl.note" }
        },
        {
          id: "size",
          type: "text",
          props: { value: `${payloadBytes()} bytes per beacon · ${peers} peers in range` },
          style: { fontSize: 12 }
        },
        {
          id: "auto-label",
          type: "text",
          props: { value: `Repeat every ${MIN_INTERVAL_MS / 60000} minutes` }
        },
        {
          id: "auto",
          type: "switch",
          props: { value: auto, event: "bl.auto" }
        },
        { id: "send", type: "button", props: { label: "Beacon now", event: "bl.send" } },
        { id: "status", type: "text", props: { value: status }, style: { fontSize: 12 } },
        {
          id: "warning",
          type: "text",
          props: {
            value: "Closing the app stops the beacon. Nothing runs in the background."
          },
          style: { fontSize: 12 }
        }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event.startsWith("bl.state.")) state = event.slice("bl.state.".length);
  else if (event === "bl.note" && typeof value === "string") note = value.slice(0, 12);
  else if (event === "bl.send") {
    await beacon(true);
    return;
  } else if (event === "bl.auto") {
    auto = value === true;
    if (auto) {
      timer = setInterval(() => void beacon(false), MIN_INTERVAL_MS);
    } else if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  } else return;
  await render();
});

await render();
