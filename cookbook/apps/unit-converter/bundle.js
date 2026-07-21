import { ui } from "@twistedpear/miniapp-sdk";

// Everything this app does happens in memory. No capabilities, no grant dialog,
// no state that outlives the process. Uninstalling it leaves nothing behind.

const UNITS = [
  { id: "km-mi", label: "kilometres → miles", factor: 0.621371, suffix: "mi" },
  { id: "m-ft", label: "metres → feet", factor: 3.28084, suffix: "ft" },
  { id: "kg-lb", label: "kilograms → pounds", factor: 2.20462, suffix: "lb" },
  { id: "l-gal", label: "litres → US gallons", factor: 0.264172, suffix: "gal" },
  { id: "km-nm", label: "kilometres → nautical miles", factor: 0.539957, suffix: "NM" }
];

let selected = UNITS[0];
let raw = "";

function converted() {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return "—";
  return `${(value * selected.factor).toFixed(3)} ${selected.suffix}`;
}

async function render() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      style: { padding: 16, gap: 12 },
      children: [
        {
          id: "title",
          type: "text",
          props: { value: "Unit converter" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "input",
          type: "text-input",
          props: { value: raw, placeholder: "Enter a value", event: "conv.input" }
        },
        {
          id: "units",
          type: "list",
          style: { gap: 4 },
          children: UNITS.map((unit) => ({
            id: `unit-${unit.id}`,
            type: "button",
            props: {
              label: unit.id === selected.id ? `● ${unit.label}` : `○ ${unit.label}`,
              event: `conv.select.${unit.id}`
            }
          }))
        },
        { id: "divider", type: "divider" },
        {
          id: "result",
          type: "text",
          props: { value: converted() },
          style: { fontSize: 32, fontWeight: "bold" }
        },
        {
          id: "footnote",
          type: "text",
          props: { value: "Works with the radio off. Nothing is stored or sent." },
          style: { fontSize: 12 }
        }
      ]
    }
  });
}

ui.onEvent(async ({ event, value }) => {
  if (event === "conv.input" && typeof value === "string") {
    raw = value;
  } else if (event.startsWith("conv.select.")) {
    const id = event.slice("conv.select.".length);
    selected = UNITS.find((unit) => unit.id === id) ?? selected;
  } else {
    return;
  }
  await render();
});

await render();
