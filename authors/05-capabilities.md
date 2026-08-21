# 5. Capabilities

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: none
-->

A capability is a string in your signed manifest. It is also a promise you are making to a
user, rendered in their language on a screen you do not control.

Two rules govern everything in this chapter:

1. A call succeeds only if the capability is **declared in the signed manifest** _and_
   **granted by the user**. Either alone is not enough.
2. The user may grant a **subset**, and may change it later. Your app has to work anyway, or
   fail in a way that explains itself.

## The full taxonomy

| Capability           | What the user is shown                                                                 |
| -------------------- | -------------------------------------------------------------------------------------- |
| `identity`           | Use an app-scoped identity for signing and addressing.                                 |
| `presence`           | Read coarse peer/interface presence and host info.                                     |
| `announce:subscribe` | Receive announces in the app namespace.                                                |
| `announce:publish`   | Publish the app destination.                                                           |
| `lxmf:send`          | Send LXMF messages from the app destination.                                           |
| `lxmf:receive`       | Receive LXMF messages for the app destination.                                         |
| `storage:kv`         | Store local key/value data for this app.                                               |
| `storage:hyperbee`   | Store ordered local Hyperbee data for this app.                                        |
| `resource:fetch`     | Fetch package resources through host budget rules.                                     |
| `workspace`          | Read and write project source files in this app's private workspace.                   |
| `ai:chat`            | Send prompts to the host-configured AI service; prompts may include workspace content. |
| `apps:package`       | Package and sign apps under this device's publisher identity (asks each time).         |
| `apps:publish`       | Publish signed apps so other users can find and install them (asks each time).         |
| `apps:install`       | Ask the host to install apps from a 256t id (asks each time, with capability review).  |
| `apps:preview`       | Run a built app in the host's sandboxed dev-preview slot.                              |
| `share:cas`          | Store and retrieve bounded content-addressed data shared by 256t id.                   |

An unknown capability string **blocks install** — the host tells the user to update, rather
than ignoring the string. So a typo does not degrade your app; it makes it uninstallable.

## Declaring

```json
{
  "name": "com.example.board",
  "version": "0.1.0",
  "entry": "bundle.js",
  "capabilities": [
    "identity",
    "announce:publish",
    "announce:subscribe",
    "storage:hyperbee"
  ],
  "icon": null,
  "minHostApi": "0.1.0"
}
```

`minHostApi` is how you say which host versions can run you. The dev-environment
capabilities (`workspace`, `ai:chat`, `apps:*`, `share:cas`) arrived in `0.2.0`; `host.info()`
in `0.3.0`, `host.info().grantedCapabilities` in `0.4.0`, and `ai.chatStream()` in `0.5.0`.
If you use them, raise `minHostApi` accordingly — otherwise an older host will install your
app and then fail your calls at runtime, which is a much worse experience than refusing the
install.

**Ask for the minimum.** Every capability you declare is a line on a screen where a cautious
user is deciding whether to trust you, and a capability you never call is pure cost.

## What the user sees

![The capability review with plain-language descriptions and per-row toggles](/authors/images/05-capability-review.png)

**Screenshot 5.1 — The grant screen for a mini-app.** A modal headed "Install Board?" with
the publisher's short address and trust status at the top. Four rows, each with a
plain-language description and its own toggle, all defaulting to granted: "Use an app-scoped
identity for signing and addressing", "Publish the app destination", "Receive announces in
the app namespace", "Store ordered local data for this app". The second row is shown toggled
**off** by the user, with an inline note reading "The app will work with reduced
functionality." Buttons: **Install**, **Cancel**.

Note that the descriptions are not yours. They come from `CAPABILITY_DEFINITIONS` in the
runtime, so every app asking for `lxmf:send` says the same thing, and a user who has read it
once has read it everywhere.

There is also a **pre-launch review**: before every non-dev launch, the host shows the
declared capabilities with their current grant state and per-capability toggles, and the user
can run this session with any subset — or cancel. So a grant is not a one-time decision at
install; assume it can change between launches.

## Designing for a partial grant

Every ungranted call fails with a typed `CapabilityError`. Catch it and degrade:

```javascript
async function publishPresence() {
  try {
    await announce.publish(appData);
    return "announced";
  } catch (error) {
    if (error.name === "CapabilityError") {
      return "not announcing — permission not granted";
    }
    throw error;
  }
}
```

```elm
GotPublish (Err err) ->
    if err.code == "CAPABILITY_DENIED" then
        ( { model | status = "not announcing — permission not granted" }, Effect.none )

    else
        ( { model | status = err.message }, Effect.none )
```

Better: ask the host what you have, once, at startup, and branch on it rather than on
exceptions.

```javascript
const info = await host.info(); // requires `presence`
const can = new Set(info.grantedCapabilities);

if (can.has("announce:publish")) {
  await announce.publish(appData);
}
```

```elm
Host.info GotInfo

-- in GotInfo (Ok info), decode grantedCapabilities and only then:
Announce.publish appData "my-app" GotPublish
```

Three patterns that work:

- **Feature-gate the UI.** Do not render a "Share" button whose only outcome is an error
  toast. Render it disabled with a one-line reason, or not at all.
- **Say what is missing, in the user's terms.** "This app cannot receive replies because
  message receiving is turned off" beats `CapabilityError: lxmf:receive`.
- **Have a real degraded mode.** Board without `announce:publish` is still a local board.
  Chat without `storage:kv` still sends messages; it just forgets the last peer.

And one that does not: **do not re-request in a loop**. There is no API to ask for a
capability at runtime, and hammering the broker with denied calls burns your message-rate
budget ([Chapter 12](12-limits-and-budgets.md)).

## Grants persist; revocation is immediate

Grants are keyed by `appId + publisherPublicKey`. They survive an update signed by the same
publisher — that is why key pinning matters ([Chapter 10](10-updates-and-trust.md)) — and they
are deleted on uninstall.

Revocation takes effect on the **next broker call**. There is no notification. A call that
worked a second ago may throw now, and long-running work should not assume otherwise.

## The double-gated capabilities

`apps:package`, `apps:publish`, `apps:install`, `apps:preview`, and trust imports are
different. Beyond the grant, **every single call** raises a host confirmation.

That dialog:

- renders in host chrome, outside your widget container, which has no component capable of
  drawing over or acknowledging it;
- shows the app id and publisher fingerprint from the broker's own context, never from
  anything your app supplied;
- carries a token generated host-side that never transits the broker;
- **auto-denies** if no channel is configured, and denies after **60 seconds** unanswered.

So design for a slow, possibly negative answer. Do not call `apps.publish` inside a tight
sequence that assumes it returns quickly, and do not treat a denial as an error state to
retry out of. [Chapter 8](08-ai-and-authoring-apps.md) covers building on these.

## Capabilities you cannot have

There is no capability for arbitrary network access, arbitrary filesystem access, native
code, background execution, or shared storage between mini-apps. These are not missing
features awaiting a version number; shared storage is
[explicitly deferred](../docs/miniapp-sdk.md), and the rest follow from the sandbox model.
Two running apps may exchange messages through `apps.channel` after both grant the named
destination.

If your design needs one of them, it is not a mini-app. See
[LIMITATIONS.md §7](../LIMITATIONS.md).
