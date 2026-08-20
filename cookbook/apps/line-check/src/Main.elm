module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Device as Device
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Links as Links
import TwistedPear.Style as S
import TwistedPear.Widget as W


type alias Peer =
    { displayLabel : String
    , reachability : String
    , plane : String
    , peer : D.Value
    , qualitySource : String
    , qualityConfidence : String
    , freshness : String
    , rttMs : Float
    , downlinkBucket : String
    , accepts : List String
    }


type alias Offer =
    { id : String
    , classId : String
    , displayLabel : String
    , maxRung : String
    }


type alias Model =
    { roster : List Peer
    , offers : List Offer
    , peersDone : Bool
    , offersDone : Bool
    , peersErr : Maybe String
    , offersErr : Maybe String
    }


type Msg
    = Refresh
    | Share
    | Measure Int
    | Revoke Int
    | GotPeers (Result Error D.Value)
    | GotOffers (Result Error D.Value)
    | GotProbe Int (Result Error D.Value)
    | GotShare (Result Error D.Value)
    | GotOpen String String (Result Error D.Value)
    | GotStream String String (Result Error D.Value)
    | GotRevoke (Result Error D.Value)


main =
    Program.app
        { init =
            ( { roster = []
              , offers = []
              , peersDone = False
              , offersDone = False
              , peersErr = Nothing
              , offersErr = Nothing
              }
            , refresh
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


refresh : Effect.Effect Msg
refresh =
    Effect.batch
        [ Links.peers GotPeers
        , Effect.call "device" "shareOffers" (E.object []) GotOffers
        ]


stringField : String -> D.Value -> String
stringField key value =
    D.decodeValue (D.field key D.string) value |> Result.withDefault ""


peerDecoder : D.Decoder Peer
peerDecoder =
    D.value
        |> D.andThen
            (\value ->
                D.succeed
                    { displayLabel = stringField "displayLabel" value
                    , reachability = stringField "reachability" value
                    , plane = stringField "plane" value
                    , peer = D.decodeValue (D.field "peer" D.value) value |> Result.withDefault E.null
                    , qualitySource = D.decodeValue (D.at [ "quality", "source" ] D.string) value |> Result.withDefault ""
                    , qualityConfidence = D.decodeValue (D.at [ "quality", "confidence" ] D.string) value |> Result.withDefault ""
                    , freshness = stringField "freshness" value
                    , rttMs =
                        D.decodeValue (D.at [ "quality", "rttMs" ] D.float) value
                            |> Result.withDefault
                                (D.decodeValue (D.at [ "quality", "rttMs" ] (D.map toFloat D.int)) value |> Result.withDefault 0)
                    , downlinkBucket = D.decodeValue (D.at [ "readiness", "downlinkBucket" ] D.string) value |> Result.withDefault ""
                    , accepts =
                        D.decodeValue (D.at [ "readiness", "accepts" ] (D.list (D.field "classId" D.string))) value
                            |> Result.withDefault []
                    }
            )


offerDecoder : D.Decoder Offer
offerDecoder =
    D.map4 Offer
        (D.oneOf [ D.field "id" D.string, D.succeed "" ])
        (D.oneOf [ D.field "classId" D.string, D.succeed "" ])
        (D.oneOf [ D.field "displayLabel" D.string, D.succeed "" ])
        (D.oneOf [ D.field "maxRung" D.string, D.succeed "" ])


capability : Peer -> String
capability peer =
    let
        camera =
            List.member "camera" peer.accepts

        mic =
            List.member "microphone" peer.accepts
    in
    if peer.reachability == "unreachable" || peer.downlinkBucket == "" then
        "Unreachable"

    else if camera && peer.downlinkBucket == "hd-video" then
        "HD video"

    else if camera && peer.downlinkBucket == "sd-video" then
        "Video"

    else if mic && List.member peer.downlinkBucket [ "hd-video", "sd-video", "audio" ] then
        "Audio"

    else if mic && peer.downlinkBucket == "narrowband" then
        "Voice (narrowband)"

    else
        "Events only"


caveat : Peer -> String
caveat peer =
    let
        cap =
            capability peer
    in
    if peer.qualitySource == "declared" && peer.qualityConfidence == "low" then
        "probably " ++ String.toLower cap ++ " — not measured"

    else
        cap


statusOf : Model -> String
statusOf model =
    if not (model.peersDone && model.offersDone) then
        "Checking host-owned link and sharing state…"

    else
        let
            failures =
                List.filterMap identity
                    [ Maybe.map (\m -> "links: " ++ m) model.peersErr
                    , Maybe.map (\m -> "sharing: " ++ m) model.offersErr
                    ]
        in
        if List.isEmpty failures then
            "Current · " ++ String.fromInt (List.length model.roster) ++ " peer(s)"

        else
            "Partial · " ++ String.join "; " failures


peerRow : Int -> Peer -> W.Widget Msg
peerRow index peer =
    W.view ("peer-" ++ String.fromInt index)
        [ S.gap 4, S.padding 8 ]
        [ W.text ("peer-name-" ++ String.fromInt index) [ S.bold ] peer.displayLabel
        , W.text ("peer-cap-" ++ String.fromInt index) [] (caveat peer ++ " · " ++ peer.reachability ++ " · " ++ peer.plane)
        , W.text ("peer-quality-" ++ String.fromInt index)
            [ S.fontSize 12 ]
            (peer.qualitySource ++ " · " ++ peer.freshness ++ " · " ++ String.fromInt (round peer.rttMs) ++ " ms RTT")
        , W.button ("measure-" ++ String.fromInt index)
            []
            { label = "Measure now"
            , onPress = Measure index
            , event = "lc.measure." ++ String.fromInt index
            }
        ]


offerRow : Int -> Offer -> W.Widget Msg
offerRow index offer =
    W.view ("offer-" ++ String.fromInt index)
        [ S.gap 4 ]
        [ W.text ("offer-label-" ++ String.fromInt index)
            []
            (offer.classId ++ " → " ++ offer.displayLabel ++ " · " ++ offer.maxRung)
        , W.button ("offer-revoke-" ++ String.fromInt index)
            []
            { label = "Revoke in host"
            , onPress = Revoke index
            , event = "lc.revoke." ++ String.fromInt index
            }
        ]


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Refresh ->
            ( { model | peersDone = False, offersDone = False, peersErr = Nothing, offersErr = Nothing }, refresh )

        Share ->
            ( model, Effect.call "device" "requestShareOffer" (E.object [ ( "purpose", E.string "Start a Line Check call" ) ]) GotShare )

        Measure index ->
            case model.roster |> List.drop index |> List.head of
                Nothing ->
                    ( model, Effect.none )

                Just peer ->
                    ( model, Links.probe peer.peer E.null (GotProbe index) )

        Revoke index ->
            case model.offers |> List.drop index |> List.head of
                Nothing ->
                    ( model, Effect.none )

                Just offer ->
                    ( model, Effect.call "device" "revokeShareOffer" (E.object [ ( "id", E.string offer.id ) ]) GotRevoke )

        GotPeers (Ok value) ->
            ( { model
                | roster = D.decodeValue (D.list peerDecoder) value |> Result.withDefault []
                , peersDone = True
                , peersErr = Nothing
              }
            , Effect.none
            )

        GotPeers (Err err) ->
            ( { model | roster = [], peersDone = True, peersErr = Just err.message }, Effect.none )

        GotOffers (Ok value) ->
            ( { model
                | offers = D.decodeValue (D.list offerDecoder) value |> Result.withDefault []
                , offersDone = True
                , offersErr = Nothing
              }
            , Effect.none
            )

        GotOffers (Err err) ->
            ( { model | offers = [], offersDone = True, offersErr = Just err.message }, Effect.none )

        GotProbe index (Ok value) ->
            let
                bps =
                    D.decodeValue (D.field "goodputBps" D.float) value
                        |> Result.withDefault (D.decodeValue (D.field "goodputBps" (D.map toFloat D.int)) value |> Result.withDefault 0)

                rtt =
                    D.decodeValue (D.field "rttMs" D.float) value
                        |> Result.withDefault (D.decodeValue (D.field "rttMs" (D.map toFloat D.int)) value |> Result.withDefault 0)

                label =
                    model.roster |> List.drop index |> List.head |> Maybe.map .displayLabel |> Maybe.withDefault ""
            in
            ( setMeasuredStatus label bps rtt model
            , Effect.batch
                [ Links.peers GotPeers
                , Effect.call "device" "shareOffers" (E.object []) GotOffers
                ]
            )

        GotProbe _ (Err _) ->
            ( model, Effect.none )

        GotShare (Ok value) ->
            case D.decodeValue (D.nullable D.value) value of
                Ok Nothing ->
                    ( setOverrideStatus model "Share request cancelled in host"
                    , Effect.call "device" "shareOffers" (E.object []) GotOffers
                    )

                _ ->
                    let
                        classId =
                            stringField "classId" value

                        displayLabel =
                            stringField "displayLabel" value

                        targetKind =
                            stringField "targetKind" value
                    in
                    if targetKind /= "peer" then
                        ( setOverrideStatus model ("Host allowed " ++ classId ++ " to " ++ displayLabel ++ "; group calls are not started by this sample")
                        , Effect.call "device" "shareOffers" (E.object []) GotOffers
                        )

                    else
                        let
                            request =
                                E.object
                                    [ ( "class", E.string classId )
                                    , ( "tier", E.string (stringField "tierId" value) )
                                    , ( "purpose", E.string "Line Check call" )
                                    , ( "rateHz"
                                      , E.int
                                            (if classId == "microphone" then
                                                10

                                             else
                                                5
                                            )
                                      )
                                    , ( "options"
                                      , if classId == "microphone" then
                                            E.object [ ( "voiceDuplex", E.bool True ) ]

                                        else
                                            E.object []
                                      )
                                    ]
                        in
                        ( model, Device.open request (GotOpen classId displayLabel) )

        GotShare (Err err) ->
            ( setOverrideStatus model ("Host allowed , but media did not start: " ++ err.message)
            , Effect.call "device" "shareOffers" (E.object []) GotOffers
            )

        GotOpen classId displayLabel (Ok session) ->
            let
                targetId =
                    D.decodeValue (D.field "targetId" D.string) session |> Result.withDefault ""

                encoding =
                    D.decodeValue (D.field "maxRung" D.string) session |> Result.withDefault ""
            in
            ( model
            , Effect.call "device"
                "stream"
                (E.object
                    [ ( "handle", session )
                    , ( "peer", E.string targetId )
                    , ( "constraints", E.object [ ( "encoding", E.string encoding ) ] )
                    ]
                )
                (GotStream classId displayLabel)
            )

        GotOpen classId displayLabel (Err err) ->
            ( setOverrideStatus model ("Host allowed " ++ classId ++ ", but media did not start: " ++ err.message)
            , Effect.call "device" "shareOffers" (E.object []) GotOffers
            )

        GotStream classId displayLabel (Ok value) ->
            let
                rung =
                    D.decodeValue (D.at [ "admission", "rung" ] D.string) value |> Result.withDefault ""
            in
            ( setOverrideStatus model ("Streaming " ++ classId ++ " to " ++ displayLabel ++ " · " ++ rung)
            , Effect.call "device" "shareOffers" (E.object []) GotOffers
            )

        GotStream classId _ (Err err) ->
            ( setOverrideStatus model ("Host allowed " ++ classId ++ ", but media did not start: " ++ err.message)
            , Effect.call "device" "shareOffers" (E.object []) GotOffers
            )

        GotRevoke (Ok value) ->
            let
                revoked =
                    D.decodeValue (D.field "revoked" D.bool) value
                        |> Result.withDefault (D.decodeValue D.bool value |> Result.withDefault False)
            in
            ( setOverrideStatus model
                (if revoked then
                    "Share revoked"

                 else
                    "Revocation cancelled"
                )
            , Effect.call "device" "shareOffers" (E.object []) GotOffers
            )

        GotRevoke (Err _) ->
            ( setOverrideStatus model "Revocation cancelled"
            , Effect.call "device" "shareOffers" (E.object []) GotOffers
            )


setOverrideStatus : Model -> String -> Model
setOverrideStatus model text =
    { model | peersDone = True, offersDone = True, peersErr = Just ("override:" ++ text) }


setMeasuredStatus : String -> Float -> Float -> Model -> Model
setMeasuredStatus label bps rtt model =
    { model | peersErr = Just ("override:Measured " ++ label ++ ": " ++ String.fromInt (round bps) ++ " bps · " ++ String.fromInt (round rtt) ++ " ms") }


displayStatus : Model -> String
displayStatus model =
    case model.peersErr of
        Just err ->
            if String.startsWith "override:" err then
                String.dropLeft 9 err

            else
                statusOf model

        Nothing ->
            statusOf model


view : Model -> W.Widget Msg
view model =
    let
        remotePeer =
            model.roster
                |> List.head
                |> Maybe.andThen (\peer -> D.decodeValue (D.field "id" D.string) peer.peer |> Result.toMaybe)
                |> Maybe.withDefault "none"

        peerNodes =
            if List.isEmpty model.roster then
                [ W.text "peers-empty" [] "No app-scoped peers are currently reachable." ]

            else
                List.indexedMap peerRow model.roster

        offerNodes =
            if List.isEmpty model.offers then
                [ W.text "offers-empty" [] "No standing camera or microphone offers." ]

            else
                List.indexedMap offerRow model.offers
    in
    W.scroll "root"
        [ S.padding 16, S.gap 12 ]
        ([ W.text "title" [ S.fontSize 24, S.bold ] "Line check"
         , W.text "subtitle" [] "Who can I call, and what am I sharing?"
         , W.button "refresh" [] { label = "Refresh", onPress = Refresh, event = "lc.refresh" }
         , W.text "matrix-title" [ S.fontSize 16, S.bold ] "Reachability matrix"
         ]
            ++ peerNodes
            ++ [ W.divider "sharing-divider"
               , W.text "sharing-title" [ S.fontSize 16, S.bold ] "What I am sharing"
               , W.button "request-share" [] { label = "Choose a peer and media in host", onPress = Share, event = "lc.share" }
               ]
            ++ offerNodes
            ++ [ W.divider "call-divider"
               , W.text "call-title" [ S.fontSize 16, S.bold ] "Call surface"
               , W.remoteVideo "remote" [] [ ( "peer", E.string remotePeer ), ( "session", E.string "pending" ) ]
               , W.text "call-note"
                    [ S.fontSize 12 ]
                    "Backgrounding ends the session. Store-and-forward peers cannot connect while asleep."
               , W.text "status" [ S.fontSize 12 ] (displayStatus model)
               ]
        )
