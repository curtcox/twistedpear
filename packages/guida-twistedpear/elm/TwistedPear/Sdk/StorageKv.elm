{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.StorageKv exposing
    ( get, set, delete )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


get : String -> (Result Error (Maybe (List Int)) -> msg) -> Effect msg
get key toMsg =
    Core.typed "storage.kv" "get" (E.object [ ( "key", E.string key ) ]) Core.maybeBytes toMsg


set : String -> (List Int) -> (Result Error () -> msg) -> Effect msg
set key value toMsg =
    Core.typed "storage.kv" "set" (E.object [ ( "key", E.string key ), ( "value", Core.encodeBytes value ) ]) Core.voidResult toMsg


delete : String -> (Result Error () -> msg) -> Effect msg
delete key toMsg =
    Core.typed "storage.kv" "delete" (E.object [ ( "key", E.string key ) ]) Core.voidResult toMsg

