# 4b. Building the UI in Guida

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: none
-->

JavaScript is not the only authoring language. [Guida](https://guida-lang.org/) compiles
The Elm Architecture to the same `bundle.js` the host already runs. Read this alongside
[Chapter 4](04-building-the-ui.md), not instead of it: the widget vocabulary, node ids, and
events are the same.

The live implementation, toolchain commands, and the `Effect` vs `Task` restriction are in
[docs/guida-ui.md](../docs/guida-ui.md). DevStudio compiles Guida projects on the device
and can add, format, and check `.elm` files. The documentation-site editor compiles Guida
in the tab the same way: [Open in the editor](https://curtcox.github.io/twistedpear/editor/?app=hello-guida)
(first Guida action fetches the ~2 MB compiler worker; hello-world is ~4 s in Chromium).

## Hello

```sh
tp guida init hello-guida
tp app build hello-guida
tp pack hello-guida
```

```elm
view : Model -> Widget Msg
view model =
    W.view "root" [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Hello"
        , W.button "tap" [] { label = "Tap me", onPress = Tapped, event = "tap" }
        , W.text "count" [] ("Taps: " ++ String.fromInt model.taps)
        ]
```

`onPress` becomes the node's id as the event name (`tap`), so a JavaScript twin that uses
`event: "tap"` produces the same frames.

## There is no `Task`

SDK calls return `TwistedPear.Effect msg` with a continuation message. Elm 0.19 — and
therefore Guida 0.x — does not let a non-kernel package define effect managers. Write:

```elm
Identity.destinationHash GotHash
```

not `Task.perform`. Broker denials arrive as `Err { code, message }` on that continuation.

## What stays JavaScript

The shim the build concatenates is generated. You do not write it. Capability scanning
still sees literal `sdk.ui.render` / `sdk.identity.destinationHash` names in the compiled
bundle.
