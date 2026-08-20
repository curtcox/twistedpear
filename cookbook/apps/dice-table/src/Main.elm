module Main exposing (main)

import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Style as S
import TwistedPear.Widget as W


historyLimit : Int
historyLimit =
    12


dice : List Int
dice =
    [ 4, 6, 8, 10, 12, 20 ]


suits : List String
suits =
    [ "♠", "♥", "♦", "♣" ]


ranks : List String
ranks =
    [ "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K" ]


type alias Entry =
    { label : String
    , result : String
    }


type alias Model =
    { history : List Entry
    , seed : Int
    }


type Msg
    = Roll Int
    | Coin
    | Card
    | Clear


main =
    Program.app
        { init = ( { history = [], seed = 1 }, Effect.none )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


stepSeed : Int -> Int
stepSeed seed =
    remainderBy 2147483647 (seed * 1103515245 + 12345)


roll : Int -> Int -> ( Int, Int )
roll sides seed =
    ( remainderBy sides seed + 1, stepSeed seed )


record : String -> String -> Model -> Model
record label result model =
    { model | history = List.take historyLimit ({ label = label, result = result } :: model.history) }


at : Int -> List a -> Maybe a
at index items =
    items |> List.drop index |> List.head


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Roll sides ->
            let
                ( value, seed ) =
                    roll sides model.seed
            in
            ( record ("d" ++ String.fromInt sides) (String.fromInt value) { model | seed = seed }, Effect.none )

        Coin ->
            let
                ( value, seed ) =
                    roll 2 model.seed
            in
            ( record "coin"
                (if value == 1 then
                    "Heads"

                 else
                    "Tails"
                )
                { model | seed = seed }
            , Effect.none
            )

        Card ->
            let
                ( rankRoll, seed1 ) =
                    roll 13 model.seed

                ( suitRoll, seed2 ) =
                    roll 4 seed1

                rank =
                    at (rankRoll - 1) ranks |> Maybe.withDefault "A"

                suit =
                    at (suitRoll - 1) suits |> Maybe.withDefault "♠"
            in
            ( record "card" (rank ++ suit) { model | seed = seed2 }, Effect.none )

        Clear ->
            ( { model | history = [] }, Effect.none )


icon : String -> String -> Float -> W.Widget msg
icon id asset side =
    W.image id [ S.width side, S.height side ] { asset = asset, alt = asset }


iconButton : String -> String -> String -> msg -> String -> W.Widget msg
iconButton id asset label onPress event =
    W.view (id ++ "-col")
        [ S.alignItems "center", S.gap 4 ]
        [ icon (id ++ "-icon") asset 32
        , W.button id [] { label = label, onPress = onPress, event = event }
        ]


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Dice table"
        , W.view "dice-row"
            [ S.flexDirection "row", S.gap 8 ]
            (List.map
                (\sides ->
                    iconButton ("d" ++ String.fromInt sides)
                        ("d" ++ String.fromInt sides)
                        ("d" ++ String.fromInt sides)
                        (Roll sides)
                        ("dice.roll." ++ String.fromInt sides)
                )
                dice
            )
        , W.view "extras"
            [ S.flexDirection "row", S.alignItems "center", S.gap 8 ]
            [ iconButton "coin" "coin" "Coin" Coin "dice.coin"
            , iconButton "card" "card" "Card" Card "dice.card"
            , W.button "clear" [] { label = "Clear", onPress = Clear, event = "dice.clear" }
            ]
        , W.divider "divider"
        , W.view "latest-row"
            [ S.flexDirection "row", S.alignItems "center", S.gap 12 ]
            (case model.history of
                [] ->
                    [ W.text "latest" [ S.fontSize 32, S.bold ] "—" ]

                entry :: _ ->
                    [ icon "latest-icon" entry.label 44
                    , W.text "latest" [ S.fontSize 32, S.bold ] entry.result
                    ]
            )
        , W.scroll "history"
            []
            [ W.list "history-list"
                [ S.gap 2 ]
                (model.history
                    |> List.drop 1
                    |> List.indexedMap
                        (\index entry ->
                            W.text ("history-" ++ String.fromInt index)
                                [ S.fontSize 14 ]
                                (entry.label ++ ": " ++ entry.result)
                        )
                )
            ]
        ]
