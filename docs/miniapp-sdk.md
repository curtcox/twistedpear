# Mini-app SDK

<!-- tp-doc
lifecycle: reference
audited: 2026-08-21
register: none
-->

Mini-apps import only `@twistedpear/miniapp-sdk`. Every SDK call crosses the host broker;
private keys, sockets, filesystems, and Bare APIs are never exposed to app code.

## Capability Taxonomy

Capabilities are declared in `app.manifest.json` and granted by the user at install. The
grant screen renders the descriptions below (from `CAPABILITY_DEFINITIONS` in the runtime).
Risk class is assigned in
[`capability-risk.json`](../specs/spec-cap/registry/capability-risk.json) and sets the
approval evidence bar ([app approval risk](app-approval-risk.md)); it is not a refusal.

| Capability                  | Risk      | User-facing description                                                                                                                                                              |
| --------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `identity`                  | elevated  | Use an app-scoped identity for signing and addressing.                                                                                                                               |
| `presence`                  | benign    | Read coarse peer/interface presence and host info.                                                                                                                                   |
| `announce:subscribe`        | elevated  | Receive announces in this app's own namespace only.                                                                                                                                  |
| `announce:publish`          | elevated  | Publish this app's own destination, not another app's.                                                                                                                               |
| `lxmf:send`                 | sensitive | Send LXMF messages to contacts you choose in the host, from the app destination.                                                                                                     |
| `lxmf:receive`              | sensitive | Receive LXMF messages for the app destination.                                                                                                                                       |
| `storage:kv`                | benign    | Store local key/value data for this app.                                                                                                                                             |
| `storage:hyperbee`          | benign    | Store ordered local Hyperbee data for this app.                                                                                                                                      |
| `resource:fetch`            | elevated  | Fetch package resources through host budget rules.                                                                                                                                   |
| `workspace`                 | benign    | Read and write project source files in this app's private workspace.                                                                                                                 |
| `ai:chat`                   | elevated  | Send prompts to the host-configured AI service; prompts may include workspace content.                                                                                               |
| `ai:embed`                  | elevated  | Send bounded text to the host-configured embedding model and rank vectors locally.                                                                                                   |
| `apps:package`              | sensitive | Package and sign apps under this device's publisher identity (asks each time).                                                                                                       |
| `apps:publish`              | sensitive | Publish signed apps so other users can find and install them (asks each time).                                                                                                       |
| `apps:install`              | sensitive | Ask the host to install apps from a 256t id (asks each time, with capability review).                                                                                                |
| `apps:preview`              | elevated  | Run a built app in the host's sandboxed dev-preview slot.                                                                                                                            |
| `apps:channel`              | elevated  | Send and receive messages with another running mini-app named when you grant this.                                                                                                   |
| `runtime:background`        | elevated  | Run while you use other apps on Android. At most two apps share this with the mesh service; it costs battery. On iOS the grant does not run anything while you are elsewhere.        |
| `runtime:wake`              | elevated  | Ask to be woken periodically for a few seconds of work. Wake-ups are rationed per host, not per app.                                                                                 |
| `notify:post`               | elevated  | Show notifications on this device. The host draws them and badges the text as coming from this app. Notifications are rationed per host, not per app.                                |
| `share:cas`                 | elevated  | Store and retrieve bounded content-addressed data shared by 256t id.                                                                                                                 |
| `peer:connect`              | elevated  | Ask trusted host chrome to find, confirm, and connect an app-scoped peer.                                                                                                            |
| `link:observe`              | benign    | See which peers are reachable and how good the connection to each is.                                                                                                                |
| `link:probe`                | elevated  | Send a small test transmission to a host-offered peer (uses airtime and battery).                                                                                                    |
| `relay:read`                | benign    | Read host relay mode, interface status, and diagnostics.                                                                                                                             |
| `relay:configure`           | critical  | Turn this device's radios, camera, microphone, speaker, and internet-push relaying on or off, and forward other people's traffic. This grant permits changes without another prompt. |
| `freenet:contract`          | sensitive | Read and publish Freenet contract state. Updates are published to a global network and cannot be recalled (asks each time for put/update).                                           |
| `device:share-policy:read`  | benign    | Read this app's live host-authored outbound media offers.                                                                                                                            |
| `device:stream:raw-inbound` | sensitive | Receive raw inbound media instead of a host-rendered sink.                                                                                                                           |

Other device capabilities follow consent class and are listed with each class in
[device-classes](device-classes/). The full assignment, including floor questions, is
[capability-risk.json](../specs/spec-cap/registry/capability-risk.json).

Unknown capability strings block install. Adding a capability bumps `HOST_API_VERSION` minor
(the dev-environment capabilities above shipped in `0.2.0`; `host.info()` shipped in `0.3.0`).
`ai.chatStream()` requires host API `0.5.0`; `ai.embed()` and `ai.search()` require `0.6.0`;
`workspace.patch()` and delta editor events require `0.7.0`.
The `peers` namespace and `peer:connect` require host API `0.8.0`.
The `links` namespace and realtime-media extensions require host API `0.12.0`.
`apps:channel` requires host API `0.13.0`.
`runtime:background` and `runtime:wake` / `host.requestWake` require host API `0.14.0`.
`apps.compile` requires host API `0.15.0`. `apps.format` and `apps.diagnostics`
require host API `0.16.0`. `lxmf.onMessage` / `announce.onEvent` /
`apps.channel.onMessage` require `0.17.0`. `notify:post` requires `0.18.0`.
Brokered `crypto.*` requires `0.19.0`. The second widget wave (`select`, `slider`,
`date`, and extra `text-input` props) requires `0.20.0`.

The `apps:*` capabilities are double-gated: beyond the grant, every package,
publish, install, preview, and channel-open call raises a host-chrome confirmation dialog the
mini-app cannot draw over or acknowledge (see
[miniapp-runtime.md](miniapp-runtime.md) — Host confirmations).
`apps:channel` names the destination app on that confirmation; both apps must grant
the pair before messages copy through the broker.

## Namespaces

- `identity.destinationHash()` — app-scoped destination derived from host identity + appId.
- `identity.sign(payload)` — brokered signing; private keys never cross the boundary.
- `lxmf.send({ to, subject, body })` — send via host LXMF router.
- `lxmf.receive()` — inbox namespaced to the app destination (destructive drain).
- `lxmf.onMessage(handler)` — at-least-once push of the same inbox; does not replace `receive()`.
- `announce.publish(appData, namespace?)` — publish in the calling app's namespace. The host rejects any other namespace.
- `announce.subscribe(namespace?)` — poll announces in the calling app's namespace.
- `announce.onEvent(handler)` — push of new announces in that namespace.
- `notify.post({ title, body, event, tag? })` — host-rendered, app-attributed notification (requires `notify:post`).
- `crypto.randomBytes(n)`, `crypto.hash(alg, bytes)`, `crypto.hmac(alg, key, bytes)`, `crypto.timingSafeEqual(a, b)` — brokered primitives, no capability. No seal/open.
- `storage.kv.get/set/delete(key, value?)` — local per-app KV with byte quota.
- `storage.bee.open/get/put/del/list` — local-only Hyperbee CRUD.
- `resource.fetch({ resourceId, budgetBytes? })` — host-budgeted Resource fetch.
- `presence.snapshot()` — coarse peer/interface state.
- `host.info()` — platform id, host version, `HOST_API_VERSION`, enabled roles,
  available interface types, quota snapshot, and `grantedCapabilities` for the
  calling app (requires `presence`).
- `host.setCheckpoint(bytes)` — store a ≤64 KiB blob in the sandbox for the next
  suspend. Local; it does not cross the broker. Overrunning the 50 ms will-suspend
  ack kills the app.
- `host.onResume(handler)` — receive that blob when the sandbox returns to running.
  There is no general `onSuspend`.
- `host.getCheckpoint()` — the blob last passed to `setCheckpoint`, or `null`.
- `host.requestWake(intervalMs, budgetMs?)` — ask for a rationed periodic wake
  (requires `runtime:wake`). Minimum interval 15 minutes; each wake is capped at
  10 seconds. Slot limits are per host, not per app.
- `ui.render(tree)` — submit a validated widget tree. Trees that imitate host chrome
  (CHROME-R8) or solicit secrets (CHROME-R9) fail `INVALID_WIDGET`.
- `ui.onEvent(handler)` — subscribe to host UI events (tap, input change, etc.).
- `workspace.list/read/write/patch/remove(path)` — per-app project source files.
  `patch(path, baseLength, edits)` applies ordered, non-overlapping UTF-16 text edits and
  rejects stale base lengths (strings; 256 KiB/file, 4 MiB and 512 files per app).
- `ai.chat({ messages, model?, maxTokens?, temperature? })` — host-mediated,
  whole-response chat completion against the host's OpenRouter-compatible endpoint.
- `ai.chatStream({ messages, model?, maxTokens?, temperature? })` — async iterable
  yielding `{ type: "delta", delta }` events followed by `{ type: "done", response }`.
  Provider events are coalesced to protect the broker rate budget; breaking iteration
  cancels the host request. Both forms share one in-flight slot, budget clamps, and the
  model allowlist; the API key never enters the sandbox.
- `ai.embed({ inputs, model? })` — embed 1–64 non-empty strings (16,384 characters
  each; vectors capped at 4,096 dimensions) through the host endpoint.
- `ai.search({ query, documents, limit?, model? })` — embed one query plus at most
  63 `{ id, text }` documents and return ids ranked by cosine score. This is a bounded
  request, not a persistent vector database. Both calls use the separate `ai:embed` grant,
  the embedding-model allowlist, and the same one-in-flight AI slot as chat.
- `apps.compile(projectPrefix)` — compile a Guida workspace project in host chrome
  (user confirmation; writes `bundle.js`).
- `apps.format(content)` / `apps.diagnostics(projectPrefix, path?)` — format Elm
  source or return structured compiler problems. Same `apps:package` grant, no
  confirmation.
- `apps.packageProject(projectPrefix, manifest)` — pack + sign a workspace
  project via the host (user confirmation); returns `{ packageHash, size, t256 }`.
- `apps.publish(t256)` / `apps.install(t256)` — publish or install by
  94-character 256t id (user confirmation; install adds a capability review).
- `apps.preview(projectPrefix, manifest, grants)` / `apps.stopPreview()` — run
  the project in the host's sandboxed dev-preview slot (user confirmation;
  grants must be a subset of the manifest's declared capabilities).
- `apps.channel.open({ appId, publisherPublicKey? })` — confirm a brokered
  channel to a running mini-app named in host chrome. Both apps must grant the
  pair. Shared storage is not included.
- `apps.channel.send({ appId, publisherPublicKey? }, payload)` /
  `apps.channel.receive()` / `apps.channel.onMessage(handler)` /
  `apps.channel.close({ appId })` /
  `apps.channel.peers()` — copy a UTF-8 payload (16 KiB cap) through the host
  after both sides have granted; `receive` drains the caller's inbox.
- `share.put(content)` / `share.get(t256)` — bounded content-addressed sharing.
- `peers.request(options)` / `peers.listen(options)` — ask trusted host chrome to pair an
  app-scoped service. The host chooses from `mechanisms` (or `"any"`), handles permissions,
  authentication, matching words, confirmation, and data-plane setup.
- `peers.info(handle)` / `peers.close(handle)` — inspect coarse confirmed-peer state or
  disconnect. Handles are opaque and limited to the calling app runtime; discovery bytes,
  addresses, SDP, credentials, and radio APIs never enter the sandbox.
- `peers.diagnostics()` — report adapter availability and actionable host reasons without
  prompting for camera, microphone, Bluetooth, or network permission.
- `links.peers()` — app-scoped peer summaries with passive/probed link quality and
  expiring two-sided media readiness. A declared low-confidence estimate is not a
  measurement.
- `links.watch()` — async iterable of app-scoped link-summary changes.
- `links.probe(peer, { budgetBytes? })` — explicit active measurement, capped by the host
  at 8 KiB and one call per app/peer/minute; costly paths may ask in trusted chrome.
- `device.shareOffers()` / `device.requestShareOffer(purpose)` /
  `device.revokeShareOffer(id)` — inspect or request changes to outbound policy. The app
  supplies only purpose text; peer, media tier, quality ceiling, and TTL are host-authored.
- `device.stream(session, peer, constraints?)` — begins host-owned egress only when the
  device session, capability, share offer, admission result, reservation, and plane binder
  all permit it. Candidate supplies from the app are ceilings, never measurements.
- `device.incoming()` / `device.accept(offer, sink)` / `device.decline(offer)` — receive
  offers and bind accepted media to a `remote-video` or speaker host sink. Raw inbound
  delivery requires the separate sensitive capability.

All calls without a matching grant fail with a typed `CapabilityError`.

The desktop host maps announce calls onto signed Reticulum destinations and exact aspect
handlers. The runtime also includes a transport-backed service exercised by a real two-host
conformance tier; mobile/web transport rollout remains separately tracked. The API and
receive path can be exercised locally by injecting a shared service; that is not a
cross-device transport test. Reticulum's underlying destination announce mechanism is
documented in its [concept guide](https://reticulum.network/manual/understanding.html#public-key-announcements),
[example](https://reticulum.network/manual/examples.html#announce), and
[`Destination.announce()` reference](https://reticulum.network/manual/reference.html#RNS.Destination.announce).

## Widget Protocol

Allowed components include `view`, `text`, `image`, `button`, `text-input`, `switch`,
`scroll`, `list`, `progress`, `divider`, `spacer`, `code-editor`, `qr-code`, and the
host-rendered device/media surfaces (`camera-preview`, `audio-meter`, `waveform`,
`map-preview`, `remote-video`).

`code-editor` is **content-by-reference**: it carries a workspace `documentId`
(plus `language`, `readOnly`, `event`) instead of file text, so sources cannot
blow the widget-tree byte budget. The host resolves the content from the app's
workspace; user edits arrive as the configured event with
`{ documentId, text }` and the app persists them via `workspace.write`.
`qr-code` renders a scannable code for a string value (≤ 512 chars — sized for
94-character 256t ids) with an optional caption; the desktop host also shows
the copyable string.

Allowed style is a bounded subset: flex layout, spacing, colors, and typography scale.
The host rejects unknown props, unknown styles, duplicate node IDs, excessive depth,
excessive nodes, and oversized messages.

Events flow from host to app via `ui.onEvent`. The app must have rendered the target
node; event forgery for unknown nodes is rejected.

Golden render-model fixtures live in `conformance/fixtures/widget-trees/` and are
checked by `packages/miniapp-runtime/test/ui-golden.test.ts` (`describeWidgetTree`).
The harness renderer in `packages/widget-renderer-rn` must stay aligned
with that model.

### Example

```javascript
import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      {
        id: "title",
        type: "text",
        props: { value: "Hello" },
        style: { fontSize: 20 },
      },
      {
        id: "go",
        type: "button",
        props: { label: "Tap me", event: "hello.tap" },
      },
    ],
  },
});

ui.onEvent(async ({ event }) => {
  if (event === "hello.tap") {
    await ui.render(/* updated tree */);
  }
});
```

```elm
view : Model -> Widget Msg
view _ =
    W.view "root" [ S.padding 16, S.gap 8 ]
        [ W.text "title" [ S.fontSize 20 ] "Hello"
        , W.button "go" [] { label = "Tap me", onPress = Tapped, event = "hello.tap" }
        ]
```

The Guida `view` is the same widget protocol. See [Guida UI](guida-ui.md).

## Example Apps

See `apps/examples/`:

- **chat** — identity + LXMF send/receive
- **file-drop** — resource fetch + KV storage
- **board** — announce + Hyperbee local store
- **Peer Link** (`apps/peer-link`) — reference pairing UI using only `peers` and `ui`

And `apps/devstudio` — the self-hosting development environment
([docs/devstudio.md](devstudio.md)) exercising the workspace, AI, apps, and
share namespaces plus the `code-editor` and `qr-code` widgets.

And `apps/handbook` — interactive diagnostic documentation as a mini-app
([docs/handbook.md](handbook.md)).

Run the CI exercises: `npm run test:examples`, `npm run test:handbook`, and
`npm run test:devstudio-loop`.

## Future Work

- **React binding:** custom reconciler emitting the same widget-tree protocol (stretch; non-blocking).
- **Hyperbee replication:** cross-device sync topics; v1 is local-only.
- **Shared mini-app storage:** a channel copies messages through the broker;
  apps still do not share a store.
- **Transport-backed mini-app announces:** connect the broker's announce service to host
  Reticulum destinations/handlers; the current default is process-local.
