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


logKey : String
logKey =
    "net-log"


outboxKey : String
outboxKey =
    "outbox"


type alias Checkin =
    { call : String
    , note : String
    }


type alias OutboxItem =
    { to : String
    , body : String
    }


type alias Model =
    { checkins : List Checkin
    , outbox : List OutboxItem
    , call : String
    , note : String
    , netControl : String
    , status : String
    , logDone : Bool
    , boxDone : Bool
    }


type Msg
    = Control String
    | Call String
    | Note String
    | CheckIn
    | File
    | Drain
    | GotLog (Result Error (Maybe (List Int)))
    | GotBox (Result Error (Maybe (List Int)))
    | GotSave (Result Error ())
    | GotSend (Result Error D.Value)
    | GotDrain Int (Result Error D.Value)


main =
    Program.app
        { init =
            ( { checkins = []
              , outbox = []
              , call = ""
              , note = ""
              , netControl = ""
              , status = ""
              , logDone = False
              , boxDone = False
              }
            , Effect.batch [ StorageKv.get logKey GotLog, StorageKv.get outboxKey GotBox ]
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


checkinDecoder : D.Decoder Checkin
checkinDecoder =
    D.map2 Checkin
        (D.field "call" D.string)
        (D.oneOf [ D.field "note" D.string, D.succeed "" ])


outboxDecoder : D.Decoder OutboxItem
outboxDecoder =
    D.map2 OutboxItem
        (D.field "to" D.string)
        (D.field "body" D.string)


persist : Model -> Effect.Effect Msg
persist model =
    Effect.batch
        [ StorageKv.set logKey
            (utf8Encode
                (E.encode 0
                    (E.list
                        (\row -> E.object [ ( "call", E.string row.call ), ( "at", E.int 0 ), ( "note", E.string row.note ) ])
                        (List.take 500 model.checkins)
                    )
                )
            )
            GotSave
        , StorageKv.set outboxKey
            (utf8Encode
                (E.encode 0
                    (E.list
                        (\item -> E.object [ ( "to", E.string item.to ), ( "body", E.string item.body ) ])
                        model.outbox
                    )
                )
            )
            GotSave
        ]


roster : List Checkin -> String
roster checkins =
    checkins
        |> List.map
            (\row ->
                if row.note == "" then
                    row.call

                else
                    row.call ++ " (" ++ row.note ++ ")"
            )
        |> String.join ", "


toUpper : String -> String
toUpper =
    String.toUpper


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Control netControl ->
            ( { model | netControl = netControl }, Effect.none )

        Call call ->
            ( { model | call = call }, Effect.none )

        Note note ->
            ( { model | note = note }, Effect.none )

        CheckIn ->
            if String.trim model.call == "" then
                ( model, Effect.none )

            else
                let
                    checkins =
                        model.checkins ++ [ { call = toUpper (String.trim model.call), note = String.trim model.note } ]

                    next =
                        { model | checkins = checkins, call = "", note = "", status = String.fromInt (List.length checkins) ++ " check-ins logged locally" }
                in
                ( next, persist next )

        File ->
            if String.trim model.netControl == "" then
                ( { model | status = "Set net control's address first" }, Effect.none )

            else
                let
                    body =
                        "NET  " ++ String.fromInt (List.length model.checkins) ++ ": " ++ roster model.checkins
                in
                ( model
                , Lxmf.send
                    (E.object
                        [ ( "to", E.string (String.trim model.netControl) )
                        , ( "subject", E.string "net/roster" )
                        , ( "body", E.string body )
                        ]
                    )
                    GotSend
                )

        Drain ->
            case model.outbox of
                [] ->
                    ( { model | status = "Sent 0; 0 still held" }, persist model )

                first :: _ ->
                    ( model
                    , Lxmf.send
                        (E.object
                            [ ( "to", E.string first.to )
                            , ( "subject", E.string "net/roster" )
                            , ( "body", E.string first.body )
                            ]
                        )
                        (GotDrain 0)
                    )

        GotLog (Ok Nothing) ->
            ( { model | logDone = True }, Effect.none )

        GotLog (Ok (Just stored)) ->
            ( { model | checkins = D.decodeString (D.list checkinDecoder) (utf8Decode stored) |> Result.withDefault [], logDone = True }, Effect.none )

        GotLog (Err _) ->
            ( { model | logDone = True }, Effect.none )

        GotBox (Ok Nothing) ->
            ( { model | boxDone = True }, Effect.none )

        GotBox (Ok (Just stored)) ->
            ( { model | outbox = D.decodeString (D.list outboxDecoder) (utf8Decode stored) |> Result.withDefault [], boxDone = True }, Effect.none )

        GotBox (Err _) ->
            ( { model | boxDone = True }, Effect.none )

        GotSave _ ->
            ( model, Effect.none )

        GotSend (Ok _) ->
            let
                body =
                    "NET  " ++ String.fromInt (List.length model.checkins) ++ ": " ++ roster model.checkins
            in
            ( { model | status = "Filed " ++ String.fromInt (String.length body) ++ " bytes to net control" }, Effect.none )

        GotSend (Err _) ->
            let
                body =
                    "NET  " ++ String.fromInt (List.length model.checkins) ++ ": " ++ roster model.checkins

                next =
                    { model
                        | outbox = model.outbox ++ [ { to = String.trim model.netControl, body = body } ]
                    }

                held =
                    { next | status = "No link. Held in the outbox (" ++ String.fromInt (List.length next.outbox) ++ ")." }
            in
            ( held, persist held )

        GotDrain sent (Ok _) ->
            let
                remaining =
                    List.drop 1 model.outbox
            in
            case remaining of
                [] ->
                    let
                        next =
                            { model | outbox = [], status = "Sent " ++ String.fromInt (sent + 1) ++ "; 0 still held" }
                    in
                    ( next, persist next )

                nextItem :: _ ->
                    ( { model | outbox = remaining }
                    , Lxmf.send
                        (E.object
                            [ ( "to", E.string nextItem.to )
                            , ( "subject", E.string "net/roster" )
                            , ( "body", E.string nextItem.body )
                            ]
                        )
                        (GotDrain (sent + 1))
                    )

        GotDrain sent (Err _) ->
            let
                next =
                    { model | status = "Sent " ++ String.fromInt sent ++ "; " ++ String.fromInt (List.length model.outbox) ++ " still held" }
            in
            ( next, persist next )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 10 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Net ledger"
        , W.textInput "control"
            []
            { value = model.netControl
            , placeholder = "Net control address"
            , onInput = Control
            , event = "nl.control"
            }
        , W.divider "divider"
        , W.textInput "call"
            []
            { value = model.call
            , placeholder = "Callsign"
            , onInput = Call
            , event = "nl.call"
            }
        , W.textInput "note"
            []
            { value = model.note
            , placeholder = "Traffic / comment"
            , onInput = Note
            , event = "nl.note"
            }
        , W.button "checkin" [] { label = "Check in", onPress = CheckIn, event = "nl.checkin" }
        , W.divider "divider2"
        , W.scroll "roster"
            []
            [ W.list "roster-list"
                [ S.gap 2 ]
                (model.checkins
                    |> List.reverse
                    |> List.take 40
                    |> List.indexedMap
                        (\index row ->
                            W.text ("ci-" ++ String.fromInt index)
                                [ S.fontSize 14 ]
                                (" " ++ row.call ++ " " ++ row.note)
                        )
                )
            ]
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "file" [] { label = "File roster", onPress = File, event = "nl.file" }
            , W.button "drain"
                []
                { label = "Outbox (" ++ String.fromInt (List.length model.outbox) ++ ")"
                , onPress = Drain
                , event = "nl.drain"
                }
            ]
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
