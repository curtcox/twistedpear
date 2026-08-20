# Guida mini-app authoring

<!-- tp-doc
lifecycle: live
audited: 2026-08-20
register: software
counterpart: docs/guida-ui-plan.md
-->

**This document describes the implementation as it exists now.** Intended remaining
work is in [guida-ui-plan.md](guida-ui-plan.md). Where they disagree, this file wins.

[Guida](https://guida-lang.org/) is a supported mini-app authoring language. An author
writes model, update, and view in Guida, runs `tp app build`, and gets a `bundle.js` the
host cannot distinguish from a JavaScript one. Nothing in the sandbox, broker, or package
format changes: Guida is a compile target for the existing bundle format.

```
Main.elm ──guida make --optimize──> guida-out.js ──scope wrapper + minify + shim──> bundle.js ──tp pack──> .tpkg
```

The compiler is pinned at **guida 1.0.0-beta.2**, an npm JavaScript package with no
platform binary. Source files are `.elm`; the project file is `elm.json`.

## What you write

Vendored Elm modules live in [`packages/guida-twistedpear/elm`](../packages/guida-twistedpear/).
Apps reach them through `elm.json` `source-directories`. The build step copies the
vendored tree into `guida-vendor/` in the app directory (packed archives omit it).

```elm
view : Model -> Widget Msg
view model =
    W.view "root" [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Hello"
        , W.button "tap" [] { label = "Tap me", onPress = Tapped }
        , W.text "count" [] ("Taps: " ++ String.fromInt model.taps)
        ]
```

Node ids are the first argument and become event names, so a Guida app and a JavaScript
app that use the same ids emit the same widget frames.

`TwistedPear.Widget` / `TwistedPear.Style` are generated from
[`specs/spec-widget/schema/widget.schema.json`](../specs/spec-widget/schema/widget.schema.json)
(`npm run generate:guida-widget`). `TwistedPear.Sdk.*` wrappers and the JS shim are
generated from [`specs/spec-sdk/schema/calls.descriptor.json`](../specs/spec-sdk/schema/calls.descriptor.json)
(`npm run generate:guida-sdk`).

## Effects are not `Task`

Guida 0.x replicates Elm 0.19.1: a non-kernel package cannot define an effect manager.
SDK wrappers therefore return `TwistedPear.Effect msg` with a continuation message, not
`Task`. `Program.app` turns those effects into the two ports `tpOut` / `tpIn`.

## Toolchain

```sh
tp guida init my-app
tp app build my-app
tp pack my-app
```

`tp pack` rebuilds a Guida project when `elm.json` is present and `bundle.js` is missing
or already a Guida artifact. A directory that also holds a JavaScript `bundle.js` twin
keeps that twin as the packaged artifact; the Guida sources are a validated variant, not
a second published app.

`collectAppFiles` honours `.tpignore` and, when `elm.json` is present, omits `*.elm`,
`elm.json`, and `guida-stuff/` from the archive.

On-device compiling uses the same JavaScript compiler module
(`JsModuleGuidaCompiler`) with an injectable filesystem. Interactive DevStudio projects
and per-platform speed measurements remain planned — see
[guida-ui-plan.md](guida-ui-plan.md) Phase 5.

## Size

A minified Guida hello world plus shim is larger than a JavaScript sample but inside both
RNode automatic-fetch thresholds (32 KiB warn / 64 KiB block). Measure a specific app
before treating Guida as interchangeable with a few-kilobyte JS bundle on LoRa. See
[LIMITATIONS.md](../LIMITATIONS.md) §6.

## Verify

```sh
npm run generate:guida-widget
npm run generate:guida-sdk
npm test -- packages/guida-twistedpear/test
npm test -- packages/cli/test/guida-init.test.ts packages/cli/test/pack-files.test.ts
npm run test:guida-parity
```
