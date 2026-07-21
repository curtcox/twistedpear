import { ui } from "@twistedpear/miniapp-sdk";

// A render loop, and therefore a rate-limit problem. The broker allows 60 messages per
// second per app; this app renders four times a second, which is deliberate. Anything
// approaching the ceiling will be throttled and the animation will stutter.

const PHASES = [
  { name: "Breathe in", seconds: 4 },
  { name: "Hold", seconds: 4 },
  { name: "Breathe out", seconds: 4 },
  { name: "Hold", seconds: 4 }
];
const TICK_MS = 250;

let running = false;
let phaseIndex = 0;
let elapsedMs = 0;
let cycles = 0;
let timer = null;

function phase() {
  return PHASES[phaseIndex];
}

function progress() {
  return Math.min(1, elapsedMs / (phase().seconds * 1000));
}

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 24, gap: 16, alignItems: "center" },
      children: [
        {
          id: "phase",
          type: "text",
          props: { value: running ? phase().name : "Ready" },
          style: { fontSize: 32, fontWeight: "bold" }
        },
        {
          id: "bar",
          type: "progress",
          props: { value: running ? progress() : 0 }
        },
        {
          id: "count",
          type: "text",
          props: { value: `Cycles: ${cycles}` }
        },
        {
          id: "toggle",
          type: "button",
          props: { label: running ? "Stop" : "Start", event: "pace.toggle" }
        },
        {
          id: "note",
          type: "text",
          props: {
            value: "Stopping the app stops the pacer. Mini-apps do not run in the background."
          },
          style: { fontSize: 12 }
        }
      ]
    }
  });
}

async function tick() {
  elapsedMs += TICK_MS;
  if (elapsedMs >= phase().seconds * 1000) {
    elapsedMs = 0;
    phaseIndex = (phaseIndex + 1) % PHASES.length;
    if (phaseIndex === 0) cycles += 1;
  }
  await render();
}

ui.onEvent(async ({ event }) => {
  if (event !== "pace.toggle") return;
  running = !running;
  if (running) {
    phaseIndex = 0;
    elapsedMs = 0;
    timer = setInterval(() => void tick(), TICK_MS);
  } else if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
  await render();
});

await render();
