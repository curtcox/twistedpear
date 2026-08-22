{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.AppsChannel exposing
    ( open, send, receive, close, peers )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


open : D.Value -> (Result Error D.Value -> msg) -> Effect msg
open destination toMsg =
    Core.typed "apps.channel" "open" (E.object [ ( "destination", destination ) ]) Core.json toMsg


send : D.Value -> String -> (Result Error D.Value -> msg) -> Effect msg
send destination payload toMsg =
    Core.typed "apps.channel" "send" (E.object [ ( "destination", destination ), ( "payload", E.string payload ) ]) Core.json toMsg


receive : (Result Error D.Value -> msg) -> Effect msg
receive toMsg =
    Core.typed "apps.channel" "receive" (E.null) Core.json toMsg


close : D.Value -> (Result Error D.Value -> msg) -> Effect msg
close destination toMsg =
    Core.typed "apps.channel" "close" (E.object [ ( "destination", destination ) ]) Core.json toMsg


peers : (Result Error D.Value -> msg) -> Effect msg
peers toMsg =
    Core.typed "apps.channel" "peers" (E.null) Core.json toMsg

