module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Announce as Announce
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageBee as StorageBee
import TwistedPear.Style as S
import TwistedPear.Widget as W


namespace : String
namespace =
    "neighborhood-board"


type alias Post =
    { key : String
    , from : String
    , text : String
    , at : String
    }


type alias Model =
    { posts : List Post
    , draft : String
    , status : String
    }


type Msg
    = Draft String
    | PostIt
    | GotOpen (Result Error D.Value)
    | GotList (Result Error D.Value)
    | GotPut (Result Error ())
    | GotPublish (Result Error ())
    | GotSubscribe (Result Error D.Value)


main =
    Program.app
        { init =
            ( { posts = [], draft = "", status = "Listening" }
            , Effect.batch
                [ StorageBee.open GotOpen
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


listOptions : E.Value
listOptions =
    E.object
        [ ( "gte", E.string "p/" )
        , ( "lt", E.string "p0" )
        , ( "limit", E.int 100 )
        ]


refresh : Effect.Effect Msg
refresh =
    StorageBee.list listOptions GotList


rowDecoder : D.Decoder Post
rowDecoder =
    D.map2
        (\key value ->
            D.decodeString
                (D.map3 (\from text at -> Post key from text at)
                    (D.field "from" D.string)
                    (D.field "text" D.string)
                    (D.field "at" D.string)
                )
                (utf8Decode value)
                |> Result.withDefault (Post key "" "" "")
        )
        (D.field "key" D.string)
        (D.field "value" (D.list D.int))


eventDecoder : D.Decoder { destination : String, appData : List Int }
eventDecoder =
    D.map2 (\destination appData -> { destination = destination, appData = appData })
        (D.field "destination" D.string)
        (D.field "appData" (D.list D.int))


payloadDecoder : D.Decoder { text : String, at : String }
payloadDecoder =
    D.map2 (\text at -> { text = text, at = at })
        (D.field "text" D.string)
        (D.oneOf [ D.field "at" D.string, D.succeed "" ])


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Draft draft ->
            ( { model | draft = draft }, Effect.none )

        PostIt ->
            if String.trim model.draft == "" then
                ( model, Effect.none )

            else
                let
                    text =
                        String.trim model.draft |> String.left 180

                    payload =
                        utf8Encode (E.encode 0 (E.object [ ( "text", E.string text ), ( "at", E.string "" ) ]))
                in
                ( { model
                    | draft = ""
                    , status = "Published. Only hosts within radio reach right now will have heard it."
                  }
                , Effect.batch
                    [ Announce.publish payload namespace GotPublish
                    , StorageBee.put "p/00000000000000"
                        (utf8Encode (E.encode 0 (E.object [ ( "from", E.string "me" ), ( "text", E.string text ), ( "at", E.string "" ) ])))
                        GotPut
                    ]
                )

        GotOpen (Ok _) ->
            ( model, refresh )

        GotOpen (Err _) ->
            ( model, Effect.none )

        GotList (Ok value) ->
            ( { model | posts = D.decodeValue (D.list rowDecoder) value |> Result.withDefault [] }, Effect.none )

        GotList (Err _) ->
            ( { model | posts = [] }, Effect.none )

        GotPut (Ok ()) ->
            ( model, refresh )

        GotPut (Err _) ->
            ( model, Effect.none )

        GotPublish _ ->
            ( model, Effect.none )

        GotSubscribe (Ok value) ->
            let
                events =
                    D.decodeValue (D.list eventDecoder) value |> Result.withDefault []

                puts =
                    List.filterMap
                        (\event ->
                            case D.decodeString payloadDecoder (utf8Decode event.appData) of
                                Ok data ->
                                    Just
                                        (StorageBee.put "p/00000000000001"
                                            (utf8Encode
                                                (E.encode 0
                                                    (E.object
                                                        [ ( "from", E.string event.destination )
                                                        , ( "text", E.string data.text )
                                                        , ( "at", E.string data.at )
                                                        ]
                                                    )
                                                )
                                            )
                                            GotPut
                                        )

                                Err _ ->
                                    Nothing
                        )
                        events
            in
            ( model, Effect.batch puts )

        GotSubscribe (Err _) ->
            ( model, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Neighborhood board"
        , W.textInput "draft"
            []
            { value = model.draft
            , placeholder = "Post to the neighbourhood (180 chars)"
            , onInput = Draft
            , event = "nb.draft"
            }
        , W.button "post" [] { label = "Post", onPress = PostIt, event = "nb.post" }
        , W.divider "divider"
        , W.scroll "posts"
            []
            [ W.list "post-list"
                [ S.gap 10 ]
                (List.map
                    (\item ->
                        W.view ("post-" ++ item.key)
                            [ S.gap 2 ]
                            [ W.text ("text-" ++ item.key) [] item.text
                            , W.text ("meta-" ++ item.key)
                                [ S.fontSize 12 ]
                                (String.left 12 item.from ++ " · " ++ (item.at |> String.left 16 |> String.replace "T" " "))
                            ]
                    )
                    model.posts
                )
            ]
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
