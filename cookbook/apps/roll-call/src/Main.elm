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


rosterKey : String
rosterKey =
    "roster"


type alias Model =
    { me : String
    , roster : List String
    , answers : List String
    , draft : String
    , status : String
    , pendingSends : List String
    }


type Msg
    = Draft String
    | Add
    | Call
    | Collect
    | GotMe (Result Error String)
    | GotRoster (Result Error (Maybe (List Int)))
    | GotSave (Result Error ())
    | GotSend (Result Error D.Value)
    | GotReceive (Result Error D.Value)


main =
    Program.app
        { init =
            ( { me = "", roster = [], answers = [], draft = "", status = "", pendingSends = [] }
            , Effect.batch [ Identity.destinationHash GotMe, StorageKv.get rosterKey GotRoster ]
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


unique : List String -> List String
unique items =
    List.foldl
        (\item acc ->
            if List.member item acc then
                acc

            else
                acc ++ [ item ]
        )
        []
        items


sendAsk : String -> Effect.Effect Msg
sendAsk address =
    Lxmf.send
        (E.object
            [ ( "to", E.string address )
            , ( "subject", E.string "roll-call/ask" )
            , ( "body", E.string "check in" )
            ]
        )
        GotSend


sendHere : String -> Effect.Effect Msg
sendHere address =
    Lxmf.send
        (E.object
            [ ( "to", E.string address )
            , ( "subject", E.string "roll-call/here" )
            , ( "body", E.string "here" )
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
        Draft draft ->
            ( { model | draft = draft }, Effect.none )

        Add ->
            if String.trim model.draft == "" then
                ( model, Effect.none )

            else
                let
                    roster =
                        unique (model.roster ++ [ String.trim model.draft ])
                in
                ( { model | roster = roster, draft = "" }
                , StorageKv.set rosterKey (utf8Encode (E.encode 0 (E.list E.string roster))) GotSave
                )

        Call ->
            if List.isEmpty model.roster then
                ( { model
                    | answers = []
                    , status = "Asked 0. Nobody has to answer, and some never will."
                  }
                , Effect.none
                )

            else
                ( { model
                    | answers = []
                    , status = "Calling " ++ String.fromInt (List.length model.roster) ++ "…"
                    , pendingSends = model.roster
                  }
                , model.roster |> List.head |> Maybe.map sendAsk |> Maybe.withDefault Effect.none
                )

        Collect ->
            ( model, Lxmf.receive GotReceive )

        GotMe (Ok me) ->
            ( { model | me = me }, Effect.none )

        GotMe (Err _) ->
            ( model, Effect.none )

        GotRoster (Ok Nothing) ->
            ( model, Effect.none )

        GotRoster (Ok (Just stored)) ->
            ( { model | roster = D.decodeString (D.list D.string) (utf8Decode stored) |> Result.withDefault [] }, Effect.none )

        GotRoster (Err _) ->
            ( model, Effect.none )

        GotSave _ ->
            ( model, Effect.none )

        GotSend _ ->
            case model.pendingSends of
                [] ->
                    ( model, Effect.none )

                _ :: rest ->
                    if List.isEmpty rest then
                        ( { model
                            | pendingSends = []
                            , status = "Asked " ++ String.fromInt (List.length model.roster) ++ ". Nobody has to answer, and some never will."
                          }
                        , Effect.none
                        )

                    else
                        ( { model | pendingSends = rest }
                        , rest |> List.head |> Maybe.map sendAsk |> Maybe.withDefault Effect.none
                        )

        GotReceive (Ok value) ->
            let
                messages =
                    D.decodeValue (D.list messageDecoder) value |> Result.withDefault []

                asks =
                    List.filter (\m -> m.subject == "roll-call/ask") messages

                heres =
                    List.filter (\m -> m.subject == "roll-call/here") messages

                answers =
                    unique (model.answers ++ List.map .from heres)
            in
            ( { model
                | answers = answers
                , status = String.fromInt (List.length answers) ++ " of " ++ String.fromInt (List.length model.roster) ++ " have answered"
              }
            , Effect.batch (List.map (\m -> sendHere m.from) asks)
            )

        GotReceive (Err _) ->
            ( { model | status = String.fromInt (List.length model.answers) ++ " of " ++ String.fromInt (List.length model.roster) ++ " have answered" }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Roll call"
        , W.text "me" [ S.fontSize 12 ] ("This app: " ++ model.me)
        , W.view "add-row"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.textInput "draft"
                []
                { value = model.draft
                , placeholder = "Add an address"
                , onInput = Draft
                , event = "rc.draft"
                }
            , W.button "add" [] { label = "Add", onPress = Add, event = "rc.add" }
            ]
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "call" [] { label = "Call the roll", onPress = Call, event = "rc.call" }
            , W.button "collect" [] { label = "Collect", onPress = Collect, event = "rc.collect" }
            ]
        , W.divider "divider"
        , W.list "roster"
            [ S.gap 4 ]
            (List.map
                (\address ->
                    W.text ("row-" ++ address)
                        []
                        ((if List.member address model.answers then
                            "✓ "

                          else
                            "… "
                         )
                            ++ String.left 16 address
                            ++ "…"
                        )
                )
                model.roster
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
