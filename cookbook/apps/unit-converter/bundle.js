import { ui } from "@twistedpear/miniapp-sdk";

// Everything this app does happens in memory. No capabilities, no grant dialog,
// no state that outlives the process. Uninstalling it leaves nothing behind.

// `icon` names an `assets/<name>.svg` the host draws beside each unit, so the kind of
// quantity (distance, mass, volume, nautical) is legible before reading the label. The
// SVGs are separate files to keep this bundle small and readable.
const UNITS = [
  { id: "km-mi", label: "kilometres → miles", factor: 0.621371, suffix: "mi", icon: "distance" },
  { id: "m-ft", label: "metres → feet", factor: 3.28084, suffix: "ft", icon: "distance" },
  { id: "kg-lb", label: "kilograms → pounds", factor: 2.20462, suffix: "lb", icon: "mass" },
  { id: "l-gal", label: "litres → US gallons", factor: 0.264172, suffix: "gal", icon: "volume" },
  { id: "km-nm", label: "kilometres → nautical miles", factor: 0.539957, suffix: "NM", icon: "nautical" }
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
            id: `unit-${unit.id}-row`,
            type: "view",
            style: { flexDirection: "row", alignItems: "center", gap: 8 },
            children: [
              {
                id: `unit-${unit.id}-icon`,
                type: "image",
                props: { asset: unit.icon, alt: unit.icon },
                style: { width: 22, height: 22 }
              },
              {
                id: `unit-${unit.id}`,
                type: "button",
                props: {
                  label: unit.id === selected.id ? `● ${unit.label}` : `○ ${unit.label}`,
                  event: `conv.select.${unit.id}`
                }
              }
            ]
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
