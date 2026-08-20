{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Announce exposing
    ( publish, subscribe )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


publish : (List Int) -> String -> (Result Error () -> msg) -> Effect msg
publish appData namespace toMsg =
    Core.typed "announce" "publish" (E.object [ ( "appData", Core.encodeBytes appData ), ( "namespace", E.string namespace ) ]) Core.voidResult toMsg


subscribe : String -> (Result Error D.Value -> msg) -> Effect msg
subscribe namespace toMsg =
    Core.typed "announce" "subscribe" (E.object [ ( "namespace", E.string namespace ) ]) Core.json toMsg

