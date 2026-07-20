# AI chat


<!-- tp-doc
lifecycle: live
audited: 2026-07-10
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
```

Responses include model id and usage counters when the host provides them.

## Outcomes

- `pass` — round-trip succeeded.
- `unavailable` — no AI endpoint configured.
- `not-granted` — `ai:chat` withheld.

## Live probe

Hosts without an AI endpoint report `unavailable`. When configured, the applet
below exercises a single round-trip.

{{applet:ai-chat}}

DevStudio uses the same proxy for whole-file edits — [DevStudio walkthrough](chapter:sdk-devstudio).
