module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Lxmf as Lxmf
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


maxBytes : Int
maxBytes =
    220


queueKey : String
queueKey =
    "queue"


lines : List String
lines =
    [ "1 Location"
    , "2 Callsign / frequency"
    , "3 Precedence"
    , "4 Equipment needed"
    , "5 Number of people"
    , "6 Security at site"
    , "7 Marking method"
    , "8 Nationality / status"
    , "9 Terrain / hazards"
    ]


type alias Queued =
    { to : String
    , body : String
    }


type alias Model =
    { recipient : String
    , values : List String
    , queue : List Queued
    , status : String
    }


type Msg
    = To String
    | Field Int String
    | Send
    | Flush
    | GotQueue (Result Error (Maybe (List Int)))
    | GotSave (Result Error ())
    | GotSend (Result Error D.Value)
    | GotFlushSend Int (Result Error D.Value)


main =
    Program.app
        { init =
            ( { recipient = "", values = List.map (\_ -> "") lines, queue = [], status = "" }
            , StorageKv.get queueKey GotQueue
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


utf8Encode : String -> List Int
utf8Encode string =
    string |> String.toList |> List.map Char.toCode


utf8Decode : List Int -> String
utf8Decode bytes =
    bytes |> List.map Char.fromCode |> String.fromList


wire : List String -> String
wire values =
    values
        |> List.map (String.replace "|" "/" >> String.trim)
        |> String.join "|"


setAt : Int -> String -> List String -> List String
setAt index value items =
    List.indexedMap
        (\i item ->
            if i == index then
                value

            else
                item
        )
        items


queuedDecoder : D.Decoder Queued
queuedDecoder =
    D.map2 Queued
        (D.field "to" D.string)
        (D.field "body" D.string)


saveQueue : List Queued -> Effect.Effect Msg
saveQueue queue =
    StorageKv.set queueKey
        (utf8Encode
            (E.encode 0
                (E.list
                    (\item -> E.object [ ( "to", E.string item.to ), ( "body", E.string item.body ), ( "at", E.int 0 ) ])
                    queue
                )
            )
        )
        GotSave


sendBody : String -> String -> (Result Error D.Value -> Msg) -> Effect.Effect Msg
sendBody to body toMsg =
    Lxmf.send
        (E.object
            [ ( "to", E.string to )
            , ( "subject", E.string "9L" )
            , ( "body", E.string body )
            ]
        )
        toMsg


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        To recipient ->
            ( { model | recipient = recipient }, Effect.none )

        Field index value ->
            ( { model | values = setAt index value model.values }, Effect.none )

        Send ->
            let
                body =
                    wire model.values

                bytes =
                    List.length (utf8Encode body)
            in
            if bytes > maxBytes then
                ( { model | status = String.fromInt bytes ++ " bytes — over the " ++ String.fromInt maxBytes ++ "-byte ceiling. Shorten a field." }, Effect.none )

            else if String.trim model.recipient == "" then
                ( { model | status = "Need a recipient" }, Effect.none )

            else
                ( model, sendBody (String.trim model.recipient) body GotSend )

        Flush ->
            case model.queue of
                [] ->
                    ( { model | status = "Flushed 0, 0 still queued" }, saveQueue [] )

                first :: _ ->
                    ( model, sendBody first.to first.body (GotFlushSend 0) )

        GotQueue (Ok Nothing) ->
            ( model, Effect.none )

        GotQueue (Ok (Just stored)) ->
            ( { model | queue = D.decodeString (D.list queuedDecoder) (utf8Decode stored) |> Result.withDefault [] }, Effect.none )

        GotQueue (Err _) ->
            ( model, Effect.none )

        GotSave _ ->
            ( model, Effect.none )

        GotSend (Ok _) ->
            ( { model | status = "Sent " ++ String.fromInt (List.length (utf8Encode (wire model.values))) ++ " bytes" }, Effect.none )

        GotSend (Err _) ->
            let
                queue =
                    model.queue ++ [ { to = String.trim model.recipient, body = wire model.values } ]
            in
            ( { model
                | queue = queue
                , status = "No link. Queued — " ++ String.fromInt (List.length queue) ++ " report(s) waiting. Reopen this app when you have a link."
              }
            , saveQueue queue
            )

        GotFlushSend sent (Ok _) ->
            let
                remaining =
                    List.drop 1 model.queue
            in
            case remaining of
                [] ->
                    ( { model | queue = [], status = "Flushed " ++ String.fromInt (sent + 1) ++ ", 0 still queued" }, saveQueue [] )

                next :: _ ->
                    ( { model | queue = remaining }, sendBody next.to next.body (GotFlushSend (sent + 1)) )

        GotFlushSend sent (Err _) ->
            ( { model | status = "Flushed " ++ String.fromInt sent ++ ", " ++ String.fromInt (List.length model.queue) ++ " still queued" }
            , saveQueue model.queue
            )


budgetStyle : Int -> List S.Style
budgetStyle bytes =
    if bytes > maxBytes then
        [ S.bold, S.color "#cc2222" ]

    else
        [ S.bold ]


view : Model -> W.Widget Msg
view model =
    let
        bytes =
            List.length (utf8Encode (wire model.values))
    in
    W.view "root"
        [ S.padding 16, S.gap 10 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Nine line"
        , W.textInput "recipient"
            []
            { value = model.recipient
            , placeholder = "Recipient address"
            , onInput = To
            , event = "nl.to"
            }
        , W.scroll "lines"
            []
            [ W.list "line-list"
                [ S.gap 6 ]
                (List.indexedMap
                    (\index label ->
                        W.textInput ("line-" ++ String.fromInt index)
                            []
                            { value = model.values |> List.drop index |> List.head |> Maybe.withDefault ""
                            , placeholder = label
                            , onInput = Field index
                            , event = "nl.field." ++ String.fromInt index
                            }
                    )
                    lines
                )
            ]
        , W.text "budget" (budgetStyle bytes) (String.fromInt bytes ++ " / " ++ String.fromInt maxBytes ++ " bytes")
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "send" [] { label = "Send", onPress = Send, event = "nl.send" }
            , W.button "flush"
                []
                { label = "Flush queue (" ++ String.fromInt (List.length model.queue) ++ ")"
                , onPress = Flush
                , event = "nl.flush"
                }
            ]
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
