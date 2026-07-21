# 7. Apps that use a model

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

`ai.chat` is one call. You pass messages, you get one reply, and the host handles the API key
— which never enters the sandbox, which is the only reason this capability can exist at all.

```javascript
const reply = await ai.chat({ messages, model, maxTokens, temperature });
```

Four constraints shape every app in this chapter, and they are not incidental:

| Constraint | Consequence for your design |
|---|---|
| **Non-streaming** | No token-by-token output. You get one reply or an error. Show a "working" state. |
| **One in-flight request per app** | A second concurrent call is rejected. Disable the button. |
| **≤ 64 messages, `maxTokens` clamped to 8,192** | Long conversations must be summarised or truncated by you. |
| **Model allowlisted host-side** | You cannot pick an arbitrary model, and the list can differ per host. |

> **⚠️ Works, with limits — `ai.chat` in v1.** Non-streaming, whole-reply only, one in-flight
> request, at most 64 messages, `maxTokens` clamped to 8,192, model allowlisted by the host.
> See [LIMITATIONS.md §7](../LIMITATIONS.md).

And one constraint that is not in the table because it dominates everything else: **the model
is remote.** On a device with no route to it — which is most of the interesting devices this
platform runs on — `ai.chat` simply fails. An app whose only feature is the model is an app
that does nothing in a field. All three recipes here are built so that the useful part
survives the model going away.

![The three model apps, one of them working offline](/cookbook/images/07-chapter-opener.png)

**Screenshot 7.1 — Chapter opener.** Three host captures: Pocket translator showing a
translated phrase with the status line "From the local phrasebook — no model call, works
offline"; Ask the handbook showing an answer with a "Sources:" line beneath it; Triage notes
showing a structured four-field review panel awaiting confirmation. The first capture is
visibly on a host whose interface list shows no IP connectivity.

| Recipe | Capabilities | Directory |
|---|---|---|
| [Pocket translator](#pocket-translator) | `ai:chat`, `storage:kv` | [apps/pocket-translator](apps/pocket-translator/README.md) |
| [Ask the handbook](#ask-the-handbook) | `ai:chat`, `workspace` | [apps/ask-the-handbook](apps/ask-the-handbook/README.md) |
| [Triage notes](#triage-notes) | `ai:chat`, `storage:hyperbee` | [apps/triage-notes](apps/triage-notes/README.md) |

---

## Pocket translator

> **Capabilities:** `ai:chat`, `storage:kv`

Translates a short phrase and keeps a local phrasebook of everything you have already asked.
The recipe about the cache — which is not a performance optimisation here, it is the offline
story.

![Pocket translator answering from its local phrasebook](/cookbook/images/07-pocket-translator.png)

**Screenshot 7.2 — Pocket translator, offline.** The mini-app surface: a phrase input
containing "Where is the water?", a row of five language buttons with "● Spanish" selected, a
**Translate** button, a divider, a large result reading "¿Dónde está el agua?", and a status
line reading "From the local phrasebook — no model call, works offline".

### The interesting part

The cache is checked before the model, always:

```javascript
const cached = await storage.kv.get(cacheKey());
if (cached !== null) {
  result = decoder.decode(cached);
  status = "From the local phrasebook — no model call, works offline";
  return;
}
```

Which turns the app into something genuinely useful in the situation you would want it: you
look up the twenty phrases you need while you still have a link, and they keep working when
you do not. The app is designed so that its value *accumulates* rather than depending on
connectivity at the moment of use.

The concurrency guard is two pieces working together:

```javascript
if (source.trim().length === 0 || inFlight) return;
```

```javascript
{
  id: "go", type: "button",
  props: { label: inFlight ? "Working…" : "Translate", event: "pt.go", disabled: inFlight }
}
```

The `disabled` prop stops most double-taps; the `inFlight` guard stops the rest, including
events that arrive while a render is in progress. Do both. A second concurrent `ai.chat` is
rejected outright, and a rejection the user caused by tapping twice looks exactly like a bug.

And the failure path leaves the app useful:

```javascript
} catch (error) {
  // No model route, no grant, or the host declined. The phrasebook still works.
  result = "";
  status = "Model unavailable — cached phrases still work";
}
```

Note `finally { inFlight = false; }` in the source. A flag set in `try` and cleared only on
success is a flag that stays stuck forever the first time anything throws, and the button
never re-enables.

Full source: [apps/pocket-translator/bundle.js](apps/pocket-translator/bundle.js).

### Make it yours

- **Pre-load a phrasebook.** A "translate these forty phrases now" button, run while you still
  have a link. This is the feature the whole app is really for.
- **Share the phrasebook.** `share.put` the JSON and let somebody else `share.get` it — see
  [Chapter 6](06-apps-that-move-files.md). One person with a link equips everyone.
- **Show the source language.** Currently implied. Ask the model for both directions and
  cache both.

---

## Ask the handbook

> **Capabilities:** `ai:chat`, `workspace`

Answers questions about documents you have stored locally. Retrieval at the scale a mini-app
can actually afford — no vector store, no embeddings, no index.

![Ask the handbook with a cited answer](/cookbook/images/07-ask-the-handbook.png)

**Screenshot 7.3 — Ask the handbook.** The mini-app surface: a question input containing "how
big can a package be over BLE?", an **Ask** button, a divider, a scrolling answer of about
four lines, a small grey line reading "Sources: docs/budgets.md, docs/ble-notes.md", and a
status line reading "Answered from 2 file(s) · 11 local files".

### The interesting part

The retrieval is a keyword count and a hard character budget. That is all.

```javascript
const CONTEXT_CHAR_BUDGET = 6000;

let context = "";
for (const file of scored) {
  if (file.score === 0) break;
  const remaining = CONTEXT_CHAR_BUDGET - context.length;
  if (remaining <= 0) break;
  context += `\n\n# ${file.path}\n${file.text.slice(0, remaining)}`;
  used.push(file.path);
}
```

There is no embedding call available in the SDK, so the sophisticated version of this is not
on the table. What is on the table works better than it has any right to when the corpus is
a dozen files somebody deliberately put there.

The budget is not optional. `maxTokens` is clamped to 8,192 host-side, and the message list
is capped at 64 — so an unbounded context is not a slow app, it is a rejected call. Bound it
in characters where you build the string, not in tokens where you cannot measure it.

The system prompt does one job:

```javascript
{
  role: "system",
  content: "Answer only from the supplied documents. If they do not answer the question, say so."
}
```

And the UI shows which files were used. Both matter: an app that can tell you where an answer
came from is an app whose answers you can check, and on a platform with no network to
double-check against, that is most of the trustworthiness you are going to get.

Full source: [apps/ask-the-handbook/bundle.js](apps/ask-the-handbook/bundle.js).

### Make it yours

- **Better scoring.** Term frequency over document length beats a raw count in about ten
  lines and noticeably improves file selection.
- **Chunk within files.** Right now a matching 200 KiB file is truncated at whatever the
  budget allows, which may be the wrong 6,000 characters. Score paragraphs, not files.
- **Cache answers.** Same trick as [Pocket translator](#pocket-translator), keyed on the
  question. Offline Q&A over documents you already have is a genuinely good field tool.
- **Fill the workspace from the air.** Combine with [Zine reader](06-apps-that-move-files.md#zine-reader)
  and you can be handed a corpus by a peer.

---

## Triage notes

> **Capabilities:** `ai:chat`, `storage:hyperbee`

Turns messy dictated notes into a structured record and files it. This is the security recipe
of the chapter: **model output is untrusted input.**

![Triage notes showing the review step before filing](/cookbook/images/07-triage-notes.png)

**Screenshot 7.4 — Triage notes, mid-review.** The mini-app surface: a multiline input at the
top containing two sentences of informal dictation, a **Structure** button, a divider, a
four-row review panel reading "subject: fallen tree", "location: mile 4 trailhead",
"severity: medium", "action: chainsaw crew", a **File it** button, another divider, and a
short list of previously filed records rendered as "[high] washout — bridge approach". The
review panel is visibly a confirmation step, not an output display.

### The interesting part

Validation is field by field, and it happens before anything touches the store:

```javascript
function validate(candidate) {
  if (candidate === null || typeof candidate !== "object") return null;
  const clean = {};
  for (const field of FIELDS) {
    const value = candidate[field];
    if (typeof value !== "string" || value.length === 0 || value.length > 200) return null;
    clean[field] = value;
  }
  if (!SEVERITIES.includes(clean.severity.toLowerCase())) return null;
  clean.severity = clean.severity.toLowerCase();
  return clean;
}
```

Every rule that matters is enforced here: the field set is fixed, types are checked, lengths
are bounded, and the enumerated field is checked against the enumeration. An app that does
`await storage.bee.put(bee, key, JSON.parse(reply.content))` has handed a remote system write
access to its database, and will one day store a 40 KiB "severity".

The parse itself assumes the reply is malformed until proven otherwise:

```javascript
let candidate = null;
try {
  candidate = JSON.parse(reply.content.trim().replace(/^```(json)?|```$/g, ""));
} catch (error) {
  candidate = null;
}
```

The code-fence strip is there because models add fences even when told not to. Ask for the
format you want, and then handle not getting it.

`temperature: 0` is set for the same reason — this is an extraction task, and variability is
pure downside.

The third defence is the one on screen: **the user confirms before anything is filed.** The
structured fields appear in a review panel, and **File it** is a separate action. The model
proposes; the person disposes. For an app whose records someone may later act on, that step
is not friction, it is the product.

Full source: [apps/triage-notes/bundle.js](apps/triage-notes/bundle.js).

### Make it yours

- **Make the review editable.** Right now the user can accept or re-run. Letting them fix one
  field is a much better app and is only a few inputs.
- **Retry once on a validation failure.** Feed the failure back as a second message. Once —
  not in a loop, because a loop against a rate-limited remote call is how you lock your own
  app up.
- **Send filed records onward.** Add `lxmf:send` and file to a coordinator — see
  [Chapter 4](04-apps-that-talk-to-one-peer.md). Keep the wire format positional if the link
  is slow, as in [Nine line](09-apps-for-a-bad-link.md#nine-line).

---

## What this chapter was actually about

Three rules, and the third is the one people skip:

1. **The model is optional infrastructure.** Build so the app degrades to something useful,
   because on this platform "no route to the model" is the normal case, not the exception.
2. **Output is untrusted.** Parse defensively, validate field by field, bound every length,
   and check enumerations. Never write a model's reply straight into a store.
3. **Let the model propose, not decide.** Anything consequential gets a human confirmation
   step — and if that feels like too much friction for your app, look again at whether the
   action was really consequential.

---

Next: [Apps that build apps](08-apps-that-build-apps.md) — the `apps:*` capabilities, and why
every one of them stops for a confirmation you cannot draw over.
