# Appendix: SDK reference

<!-- tp-doc
lifecycle: live
audited: 2026-07-21
register: none
-->

Every namespace and call, with the capability it needs. This is a reading aid; the maintained
reference is [docs/miniapp-sdk.md](../docs/miniapp-sdk.md), and where the two disagree it wins.

Everything below comes from one import:

```javascript
import {
  identity,
  lxmf,
  announce,
  storage,
  resource,
  presence,
  host,
  ui,
  workspace,
  ai,
  apps,
  share,
} from "@twistedpear/miniapp-sdk";
```

All calls without a matching grant fail with a typed `CapabilityError`.

## identity

| Call                         | Capability | Returns                                                   |
| ---------------------------- | ---------- | --------------------------------------------------------- |
| `identity.destinationHash()` | `identity` | App-scoped destination derived from host identity + appId |
| `identity.sign(payload)`     | `identity` | Brokered signature; private keys never cross the boundary |

## lxmf

| Call                               | Capability     | Notes                                              |
| ---------------------------------- | -------------- | -------------------------------------------------- |
| `lxmf.send({ to, subject, body })` | `lxmf:send`    | Sends from the **app** destination, not the user's |
| `lxmf.receive()`                   | `lxmf:receive` | Inbox namespaced to the app destination            |

## announce

| Call                                    | Capability           | Notes                                   |
| --------------------------------------- | -------------------- | --------------------------------------- |
| `announce.publish(appData, namespace?)` | `announce:publish`   | Publishes in the app namespace          |
| `announce.subscribe(namespace?)`        | `announce:subscribe` | Receives announces in the app namespace |

## storage

| Call                           | Capability         | Notes                                                 |
| ------------------------------ | ------------------ | ----------------------------------------------------- |
| `storage.kv.get(key)`          | `storage:kv`       | Bytes, or `null`                                      |
| `storage.kv.set(key, value)`   | `storage:kv`       | Bytes; counts against the app's byte quota            |
| `storage.kv.delete(key)`       | `storage:kv`       |                                                       |
| `storage.bee.open(name)`       | `storage:hyperbee` | Local-only Hyperbee                                   |
| `storage.bee.get/put/del/list` | `storage:hyperbee` | Lexicographic key order; history counts against quota |

## resource

| Call                                           | Capability       | Notes                                       |
| ---------------------------------------------- | ---------------- | ------------------------------------------- |
| `resource.fetch({ resourceId, budgetBytes? })` | `resource:fetch` | Host applies its own budget on top of yours |

## presence and host

| Call                  | Capability | Notes                                                                                                                |
| --------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `presence.snapshot()` | `presence` | Coarse peer/interface state                                                                                          |
| `host.info()`         | `presence` | Platform id, host version, `HOST_API_VERSION`, enabled roles, interface types, quota snapshot, `grantedCapabilities` |

`host.info()` requires host API `0.3.0`.

## ui

| Call                  | Capability | Notes                                                                  |
| --------------------- | ---------- | ---------------------------------------------------------------------- |
| `ui.render(tree)`     | none       | Submits a validated widget tree; rejected trees do not partially apply |
| `ui.onEvent(handler)` | none       | Tap, input change, editor change, etc.                                 |

UI needs no grant — it is your app's own surface — but obeys the same size and rate limits as
every broker call.

## workspace

| Call                                       | Capability  | Notes                                     |
| ------------------------------------------ | ----------- | ----------------------------------------- |
| `workspace.list(path)`                     | `workspace` |                                           |
| `workspace.read(path)`                     | `workspace` | Strings, not bytes                        |
| `workspace.write(path, text)`              | `workspace` |                                           |
| `workspace.patch(path, baseLength, edits)` | `workspace` | Rejects stale bases and overlapping edits |
| `workspace.remove(path)`                   | `workspace` |                                           |

Strictly relative paths. 256 KiB per file, 4 MiB and 512 files per app. Editor changes use
patches; the per-file limit is a host safety quota rather than a broker-message requirement.

## ai

| Call                                                            | Capability | Notes                                                                 |
| --------------------------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| `ai.chat({ messages, model?, maxTokens?, temperature? })`       | `ai:chat`  | Whole response; API key never enters the sandbox                      |
| `ai.chatStream({ messages, model?, maxTokens?, temperature? })` | `ai:chat`  | Async iterable of coalesced `delta` events and one final `done` event |

One in-flight request per app, ≤ 64 messages, `maxTokens` clamped to 8,192, model allowlisted
host-side. `ai.chatStream` requires host API `0.5.0`.

## apps

| Call                                            | Capability     | Confirmed?                    | Returns                       |
| ----------------------------------------------- | -------------- | ----------------------------- | ----------------------------- |
| `apps.packageProject(projectPrefix, manifest)`  | `apps:package` | Yes, every call               | `{ packageHash, size, t256 }` |
| `apps.publish(t256)`                            | `apps:publish` | Yes, every call               |                               |
| `apps.install(t256)`                            | `apps:install` | Yes, plus a capability review |                               |
| `apps.preview(projectPrefix, manifest, grants)` | `apps:preview` | Yes, every call               |                               |
| `apps.stopPreview()`                            | `apps:preview` |                               |                               |
| `apps.channel.open({ appId, publisherPublicKey? })` | `apps:channel` | Yes, names the destination | `{ destination }` |
| `apps.channel.send(destination, payload)`       | `apps:channel` |                               | `{ id }`                      |
| `apps.channel.receive()`                        | `apps:channel` |                               | messages                      |
| `apps.channel.close(destination)`               | `apps:channel` |                               |                               |
| `apps.channel.peers()`                          | `apps:channel` |                               | running mutual grants         |

"Confirmed" means a host-chrome dialog your app cannot draw over or acknowledge, auto-denied
after 60 seconds. `grants` must be a subset of the project's declared capabilities.

Requires host API `0.2.0`. `apps.channel` requires host API `0.13.0`.

## share

| Call                 | Capability  | Notes                                                 |
| -------------------- | ----------- | ----------------------------------------------------- |
| `share.put(content)` | `share:cas` | Returns a 94-character 256t identifier                |
| `share.get(t256)`    | `share:cas` | Resolves only if a locator announce was already heard |

## Widget components

`view`, `text`, `image`, `button`, `text-input`, `switch`, `scroll`, `list`, `progress`,
`divider`, `spacer`, `code-editor`, `qr-code`.

Style is a bounded subset: flex layout, spacing, colours, and a typography scale. Unknown
components, props, or styles reject the whole tree.

## Capability strings

`identity`, `presence`, `announce:subscribe`, `announce:publish`, `lxmf:send`, `lxmf:receive`,
`storage:kv`, `storage:hyperbee`, `resource:fetch`, `workspace`, `ai:chat`, `apps:package`,
`apps:publish`, `apps:install`, `apps:preview`, `apps:channel`, `share:cas`.

An unknown string blocks install.

## Default limits

| Limit                            | Default                                       |
| -------------------------------- | --------------------------------------------- |
| Broker message size              | 256 KiB                                       |
| Broker messages per second       | 60 per app                                    |
| Widget tree nodes / depth / size | 5,000 / 32 / 256 KiB                          |
| Workspace                        | 256 KiB per file, 4 MiB and 512 files per app |
| Host confirmation timeout        | 60 s, then denied                             |

Host-configurable, and adjustable on a running app by the user. See
[Chapter 12](12-limits-and-budgets.md).
