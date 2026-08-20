module Main exposing (main)

import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Model =
    { taps : Int }


type Msg
    = Tapped


main =
    Program.app
        { init = ( { taps = 0 }, Effect.none )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Tapped ->
            ( { taps = model.taps + 1 }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Hello"
        , W.button "tap" [] { label = "Tap me", onPress = Tapped, event = "tap" }
        , W.text "count" [] ("Taps: " ++ String.fromInt model.taps)
        ]
