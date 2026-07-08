# AI chat

`ai:chat` sends prompts to the host-configured OpenRouter-compatible endpoint.
The host clamps budgets, enforces a model allowlist, and allows one in-flight
request per app. The API key never enters the sandbox.

## API

```javascript
import { ai } from "@twistedpear/miniapp-sdk";

const response = await ai.chat({
  messages: [{ role: "user", content: "hello" }]
});
```

## Live probe

Hosts without an AI endpoint report `unavailable`. When configured, the applet
below exercises a single round-trip.

{{applet:ai-chat}}
