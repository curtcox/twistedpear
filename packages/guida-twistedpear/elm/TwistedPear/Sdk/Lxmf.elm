{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Lxmf exposing
    ( send, receive )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


send : D.Value -> (Result Error D.Value -> msg) -> Effect msg
send request toMsg =
    Core.typed "lxmf" "send" (E.object [ ( "request", request ) ]) Core.json toMsg


receive : (Result Error D.Value -> msg) -> Effect msg
receive toMsg =
    Core.typed "lxmf" "receive" (E.null) Core.json toMsg

