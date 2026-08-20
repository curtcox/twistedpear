module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Ai as Ai
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


cachePrefix : String
cachePrefix =
    "phrase/"


languages : List String
languages =
    [ "Spanish", "French", "German", "Japanese", "Swahili" ]


type alias Model =
    { source : String
    , target : String
    , result : String
    , inFlight : Bool
    , status : String
    }


type Msg
    = Source String
    | Lang String
    | Go
    | GotCache (Result Error (Maybe (List Int)))
    | GotChat (Result Error D.Value)
    | GotSave (Result Error ())


main =
    Program.app
        { init =
            ( { source = "", target = "Spanish", result = "", inFlight = False, status = "" }
            , Effect.none
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


cacheKey : Model -> String
cacheKey model =
    cachePrefix ++ model.target ++ "/" ++ String.toLower (String.trim model.source)


chatRequest : Model -> E.Value
chatRequest model =
    E.object
        [ ( "messages"
          , E.list identity
                [ E.object
                    [ ( "role", E.string "system" )
                    , ( "content", E.string "Translate the user's phrase. Reply with the translation and nothing else." )
                    ]
                , E.object
                    [ ( "role", E.string "user" )
                    , ( "content", E.string ("Into " ++ model.target ++ ": " ++ String.trim model.source) )
                    ]
                ]
          )
        , ( "maxTokens", E.int 256 )
        ]


assistantText : D.Value -> String
assistantText value =
    D.decodeValue (D.at [ "message", "content" ] D.string) value
        |> Result.withDefault (D.decodeValue D.string value |> Result.withDefault "")
        |> String.trim


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Source source ->
            ( { model | source = source }, Effect.none )

        Lang target ->
            ( { model | target = target }, Effect.none )

        Go ->
            if String.trim model.source == "" || model.inFlight then
                ( model, Effect.none )

            else
                ( { model | inFlight = True, status = "Asking the model…", result = "" }
                , StorageKv.get (cacheKey model) GotCache
                )

        GotCache (Ok (Just stored)) ->
            ( { model
                | inFlight = False
                , result = utf8Decode stored
                , status = "From the local phrasebook — no model call, works offline"
              }
            , Effect.none
            )

        GotCache (Ok Nothing) ->
            ( { model | status = "Asking the model…", result = "" }, Ai.chat (chatRequest model) GotChat )

        GotCache (Err _) ->
            ( { model | status = "Asking the model…", result = "" }, Ai.chat (chatRequest model) GotChat )

        GotChat (Ok value) ->
            let
                result =
                    assistantText value
            in
            ( { model
                | inFlight = False
                , result = result
                , status = "Translated and saved to the phrasebook"
              }
            , StorageKv.set (cacheKey model) (utf8Encode result) GotSave
            )

        GotChat (Err _) ->
            ( { model | inFlight = False, result = "", status = "Model unavailable — cached phrases still work" }, Effect.none )

        GotSave _ ->
            ( model, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Pocket translator"
        , W.textInput "source"
            []
            { value = model.source
            , placeholder = "Phrase"
            , onInput = Source
            , event = "pt.source"
            }
        , W.view "langs"
            [ S.flexDirection "row", S.gap 6 ]
            (List.map
                (\lang ->
                    W.button ("lang-" ++ lang)
                        []
                        { label =
                            if lang == model.target then
                                "● " ++ lang

                            else
                                lang
                        , onPress = Lang lang
                        , event = "pt.lang." ++ lang
                        }
                )
                languages
            )
        , W.button "go"
            []
            { label =
                if model.inFlight then
                    "Working…"

                else
                    "Translate"
            , onPress = Go
            , event = "pt.go"
            }
        , W.divider "divider"
        , W.text "result"
            [ S.fontSize 24 ]
            (if model.result == "" then
                "—"

             else
                model.result
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
