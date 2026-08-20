module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Apps as Apps
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Workspace as Workspace
import TwistedPear.Style as S
import TwistedPear.Widget as W


project : String
project =
    "mill/sticker"


type alias Model =
    { label : String
    , colour : String
    , lastT256 : Maybe String
    , lastSize : Int
    , status : String
    , busy : Bool
    }


type Msg
    = Label String
    | Colour String
    | Preview
    | Package
    | Publish
    | GotWrite (Result Error D.Value)
    | GotPreview (Result Error D.Value)
    | GotPackage (Result Error D.Value)
    | GotPublish (Result Error D.Value)


main =
    Program.app
        { init =
            ( { label = "Hello", colour = "#3355ff", lastT256 = Nothing, lastSize = 0, status = "", busy = False }
            , Effect.none
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


slug : String -> String
slug raw =
    let
        mapped =
            raw
                |> String.toLower
                |> String.toList
                |> List.map
                    (\c ->
                        if Char.isAlphaNum c then
                            String.fromChar c

                        else
                            "-"
                    )
                |> String.concat

        collapsed =
            mapped
                |> String.split "-"
                |> List.filter ((/=) "")
                |> String.join "-"
                |> String.left 20
    in
    if collapsed == "" then
        "blank"

    else
        collapsed


generatedBundle : Model -> String
generatedBundle model =
    "import { ui } from \"@twistedpear/miniapp-sdk\";\n\nawait ui.render({\n  root: {\n    id: \"root\",\n    type: \"view\",\n    style: { padding: 32, alignItems: \"center\", justifyContent: \"center\", backgroundColor: "
        ++ E.encode 0 (E.string model.colour)
        ++ " },\n    children: [\n      {\n        id: \"label\",\n        type: \"text\",\n        props: { value: "
        ++ E.encode 0 (E.string model.label)
        ++ " },\n        style: { fontSize: 40, fontWeight: \"bold\", color: \"#ffffff\" }\n      }\n    ]\n  }\n});\n"


generatedManifest : Model -> E.Value
generatedManifest model =
    E.object
        [ ( "name", E.string ("sticker-" ++ slug model.label) )
        , ( "version", E.string "1.0.0" )
        , ( "entry", E.string "bundle.js" )
        , ( "capabilities", E.list identity [] )
        , ( "icon", E.null )
        , ( "minHostApi", E.string "0.1.0" )
        ]


writeProject : Model -> List (Effect.Effect Msg)
writeProject model =
    [ Workspace.write (project ++ "/bundle.js") (generatedBundle model) GotWrite
    , Workspace.write (project ++ "/app.manifest.json") (E.encode 2 (generatedManifest model)) GotWrite
    ]


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Label label ->
            ( { model | label = label }, Effect.none )

        Colour colour ->
            ( { model | colour = colour }, Effect.none )

        Preview ->
            if model.busy then
                ( model, Effect.none )

            else
                ( { model | busy = True, status = "Waiting for host confirmation…" }
                , Effect.batch (writeProject model ++ [ Apps.preview project (generatedManifest model) (E.list identity []) GotPreview ])
                )

        Package ->
            if model.busy then
                ( model, Effect.none )

            else
                ( { model | busy = True, status = "Waiting for host confirmation…" }
                , Effect.batch (writeProject model ++ [ Apps.packageProject project (generatedManifest model) GotPackage ])
                )

        Publish ->
            case model.lastT256 of
                Nothing ->
                    ( { model | status = "Package it first" }, Effect.none )

                Just t256 ->
                    if model.busy then
                        ( model, Effect.none )

                    else
                        ( { model | busy = True, status = "Waiting for host confirmation…" }
                        , Apps.publish t256 GotPublish
                        )

        GotWrite _ ->
            ( model, Effect.none )

        GotPreview (Ok _) ->
            ( { model | busy = False, status = "Previewing. Press Stop preview to get the slot back." }, Effect.none )

        GotPreview (Err err) ->
            ( { model | busy = False, status = "Preview declined or failed: " ++ err.message }, Effect.none )

        GotPackage (Ok value) ->
            ( { model
                | busy = False
                , lastT256 = D.decodeValue (D.field "t256" D.string) value |> Result.toMaybe
                , lastSize = D.decodeValue (D.field "size" D.int) value |> Result.withDefault 0
                , status =
                    "Packaged "
                        ++ String.fromInt (D.decodeValue (D.field "size" D.int) value |> Result.withDefault 0)
                        ++ " bytes"
              }
            , Effect.none
            )

        GotPackage (Err err) ->
            ( { model | busy = False, status = "Packaging declined or failed: " ++ err.message }, Effect.none )

        GotPublish (Ok _) ->
            ( { model | busy = False, status = "Published. Anyone who heard the announce can install it." }, Effect.none )

        GotPublish (Err err) ->
            ( { model | busy = False, status = "Publish declined or failed: " ++ err.message }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Sticker mill"
        , W.textInput "label"
            []
            { value = model.label
            , placeholder = "Sticker text"
            , onInput = Label
            , event = "sm.label"
            }
        , W.textInput "colour"
            []
            { value = model.colour
            , placeholder = "#rrggbb"
            , onInput = Colour
            , event = "sm.colour"
            }
        , W.view "swatch"
            [ S.backgroundColor model.colour, S.height 60, S.alignItems "center", S.justifyContent "center" ]
            [ W.text "swatch-text" [ S.fontSize 24, S.bold, S.color "#ffffff" ] model.label ]
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "preview" [] { label = "Preview", onPress = Preview, event = "sm.preview" }
            , W.button "package" [] { label = "Package", onPress = Package, event = "sm.package" }
            , W.button "publish" [] { label = "Publish", onPress = Publish, event = "sm.publish" }
            ]
        , W.divider "divider"
        , case model.lastT256 of
            Nothing ->
                W.text "no-package" [] "Nothing packaged yet"

            Just t256 ->
                W.qrCode "t256" [] { value = t256, size = Nothing, caption = Nothing }
        , W.text "t256-text"
            [ S.fontSize 12 ]
            (Maybe.withDefault "" model.lastT256)
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
