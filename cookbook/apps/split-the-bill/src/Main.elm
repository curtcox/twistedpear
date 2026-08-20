module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageBee as StorageBee
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Entry =
    { key : String
    , who : String
    , what : String
    , cents : Int
    }


type alias Model =
    { entries : List Entry
    , who : String
    , what : String
    , amount : String
    , status : String
    , seq : Int
    }


type Msg
    = Who String
    | What String
    | Amount String
    | Add
    | GotOpen (Result Error D.Value)
    | GotList (Result Error D.Value)
    | GotPut (Result Error ())


main =
    Program.app
        { init =
            ( { entries = [], who = "", what = "", amount = "", status = "", seq = 0 }
            , StorageBee.open GotOpen
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
        [ ( "gte", E.string "e/" )
        , ( "lt", E.string "e0" )
        , ( "limit", E.int 200 )
        ]


refresh : Effect.Effect Msg
refresh =
    StorageBee.list listOptions GotList


rowDecoder : D.Decoder Entry
rowDecoder =
    D.map2
        (\key value ->
            D.decodeString
                (D.map3 (\who what cents -> Entry key who what cents)
                    (D.field "who" D.string)
                    (D.field "what" D.string)
                    (D.field "cents" D.int)
                )
                (utf8Decode value)
                |> Result.withDefault (Entry key "" "" 0)
        )
        (D.field "key" D.string)
        (D.field "value" (D.list D.int))


decodeEntries : D.Value -> List Entry
decodeEntries value =
    D.decodeValue (D.list rowDecoder) value |> Result.withDefault []


money : Int -> String
money cents =
    let
        absCents =
            abs cents

        whole =
            absCents // 100

        frac =
            remainderBy 100 absCents

        sign =
            if cents < 0 then
                "-"

            else
                ""
    in
    sign ++ String.fromInt whole ++ "." ++ String.padLeft 2 '0' (String.fromInt frac)


peopleOf : List Entry -> List String
peopleOf entries =
    List.foldl
        (\entry acc ->
            if List.member entry.who acc then
                acc

            else
                acc ++ [ entry.who ]
        )
        []
        entries


paidBy : String -> List Entry -> Int
paidBy person entries =
    entries
        |> List.filter (\entry -> entry.who == person)
        |> List.map .cents
        |> List.sum


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Who who ->
            ( { model | who = who }, Effect.none )

        What what ->
            ( { model | what = what }, Effect.none )

        Amount amount ->
            ( { model | amount = amount }, Effect.none )

        Add ->
            case String.toFloat model.amount of
                Nothing ->
                    ( { model | status = "Need a name and an amount" }, Effect.none )

                Just raw ->
                    let
                        cents =
                            round (raw * 100)
                    in
                    if String.trim model.who == "" then
                        ( { model | status = "Need a name and an amount" }, Effect.none )

                    else
                        let
                            key =
                                "e/" ++ String.fromInt model.seq

                            payload =
                                E.encode 0
                                    (E.object
                                        [ ( "who", E.string (String.trim model.who) )
                                        , ( "what", E.string (String.trim model.what) )
                                        , ( "cents", E.int cents )
                                        ]
                                    )
                        in
                        ( { model | what = "", amount = "", status = "Added", seq = model.seq + 1 }
                        , StorageBee.put key (utf8Encode payload) GotPut
                        )

        GotOpen (Ok _) ->
            ( model, refresh )

        GotOpen (Err _) ->
            ( model, Effect.none )

        GotList (Ok value) ->
            ( { model | entries = decodeEntries value }, Effect.none )

        GotList (Err _) ->
            ( { model | entries = [] }, Effect.none )

        GotPut (Ok ()) ->
            ( model, refresh )

        GotPut (Err _) ->
            ( model, Effect.none )


view : Model -> W.Widget Msg
view model =
    let
        people =
            peopleOf model.entries

        total =
            List.sum (List.map .cents model.entries)

        fairShare =
            if List.isEmpty people then
                0

            else
                round (toFloat total / toFloat (List.length people))
    in
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Split the bill"
        , W.textInput "who" [] { value = model.who, placeholder = "Who paid", onInput = Who, event = "bill.who" }
        , W.textInput "what" [] { value = model.what, placeholder = "For what", onInput = What, event = "bill.what" }
        , W.textInput "amount" [] { value = model.amount, placeholder = "Amount", onInput = Amount, event = "bill.amount" }
        , W.button "add" [] { label = "Add", onPress = Add, event = "bill.add" }
        , W.divider "divider"
        , W.text "total"
            [ S.bold ]
            ("Total " ++ money total ++ " · " ++ String.fromInt (List.length people) ++ " people · " ++ money fairShare ++ " each")
        , W.list "settle"
            [ S.gap 2 ]
            (List.map
                (\person ->
                    let
                        delta =
                            paidBy person model.entries - fairShare

                        verdict =
                            if delta == 0 then
                                "square"

                            else if delta > 0 then
                                "is owed " ++ money delta

                            else
                                "owes " ++ money -delta
                    in
                    W.text ("settle-" ++ person) [] (person ++ " " ++ verdict)
                )
                people
            )
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
