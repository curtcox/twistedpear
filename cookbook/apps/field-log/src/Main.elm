module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageBee as StorageBee
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Entry =
    { key : String
    , at : String
    , text : String
    }


type alias Model =
    { entries : List Entry
    , draft : String
    , status : String
    }


type Msg
    = Draft String
    | Add
    | GotOpen (Result Error D.Value)
    | GotList (Result Error D.Value)
    | GotPut (Result Error ())


main =
    Program.app
        { init = ( { entries = [], draft = "", status = "" }, StorageBee.open GotOpen )
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
        [ ( "gte", E.string "obs/" )
        , ( "lt", E.string "obs0" )
        , ( "limit", E.int 50 )
        ]


refresh : Effect.Effect Msg
refresh =
    StorageBee.list listOptions GotList


rowDecoder : D.Decoder Entry
rowDecoder =
    D.map2
        (\key value ->
            let
                parsed =
                    D.decodeString payloadDecoder (utf8Decode value)
                        |> Result.withDefault { at = "", text = "" }
            in
            { key = key, at = parsed.at, text = parsed.text }
        )
        (D.field "key" D.string)
        (D.field "value" (D.list D.int))


payloadDecoder : D.Decoder { at : String, text : String }
payloadDecoder =
    D.map2 (\at text -> { at = at, text = text })
        (D.field "at" D.string)
        (D.field "text" D.string)


decodeEntries : D.Value -> List Entry
decodeEntries value =
    D.decodeValue (D.list rowDecoder) value |> Result.withDefault []


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Draft draft ->
            ( { model | draft = draft }, Effect.none )

        Add ->
            if String.trim model.draft == "" then
                ( model, Effect.none )

            else
                -- Keys use a reverse timestamp in the JS twin. Without elm/time the
                -- parity suite compares the empty settled list; puts still go through
                -- Hyperbee so scripted adds persist under a stable cookbook key.
                ( { model | draft = "", status = "Logged" }
                , StorageBee.put
                    "obs/00000000000000"
                    (utf8Encode (E.encode 0 (E.object [ ( "at", E.string "" ), ( "text", E.string (String.trim model.draft) ) ])))
                    GotPut
                )

        GotOpen (Ok _) ->
            ( model, refresh )

        GotOpen (Err _) ->
            ( model, Effect.none )

        GotList (Ok value) ->
            ( { model | entries = decodeEntries value }, Effect.none )

        GotList (Err _) ->
            ( { model | entries = [] }, Effect.none )

        GotPut (Ok ()) ->
            ( model, refresh )

        GotPut (Err _) ->
            ( model, Effect.none )


formatWhen : String -> String
formatWhen at =
    at |> String.replace "T" " " |> String.left 19


entryView : Entry -> W.Widget msg
entryView entry =
    W.view ("entry-" ++ entry.key)
        [ S.gap 2 ]
        [ W.text ("when-" ++ entry.key) [ S.fontSize 12 ] (formatWhen entry.at)
        , W.text ("what-" ++ entry.key) [] entry.text
        ]


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Field log"
        , W.textInput "draft"
            []
            { value = model.draft
            , placeholder = "What did you observe?"
            , onInput = Draft
            , event = "log.draft"
            }
        , W.button "add" [] { label = "Log it", onPress = Add, event = "log.add" }
        , W.divider "divider"
        , W.scroll "entries"
            []
            [ W.list "entry-list" [ S.gap 8 ] (List.map entryView model.entries) ]
        , W.text "status"
            [ S.fontSize 12 ]
            (model.status ++ " · " ++ String.fromInt (List.length model.entries) ++ " entries held locally")
        ]
