module TwistedPear.Sdk.Core exposing (bytes, encodeBytes, json, maybeBytes, string, typed, voidResult)

{-| Shared encoding for generated SDK wrappers. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect exposing (Effect)
import TwistedPear.Sdk.Error as Error exposing (Error)


typed : String -> String -> E.Value -> D.Decoder a -> (Result Error a -> msg) -> Effect msg
typed namespace method payload decoder toMsg =
    Effect.call namespace method payload (decode decoder >> toMsg)


decode : D.Decoder a -> Result Error D.Value -> Result Error a
decode decoder result =
    case result of
        Err err ->
            Err err

        Ok value ->
            case D.decodeValue decoder value of
                Ok decoded ->
                    Ok decoded

                Err problem ->
                    Err (Error.fromCode "BROKER_ERROR" (D.errorToString problem))


voidResult : D.Decoder ()
voidResult =
    D.succeed ()


string : D.Decoder String
string =
    D.string


json : D.Decoder D.Value
json =
    D.value


bytes : D.Decoder (List Int)
bytes =
    D.list D.int


maybeBytes : D.Decoder (Maybe (List Int))
maybeBytes =
    D.oneOf [ D.map Just bytes, D.null Nothing ]


encodeBytes : List Int -> E.Value
encodeBytes =
    E.list E.int
