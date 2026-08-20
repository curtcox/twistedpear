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


type alias Model =
    { postCount : Int
    , status : String
    }


type Msg
    = Publish
    | Refresh
    | GotOpen (Result Error D.Value)
    | GotPut (List Int) (Result Error ())
    | GotPublish Int (Result Error ())
    | GotList (Result Error D.Value)
    | GotSubscribe D.Value (Result Error D.Value)


main =
    Program.app
        { init =
            ( { postCount = 0, status = "Publish a post to the board namespace." }
            , StorageBee.open GotOpen
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


utf8Encode : String -> List Int
utf8Encode string =
    string |> String.toList |> List.map Char.toCode


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Publish ->
            let
                key =
                    "post:0"

                body =
                    utf8Encode ("Post " ++ key)
            in
            ( model, StorageBee.put key body (GotPut body) )

        Refresh ->
            ( model, StorageBee.list (E.object [ ( "limit", E.int 10 ) ]) GotList )

        GotOpen _ ->
            ( model, Effect.none )

        GotPut body (Ok ()) ->
            ( model, Announce.publish body "board" (GotPublish (model.postCount + 1)) )

        GotPut _ (Err _) ->
            ( model, Effect.none )

        GotPublish count (Ok ()) ->
            ( { model | postCount = count, status = "Published " ++ String.fromInt count ++ " post(s) locally" }, Effect.none )

        GotPublish count (Err _) ->
            ( { model | postCount = count, status = "Published " ++ String.fromInt count ++ " post(s) locally" }, Effect.none )

        GotList (Ok posts) ->
            let
                n =
                    D.decodeValue (D.list D.value) posts |> Result.map List.length |> Result.withDefault 0
            in
            ( model, Announce.subscribe "board" (GotSubscribe (E.int n)) )

        GotList (Err _) ->
            ( model, Announce.subscribe "board" (GotSubscribe (E.int 0)) )

        GotSubscribe postCount (Ok announces) ->
            let
                posts =
                    D.decodeValue D.int postCount |> Result.withDefault 0

                n =
                    D.decodeValue (D.list D.value) announces |> Result.map List.length |> Result.withDefault 0
            in
            ( { model | status = String.fromInt posts ++ " local post(s), " ++ String.fromInt n ++ " announce(s) on board" }, Effect.none )

        GotSubscribe postCount (Err _) ->
            let
                posts =
                    D.decodeValue D.int postCount |> Result.withDefault 0
            in
            ( { model | status = String.fromInt posts ++ " local post(s), 0 announce(s) on board" }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Board"
        , W.text "body" [] model.status
        , W.button "publish" [] { label = "Publish post", onPress = Publish, event = "board.publish" }
        , W.button "refresh" [] { label = "Refresh board", onPress = Refresh, event = "board.refresh" }
        ]
