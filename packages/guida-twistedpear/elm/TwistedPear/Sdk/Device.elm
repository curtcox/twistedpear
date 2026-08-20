{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Device exposing
    ( inventory, diagnostics, open, close, read )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


inventory : (Result Error D.Value -> msg) -> Effect msg
inventory toMsg =
    Core.typed "device" "inventory" (E.null) Core.json toMsg


diagnostics : (Result Error D.Value -> msg) -> Effect msg
diagnostics toMsg =
    Core.typed "device" "diagnostics" (E.null) Core.json toMsg


open : D.Value -> (Result Error D.Value -> msg) -> Effect msg
open request toMsg =
    Core.typed "device" "open" (E.object [ ( "request", request ) ]) Core.json toMsg


close : D.Value -> (Result Error () -> msg) -> Effect msg
close session toMsg =
    Core.typed "device" "close" (E.object [ ( "session", session ) ]) Core.voidResult toMsg


read : D.Value -> (Result Error D.Value -> msg) -> Effect msg
read session toMsg =
    Core.typed "device" "read" (E.object [ ( "session", session ) ]) Core.json toMsg

