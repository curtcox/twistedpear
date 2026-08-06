# 2. Apps with no capabilities

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

An app that declares no capabilities cannot store anything, send anything, hear anything, or
read anything about the device it is on. It gets a screen and an event loop. That sounds like
almost nothing, and this chapter exists because it is not.

A zero-capability app installs without a review dialog, because there is nothing to review.
It leaves nothing behind when uninstalled. It cannot leak what it never had. On a platform
whose whole security story is "the grant is the defence", the strongest position an app can
take is to need no grant at all — and a surprising number of genuinely useful tools fit
inside that box.

![Three zero-capability apps, none of which triggered an install review](/cookbook/images/02-chapter-opener.png)

**Screenshot 2.1 — Chapter opener.** Three desktop host captures side by side at equal
size: Unit converter showing "12.4 km → 7.705 mi", Dice table showing a d20 roll of 17 with
a short history beneath, and Breath pacer mid-cycle with its progress bar about a third
filled and "Breathe in" above it. Beneath the trio, a single host **Grants** panel is shown
with all three apps listed and the text "No capabilities requested" against each.

| Recipe                            | Capabilities | Directory                                            |
| --------------------------------- | ------------ | ---------------------------------------------------- |
| [Unit converter](#unit-converter) | _(none)_     | [apps/unit-converter](apps/unit-converter/README.md) |
| [Dice table](#dice-table)         | _(none)_     | [apps/dice-table](apps/dice-table/README.md)         |
| [Breath pacer](#breath-pacer)     | _(none)_     | [apps/breath-pacer](apps/breath-pacer/README.md)     |

---

## Unit converter

> **Capabilities:** none.

Converts between metric, imperial, and navigation units. It is the app you actually want on
a device that may have no network at all, and it is about ninety lines.

![Unit converter running in the host](/cookbook/images/02-unit-converter.png)

**Screenshot 2.2 — Unit converter.** Desktop host at 1280×800. The mini-app surface shows a
heading "Unit converter", a text input containing "12.4", five radio-style buttons stacked
below it with "● kilometres → miles" selected and the other four showing "○", a horizontal
rule, and a large result reading "7.705 mi". A small footnote beneath reads "Works with the
radio off. Nothing is stored or sent."

### The interesting part

The whole app is a pure function from two variables to one string. There is no state to
persist, so there is nothing to load on launch and nothing to save on exit — the app simply
starts empty every time.

```javascript
let selected = UNITS[0];
let raw = "";

function converted() {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return "—";
  return `${(value * selected.factor).toFixed(3)} ${selected.suffix}`;
}
```

The event handler is the other half, and it is the pattern every app in this cookbook uses:
mutate state, then re-render the whole tree. There is no diffing to do by hand — `ui.render`
takes a complete tree every time and the host reconciles it.

```javascript
ui.onEvent(async ({ event, value }) => {
  if (event === "conv.input" && typeof value === "string") {
    raw = value;
  } else if (event.startsWith("conv.select.")) {
    const id = event.slice("conv.select.".length);
    selected = UNITS.find((unit) => unit.id === id) ?? selected;
  } else {
    return; // unknown event: render nothing, change nothing
  }
  await render();
});
```

Note the `else { return; }`. Every recipe here does this. An event you do not recognise
should cost you a comparison and nothing else — not a re-render, and definitely not a broker
call.

Full source: [apps/unit-converter/bundle.js](apps/unit-converter/bundle.js).

### Make it yours

- **Add a unit.** One object in the `UNITS` array. Twenty seconds.
- **Invert the conversion.** Add a swap button that flips `factor` to `1 / factor` and
  rewrites the label. This is where you discover that the label should have been two fields
  all along.
- **Remember the last unit.** Add `storage:kv` and four lines — and notice that you have just
  turned a no-review app into one that asks the user for something. Decide whether it was
  worth it. [Chapter 3](03-apps-that-remember.md) covers the mechanics.
- **Make it a calculator.** The event plumbing is already there; you are replacing
  `converted()` and adding a keypad.

---

## Dice table

> **Capabilities:** none.

Dice, coins, and card draws for a tabletop game, with a visible history so nobody can
re-roll quietly.

![Dice table with a roll history](/cookbook/images/02-dice-table.png)

**Screenshot 2.3 — Dice table.** The mini-app surface with a row of six buttons labelled d4,
d6, d8, d10, d12, d20; a second row reading Coin, Card, Clear; a divider; a very large "17";
and beneath it a scrolling list of eleven smaller history lines such as "d20: 4", "coin:
Heads", "card: Q♥". The history is visibly capped — the list does not run off the bottom of
the surface.

### The interesting part

The history cap is the whole lesson.

```javascript
const HISTORY_LIMIT = 12;

function record(label, result) {
  history = [{ label, result }, ...history].slice(0, HISTORY_LIMIT);
}
```

`ui.render` rejects a tree with more than 5,000 nodes, more than 32 levels of depth, or more
than 256 KiB of serialised size — and it rejects the **whole tree**, so the failure mode is
not "the list gets truncated", it is "the app stops drawing". An unbounded list of anything
is a time bomb with a fuse whose length depends on how much the user enjoys your app.

Cap the data structure, not the render. If you cap it at render time you still pay to keep
the array in memory, and you will forget the cap the next time you add a second list.

Full source: [apps/dice-table/bundle.js](apps/dice-table/bundle.js).

### Make it yours

- **Add dice pools.** "4d6 drop lowest" is a loop and a sort.
- **Add a seed.** Show it, and let the user type one in. Now two people can verify they got
  the same rolls — without either of them needing a network.
- **Deal a hand, not a card.** Shuffling a real deck means keeping deck state, which means
  deciding whether the deck survives a restart, which means [Chapter 3](03-apps-that-remember.md).

---

## Breath pacer

> **Capabilities:** none.

A four-count breathing pacer. Included because it is the only app in the cookbook driven by
a clock rather than by the user, and clocks are where the broker rate limit stops being
theoretical.

![Breath pacer mid-cycle](/cookbook/images/02-breath-pacer.png)

**Screenshot 2.4 — Breath pacer.** The mini-app surface, contents centred: "Breathe in" in
large bold type, a progress bar roughly 40 % filled beneath it, "Cycles: 3", a **Stop**
button, and a small note reading "Stopping the app stops the pacer. Mini-apps do not run in
the background."

### The interesting part

```javascript
const TICK_MS = 250; // four renders per second, against a 60-per-second ceiling

async function tick() {
  elapsedMs += TICK_MS;
  if (elapsedMs >= phase().seconds * 1000) {
    elapsedMs = 0;
    phaseIndex = (phaseIndex + 1) % PHASES.length;
    if (phaseIndex === 0) cycles += 1;
  }
  await render();
}
```

Four renders per second against a ceiling of sixty broker messages per second per app leaves
a factor of fifteen of headroom — deliberately, because `ui.render` is not the only thing
that sends messages, and because the limit is a host default the user can lower.

Anything approaching 60 Hz will be throttled, and a throttled animation looks like a bug in
your app rather than a limit in the host. If you want smooth motion, the honest answer on
this platform is that you cannot have it: there is no animation primitive, and driving one
from JavaScript through a broker will not get there. Design for a progress bar, not a
sixty-frame transition.

The second lesson is in the footnote on screen. `setInterval` stops when the app stops, and
the app stops the moment the user looks at something else. There is no such thing as a
mini-app timer that fires while the app is closed — not a delayed one, not a repeating one,
not a notification.

> **⏳ Not yet available — background execution and notifications.** An app cannot do work,
> keep a timer, or raise a notification while it is not in the foreground. This is a v1
> design decision, not a gap. See [LIMITATIONS.md §7](../LIMITATIONS.md).

Full source: [apps/breath-pacer/bundle.js](apps/breath-pacer/bundle.js).

### Make it yours

- **Change the pattern.** `PHASES` is four objects; box breathing, 4-7-8, and coherent
  breathing are all one edit.
- **Add a session length.** Stop after N cycles and show a summary.
- **Log completed sessions.** `storage:kv`, and now the app has a history — see
  [Streak tracker](03-apps-that-remember.md#streak-tracker), which is essentially this
  change already made.

---

## What this chapter was actually about

Reach for a capability when the app cannot exist without it, not when the app would be
slightly nicer with it. Every grant you request is a dialog the user has to read, a thing
they might say no to, and a reason for them to wonder what you are doing with it.

Three of the twenty-five apps in this cookbook need nothing. When you finish designing an
app, it is worth one minute to ask whether yours could have been a fourth.

---

Next: [Apps that remember](03-apps-that-remember.md) — the two storage models and how to
choose between them.
