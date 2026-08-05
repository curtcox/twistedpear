# 8. AI and apps that build apps

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Most mini-apps will not need this chapter. It covers the capabilities that let an app act on
the _platform_ — send prompts to an AI service, package and sign other apps, publish them,
install them, and run them in a preview slot.

DevStudio is built entirely out of these, which is the point: there is no privileged authoring
tool. If you want a different development environment — a tutorial that builds apps as you
read it, a template gallery, a domain-specific generator — you have the same surface DevStudio
does.

## `ai.chat` and `ai.chatStream`

```javascript
import { ai } from "@twistedpear/miniapp-sdk";

const reply = await ai.chat({
  messages: [
    { role: "system", content: "You rewrite mini-app source files." },
    { role: "user", content: `${instruction}\n\n---\n${currentSource}` },
  ],
  model: "…", // optional; must be on the host's allowlist
  maxTokens: 4096, // optional; clamped by the host
  temperature: 0.2, // optional
});

let proposal = "";
for await (const event of ai.chatStream({ messages })) {
  if (event.type === "delta") proposal += event.delta;
  if (event.type === "done") usage = event.response.usage;
}
```

The host holds the endpoint URL, the API key, and the model allowlist. Desktop configures
these under **Settings → AI**; headless nodes use `HostConfig.ai`. **The key never enters the
sandbox** — not yours, not DevStudio's.

Constraints the host enforces, not you:

| Constraint           | Value                              |
| -------------------- | ---------------------------------- |
| In-flight requests   | 1 per app                          |
| Messages per request | ≤ 64                               |
| `maxTokens`          | Clamped to 8,192                   |
| Model                | Must be on the host's allowlist    |
| Endpoint             | OpenRouter-compatible, host-chosen |

Requires `ai:chat`.

> **⚠️ Works, with limits — coalesced streaming.** `ai.chatStream` yields text deltas plus a
> final response event. Deltas are grouped to stay below broker rate limits and are not token
> boundaries. Streaming and `ai.chat` share the one-request-per-app slot; breaking iteration
> cancels the host request. See [docs/miniapp-sdk.md](../docs/miniapp-sdk.md).

For retrieval, `ai.embed({ inputs })` returns bounded vectors and
`ai.search({ query, documents, limit })` ranks app-supplied document ids with cosine
similarity. These use a separate `ai:embed` grant and embedding-model allowlist, accept at
most 64 total inputs (63 documents plus the query), cap each input at 16,384 characters and
vectors at 4,096 dimensions, create no persistent index, and share the same in-flight slot.

### The disclosure you owe the user

The grant screens for `ai:chat` and `ai:embed` say that supplied content leaves the sandbox.
That wording is there because it is usually true, and users decide based on it.

- **Do not send more than the task needs.** One file, not the whole workspace.
- **Say what you are sending, before you send it.** DevStudio shows the file it is about to
  include.
- **There may be no endpoint configured at all.** Handle that as a normal state, not an
  error — the feature is simply absent, and the rest of your app should work.

## The `apps:*` capabilities

| Call                                            | Capability     | Does                                                                     |
| ----------------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `apps.packageProject(projectPrefix, manifest)`  | `apps:package` | Packs + signs a workspace project; returns `{ packageHash, size, t256 }` |
| `apps.publish(t256)`                            | `apps:publish` | Seeds and announces a signed package                                     |
| `apps.install(t256)`                            | `apps:install` | Asks the host to install by identifier                                   |
| `apps.preview(projectPrefix, manifest, grants)` | `apps:preview` | Runs a project in the dev-preview slot                                   |
| `apps.stopPreview()`                            | `apps:preview` | Stops it                                                                 |

```javascript
import { apps } from "@twistedpear/miniapp-sdk";

const { t256, packageHash, size } = await apps.packageProject(
  "hello-app/",
  manifest,
);
await apps.publish(t256);
```

`packageProject` signs under **this device's publisher identity**. Your app is not signing
anything; it is asking the host to, and the user is approving that the host does.

`apps.preview` takes a `grants` argument that must be a **subset of the project's declared
capabilities** — you cannot preview an app into having more than it asks for. The preview runs
in an independent `MiniappHost` with its own broker and its own in-memory grant store under a
`dev-preview:` publisher key, so your app keeps running while it does.

## Every call is confirmed, every time

This is the part that will shape your code. Beyond the grant, **each individual** package,
publish, install, and preview call raises a host confirmation:

- drawn in host chrome, outside your widget container;
- showing the app id and publisher fingerprint from the broker's context, never from your
  payload;
- with a token generated host-side that never transits the broker;
- **auto-denied** if no confirmation channel is configured;
- **denied after 60 seconds** unanswered.

![A host confirmation dialog for a publish request](/authors/images/08-host-confirmation.png)

**Screenshot 8.1 — A host confirmation.** A modal rendered in host chrome, visibly outside and
above the mini-app surface, which is dimmed and non-interactive behind it. Title: "Publish
hello-app 0.1.0?" Beneath it: "Requested by: DevStudio" with its publisher key fingerprint in
monospace, then "Signing as: `<your publisher fingerprint>`", then a summary line "Seeds the
package and announces it to your peers." A countdown in small grey text reads "Denies
automatically in 47 s." Buttons: **Publish**, **Cancel**.

What that means in practice:

```javascript
async function publishCurrentProject() {
  try {
    const { t256 } = await apps.packageProject(projectPrefix, manifest);
    // The user has now answered one dialog. They will get a second one here.
    await apps.publish(t256);
    return { ok: true, t256 };
  } catch (error) {
    // Denial and timeout both land here. Neither is a bug.
    return { ok: false, reason: describe(error) };
  }
}
```

- **Do not chain confirmations without telling the user.** Two dialogs in a row with no
  explanation reads as a malfunction. Say "this will ask you twice" first.
- **Treat denial as a normal outcome.** Return to the previous state cleanly; do not retry
  automatically, and never loop.
- **Do not start a confirmed operation from a background timer.** A dialog the user did not
  ask for is one they will deny.
- **Budget 60 seconds.** Anything you were holding open across the call has to survive that.

## Installing on the user's behalf

`apps.install(t256)` adds a full capability review on top of the confirmation: the user sees
what the app being installed is asking for, and grants a subset if they like. Your app has no
visibility into and no influence over that decision. You learn whether the install happened,
not what was granted.

## Sharing by identifier

`share.put` / `share.get` (capability `share:cas`, [Chapter 7](07-identity-messaging-and-peers.md))
round out the set: bounded content-addressed storage for anything that is not itself an app —
a template, a project bundle, a document your app wants to hand to another instance of itself.

## A worked shape

An authoring app, end to end:

1. `workspace.write` the project files.
2. `apps.preview(prefix, manifest, grants)` — one confirmation — and let the user try it.
3. `apps.stopPreview()`.
4. `apps.packageProject(prefix, manifest)` — one confirmation — and show the returned `t256`
   in a `qr-code` widget.
5. `apps.publish(t256)` — one confirmation — once the user says they want others to have it.

That is DevStudio. `npm run test:devstudio-loop` runs the whole sequence across two host
instances, including the denial and force-quit paths, and
[conformance/devstudio-loop](../conformance/devstudio-loop/README.md) describes what it asserts.
If you are building something in this shape, that suite is the closest thing to a
specification for the flow.
