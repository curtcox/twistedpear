module Main exposing (main)

import Json.Decode as D
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.ShareCas as ShareCas
import TwistedPear.Sdk.Workspace as Workspace
import TwistedPear.Style as S
import TwistedPear.Widget as W


cacheDir : String
cacheDir =
    "zines"


type alias Model =
    { identifier : String
    , cached : List String
    , pages : List String
    , pageIndex : Int
    , status : String
    }


type Msg
    = Id String
    | Open
    | Cached Int
    | Prev
    | Next
    | GotList (Result Error D.Value)
    | GotRead (Result Error String)
    | GotShare (Result Error D.Value)
    | GotWrite String (Result Error D.Value)


main =
    Program.app
        { init =
            ( { identifier = "", cached = [], pages = [], pageIndex = 0, status = "" }
            , Workspace.list cacheDir GotList
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


filePath : D.Decoder String
filePath =
    D.oneOf [ D.field "path" D.string, D.string ]


cachePath : String -> String
cachePath t256 =
    cacheDir ++ "/" ++ String.left 24 t256 ++ ".txt"


splitPages : String -> List String
splitPages text =
    String.split "\n---\n" text


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Id identifier ->
            ( { model | identifier = identifier }, Effect.none )

        Open ->
            let
                t256 =
                    String.trim model.identifier

                path =
                    cachePath t256

                hit =
                    List.member path model.cached
                        || List.member (path |> String.split "/" |> List.reverse |> List.head |> Maybe.withDefault path) model.cached
            in
            if hit then
                ( { model | status = "Read from cache — no bytes over the air" }
                , Workspace.read
                    (if List.member path model.cached then
                        path

                     else
                        path |> String.split "/" |> List.reverse |> List.head |> Maybe.withDefault path
                    )
                    GotRead
                )

            else
                ( { model | status = "Fetching…" }, ShareCas.get t256 GotShare )

        Cached index ->
            case model.cached |> List.drop index |> List.head of
                Nothing ->
                    ( model, Effect.none )

                Just name ->
                    let
                        path =
                            if String.contains "/" name then
                                name

                            else
                                cacheDir ++ "/" ++ name
                    in
                    ( { model | status = "Read from cache" }, Workspace.read path GotRead )

        Prev ->
            ( { model | pageIndex = max 0 (model.pageIndex - 1) }, Effect.none )

        Next ->
            ( { model | pageIndex = min (List.length model.pages - 1) (model.pageIndex + 1) }, Effect.none )

        GotList (Ok value) ->
            ( { model | cached = D.decodeValue (D.list filePath) value |> Result.withDefault [] }, Effect.none )

        GotList (Err _) ->
            ( { model | cached = [] }, Effect.none )

        GotRead (Ok text) ->
            ( { model | pages = splitPages text, pageIndex = 0 }, Effect.none )

        GotRead (Err _) ->
            ( model, Effect.none )

        GotShare (Ok value) ->
            case D.decodeValue (D.oneOf [ D.map Just D.string, D.null Nothing, D.field "content" (D.nullable D.string) ]) value of
                Ok (Just text) ->
                    if String.length text > 256 * 1024 then
                        ( { model | status = "Too large for one workspace file (256 KiB limit)" }, Effect.none )

                    else
                        let
                            path =
                                cachePath (String.trim model.identifier)
                        in
                        ( { model | pages = splitPages text, pageIndex = 0, status = "Fetched and cached " ++ String.fromInt (String.length text) ++ " bytes" }
                        , Workspace.write path text (GotWrite path)
                        )

                _ ->
                    ( { model | status = "Not found — no locator announce was heard" }, Effect.none )

        GotShare (Err _) ->
            ( { model | status = "Not found — no locator announce was heard" }, Effect.none )

        GotWrite _ (Ok _) ->
            ( model, Workspace.list cacheDir GotList )

        GotWrite _ (Err _) ->
            ( model, Effect.none )


pageText : Model -> String
pageText model =
    model.pages |> List.drop model.pageIndex |> List.head |> Maybe.withDefault "Nothing open"


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Zine reader"
        , W.textInput "id"
            []
            { value = model.identifier
            , placeholder = "256t identifier"
            , onInput = Id
            , event = "zr.id"
            }
        , W.button "open" [] { label = "Open", onPress = Open, event = "zr.open" }
        , W.list "cached"
            [ S.gap 2 ]
            (List.indexedMap
                (\index name ->
                    W.button ("cached-" ++ String.fromInt index)
                        []
                        { label = "Cached: " ++ name
                        , onPress = Cached index
                        , event = "zr.cached." ++ String.fromInt index
                        }
                )
                model.cached
            )
        , W.divider "divider"
        , W.scroll "page"
            []
            [ W.text "page-text" [] (pageText model) ]
        , W.view "nav"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "prev" [] { label = "◀", onPress = Prev, event = "zr.prev" }
            , W.text "pageno"
                []
                (if List.isEmpty model.pages then
                    "—"

                 else
                    String.fromInt (model.pageIndex + 1) ++ " / " ++ String.fromInt (List.length model.pages)
                )
            , W.button "next" [] { label = "▶", onPress = Next, event = "zr.next" }
            ]
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
