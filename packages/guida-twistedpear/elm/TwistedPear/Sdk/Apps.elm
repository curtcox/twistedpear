{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Apps exposing
    ( compile, format, diagnostics, packageProject, publish, install, preview, stopPreview )

{-| Generated SDK wrappers. Effects complete as a continuation message; there is no Task. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)


compile : String -> (Result Error D.Value -> msg) -> Effect msg
compile projectPrefix toMsg =
    Core.typed "apps" "compile" (E.object [ ( "projectPrefix", E.string projectPrefix ) ]) Core.json toMsg


format : String -> (Result Error D.Value -> msg) -> Effect msg
format content toMsg =
    Core.typed "apps" "format" (E.object [ ( "content", E.string content ) ]) Core.json toMsg


diagnostics : String -> String -> (Result Error D.Value -> msg) -> Effect msg
diagnostics projectPrefix path toMsg =
    Core.typed "apps" "diagnostics" (E.object [ ( "projectPrefix", E.string projectPrefix ), ( "path", E.string path ) ]) Core.json toMsg


packageProject : String -> D.Value -> (Result Error D.Value -> msg) -> Effect msg
packageProject projectPrefix manifest toMsg =
    Core.typed "apps" "packageProject" (E.object [ ( "projectPrefix", E.string projectPrefix ), ( "manifest", manifest ) ]) Core.json toMsg


publish : String -> (Result Error D.Value -> msg) -> Effect msg
publish t256 toMsg =
    Core.typed "apps" "publish" (E.object [ ( "t256", E.string t256 ) ]) Core.json toMsg


install : String -> (Result Error D.Value -> msg) -> Effect msg
install t256 toMsg =
    Core.typed "apps" "install" (E.object [ ( "t256", E.string t256 ) ]) Core.json toMsg


preview : String -> D.Value -> D.Value -> (Result Error D.Value -> msg) -> Effect msg
preview projectPrefix manifest grants toMsg =
    Core.typed "apps" "preview" (E.object [ ( "projectPrefix", E.string projectPrefix ), ( "manifest", manifest ), ( "grants", grants ) ]) Core.json toMsg


stopPreview : (Result Error () -> msg) -> Effect msg
stopPreview toMsg =
    Core.typed "apps" "stopPreview" (E.null) Core.voidResult toMsg

