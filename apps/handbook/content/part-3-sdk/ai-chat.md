# AI chat


<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

`ai:chat` sends prompts to the host-configured OpenRouter-compatible endpoint.
The host clamps budgets, enforces a model allowlist, and allows one in-flight
request per app. The API key never enters the sandbox.

## Host configuration

Desktop hosts configure AI under **Settings → AI** or in `config.json`. Until an
endpoint is set, probes report `unavailable` — that is honest, not a failure.

## API

```javascript
import { ai } from "@twistedpear/miniapp-sdk";

const response = await ai.chat({
  messages: [{ role: "user", content: "hello" }]
});

let text = "";
for await (const event of ai.chatStream({
  messages: [{ role: "user", content: "hello" }]
})) {
  if (event.type === "delta") text += event.delta;
}
```

Whole responses and final stream events include model id and usage counters when the host
provides them. Stream deltas are coalesced and are not token boundaries. Both calls share one
in-flight slot per app; breaking out of iteration cancels the stream.

## Outcomes

- `pass` — round-trip succeeded.
- `unavailable` — no AI endpoint configured.
- `not-granted` — `ai:chat` withheld.

## Live probe

Hosts without an AI endpoint report `unavailable`. When configured, the applet
below exercises a single round-trip.

{{applet:ai-chat}}

DevStudio uses the same proxy for whole-file edits — [DevStudio walkthrough](chapter:sdk-devstudio).
