{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Links exposing
    ( peers, probe )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


peers : (Result Error D.Value -> msg) -> Effect msg
peers toMsg =
    Core.typed "links" "peers" (E.null) Core.json toMsg


probe : D.Value -> D.Value -> (Result Error D.Value -> msg) -> Effect msg
probe peer options toMsg =
    Core.typed "links" "probe" (E.object [ ( "peer", peer ), ( "options", options ) ]) Core.json toMsg

