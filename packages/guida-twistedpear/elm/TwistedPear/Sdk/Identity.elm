{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Identity exposing
    ( destinationHash, sign )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


destinationHash : (Result Error String -> msg) -> Effect msg
destinationHash toMsg =
    Core.typed "identity" "destinationHash" (E.null) Core.string toMsg


sign : (List Int) -> (Result Error (List Int) -> msg) -> Effect msg
sign payload toMsg =
    Core.typed "identity" "sign" (E.object [ ( "payload", Core.encodeBytes payload ) ]) Core.bytes toMsg

