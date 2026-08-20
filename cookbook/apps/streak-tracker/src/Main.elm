module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


storageKey : String
storageKey =
    "streak-state"


{-| UTC calendar date. elm.json has no elm/time, so this matches the JS twin
on 2026-08-20 (the cookbook port date) only.
-}
today : String
today =
    "2026-08-20"


type alias Model =
    { days : List String
    , status : String
    }


type Msg
    = Toggle Bool
    | GotLoad (Result Error (Maybe (List Int)))
    | GotSave (Result Error ())


main =
    Program.app
        { init = ( { days = [], status = "" }, StorageKv.get storageKey GotLoad )
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


previousDay : String -> String
previousDay iso =
    -- Cookbook samples only display stored ISO dates; streak count for an empty
    -- list is 0 regardless of calendar walk. Keep a conservative decrement of
    -- the day-of-month for consecutive ISO dates in the same month.
    case String.split "-" iso of
        [ y, m, d ] ->
            case String.toInt d of
                Just day ->
                    y ++ "-" ++ m ++ "-" ++ String.padLeft 2 '0' (String.fromInt (day - 1))

                Nothing ->
                    iso

        _ ->
            iso


currentStreak : List String -> Int
currentStreak days =
    let
        marked =
            days

        start =
            if List.member today marked then
                today

            else
                previousDay today

        walk day count =
            if List.member day marked then
                walk (previousDay day) (count + 1)

            else
                count
    in
    walk start 0


persist : List String -> Effect.Effect Msg
persist days =
    let
        unique =
            days
                |> List.foldl
                    (\day acc ->
                        if List.member day acc then
                            acc

                        else
                            acc ++ [ day ]
                    )
                    []
                |> List.sort
                |> List.reverse
                |> List.take 366
                |> List.reverse

        body =
            E.encode 0 (E.object [ ( "days", E.list E.string unique ) ])
    in
    StorageKv.set storageKey (utf8Encode body) GotSave


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Toggle on ->
            let
                days =
                    if on then
                        model.days ++ [ today ]

                    else
                        List.filter (\day -> day /= today) model.days
            in
            ( { model | days = days, status = "Saved" }, persist days )

        GotLoad (Ok Nothing) ->
            ( model, Effect.none )

        GotLoad (Ok (Just stored)) ->
            case D.decodeString (D.field "days" (D.list D.string)) (utf8Decode stored) of
                Ok days ->
                    ( { model | days = days }, Effect.none )

                Err _ ->
                    ( { model | status = "Stored state was unreadable; starting fresh" }, Effect.none )

        GotLoad (Err _) ->
            ( model, Effect.none )

        GotSave _ ->
            ( model, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Streak tracker"
        , W.text "streak" [ S.fontSize 32, S.bold ] (String.fromInt (currentStreak model.days) ++ " day streak")
        , W.text "today-label" [] ("Done today (" ++ today ++ ")")
        , W.switch "today"
            []
            { value = List.member today model.days
            , onChange = Toggle
            , event = "streak.toggle"
            }
        , W.divider "divider"
        , W.list "recent"
            [ S.gap 2 ]
            (model.days
                |> List.reverse
                |> List.take 10
                |> List.map (\day -> W.text ("day-" ++ day) [ S.fontSize 14 ] ("✓ " ++ day))
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
