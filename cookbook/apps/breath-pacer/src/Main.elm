module Main exposing (main)

import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Phase =
    { name : String
    , seconds : Int
    , icon : String
    }


phases : List Phase
phases =
    [ Phase "Breathe in" 4 "inhale"
    , Phase "Hold" 4 "hold"
    , Phase "Breathe out" 4 "exhale"
    , Phase "Hold" 4 "hold"
    ]


type alias Model =
    { running : Bool
    , phaseIndex : Int
    , elapsedMs : Int
    , cycles : Int
    }


type Msg
    = Toggle


main =
    Program.app
        { init =
            ( { running = False
              , phaseIndex = 0
              , elapsedMs = 0
              , cycles = 0
              }
            , Effect.none
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


phaseAt : Int -> Phase
phaseAt index =
    phases
        |> List.drop (remainderBy (List.length phases) index)
        |> List.head
        |> Maybe.withDefault (Phase "Breathe in" 4 "inhale")


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Toggle ->
            if model.running then
                ( { model | running = False }, Effect.none )

            else
                ( { model | running = True, phaseIndex = 0, elapsedMs = 0 }, Effect.none )


progress : Model -> Float
progress model =
    let
        seconds =
            (phaseAt model.phaseIndex).seconds
    in
    min 1 (toFloat model.elapsedMs / (toFloat seconds * 1000))


view : Model -> W.Widget Msg
view model =
    let
        current =
            phaseAt model.phaseIndex
    in
    W.view "root"
        [ S.padding 24, S.gap 16, S.alignItems "center" ]
        [ W.image "phase-icon"
            [ S.width 72, S.height 72 ]
            { asset =
                if model.running then
                    current.icon

                else
                    "ready"
            , alt =
                if model.running then
                    current.name

                else
                    "Ready"
            }
        , W.text "phase"
            [ S.fontSize 32, S.bold ]
            (if model.running then
                current.name

             else
                "Ready"
            )
        , W.progress "bar"
            []
            { value =
                if model.running then
                    progress model

                else
                    0
            }
        , W.text "count" [] ("Cycles: " ++ String.fromInt model.cycles)
        , W.button "toggle"
            []
            { label =
                if model.running then
                    "Stop"

                else
                    "Start"
            , onPress = Toggle
            , event = "pace.toggle"
            }
        , W.text "note"
            [ S.fontSize 12 ]
            "Stopping the app stops the pacer. Mini-apps do not run in the background."
        ]
