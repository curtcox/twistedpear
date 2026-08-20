module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Announce as Announce
import TwistedPear.Sdk.Apps as Apps
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


trustedKey : String
trustedKey =
    "trusted"


namespace : String
namespace =
    "app-relay"


type alias Heard =
    { from : String
    , name : String
    , t256 : String
    }


type alias Model =
    { trusted : List String
    , heard : List Heard
    , draft : String
    , status : String
    }


type Msg
    = Draft String
    | Trust
    | Install Int
    | GotLoad (Result Error (Maybe (List Int)))
    | GotSave (Result Error ())
    | GotSubscribe (Result Error D.Value)
    | GotInstall (Result Error D.Value)


main =
    Program.app
        { init =
            ( { trusted = [], heard = [], draft = "", status = "Listening for app announces" }
            , Effect.batch
                [ StorageKv.get trustedKey GotLoad
                , Announce.subscribe namespace GotSubscribe
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


visible : Model -> List Heard
visible model =
    if List.isEmpty model.trusted then
        model.heard

    else
        List.filter (\row -> List.member row.from model.trusted) model.heard


eventDecoder : D.Decoder { destination : String, appData : List Int }
eventDecoder =
    D.map2 (\destination appData -> { destination = destination, appData = appData })
        (D.field "destination" D.string)
        (D.field "appData" (D.list D.int))


payloadDecoder : D.Decoder { name : String, t256 : String }
payloadDecoder =
    D.map2 (\name t256 -> { name = name, t256 = t256 })
        (D.oneOf [ D.field "name" D.string, D.succeed "unnamed" ])
        (D.field "t256" D.string)


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Draft draft ->
            ( { model | draft = draft }, Effect.none )

        Trust ->
            if String.trim model.draft == "" then
                ( model, Effect.none )

            else
                let
                    trusted =
                        unique (model.trusted ++ [ String.trim model.draft ])
                in
                ( { model | trusted = trusted, draft = "" }
                , StorageKv.set trustedKey (utf8Encode (E.encode 0 (E.list E.string trusted))) GotSave
                )

        Install index ->
            case visible model |> List.drop index |> List.head of
                Nothing ->
                    ( model, Effect.none )

                Just row ->
                    ( { model | status = "Waiting for the host's capability review…" }
                    , Apps.install row.t256 GotInstall
                    )

        GotLoad (Ok Nothing) ->
            ( model, Effect.none )

        GotLoad (Ok (Just stored)) ->
            ( { model | trusted = D.decodeString (D.list D.string) (utf8Decode stored) |> Result.withDefault [] }, Effect.none )

        GotLoad (Err _) ->
            ( model, Effect.none )

        GotSave _ ->
            ( model, Effect.none )

        GotSubscribe (Ok value) ->
            let
                events =
                    D.decodeValue (D.list eventDecoder) value |> Result.withDefault []

                heard =
                    List.foldl
                        (\event acc ->
                            case D.decodeString payloadDecoder (utf8Decode event.appData) of
                                Ok data ->
                                    if String.length data.t256 == 94 then
                                        { from = event.destination, name = data.name, t256 = data.t256 }
                                            :: List.filter (\row -> row.t256 /= data.t256) acc

                                    else
                                        acc

                                Err _ ->
                                    acc
                        )
                        model.heard
                        (List.reverse events)
                        |> List.take 50
            in
            ( { model | heard = heard }, Effect.none )

        GotSubscribe (Err _) ->
            ( model, Effect.none )

        GotInstall (Ok _) ->
            ( { model | status = "Installed" }, Effect.none )

        GotInstall (Err err) ->
            ( { model | status = "Not installed: " ++ err.message }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "App relay"
        , W.view "trust-row"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.textInput "draft"
                []
                { value = model.draft
                , placeholder = "Trust a publisher address"
                , onInput = Draft
                , event = "ar.draft"
                }
            , W.button "trust" [] { label = "Trust", onPress = Trust, event = "ar.trust" }
            ]
        , W.text "trusted"
            [ S.fontSize 12 ]
            (if List.isEmpty model.trusted then
                "Trusting nobody — showing everything heard. This is not a safe default."

             else
                "Trusting " ++ String.fromInt (List.length model.trusted) ++ " publisher(s)"
            )
        , W.divider "divider"
        , W.list "heard"
            [ S.gap 8 ]
            (List.indexedMap
                (\index row ->
                    W.view ("heard-" ++ String.fromInt index)
                        [ S.gap 2 ]
                        [ W.text ("name-" ++ String.fromInt index) [] row.name
                        , W.text ("from-" ++ String.fromInt index)
                            [ S.fontSize 12 ]
                            ("from " ++ String.left 16 row.from ++ "… · " ++ String.left 16 row.t256 ++ "…")
                        , W.button ("install-" ++ String.fromInt index)
                            []
                            { label = "Install…"
                            , onPress = Install index
                            , event = "ar.install." ++ String.fromInt index
                            }
                        ]
                )
                (visible model)
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
