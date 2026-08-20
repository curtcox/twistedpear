{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.ShareCas exposing
    ( put, get )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


put : String -> (Result Error D.Value -> msg) -> Effect msg
put content toMsg =
    Core.typed "share.cas" "put" (E.object [ ( "content", E.string content ) ]) Core.json toMsg


get : String -> (Result Error D.Value -> msg) -> Effect msg
get t256 toMsg =
    Core.typed "share.cas" "get" (E.object [ ( "t256", E.string t256 ) ]) Core.json toMsg

