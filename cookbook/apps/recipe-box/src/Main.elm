module Main exposing (main)

import Json.Decode as D
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Workspace as Workspace
import TwistedPear.Style as S
import TwistedPear.Widget as W


dir : String
dir =
    "recipes"


maxFileBytes : Int
maxFileBytes =
    256 * 1024


maxFiles : Int
maxFiles =
    512


type alias Model =
    { files : List String
    , openFile : Maybe String
    , text : String
    , newName : String
    , status : String
    }


type Msg
    = Name String
    | Text String
    | Create
    | Save
    | Delete
    | Open Int
    | GotList (Result Error D.Value)
    | GotRead String (Result Error String)
    | GotWrite String (Result Error D.Value)
    | GotRemove (Result Error ())


main =
    Program.app
        { init =
            ( { files = [], openFile = Nothing, text = "", newName = "", status = "" }
            , Workspace.list dir GotList
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


utf8Len : String -> Int
utf8Len string =
    string |> String.toList |> List.map Char.toCode |> List.length


isSafeChar : Char -> Bool
isSafeChar c =
    Char.isAlphaNum c || c == '-' || c == '_' || c == ' '


collapseSpaces : String -> String
collapseSpaces raw =
    raw
        |> String.words
        |> String.join "-"


pathFor : String -> Maybe String
pathFor name =
    let
        safe =
            name
                |> String.toList
                |> List.filter isSafeChar
                |> String.fromList
                |> String.trim
                |> collapseSpaces
    in
    if safe == "" then
        Nothing

    else
        Just (dir ++ "/" ++ safe ++ ".md")


filePath : D.Decoder String
filePath =
    D.oneOf [ D.field "path" D.string, D.string ]


decodeFiles : D.Value -> List String
decodeFiles value =
    D.decodeValue (D.list filePath) value |> Result.withDefault []


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Name newName ->
            ( { model | newName = newName }, Effect.none )

        Text text ->
            ( { model | text = text }, Effect.none )

        Create ->
            case pathFor model.newName of
                Nothing ->
                    ( { model | status = "Give it a name" }, Effect.none )

                Just path ->
                    if List.length model.files >= maxFiles then
                        ( { model | status = "At the " ++ String.fromInt maxFiles ++ "-file ceiling — delete something first" }, Effect.none )

                    else
                        let
                            content =
                                "# " ++ model.newName ++ "\n\n## Ingredients\n\n## Method\n"
                        in
                        ( { model | newName = "" }
                        , Workspace.write path content (GotWrite path)
                        )

        Save ->
            case model.openFile of
                Nothing ->
                    ( model, Effect.none )

                Just path ->
                    if utf8Len model.text > maxFileBytes then
                        ( { model | status = "Too large — the per-file limit is 256 KiB" }, Effect.none )

                    else
                        ( model, Workspace.write path model.text (GotWrite ("save:" ++ path)) )

        Delete ->
            case model.openFile of
                Nothing ->
                    ( model, Effect.none )

                Just path ->
                    ( { model | openFile = Nothing, text = "" }, Workspace.remove path GotRemove )

        Open index ->
            case model.files |> List.drop index |> List.head of
                Nothing ->
                    ( model, Effect.none )

                Just name ->
                    let
                        path =
                            if String.contains "/" name then
                                name

                            else
                                dir ++ "/" ++ name
                    in
                    ( { model | openFile = Just path }, Workspace.read path (GotRead path) )

        GotList (Ok value) ->
            ( { model | files = decodeFiles value }, Effect.none )

        GotList (Err _) ->
            ( { model | files = [] }, Effect.none )

        GotRead path (Ok text) ->
            ( { model | openFile = Just path, text = text, status = "Open: " ++ path }, Effect.none )

        GotRead _ (Err _) ->
            ( model, Effect.none )

        GotWrite path (Ok _) ->
            if String.startsWith "save:" path then
                ( { model | status = "Saved" }, Effect.none )

            else
                ( { model | openFile = Just path, status = "Open: " ++ path }
                , Effect.batch [ Workspace.list dir GotList, Workspace.read path (GotRead path) ]
                )

        GotWrite _ (Err _) ->
            ( model, Effect.none )

        GotRemove (Ok ()) ->
            ( { model | status = "Deleted" }, Workspace.list dir GotList )

        GotRemove (Err _) ->
            ( model, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Recipe box"
        , W.view "new-row"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.textInput "newname"
                []
                { value = model.newName
                , placeholder = "New recipe"
                , onInput = Name
                , event = "rb.name"
                }
            , W.button "create" [] { label = "Create", onPress = Create, event = "rb.create" }
            ]
        , W.list "files"
            [ S.gap 2 ]
            (List.indexedMap
                (\index name ->
                    W.button ("file-" ++ String.fromInt index)
                        []
                        { label = name
                        , onPress = Open index
                        , event = "rb.open." ++ String.fromInt index
                        }
                )
                model.files
            )
        , W.divider "divider"
        , W.textInput "editor"
            [ S.height 200 ]
            { value = model.text
            , placeholder = "Select a recipe"
            , onInput = Text
            , event = "rb.text"
            }
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "save" [] { label = "Save", onPress = Save, event = "rb.save" }
            , W.button "delete" [] { label = "Delete", onPress = Delete, event = "rb.delete" }
            ]
        , W.text "status"
            [ S.fontSize 12 ]
            (model.status ++ " · " ++ String.fromInt (List.length model.files) ++ "/" ++ String.fromInt maxFiles ++ " files")
        ]
