{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Freenet exposing
    ( get, put, update )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


get : String -> (Result Error D.Value -> msg) -> Effect msg
get keyHex toMsg =
    Core.typed "freenet" "get" (E.object [ ( "keyHex", E.string keyHex ) ]) Core.json toMsg


put : D.Value -> (Result Error D.Value -> msg) -> Effect msg
put options toMsg =
    Core.typed "freenet" "put" (E.object [ ( "options", options ) ]) Core.json toMsg


update : D.Value -> (Result Error () -> msg) -> Effect msg
update options toMsg =
    Core.typed "freenet" "update" (E.object [ ( "options", options ) ]) Core.voidResult toMsg

