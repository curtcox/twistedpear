module TwistedPear.Sdk.Error exposing (Error, decoder, fromCode)

{-| Broker denial. Guida apps pattern-match on `code` rather than catching throws. -}

import Json.Decode as D


type alias Error =
    { code : String
    , message : String
    }


decoder : D.Decoder Error
decoder =
    D.map2 Error
        (D.oneOf [ D.field "code" D.string, D.succeed "BROKER_ERROR" ])
        (D.oneOf [ D.field "message" D.string, D.succeed "Host request failed" ])


fromCode : String -> String -> Error
fromCode code message =
    { code = code, message = message }
