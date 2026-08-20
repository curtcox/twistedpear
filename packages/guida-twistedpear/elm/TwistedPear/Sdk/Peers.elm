{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Peers exposing
    ( request, listen, diagnostics, info, close )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


request : D.Value -> (Result Error D.Value -> msg) -> Effect msg
request options toMsg =
    Core.typed "peers" "request" (E.object [ ( "options", options ) ]) Core.json toMsg


listen : D.Value -> (Result Error D.Value -> msg) -> Effect msg
listen options toMsg =
    Core.typed "peers" "listen" (E.object [ ( "options", options ) ]) Core.json toMsg


diagnostics : (Result Error D.Value -> msg) -> Effect msg
diagnostics toMsg =
    Core.typed "peers" "diagnostics" (E.null) Core.json toMsg


info : D.Value -> (Result Error D.Value -> msg) -> Effect msg
info handle toMsg =
    Core.typed "peers" "info" (E.object [ ( "handle", handle ) ]) Core.json toMsg


close : D.Value -> (Result Error () -> msg) -> Effect msg
close handle toMsg =
    Core.typed "peers" "close" (E.object [ ( "handle", handle ) ]) Core.voidResult toMsg

