module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Ai as Ai
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageBee as StorageBee
import TwistedPear.Style as S
import TwistedPear.Widget as W


fields : List String
fields =
    [ "subject", "location", "severity", "action" ]


severities : List String
severities =
    [ "low", "medium", "high" ]


type alias Record =
    { subject : String
    , location : String
    , severity : String
    , action : String
    }


type alias Stored =
    { key : String
    , record : Record
    }


type alias Model =
    { dictation : String
    , parsed : Maybe Record
    , records : List Stored
    , inFlight : Bool
    , status : String
    }


type Msg
    = Text String
    | Structure
    | File
    | GotOpen (Result Error D.Value)
    | GotList (Result Error D.Value)
    | GotChat (Result Error D.Value)
    | GotPut (Result Error ())


main =
    Program.app
        { init =
            ( { dictation = "", parsed = Nothing, records = [], inFlight = False, status = "" }
            , StorageBee.open GotOpen
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


listOptions : E.Value
listOptions =
    E.object
        [ ( "gte", E.string "r/" )
        , ( "lt", E.string "r0" )
        , ( "limit", E.int 50 )
        ]


recordDecoder : D.Decoder Record
recordDecoder =
    D.map4 Record
        (D.field "subject" D.string)
        (D.field "location" D.string)
        (D.field "severity" D.string)
        (D.field "action" D.string)


validate : Record -> Maybe Record
validate record =
    let
        ok field =
            let
                n =
                    String.length field
            in
            n > 0 && n <= 200

        severity =
            String.toLower record.severity
    in
    if ok record.subject && ok record.location && ok record.severity && ok record.action && List.member severity severities then
        Just { record | severity = severity }

    else
        Nothing


rowDecoder : D.Decoder Stored
rowDecoder =
    D.map2
        (\key value ->
            { key = key
            , record =
                D.decodeString recordDecoder (utf8Decode value)
                    |> Result.withDefault (Record "" "" "" "")
            }
        )
        (D.field "key" D.string)
        (D.field "value" (D.list D.int))


chatRequest : String -> E.Value
chatRequest dictation =
    E.object
        [ ( "messages"
          , E.list identity
                [ E.object
                    [ ( "role", E.string "system" )
                    , ( "content"
                      , E.string
                            ("Return a single JSON object with exactly these keys: "
                                ++ String.join ", " fields
                                ++ ". severity must be one of: "
                                ++ String.join ", " severities
                                ++ ". No prose, no code fence."
                            )
                      )
                    ]
                , E.object [ ( "role", E.string "user" ), ( "content", E.string (String.trim dictation) ) ]
                ]
          )
        , ( "maxTokens", E.int 512 )
        , ( "temperature", E.int 0 )
        ]


assistantText : D.Value -> String
assistantText value =
    D.decodeValue (D.at [ "message", "content" ] D.string) value
        |> Result.withDefault ""
        |> String.trim


stripFence : String -> String
stripFence raw =
    raw
        |> String.replace "```json" ""
        |> String.replace "```" ""
        |> String.trim


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Text dictation ->
            ( { model | dictation = dictation }, Effect.none )

        Structure ->
            if String.trim model.dictation == "" || model.inFlight then
                ( model, Effect.none )

            else
                ( { model | inFlight = True, status = "Structuring…" }
                , Ai.chat (chatRequest model.dictation) GotChat
                )

        File ->
            case model.parsed of
                Nothing ->
                    ( model, Effect.none )

                Just record ->
                    let
                        payload =
                            E.encode 0
                                (E.object
                                    [ ( "subject", E.string record.subject )
                                    , ( "location", E.string record.location )
                                    , ( "severity", E.string record.severity )
                                    , ( "action", E.string record.action )
                                    ]
                                )
                    in
                    ( { model | parsed = Nothing, dictation = "", status = "Filed" }
                    , StorageBee.put "r/00000000000000" (utf8Encode payload) GotPut
                    )

        GotOpen (Ok _) ->
            ( model, StorageBee.list listOptions GotList )

        GotOpen (Err _) ->
            ( model, Effect.none )

        GotList (Ok value) ->
            ( { model | records = D.decodeValue (D.list rowDecoder) value |> Result.withDefault [] }, Effect.none )

        GotList (Err _) ->
            ( { model | records = [] }, Effect.none )

        GotChat (Ok value) ->
            let
                parsed =
                    D.decodeString recordDecoder (stripFence (assistantText value))
                        |> Result.toMaybe
                        |> Maybe.andThen validate
            in
            ( { model
                | inFlight = False
                , parsed = parsed
                , status =
                    if parsed == Nothing then
                        "Model returned something unusable — edit and retry"

                    else
                        "Review before filing"
              }
            , Effect.none
            )

        GotChat (Err _) ->
            ( { model | inFlight = False, status = "Model unavailable" }, Effect.none )

        GotPut (Ok ()) ->
            ( model, StorageBee.list listOptions GotList )

        GotPut (Err _) ->
            ( model, Effect.none )


fieldValue : Record -> String -> String
fieldValue record field =
    case field of
        "subject" ->
            record.subject

        "location" ->
            record.location

        "severity" ->
            record.severity

        "action" ->
            record.action

        _ ->
            ""


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Triage notes"
        , W.textInput "dictation"
            [ S.height 100 ]
            { value = model.dictation
            , placeholder = "Type it how you'd say it"
            , onInput = Text
            , event = "tn.text"
            }
        , W.button "structure"
            []
            { label =
                if model.inFlight then
                    "Working…"

                else
                    "Structure"
            , onPress = Structure
            , event = "tn.structure"
            }
        , W.divider "divider"
        , W.list "review"
            [ S.gap 2 ]
            (case model.parsed of
                Nothing ->
                    [ W.text "no-review" [] "Nothing to review" ]

                Just record ->
                    List.map
                        (\field ->
                            W.text ("f-" ++ field) [] (field ++ ": " ++ fieldValue record field)
                        )
                        fields
            )
        , W.button "file" [] { label = "File it", onPress = File, event = "tn.file" }
        , W.divider "divider2"
        , W.list "records"
            [ S.gap 2 ]
            (List.map
                (\row ->
                    W.text ("rec-" ++ row.key)
                        [ S.fontSize 14 ]
                        ("[" ++ row.record.severity ++ "] " ++ row.record.subject ++ " — " ++ row.record.location)
                )
                model.records
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
