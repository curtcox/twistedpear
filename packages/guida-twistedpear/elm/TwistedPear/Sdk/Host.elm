{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Host exposing
    ( info, requestWake )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


info : (Result Error D.Value -> msg) -> Effect msg
info toMsg =
    Core.typed "host" "info" (E.null) Core.json toMsg


requestWake : Int -> Int -> (Result Error D.Value -> msg) -> Effect msg
requestWake intervalMs budgetMs toMsg =
    Core.typed "host" "requestWake" (E.object [ ( "intervalMs", E.int intervalMs ), ( "budgetMs", E.int budgetMs ) ]) Core.json toMsg

