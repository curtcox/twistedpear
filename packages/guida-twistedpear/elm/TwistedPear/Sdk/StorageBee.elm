{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.StorageBee exposing
    ( open, get, put, del, list )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


open : (Result Error D.Value -> msg) -> Effect msg
open toMsg =
    Core.typed "storage.bee" "open" (E.null) Core.json toMsg


get : String -> (Result Error (Maybe (List Int)) -> msg) -> Effect msg
get key toMsg =
    Core.typed "storage.bee" "get" (E.object [ ( "key", E.string key ) ]) Core.maybeBytes toMsg


put : String -> (List Int) -> (Result Error () -> msg) -> Effect msg
put key value toMsg =
    Core.typed "storage.bee" "put" (E.object [ ( "key", E.string key ), ( "value", Core.encodeBytes value ) ]) Core.voidResult toMsg


del : String -> (Result Error () -> msg) -> Effect msg
del key toMsg =
    Core.typed "storage.bee" "del" (E.object [ ( "key", E.string key ) ]) Core.voidResult toMsg


list : D.Value -> (Result Error D.Value -> msg) -> Effect msg
list options toMsg =
    Core.typed "storage.bee" "list" (E.object [ ( "options", options ) ]) Core.json toMsg

