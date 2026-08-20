module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Dispatch as Dispatch
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Widget as W


type alias Model =
    { raw : String
    , result : String
    }


type Msg
    = Typed String
    | Run
    | Got (Result Error E.Value)


type alias Step =
    { namespace : String
    , method : String
    , payload : E.Value
    }


main =
    Program.app
        { init = ( { raw = "", result = "" }, Effect.none )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Typed raw ->
            ( { model | raw = raw }, Effect.none )

        Run ->
            case D.decodeString stepDecoder model.raw of
                Ok step ->
                    ( model, Dispatch.run step.namespace step.method step.payload Got )

                Err err ->
                    ( { model | result = D.errorToString err }, Effect.none )

        Got (Ok value) ->
            ( { model | result = encodeOutcome True value Nothing }, Effect.none )

        Got (Err err) ->
            ( { model | result = encodeOutcome False E.null (Just err) }, Effect.none )


encodeOutcome : Bool -> E.Value -> Maybe Error -> String
encodeOutcome ok result error =
    E.encode 0
        (E.object
            [ ( "ok", E.bool ok )
            , ( "result", result )
            , ( "error"
              , case error of
                    Nothing ->
                        E.null

                    Just err ->
                        E.object
                            [ ( "code", E.string err.code )
                            , ( "message", E.string err.message )
                            ]
              )
            ]
        )


stepDecoder : D.Decoder Step
stepDecoder =
    D.map3 Step
        (D.field "namespace" D.string)
        (D.field "method" D.string)
        (D.oneOf [ D.field "payload" D.value, D.succeed E.null ])


view : Model -> W.Widget Msg
view model =
    W.view "root"
        []
        [ W.textInput "call"
            []
            { value = model.raw
            , placeholder = "call"
            , onInput = Typed
            , event = "call"
            }
        , W.button "run" [] { label = "Run", onPress = Run, event = "run" }
        , W.text "result" [] model.result
        ]
