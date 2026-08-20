module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Identity as Identity
import TwistedPear.Sdk.Lxmf as Lxmf
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Model =
    { me : String
    , peer : String
    , inboxSummary : String
    }


type Msg
    = Peer String
    | Send
    | Refresh
    | GotMe (Result Error String)
    | GotPeer (Result Error (Maybe (List Int)))
    | GotSave (Result Error ())
    | GotSend (Result Error D.Value)
    | GotReceive (Result Error D.Value)


main =
    Program.app
        { init =
            ( { me = "", peer = "", inboxSummary = "No messages yet" }
            , Effect.batch
                [ Identity.destinationHash GotMe
                , StorageKv.get "last-peer" GotPeer
                ]
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


messageDecoder : D.Decoder { from : String, body : String }
messageDecoder =
    D.map2 (\from body -> { from = from, body = body })
        (D.field "from" D.string)
        (D.field "body" D.string)


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Peer peer ->
            ( { model | peer = peer }
            , StorageKv.set "last-peer" (utf8Encode peer) GotSave
            )

        Send ->
            if model.peer == "" then
                ( { model | inboxSummary = "Set a peer app id first" }, Effect.none )

            else
                ( model
                , Lxmf.send
                    (E.object
                        [ ( "to", E.string model.peer )
                        , ( "subject", E.string "hello" )
                        , ( "body", E.string ("Hi from " ++ model.me) )
                        ]
                    )
                    GotSend
                )

        Refresh ->
            ( model, Lxmf.receive GotReceive )

        GotMe (Ok me) ->
            ( { model | me = me }, Effect.none )

        GotMe (Err _) ->
            ( model, Effect.none )

        GotPeer (Ok Nothing) ->
            ( model, Effect.none )

        GotPeer (Ok (Just stored)) ->
            ( { model | peer = utf8Decode stored }, Effect.none )

        GotPeer (Err _) ->
            ( model, Effect.none )

        GotSave _ ->
            ( model, Effect.none )

        GotSend (Ok _) ->
            ( { model | inboxSummary = "Sent hello to " ++ model.peer }, Effect.none )

        GotSend (Err _) ->
            ( { model | inboxSummary = "Sent hello to " ++ model.peer }, Effect.none )

        GotReceive (Ok value) ->
            let
                messages =
                    D.decodeValue (D.list messageDecoder) value |> Result.withDefault []
            in
            ( { model
                | inboxSummary =
                    if List.isEmpty messages then
                        "Inbox empty"

                    else
                        messages
                            |> List.map (\m -> m.from ++ ": " ++ m.body)
                            |> String.join "\n"
              }
            , Effect.none
            )

        GotReceive (Err _) ->
            ( { model | inboxSummary = "Inbox empty" }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Chat"
        , W.text "me" [] ("Me: " ++ model.me)
        , W.textInput "peer-input"
            []
            { value = model.peer
            , placeholder = "Peer app id"
            , onInput = Peer
            , event = "chat.peer"
            }
        , W.button "send" [] { label = "Send hello", onPress = Send, event = "chat.send" }
        , W.button "refresh" [] { label = "Check inbox", onPress = Refresh, event = "chat.refresh" }
        , W.text "inbox" [] model.inboxSummary
        ]
