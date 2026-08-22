{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Crypto exposing
    ( randomBytes, hash, hmac, timingSafeEqual )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


randomBytes : Int -> (Result Error (List Int) -> msg) -> Effect msg
randomBytes n toMsg =
    Core.typed "crypto" "randomBytes" (E.object [ ( "n", E.int n ) ]) Core.bytes toMsg


hash : String -> (List Int) -> (Result Error (List Int) -> msg) -> Effect msg
hash alg bytes toMsg =
    Core.typed "crypto" "hash" (E.object [ ( "alg", E.string alg ), ( "bytes", Core.encodeBytes bytes ) ]) Core.bytes toMsg


hmac : String -> (List Int) -> (List Int) -> (Result Error (List Int) -> msg) -> Effect msg
hmac alg key bytes toMsg =
    Core.typed "crypto" "hmac" (E.object [ ( "alg", E.string alg ), ( "key", Core.encodeBytes key ), ( "bytes", Core.encodeBytes bytes ) ]) Core.bytes toMsg


timingSafeEqual : (List Int) -> (List Int) -> (Result Error D.Value -> msg) -> Effect msg
timingSafeEqual a b toMsg =
    Core.typed "crypto" "timingSafeEqual" (E.object [ ( "a", Core.encodeBytes a ), ( "b", Core.encodeBytes b ) ]) Core.json toMsg

