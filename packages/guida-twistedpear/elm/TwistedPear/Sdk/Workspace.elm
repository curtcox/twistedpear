{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Workspace exposing
    ( list, read, write, patch, remove )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


list : String -> (Result Error D.Value -> msg) -> Effect msg
list prefix toMsg =
    Core.typed "workspace" "list" (E.object [ ( "prefix", E.string prefix ) ]) Core.json toMsg


read : String -> (Result Error String -> msg) -> Effect msg
read path toMsg =
    Core.typed "workspace" "read" (E.object [ ( "path", E.string path ) ]) Core.string toMsg


write : String -> String -> (Result Error D.Value -> msg) -> Effect msg
write path content toMsg =
    Core.typed "workspace" "write" (E.object [ ( "path", E.string path ), ( "content", E.string content ) ]) Core.json toMsg


patch : String -> Int -> D.Value -> (Result Error D.Value -> msg) -> Effect msg
patch path baseLength edits toMsg =
    Core.typed "workspace" "patch" (E.object [ ( "path", E.string path ), ( "baseLength", E.int baseLength ), ( "edits", edits ) ]) Core.json toMsg


remove : String -> (Result Error () -> msg) -> Effect msg
remove path toMsg =
    Core.typed "workspace" "remove" (E.object [ ( "path", E.string path ) ]) Core.voidResult toMsg

