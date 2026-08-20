module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Identity as Identity
import TwistedPear.Sdk.Lxmf as Lxmf
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Row =
    { nonce : String
    , ms : Maybe Int
    }


type alias Model =
    { me : String
    , peer : String
    , outstanding : List String
    , results : List Row
    , status : String
    , seq : Int
    }


type Msg
    = Peer String
    | Ping
    | Poll
    | GotMe (Result Error String)
    | GotSend (Result Error D.Value)
    | GotReceive (Result Error D.Value)


main =
    Program.app
        { init =
            ( { me = "", peer = "", outstanding = [], results = [], status = "Idle", seq = 0 }
            , Identity.destinationHash GotMe
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


sendPing : String -> String -> Effect.Effect Msg
sendPing to body =
    Lxmf.send
        (E.object
            [ ( "to", E.string to )
            , ( "subject", E.string "signal-check/ping" )
            , ( "body", E.string body )
            ]
        )
        GotSend


sendPong : String -> String -> Effect.Effect Msg
sendPong to body =
    Lxmf.send
        (E.object
            [ ( "to", E.string to )
            , ( "subject", E.string "signal-check/pong" )
            , ( "body", E.string body )
            ]
        )
        GotSend


messageDecoder : D.Decoder { from : String, subject : String, body : String }
messageDecoder =
    D.map3 (\from subject body -> { from = from, subject = subject, body = body })
        (D.field "from" D.string)
        (D.field "subject" D.string)
        (D.field "body" D.string)


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Peer peer ->
            ( { model | peer = peer }, Effect.none )

        Ping ->
            if String.trim model.peer == "" then
                ( { model | status = "Enter a peer address first" }, Effect.none )

            else
                let
                    id =
                        "n" ++ String.fromInt model.seq
                in
                ( { model
                    | outstanding = id :: model.outstanding
                    , results = List.take 10 ({ nonce = id, ms = Nothing } :: model.results)
                    , status = "Sent ping " ++ id
                    , seq = model.seq + 1
                  }
                , sendPing (String.trim model.peer) id
                )

        Poll ->
            ( model, Lxmf.receive GotReceive )

        GotMe (Ok me) ->
            ( { model | me = me }, Effect.none )

        GotMe (Err _) ->
            ( model, Effect.none )

        GotSend _ ->
            ( model, Effect.none )

        GotReceive (Ok value) ->
            let
                messages =
                    D.decodeValue (D.list messageDecoder) value |> Result.withDefault []

                pongs =
                    List.filter (\m -> m.subject == "signal-check/pong") messages

                pings =
                    List.filter (\m -> m.subject == "signal-check/ping") messages

                replied =
                    List.foldl
                        (\pong outstanding -> List.filter (\n -> n /= pong.body) outstanding)
                        model.outstanding
                        pongs

                results =
                    List.map
                        (\row ->
                            if List.any (\pong -> pong.body == row.nonce) pongs then
                                { row | ms = Just 0 }

                            else
                                row
                        )
                        model.results

                replies =
                    List.map (\ping -> sendPong ping.from ping.body) pings
            in
            ( { model
                | outstanding = replied
                , results = results
                , status = "Checked inbox · " ++ String.fromInt (List.length replied) ++ " still outstanding"
              }
            , Effect.batch replies
            )

        GotReceive (Err _) ->
            ( { model | status = "Checked inbox · " ++ String.fromInt (List.length model.outstanding) ++ " still outstanding" }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Signal check"
        , W.text "me" [ S.fontSize 12 ] ("This app: " ++ model.me)
        , W.textInput "peer"
            []
            { value = model.peer
            , placeholder = "Peer app address"
            , onInput = Peer
            , event = "sc.peer"
            }
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "ping" [] { label = "Ping", onPress = Ping, event = "sc.ping" }
            , W.button "poll" [] { label = "Check replies", onPress = Poll, event = "sc.poll" }
            ]
        , W.divider "divider"
        , W.list "results"
            [ S.gap 2 ]
            (List.map
                (\row ->
                    W.text ("row-" ++ row.nonce)
                        []
                        (case row.ms of
                            Nothing ->
                                row.nonce ++ " … waiting"

                            Just ms ->
                                row.nonce ++ " — " ++ String.fromInt ms ++ " ms"
                        )
                )
                model.results
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        , W.text "caveat"
            [ S.fontSize 12 ]
            "Round trip includes however long the app sat closed. There is no background delivery."
        ]
