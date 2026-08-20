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


type alias Note =
    { from : String
    , body : String
    , signature : String
    }


type alias Model =
    { me : String
    , peer : String
    , note : String
    , status : String
    , received : List Note
    }


type Msg
    = Peer String
    | NoteInput String
    | Drop
    | Collect
    | GotMe (Result Error String)
    | GotSign String (Result Error (List Int))
    | GotSend Int (Result Error D.Value)
    | GotReceive (Result Error D.Value)


main =
    Program.app
        { init =
            ( { me = "", peer = "", note = "", status = "", received = [] }
            , Identity.destinationHash GotMe
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


utf8Encode : String -> List Int
utf8Encode string =
    string |> String.toList |> List.map Char.toCode


hexByte : Int -> String
hexByte n =
    let
        digits =
            "0123456789abcdef"

        hi =
            n // 16

        lo =
            remainderBy 16 n
    in
    String.slice hi (hi + 1) digits ++ String.slice lo (lo + 1) digits


hex : List Int -> String
hex bytes =
    String.concat (List.map hexByte bytes)


noteDecoder : D.Decoder Note
noteDecoder =
    D.map3 Note
        (D.field "from" D.string)
        (D.field "body" D.string)
        (D.field "signature" D.string)


messageDecoder : D.Decoder { from : String, subject : String, body : String }
messageDecoder =
    D.map3 (\from subject body -> { from = from, subject = subject, body = body })
        (D.field "from" D.string)
        (D.field "subject" D.string)
        (D.field "body" D.string)


parseNote : { from : String, subject : String, body : String } -> Note
parseNote message =
    D.decodeString noteDecoder message.body
        |> Result.withDefault { from = message.from, body = "(unreadable envelope)", signature = "" }


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Peer peer ->
            ( { model | peer = peer }, Effect.none )

        NoteInput note ->
            ( { model | note = note }, Effect.none )

        Drop ->
            if String.trim model.peer == "" || String.trim model.note == "" then
                ( { model | status = "Need a recipient and a note" }, Effect.none )

            else
                ( model, Identity.sign (utf8Encode (String.trim model.note)) (GotSign (String.trim model.note)) )

        Collect ->
            ( model, Lxmf.receive GotReceive )

        GotMe (Ok me) ->
            ( { model | me = me }, Effect.none )

        GotMe (Err _) ->
            ( model, Effect.none )

        GotSign payload (Ok signature) ->
            let
                envelope =
                    E.encode 0
                        (E.object
                            [ ( "from", E.string model.me )
                            , ( "body", E.string payload )
                            , ( "signature", E.string (hex signature) )
                            ]
                        )
            in
            ( { model | note = "", status = "Dropped " ++ String.fromInt (String.length envelope) ++ " bytes" }
            , Lxmf.send
                (E.object
                    [ ( "to", E.string (String.trim model.peer) )
                    , ( "subject", E.string "dead-drop/note" )
                    , ( "body", E.string envelope )
                    ]
                )
                (GotSend (String.length envelope))
            )

        GotSign _ (Err _) ->
            ( model, Effect.none )

        GotSend _ _ ->
            ( model, Effect.none )

        GotReceive (Ok value) ->
            let
                received =
                    D.decodeValue (D.list messageDecoder) value
                        |> Result.withDefault []
                        |> List.filter (\m -> m.subject == "dead-drop/note")
                        |> List.map parseNote
            in
            ( { model | received = received, status = String.fromInt (List.length received) ++ " notes in the drop" }, Effect.none )

        GotReceive (Err _) ->
            ( { model | received = [], status = "0 notes in the drop" }, Effect.none )


sigLine : Note -> String
sigLine item =
    "signed "
        ++ String.left 16 item.signature
        ++ "… by "
        ++ String.left 16 item.from
        ++ "…"


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Dead drop"
        , W.text "me" [ S.fontSize 12 ] ("Signing as " ++ model.me)
        , W.textInput "peer"
            []
            { value = model.peer
            , placeholder = "Recipient address"
            , onInput = Peer
            , event = "dd.peer"
            }
        , W.textInput "note"
            [ S.height 96 ]
            { value = model.note
            , placeholder = "Short note"
            , onInput = NoteInput
            , event = "dd.note"
            }
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "drop" [] { label = "Drop it", onPress = Drop, event = "dd.drop" }
            , W.button "collect" [] { label = "Collect", onPress = Collect, event = "dd.collect" }
            ]
        , W.divider "divider"
        , W.list "received"
            [ S.gap 8 ]
            (List.indexedMap
                (\index item ->
                    W.view ("note-" ++ String.fromInt index)
                        [ S.gap 2 ]
                        [ W.text ("body-" ++ String.fromInt index) [] item.body
                        , W.text ("sig-" ++ String.fromInt index) [ S.fontSize 12 ] (sigLine item)
                        ]
                )
                model.received
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
