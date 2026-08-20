module Main exposing (main)

import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Unit =
    { id : String
    , label : String
    , factor : Float
    , suffix : String
    , icon : String
    }


units : List Unit
units =
    [ Unit "km-mi" "kilometres → miles" 0.621371 "mi" "distance"
    , Unit "m-ft" "metres → feet" 3.28084 "ft" "distance"
    , Unit "kg-lb" "kilograms → pounds" 2.20462 "lb" "mass"
    , Unit "l-gal" "litres → US gallons" 0.264172 "gal" "volume"
    , Unit "km-nm" "kilometres → nautical miles" 0.539957 "NM" "nautical"
    ]


type alias Model =
    { selected : Unit
    , raw : String
    }


type Msg
    = Typed String
    | Select String


main =
    Program.app
        { init =
            ( { selected = Unit "km-mi" "kilometres → miles" 0.621371 "mi" "distance"
              , raw = ""
              }
            , Effect.none
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Typed raw ->
            ( { model | raw = raw }, Effect.none )

        Select id ->
            ( { model
                | selected =
                    units
                        |> List.filter (\unit -> unit.id == id)
                        |> List.head
                        |> Maybe.withDefault model.selected
              }
            , Effect.none
            )


format3 : Float -> String
format3 value =
    let
        cents =
            abs (round (value * 1000))

        whole =
            cents // 1000

        frac =
            remainderBy 1000 cents

        sign =
            if value < 0 then
                "-"

            else
                ""
    in
    sign ++ String.fromInt whole ++ "." ++ String.padLeft 3 '0' (String.fromInt frac)


converted : Model -> String
converted model =
    case String.toFloat model.raw of
        Nothing ->
            "—"

        Just number ->
            format3 (number * model.selected.factor) ++ " " ++ model.selected.suffix


unitRow : String -> Unit -> W.Widget Msg
unitRow selectedId unit =
    W.view ("unit-" ++ unit.id ++ "-row")
        [ S.flexDirection "row", S.alignItems "center", S.gap 8 ]
        [ W.image ("unit-" ++ unit.id ++ "-icon")
            [ S.width 22, S.height 22 ]
            { asset = unit.icon, alt = unit.icon }
        , W.button ("unit-" ++ unit.id)
            []
            { label =
                if unit.id == selectedId then
                    "● " ++ unit.label

                else
                    "○ " ++ unit.label
            , onPress = Select unit.id
            , event = "conv.select." ++ unit.id
            }
        ]


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Unit converter"
        , W.textInput "input"
            []
            { value = model.raw
            , placeholder = "Enter a value"
            , onInput = Typed
            , event = "conv.input"
            }
        , W.list "units" [ S.gap 4 ] (List.map (unitRow model.selected.id) units)
        , W.divider "divider"
        , W.text "result" [ S.fontSize 32, S.bold ] (converted model)
        , W.text "footnote"
            [ S.fontSize 12 ]
            "Works with the radio off. Nothing is stored or sent."
        ]
