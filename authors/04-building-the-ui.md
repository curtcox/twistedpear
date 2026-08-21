# 4. Building the UI

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: none
-->

Your UI is a JSON tree you hand to the host. The host validates it against a closed allowlist
and renders it natively. Anything not on the allowlist is rejected — the tree is refused
whole, not silently pruned.

`ui.render` and `ui.onEvent` require **no capability grant**. The UI is your app's own
surface, not a host service. They are still subject to the same size and rate limits as every
other broker call.

## The tree

```javascript
await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      {
        id: "title",
        type: "text",
        props: { value: "Chat" },
        style: { fontSize: 20, fontWeight: "bold" },
      },
      {
        id: "peer",
        type: "text-input",
        props: { value: peer, placeholder: "Peer app id", event: "chat.peer" },
      },
      {
        id: "send",
        type: "button",
        props: { label: "Send", event: "chat.send" },
      },
    ],
  },
});
```

```elm
W.view "root" [ S.padding 16, S.gap 12 ]
    [ W.text "title" [ S.fontSize 20, S.bold ] "Chat"
    , W.textInput "peer"
        []
        { value = model.peer, placeholder = "Peer app id", onInput = Peer, event = "chat.peer" }
    , W.button "send" [] { label = "Send", onPress = Send, event = "chat.send" }
    ]
```

Every node needs a unique `id`. Duplicate ids reject the tree. Ids are also how events are
attributed, so keep them stable across renders for anything the user interacts with — a
`text-input` whose id changes between renders loses focus.

## Components

The allowlist is closed. These are all of them:

| Component     | For                                                |
| ------------- | -------------------------------------------------- |
| `view`        | A layout box. The only container.                  |
| `text`        | A run of text.                                     |
| `image`       | A bitmap from your package.                        |
| `button`      | A tappable control that emits an event.            |
| `text-input`  | Single-line text entry; emits on change.           |
| `switch`      | A boolean toggle.                                  |
| `scroll`      | A scrollable region.                               |
| `list`        | A vertical collection.                             |
| `progress`    | A determinate or indeterminate progress indicator. |
| `divider`     | A horizontal rule.                                 |
| `spacer`      | Flexible empty space.                              |
| `code-editor` | A source editor, addressed by workspace document.  |
| `qr-code`     | A scannable code for a short string.               |

There is no modal, no menu, no tab bar, and no native date picker. Build those out of `view`,
`text`, and `button` — or reconsider whether your app needs them.

![The full component set rendered on desktop, Android, and in a browser](/authors/images/04-component-gallery.png)

**Screenshot 4.1 — The component set, three ways.** Three panels side by side, each showing
the same widget tree rendered by a different host: desktop (Electron, 1280×800 window,
cropped to the app surface), Android (portrait phone), and a browser tab. Each panel shows,
top to bottom: a heading `text`, a `divider`, a `text-input` with placeholder, a `switch`, a
`progress` bar at about 60%, a `button`, and a `list` of three rows. The point of the shot is
that the layout is identical while each control adopts its platform's native appearance.

### `code-editor`

The editor carries a workspace `documentId`, not file text — `language`, `readOnly`, and
`event` alongside it. The host resolves the content from your app's workspace and delivers
edits as your configured event with `{ documentId, text }`, which you persist with
`workspace.write`.

This exists so a source file cannot blow the widget-tree byte budget. It also means the
editor is only useful to an app holding the `workspace` capability
([Chapter 6](06-storage-and-files.md)).

### `qr-code`

Renders a scannable code for a string of up to 512 characters — sized for a 94-character 256t
identifier. Takes an optional caption. On desktop the host also shows the string itself in a
copyable form, because desktop cannot scan.

## Style

Style is a bounded subset: flex layout, spacing, colours, and a typography scale. Unknown
style keys reject the tree.

```javascript
style: {
  padding: 16,
  gap: 8,
  fontSize: 20,
  fontWeight: "bold"
}
```

```elm
[ S.padding 16, S.gap 8, S.fontSize 20, S.bold ]
```

You cannot ship CSS, web fonts, animations, or arbitrary drawing. Two things follow:

- **Your app looks like the host.** Users get a consistent surface across every mini-app they
  run, and you get a phone layout you did not write.
- **You cannot spoof host chrome.** This is why users can trust the install and publish
  dialogs: there is no component that can draw one.

Design for the narrowest target you care about. A layout that works on a phone works
everywhere; the reverse is not true.

## Events

```javascript
ui.onEvent(async ({ event, value }) => {
  if (event === "chat.peer" && typeof value === "string") {
    peer = value;
    await render();
    return;
  }
  if (event === "chat.send") {
    await lxmf.send({ to: peer, subject: "hello", body: "Hi" });
    await render();
  }
});
```

```elm
update : Msg -> Model -> ( Model, Effect Msg )
update msg model =
    case msg of
        Peer peer ->
            ( { model | peer = peer }, Effect.none )

        Send ->
            ( model
            , Lxmf.send
                (E.object
                    [ ( "to", E.string model.peer )
                    , ( "subject", E.string "hello" )
                    , ( "body", E.string "Hi" )
                    ]
                )
                GotSend
            )
```

- `event` is the string you put in the node's `props.event`. Namespace them (`chat.send`, not
  `send`) so a growing app does not collide with itself.
- `value` carries the control's payload: the text for a `text-input`, the boolean for a
  `switch`, `{ documentId, text }` for a `code-editor`.
- **Validate `value` anyway.** Check the type before you use it, as the example does.
- The host rejects events for nodes you have not rendered, so event forgery for unknown nodes
  is not a threat you have to defend against — but a node you _did_ render can be interacted
  with in any order, at any time.

There is no unmount, no lifecycle hook, and no navigation stack. Your app is a value plus a
`render()` function; changing the value and re-rendering is the whole pattern.

## Re-rendering

Call `ui.render` with a complete fresh tree. The host diffs against the previous tree and
applies an incremental update, so you are not paying for a full redraw — but you _are_ paying
to serialise and ship the whole tree across the broker each time.

That matters at scale. A 5,000-node tree at 60 renders per second is not a thing you can do;
see [Chapter 12](12-limits-and-budgets.md) for the actual ceilings.

## What rejects a tree

| Rejection                 | Default |
| ------------------------- | ------- |
| Unknown component type    | —       |
| Unknown prop or style key | —       |
| Duplicate node id         | —       |
| Too many nodes            | 5,000   |
| Too deep                  | 32      |
| Message too large         | 256 KiB |

These are host-configurable, so treat the numbers as the generous case rather than a target.
A rejected render throws; it does not partially apply.

![A rejected widget tree surfaced in the host's developer output](/authors/images/04-render-rejection.png)

**Screenshot 4.2 — A rejected tree.** The desktop host with the Runtime controls panel open.
The app surface shows the last successfully rendered tree, unchanged. Below it, a log line in
red: `WidgetValidationError: unknown component type "table" at node "results-table"`. A
sibling line in grey reads `render rejected — previous tree retained`. The point of the shot
is that the app does not go blank when a render is refused.

## Golden fixtures

The render model is pinned by golden fixtures in `conformance/fixtures/widget-trees/`,
checked by `packages/miniapp-runtime/test/ui-golden.test.ts`. If you are curious about what a
particular tree resolves to, or you think a host is rendering something wrongly, those
fixtures are the reference — not any individual host's behaviour.
