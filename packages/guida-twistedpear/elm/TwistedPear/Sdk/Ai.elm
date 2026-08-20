{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Ai exposing
    ( chat, embed, search )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


chat : D.Value -> (Result Error D.Value -> msg) -> Effect msg
chat request toMsg =
    Core.typed "ai" "chat" (E.object [ ( "request", request ) ]) Core.json toMsg


embed : D.Value -> (Result Error D.Value -> msg) -> Effect msg
embed request toMsg =
    Core.typed "ai" "embed" (E.object [ ( "request", request ) ]) Core.json toMsg


search : D.Value -> (Result Error D.Value -> msg) -> Effect msg
search request toMsg =
    Core.typed "ai" "search" (E.object [ ( "request", request ) ]) Core.json toMsg

