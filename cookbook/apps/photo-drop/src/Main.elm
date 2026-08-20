module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Resource as Resource
import TwistedPear.Sdk.ShareCas as ShareCas
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


historyKey : String
historyKey =
    "drops"


type alias Model =
    { history : List String
    , identifier : String
    , preview : Maybe String
    , status : String
    , budgetKib : Int
    }


type Msg
    = Id String
    | Budget String
    | Put
    | Fetch
    | Recall Int
    | GotLoad (Result Error (Maybe (List Int)))
    | GotSave (Result Error ())
    | GotPut (Result Error D.Value)
    | GotFetch (Result Error (List Int))


main =
    Program.app
        { init =
            ( { history = [], identifier = "", preview = Nothing, status = "", budgetKib = 256 }
            , StorageKv.get historyKey GotLoad
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


remember : String -> Model -> ( Model, Effect.Effect Msg )
remember t256 model =
    let
        history =
            (t256 :: List.filter ((/=) t256) model.history) |> List.take 20
    in
    ( { model | history = history }
    , StorageKv.set historyKey (utf8Encode (E.encode 0 (E.list E.string history))) GotSave
    )


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Id identifier ->
            ( { model | identifier = identifier }, Effect.none )

        Budget raw ->
            ( { model | budgetKib = String.toInt raw |> Maybe.withDefault 256 }, Effect.none )

        Put ->
            ( model, ShareCas.put "photo-drop sample" GotPut )

        Fetch ->
            if String.length (String.trim model.identifier) /= 94 then
                ( { model | status = "A 256t identifier is 94 characters" }, Effect.none )

            else
                ( { model | status = "Fetching…" }
                , Resource.fetch
                    (E.object
                        [ ( "resourceId", E.string (String.trim model.identifier) )
                        , ( "budgetBytes", E.int (model.budgetKib * 1024) )
                        ]
                    )
                    GotFetch
                )

        Recall index ->
            case model.history |> List.drop index |> List.head of
                Nothing ->
                    ( model, Effect.none )

                Just item ->
                    ( { model | identifier = item }, Effect.none )

        GotLoad (Ok Nothing) ->
            ( model, Effect.none )

        GotLoad (Ok (Just stored)) ->
            ( { model | history = D.decodeString (D.list D.string) (utf8Decode stored) |> Result.withDefault [] }, Effect.none )

        GotLoad (Err _) ->
            ( model, Effect.none )

        GotSave _ ->
            ( model, Effect.none )

        GotPut (Ok value) ->
            let
                t256 =
                    D.decodeValue (D.field "t256" D.string) value |> Result.withDefault ""

                size =
                    D.decodeValue (D.field "size" D.int) value |> Result.withDefault 0

                ( next, effect ) =
                    remember t256 { model | identifier = t256, status = "Shared " ++ String.fromInt size ++ " bytes as " ++ String.left 12 t256 ++ "…" }
            in
            ( next, effect )

        GotPut (Err err) ->
            ( { model | status = "Fetch failed: " ++ err.message }, Effect.none )

        GotFetch (Ok bytes) ->
            let
                ( next, effect ) =
                    remember (String.trim model.identifier)
                        { model
                            | preview = Just (utf8Decode bytes |> String.left 200)
                            , status = "Fetched " ++ String.fromInt (List.length bytes) ++ " bytes"
                        }
            in
            ( next, effect )

        GotFetch (Err err) ->
            ( { model | status = "Fetch failed: " ++ err.message }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Photo drop"
        , W.button "put" [] { label = "Share a payload", onPress = Put, event = "pd.put" }
        , W.textInput "id"
            []
            { value = model.identifier
            , placeholder = "256t identifier"
            , onInput = Id
            , event = "pd.id"
            }
        , if String.length model.identifier == 94 then
            W.qrCode "qr" [] { value = model.identifier, size = Nothing, caption = Nothing }

          else
            W.spacer "qr-placeholder" 0
        , W.textInput "budget"
            []
            { value = String.fromInt model.budgetKib
            , placeholder = "Budget (KiB)"
            , onInput = Budget
            , event = "pd.budget"
            }
        , W.button "fetch" [] { label = "Fetch", onPress = Fetch, event = "pd.fetch" }
        , W.divider "divider"
        , W.text "preview"
            []
            (Maybe.withDefault "Nothing fetched yet" model.preview)
        , W.list "history"
            [ S.gap 2 ]
            (List.indexedMap
                (\index item ->
                    W.button ("hist-" ++ String.fromInt index)
                        []
                        { label = String.left 24 item ++ "…"
                        , onPress = Recall index
                        , event = "pd.recall." ++ String.fromInt index
                        }
                )
                model.history
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
