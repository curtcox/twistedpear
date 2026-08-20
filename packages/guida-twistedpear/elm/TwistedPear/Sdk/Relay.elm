{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Relay exposing
    ( setMode, list, status, diagnostics )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


setMode : String -> (Result Error () -> msg) -> Effect msg
setMode mode toMsg =
    Core.typed "relay" "setMode" (E.object [ ( "mode", E.string mode ) ]) Core.voidResult toMsg


list : (Result Error D.Value -> msg) -> Effect msg
list toMsg =
    Core.typed "relay" "list" (E.null) Core.json toMsg


status : (Result Error D.Value -> msg) -> Effect msg
status toMsg =
    Core.typed "relay" "status" (E.null) Core.json toMsg


diagnostics : (Result Error D.Value -> msg) -> Effect msg
diagnostics toMsg =
    Core.typed "relay" "diagnostics" (E.null) Core.json toMsg

