module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Ai as Ai
import TwistedPear.Sdk.Apps as Apps
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Workspace as Workspace
import TwistedPear.Style as S
import TwistedPear.Widget as W


project : String
project =
    "forge/current"


types : List String
types =
    [ "text", "number", "switch" ]


maxFields : Int
maxFields =
    12


type alias Field =
    { name : String
    , label : String
    , type_ : String
    }


type alias Model =
    { brief : String
    , fields : List Field
    , lastT256 : Maybe String
    , inFlight : Bool
    , status : String
    }


type Msg
    = Brief String
    | Design
    | Preview
    | Package
    | GotWrite (Result Error D.Value)
    | GotChat (Result Error D.Value)
    | GotPreview (Result Error D.Value)
    | GotPackage (Result Error D.Value)


main =
    Program.app
        { init =
            ( { brief = "", fields = [], lastT256 = Nothing, inFlight = False, status = "" }
            , Effect.none
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


slug : String -> String
slug raw =
    let
        collapsed =
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
                |> String.split "-"
                |> List.filter ((/=) "")
                |> String.join "-"
    in
    collapsed


fieldName : String -> String
fieldName label =
    slug label |> String.left 24


validateFields : D.Value -> Maybe (List Field)
validateFields value =
    case D.decodeValue (D.list fieldCandidate) value of
        Ok items ->
            let
                n =
                    List.length items
            in
            if n == 0 || n > maxFields then
                Nothing

            else
                let
                    clean =
                        List.filterMap
                            (\item ->
                                let
                                    name =
                                        fieldName item.label
                                in
                                if item.label == "" || String.length item.label > 60 || not (List.member item.type_ types) || name == "" then
                                    Nothing

                                else
                                    Just { name = name, label = item.label, type_ = item.type_ }
                            )
                            items
                in
                if List.length clean == n then
                    Just clean

                else
                    Nothing

        Err _ ->
            Nothing


fieldCandidate : D.Decoder { label : String, type_ : String }
fieldCandidate =
    D.map2 (\label type_ -> { label = label, type_ = type_ })
        (D.field "label" D.string)
        (D.field "type" D.string)


generatedManifest : Model -> E.Value
generatedManifest model =
    let
        name =
            let
                s =
                    slug model.brief |> String.left 20
            in
            if s == "" then
                "form-blank"

            else
                "form-" ++ s
    in
    E.object
        [ ( "name", E.string name )
        , ( "version", E.string "1.0.0" )
        , ( "entry", E.string "bundle.js" )
        , ( "capabilities", E.list E.string [ "storage:kv" ] )
        , ( "icon", E.null )
        , ( "minHostApi", E.string "0.1.0" )
        ]


generatedBundle : Model -> String
generatedBundle model =
    "import { storage, ui } from \"@twistedpear/miniapp-sdk\";\n\nconst FIELDS = "
        ++ E.encode 2
            (E.list
                (\field ->
                    E.object
                        [ ( "name", E.string field.name )
                        , ( "label", E.string field.label )
                        , ( "type", E.string field.type_ )
                        ]
                )
                model.fields
            )
        ++ ";\nconst decoder = new TextDecoder();\nconst encoder = new TextEncoder();\nlet values = {};\n\nconst stored = await storage.kv.get(\"form\");\nif (stored !== null) {\n  try { values = JSON.parse(decoder.decode(stored)); } catch (error) { values = {}; }\n}\n\nasync function render() {\n  await ui.render({\n    root: {\n      id: \"root\",\n      type: \"view\",\n      style: { padding: 16, gap: 10 },\n      children: FIELDS.map((field) =>\n        field.type === \"switch\"\n          ? {\n              id: \"row-\" + field.name,\n              type: \"view\",\n              style: { flexDirection: \"row\", gap: 8 },\n              children: [\n                { id: \"label-\" + field.name, type: \"text\", props: { value: field.label } },\n                { id: field.name, type: \"switch\", props: { value: values[field.name] === true, event: field.name, accessibilityLabel: field.label } }\n              ]\n            }\n          : { id: field.name, type: \"text-input\", props: { value: values[field.name] ?? \"\", placeholder: field.label, event: field.name } }\n      )\n    }\n  });\n}\n\nui.onEvent(async ({ event, value }) => {\n  values[event] = value;\n  await storage.kv.set(\"form\", encoder.encode(JSON.stringify(values)));\n  await render();\n});\n\nawait render();\n"


writeProject : Model -> List (Effect.Effect Msg)
writeProject model =
    [ Workspace.write (project ++ "/bundle.js") (generatedBundle model) GotWrite
    , Workspace.write (project ++ "/app.manifest.json") (E.encode 2 (generatedManifest model)) GotWrite
    ]


chatRequest : String -> E.Value
chatRequest brief =
    E.object
        [ ( "messages"
          , E.list identity
                [ E.object
                    [ ( "role", E.string "system" )
                    , ( "content"
                      , E.string
                            ("Return a JSON array of at most "
                                ++ String.fromInt maxFields
                                ++ " form fields. Each element has \"label\" (string) and \"type\" (one of "
                                ++ String.join ", " types
                                ++ "). No prose."
                            )
                      )
                    ]
                , E.object [ ( "role", E.string "user" ), ( "content", E.string (String.trim brief) ) ]
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
        |> String.replace "```json" ""
        |> String.replace "```" ""
        |> String.trim


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Brief brief ->
            ( { model | brief = brief }, Effect.none )

        Design ->
            if String.trim model.brief == "" || model.inFlight then
                ( model, Effect.none )

            else
                ( { model | inFlight = True, status = "Designing the form…" }
                , Ai.chat (chatRequest model.brief) GotChat
                )

        Preview ->
            if List.isEmpty model.fields then
                ( model, Effect.none )

            else
                ( model
                , Effect.batch
                    (writeProject model
                        ++ [ Apps.preview project (generatedManifest model) (E.list E.string [ "storage:kv" ]) GotPreview ]
                    )
                )

        Package ->
            if List.isEmpty model.fields then
                ( { model | status = "Design a form first" }, Effect.none )

            else
                ( { model | status = "Waiting for host confirmation…" }
                , Effect.batch (writeProject model ++ [ Apps.packageProject project (generatedManifest model) GotPackage ])
                )

        GotWrite _ ->
            ( model, Effect.none )

        GotChat (Ok value) ->
            case D.decodeString D.value (assistantText value) |> Result.toMaybe |> Maybe.andThen validateFields of
                Nothing ->
                    ( { model | inFlight = False, status = "The model's design failed validation — try rewording the brief" }, Effect.none )

                Just clean ->
                    ( { model
                        | inFlight = False
                        , fields = clean
                        , status = "Designed " ++ String.fromInt (List.length clean) ++ " fields. Review them before packaging."
                      }
                    , Effect.none
                    )

        GotChat (Err _) ->
            ( { model | inFlight = False, status = "Model unavailable" }, Effect.none )

        GotPreview (Ok _) ->
            ( { model | status = "Previewing the generated app" }, Effect.none )

        GotPreview (Err err) ->
            ( { model | status = "Preview declined: " ++ err.message }, Effect.none )

        GotPackage (Ok value) ->
            ( { model
                | lastT256 = D.decodeValue (D.field "t256" D.string) value |> Result.toMaybe
                , status =
                    "Packaged "
                        ++ String.fromInt (D.decodeValue (D.field "size" D.int) value |> Result.withDefault 0)
                        ++ " bytes"
              }
            , Effect.none
            )

        GotPackage (Err err) ->
            ( { model | status = "Declined or failed: " ++ err.message }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Form forge"
        , W.textInput "brief"
            []
            { value = model.brief
            , placeholder = "e.g. a trailhead sign-in sheet"
            , onInput = Brief
            , event = "ff.brief"
            }
        , W.button "design"
            []
            { label =
                if model.inFlight then
                    "Working…"

                else
                    "Design it"
            , onPress = Design
            , event = "ff.design"
            }
        , W.divider "divider"
        , W.list "fields"
            [ S.gap 2 ]
            (List.map
                (\field ->
                    W.text ("fld-" ++ field.name) [] (field.label ++ " (" ++ field.type_ ++ ")")
                )
                model.fields
            )
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "preview" [] { label = "Preview", onPress = Preview, event = "ff.preview" }
            , W.button "package" [] { label = "Package", onPress = Package, event = "ff.package" }
            ]
        , W.text "t256"
            [ S.fontSize 12 ]
            (Maybe.withDefault "" model.lastT256)
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
