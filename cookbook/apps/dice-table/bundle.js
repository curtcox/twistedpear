import { ui } from "@twistedpear/miniapp-sdk";

// A bounded history kept in memory. The cap matters: an unbounded array would grow
// the widget tree until it hit the 5,000-node limit and ui.render started rejecting.

const HISTORY_LIMIT = 12;
const DICE = [4, 6, 8, 10, 12, 20];

/** @type {{ label: string; result: string }[]} */
let history = [];

function roll(sides) {
  return 1 + Math.floor(Math.random() * sides);
}

function record(label, result) {
  history = [{ label, result }, ...history].slice(0, HISTORY_LIMIT);
}

// An `image` widget names its art by `asset`; the host resolves the name to a file
// under this app's assets/ directory. Keeping the SVGs out of this bundle is why the
// die/coin/card faces do not bloat the source. Each history label doubles as an asset
// name (d4…d20, coin, card), so the latest roll can show its own icon.

/** @typedef {import("@twistedpear/miniapp-runtime").WidgetTree["root"]} WidgetNode */

/**
 * A square icon that renders `assets/<asset>.svg` at the given side length.
 * @returns {WidgetNode}
 */
function icon(id, asset, side) {
  return { id, type: "image", props: { asset, alt: asset }, style: { width: side, height: side } };
}

/**
 * A labelled button with its die/coin face stacked above it.
 * @returns {WidgetNode}
 */
function iconButton(id, asset, label, event) {
  return {
    id: `${id}-col`,
    type: "view",
    style: { alignItems: "center", gap: 4 },
    children: [
      icon(`${id}-icon`, asset, 32),
      { id, type: "button", props: { label, event } }
    ]
  };
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
          props: { value: "Dice table" },
          style: { fontSize: 20, fontWeight: "bold" }
        },
        {
          id: "dice-row",
          type: "view",
          style: { flexDirection: "row", gap: 8 },
          children: DICE.map((sides) => iconButton(`d${sides}`, `d${sides}`, `d${sides}`, `dice.roll.${sides}`))
        },
        {
          id: "extras",
          type: "view",
          style: { flexDirection: "row", alignItems: "center", gap: 8 },
          children: [
            iconButton("coin", "coin", "Coin", "dice.coin"),
            iconButton("card", "card", "Card", "dice.card"),
            { id: "clear", type: "button", props: { label: "Clear", event: "dice.clear" } }
          ]
        },
        { id: "divider", type: "divider" },
        {
          id: "latest-row",
          type: "view",
          style: { flexDirection: "row", alignItems: "center", gap: 12 },
          children: [
            ...(history.length === 0 ? [] : [icon("latest-icon", history[0].label, 44)]),
            {
              id: "latest",
              type: "text",
              props: { value: history.length === 0 ? "—" : history[0].result },
              style: { fontSize: 32, fontWeight: "bold" }
            }
          ]
        },
        {
          id: "history",
          type: "scroll",
          children: [
            {
              id: "history-list",
              type: "list",
              style: { gap: 2 },
              children: history.slice(1).map((entry, index) => ({
                id: `history-${index}`,
                type: "text",
                props: { value: `${entry.label}: ${entry.result}` },
                style: { fontSize: 14 }
              }))
            }
          ]
        }
      ]
    }
  });
}

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

ui.onEvent(async ({ event }) => {
  if (event.startsWith("dice.roll.")) {
    const sides = Number.parseInt(event.slice("dice.roll.".length), 10);
    record(`d${sides}`, String(roll(sides)));
  } else if (event === "dice.coin") {
    record("coin", roll(2) === 1 ? "Heads" : "Tails");
  } else if (event === "dice.card") {
    record("card", `${RANKS[roll(13) - 1]}${SUITS[roll(4) - 1]}`);
  } else if (event === "dice.clear") {
    history = [];
  } else {
    return;
  }
  await render();
});

await render();
