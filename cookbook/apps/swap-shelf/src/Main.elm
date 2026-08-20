module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Announce as Announce
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


maxPayloadBytes : Int
maxPayloadBytes =
    120


listingsKey : String
listingsKey =
    "listings"


namespace : String
namespace =
    "swap-shelf"


type alias Listing =
    { from : String
    , item : String
    }


type alias Model =
    { listings : List Listing
    , draft : String
    , status : String
    }


type Msg
    = Draft String
    | Offer
    | GotLoad (Result Error (Maybe (List Int)))
    | GotSave (Result Error ())
    | GotPublish (Result Error ())
    | GotSubscribe (Result Error D.Value)


main =
    Program.app
        { init =
            ( { listings = [], draft = "", status = "" }
            , Effect.batch
                [ StorageKv.get listingsKey GotLoad
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


utf8Len : String -> Int
utf8Len string =
    List.length (utf8Encode string)


listingDecoder : D.Decoder Listing
listingDecoder =
    D.map2 Listing
        (D.field "from" D.string)
        (D.field "item" D.string)


persist : List Listing -> Effect.Effect Msg
persist listings =
    let
        body =
            E.encode 0
                (E.list
                    (\row ->
                        E.object
                            [ ( "from", E.string row.from )
                            , ( "item", E.string row.item )
                            , ( "at", E.int 0 )
                            ]
                    )
                    (List.take 200 listings)
                )
    in
    StorageKv.set listingsKey (utf8Encode body) GotSave


payloadFor : String -> Maybe String
payloadFor item =
    let
        json =
            E.encode 0 (E.object [ ( "i", E.string item ) ])
    in
    if utf8Len json > maxPayloadBytes then
        Nothing

    else
        Just json


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Draft draft ->
            ( { model | draft = draft }, Effect.none )

        Offer ->
            let
                item =
                    String.trim model.draft
            in
            case payloadFor item of
                Nothing ->
                    ( { model | status = "Too long — keep the whole payload under " ++ String.fromInt maxPayloadBytes ++ " bytes" }, Effect.none )

                Just payload ->
                    let
                        listings =
                            model.listings ++ [ { from = "me", item = item } ]
                    in
                    ( { model | listings = listings, draft = "", status = "Offered" }
                    , Effect.batch
                        [ Announce.publish (utf8Encode payload) namespace GotPublish
                        , persist listings
                        ]
                    )

        GotLoad (Ok Nothing) ->
            ( model, persist [] )

        GotLoad (Ok (Just stored)) ->
            let
                listings =
                    D.decodeString (D.list listingDecoder) (utf8Decode stored) |> Result.withDefault []
            in
            ( { model | listings = listings }, persist listings )

        GotLoad (Err _) ->
            ( model, persist [] )

        GotSave _ ->
            ( model, Effect.none )

        GotPublish _ ->
            ( model, Effect.none )

        GotSubscribe (Ok value) ->
            let
                events =
                    D.decodeValue
                        (D.list
                            (D.map2 (\destination appData -> { destination = destination, appData = appData })
                                (D.field "destination" D.string)
                                (D.field "appData" (D.list D.int))
                            )
                        )
                        value
                        |> Result.withDefault []

                extra =
                    List.filterMap
                        (\event ->
                            case D.decodeString (D.field "i" D.string) (utf8Decode event.appData) of
                                Ok item ->
                                    Just { from = event.destination, item = item }

                                Err _ ->
                                    Nothing
                        )
                        events

                listings =
                    model.listings ++ extra
            in
            if List.isEmpty extra then
                ( model, Effect.none )

            else
                ( { model | listings = listings }, persist listings )

        GotSubscribe (Err _) ->
            ( model, Effect.none )


remaining : Model -> Int
remaining model =
    maxPayloadBytes - utf8Len (E.encode 0 (E.object [ ( "i", E.string model.draft ) ]))


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Swap shelf"
        , W.textInput "draft"
            []
            { value = model.draft
            , placeholder = "What are you offering?"
            , onInput = Draft
            , event = "ss.draft"
            }
        , W.text "budget"
            [ S.fontSize 12 ]
            (String.fromInt (remaining model) ++ " bytes left in the payload budget")
        , W.button "offer" [] { label = "Offer it", onPress = Offer, event = "ss.offer" }
        , W.divider "divider"
        , W.scroll "listings"
            []
            [ W.list "listing-list"
                [ S.gap 6 ]
                (model.listings
                    |> List.reverse
                    |> List.indexedMap
                        (\index row ->
                            W.text ("listing-" ++ String.fromInt index)
                                []
                                (row.item ++ " — " ++ String.left 12 row.from)
                        )
                )
            ]
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
