module Main exposing (main)

import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Resource as Resource
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Model =
    { status : String }


type Msg
    = Fetch
    | GotFetch (Result Error (List Int))
    | GotSave (Result Error ())


main =
    Program.app
        { init =
            ( { status = "Tap fetch to load offer:demo through host budget checks." }
            , Effect.none
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Fetch ->
            ( model
            , Resource.fetch
                (E.object
                    [ ( "resourceId", E.string "offer:demo" )
                    , ( "budgetBytes", E.int 4096 )
                    ]
                )
                GotFetch
            )

        GotFetch (Ok bytes) ->
            ( { model | status = "Fetched " ++ String.fromInt (List.length bytes) ++ " bytes for offer:demo" }
            , StorageKv.set "last-fetch" bytes GotSave
            )

        GotFetch (Err err) ->
            ( { model | status = err.message }, Effect.none )

        GotSave _ ->
            ( model, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "File Drop"
        , W.text "body" [] model.status
        , W.button "fetch" [] { label = "Fetch offer", onPress = Fetch, event = "resource.fetch" }
        ]
