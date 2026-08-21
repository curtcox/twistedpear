module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Freenet as Freenet
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Model =
    { keyHex : String
    , codeHashHex : String
    , wasmHex : String
    , parametersHex : String
    , stateHex : String
    , status : String
    }


type Msg
    = Key String
    | CodeHash String
    | Wasm String
    | Parameters String
    | State String
    | Get
    | Put
    | Update
    | GotGet (Result Error D.Value)
    | GotPut (Result Error D.Value)
    | GotUpdate (Result Error ())


initialStatus : String
initialStatus =
    "Reads are private to your node connection. Put and update are global and irreversible."


main =
    Program.app
        { init =
            ( { keyHex = ""
              , codeHashHex = ""
              , wasmHex = ""
              , parametersHex = ""
              , stateHex = ""
              , status = initialStatus
              }
            , Effect.none
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


recordDecoder : D.Decoder { keyHex : String, stateHex : String }
recordDecoder =
    D.map2 (\keyHex stateHex -> { keyHex = keyHex, stateHex = stateHex })
        (D.field "keyHex" D.string)
        (D.field "stateHex" D.string)


maybeRecord : D.Decoder (Maybe { keyHex : String, stateHex : String })
maybeRecord =
    D.oneOf
        [ D.null Nothing
        , D.map Just recordDecoder
        ]


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Key keyHex ->
            ( { model | keyHex = String.trim keyHex }, Effect.none )

        CodeHash codeHashHex ->
            ( { model | codeHashHex = String.trim codeHashHex }, Effect.none )

        Wasm wasmHex ->
            ( { model | wasmHex = String.trim wasmHex }, Effect.none )

        Parameters parametersHex ->
            ( { model | parametersHex = String.trim parametersHex }, Effect.none )

        State stateHex ->
            ( { model | stateHex = String.trim stateHex }, Effect.none )

        Get ->
            ( model, Freenet.get model.keyHex GotGet )

        Put ->
            ( model
            , Freenet.put
                (E.object
                    [ ( "wasmHex", E.string model.wasmHex )
                    , ( "parametersHex", E.string model.parametersHex )
                    , ( "stateHex", E.string model.stateHex )
                    ]
                )
                GotPut
            )

        Update ->
            ( model
            , Freenet.update
                (E.object
                    [ ( "keyHex", E.string model.keyHex )
                    , ( "codeHashHex", E.string model.codeHashHex )
                    , ( "stateHex", E.string model.stateHex )
                    ]
                )
                GotUpdate
            )

        GotGet (Ok value) ->
            case D.decodeValue maybeRecord value of
                Ok Nothing ->
                    ( { model | status = "Contract not found" }, Effect.none )

                Ok (Just record) ->
                    ( { model
                        | keyHex = record.keyHex
                        , stateHex = record.stateHex
                        , status =
                            "Read "
                                ++ String.fromInt (String.length record.stateHex // 2)
                                ++ " state bytes"
                      }
                    , Effect.none
                    )

                Err _ ->
                    ( { model | status = "Contract not found" }, Effect.none )

        GotGet (Err err) ->
            ( { model | status = err.message }, Effect.none )

        GotPut (Ok value) ->
            let
                keyHex =
                    D.decodeValue (D.field "keyHex" D.string) value
                        |> Result.withDefault model.keyHex
            in
            ( { model
                | keyHex = keyHex
                , status = "Published contract " ++ keyHex
              }
            , Effect.none
            )

        GotPut (Err err) ->
            ( { model | status = err.message }, Effect.none )

        GotUpdate (Ok ()) ->
            ( { model | status = "Published contract update" }, Effect.none )

        GotUpdate (Err err) ->
            ( { model | status = err.message }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 10 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Contract notebook"
        , W.text "warning"
            []
            "Put and update publish to Freenet. The host asks for confirmation every time."
        , W.textInput "key"
            []
            { value = model.keyHex
            , placeholder = "Contract key (hex)"
            , onInput = Key
            , event = "fn.key"
            }
        , W.textInput "code-hash"
            []
            { value = model.codeHashHex
            , placeholder = "Contract code hash for update (hex)"
            , onInput = CodeHash
            , event = "fn.codeHash"
            }
        , W.textInput "wasm"
            []
            { value = model.wasmHex
            , placeholder = "Contract WASM for put (hex)"
            , onInput = Wasm
            , event = "fn.wasm"
            }
        , W.textInput "parameters"
            []
            { value = model.parametersHex
            , placeholder = "Contract parameters (hex; empty is allowed)"
            , onInput = Parameters
            , event = "fn.parameters"
            }
        , W.textInput "state"
            []
            { value = model.stateHex
            , placeholder = "Contract state (hex)"
            , onInput = State
            , event = "fn.state"
            }
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "get" [] { label = "Get", onPress = Get, event = "fn.get" }
            , W.button "put" [] { label = "Put", onPress = Put, event = "fn.put" }
            , W.button "update" [] { label = "Update", onPress = Update, event = "fn.update" }
            ]
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
