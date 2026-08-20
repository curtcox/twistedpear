module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Announce as Announce
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Presence as Presence
import TwistedPear.Style as S
import TwistedPear.Widget as W


minIntervalMs : Int
minIntervalMs =
    5 * 60 * 1000


states : List String
states =
    [ "ok", "busy", "help", "off" ]


type alias Model =
    { state : String
    , note : String
    , auto : Bool
    , peers : Int
    , status : String
    }


type Msg
    = Select String
    | Note String
    | Send
    | Auto Bool
    | GotSnapshot (Result Error D.Value)
    | GotPublish (Result Error ())


main =
    Program.app
        { init =
            ( { state = "ok", note = "", auto = False, peers = 0, status = "" }
            , Presence.snapshot GotSnapshot
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


utf8Len : String -> Int
utf8Len string =
    string |> String.toList |> List.map Char.toCode |> List.length


indexOf : String -> List String -> Int
indexOf item items =
    items
        |> List.indexedMap Tuple.pair
        |> List.filter (\( _, value ) -> value == item)
        |> List.head
        |> Maybe.map Tuple.first
        |> Maybe.withDefault -1


payloadJson : Model -> String
payloadJson model =
    E.encode 0
        (E.object
            [ ( "s", E.int (indexOf model.state states) )
            , ( "n", E.string (String.left 12 model.note) )
            , ( "t", E.int 0 )
            ]
        )


payloadBytes : Model -> Int
payloadBytes model =
    utf8Len (payloadJson model)


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Select state ->
            ( { model | state = state }, Presence.snapshot GotSnapshot )

        Note note ->
            ( { model | note = String.left 12 note }, Presence.snapshot GotSnapshot )

        Send ->
            ( { model | status = "Beaconed " ++ String.fromInt (payloadBytes model) ++ " bytes at " }
            , Effect.batch
                [ Announce.publish (payloadJson model |> String.toList |> List.map Char.toCode) "beacon-lite" GotPublish
                , Presence.snapshot GotSnapshot
                ]
            )

        Auto auto ->
            ( { model | auto = auto }, Presence.snapshot GotSnapshot )

        GotSnapshot (Ok value) ->
            ( { model | peers = D.decodeValue (D.field "peers" D.int) value |> Result.withDefault 0 }, Effect.none )

        GotSnapshot (Err _) ->
            ( { model | peers = 0 }, Effect.none )

        GotPublish _ ->
            ( model, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Beacon lite"
        , W.view "states"
            [ S.flexDirection "row", S.gap 8 ]
            (List.map
                (\option ->
                    W.button ("state-" ++ option)
                        []
                        { label =
                            if option == model.state then
                                "● " ++ option

                            else
                                option
                        , onPress = Select option
                        , event = "bl.state." ++ option
                        }
                )
                states
            )
        , W.textInput "note"
            []
            { value = model.note
            , placeholder = "12 characters, no more"
            , onInput = Note
            , event = "bl.note"
            }
        , W.text "size"
            [ S.fontSize 12 ]
            (String.fromInt (payloadBytes model) ++ " bytes per beacon · " ++ String.fromInt model.peers ++ " peers in range")
        , W.text "auto-label" [] ("Repeat every " ++ String.fromInt (minIntervalMs // 60000) ++ " minutes")
        , W.switch "auto" [] { value = model.auto, onChange = Auto, event = "bl.auto" }
        , W.button "send" [] { label = "Beacon now", onPress = Send, event = "bl.send" }
        , W.text "status" [ S.fontSize 12 ] model.status
        , W.text "warning"
            [ S.fontSize 12 ]
            "Closing the app stops the beacon. Nothing runs in the background."
        ]
