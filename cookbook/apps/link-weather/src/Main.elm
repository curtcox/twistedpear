module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Host as Host
import TwistedPear.Sdk.Peers as Peers
import TwistedPear.Sdk.Presence as Presence
import TwistedPear.Style as S
import TwistedPear.Widget as W


mechanisms : List ( String, String )
mechanisms =
    [ ( "reticulum", "Reticulum" )
    , ( "qr", "QR / camera" )
    , ( "manual", "Manual code" )
    , ( "audio", "Audio" )
    , ( "bluetooth", "Bluetooth" )
    , ( "ntfy", "ntfy" )
    , ( "local-peer-to-peer", "Local peer-to-peer" )
    ]


type alias Availability =
    { state : String
    , reason : Maybe String
    }


type alias Connection =
    { handle : D.Value
    , displayLabel : String
    , state : String
    , rendezvous : String
    , dataPlane : String
    , fingerprint : String
    }


type alias Model =
    { snapshot : Maybe D.Value
    , info : Maybe D.Value
    , diagnostics : List { kind : String, availability : Availability }
    , connections : List Connection
    , snapshotDone : Bool
    , infoDone : Bool
    , diagDone : Bool
    , snapshotErr : Maybe String
    , infoErr : Maybe String
    , diagErr : Maybe String
    , busy : Bool
    , status : String
    }


type Msg
    = Refresh
    | Invite String
    | Join String
    | Disconnect Int
    | GotSnapshot (Result Error D.Value)
    | GotInfo (Result Error D.Value)
    | GotDiag (Result Error D.Value)
    | GotHandle Bool String (Result Error D.Value)
    | GotPeerInfo D.Value (Result Error D.Value)
    | GotClose Int String String (Result Error ())


main =
    Program.app
        { init =
            ( emptyModel, load )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


emptyModel : Model
emptyModel =
    { snapshot = Nothing
    , info = Nothing
    , diagnostics = []
    , connections = []
    , snapshotDone = False
    , infoDone = False
    , diagDone = False
    , snapshotErr = Nothing
    , infoErr = Nothing
    , diagErr = Nothing
    , busy = False
    , status = ""
    }


load : Effect.Effect Msg
load =
    Effect.batch
        [ Presence.snapshot GotSnapshot
        , Host.info GotInfo
        , Peers.diagnostics GotDiag
        ]


errorMessage : Error -> String
errorMessage err =
    if err.code == "" then
        err.message

    else
        err.code ++ ": " ++ err.message


availabilityDecoder : D.Decoder Availability
availabilityDecoder =
    D.map2 Availability
        (D.field "state" D.string)
        (D.maybe (D.field "reason" D.string))


diagnosticDecoder : D.Decoder { kind : String, availability : Availability }
diagnosticDecoder =
    D.map2 (\kind availability -> { kind = kind, availability = availability })
        (D.field "kind" D.string)
        (D.field "availability" availabilityDecoder)


diagnostic : String -> Model -> Availability
diagnostic kind model =
    model.diagnostics
        |> List.filter (\entry -> entry.kind == kind)
        |> List.head
        |> Maybe.map .availability
        |> Maybe.withDefault { state = "unsupported", reason = Just "This host did not register the mechanism" }


selectable : Availability -> Bool
selectable availability =
    availability.state == "available" || availability.state == "permission-required"


stringAt : List String -> D.Value -> String
stringAt path value =
    D.decodeValue (D.at path D.string) value |> Result.withDefault "unknown"


stringListAt : List String -> D.Value -> List String
stringListAt path value =
    D.decodeValue (D.at path (D.list D.string)) value |> Result.withDefault []


rolesOf : D.Value -> String
rolesOf info =
    case D.decodeValue (D.field "roles" (D.keyValuePairs D.bool)) info of
        Ok pairs ->
            let
                enabled =
                    pairs
                        |> List.filter Tuple.second
                        |> List.map Tuple.first
            in
            if List.isEmpty enabled then
                "none"

            else
                String.join ", " enabled

        Err _ ->
            "none"


kvQuota : Maybe D.Value -> String
kvQuota info =
    case info of
        Nothing ->
            "host default"

        Just value ->
            D.decodeValue (D.at [ "quotas", "kvQuotaBytes" ] D.int) value
                |> Result.map String.fromInt
                |> Result.withDefault "host default"


peerCount : Maybe D.Value -> String
peerCount snapshot =
    snapshot
        |> Maybe.andThen (\value -> D.decodeValue (D.field "peers" D.int) value |> Result.toMaybe)
        |> Maybe.withDefault 0
        |> String.fromInt


granted : Maybe D.Value -> String
granted info =
    case info of
        Nothing ->
            "none"

        Just value ->
            let
                caps =
                    stringListAt [ "grantedCapabilities" ] value
            in
            if List.isEmpty caps then
                "none"

            else
                String.join ", " caps


interfaces : Maybe D.Value -> List String
interfaces info =
    info
        |> Maybe.map (\value -> stringListAt [ "interfaceTypes" ] value)
        |> Maybe.withDefault []


row : String -> String -> String -> W.Widget msg
row id label value =
    W.view id
        [ S.flexDirection "row", S.gap 8 ]
        [ W.text (id ++ "-l") [ S.bold ] label
        , W.text (id ++ "-v") [] value
        ]


mechanismRow : Model -> ( String, String ) -> W.Widget Msg
mechanismRow model ( kind, label ) =
    let
        availability =
            diagnostic kind model

        detail =
            case availability.reason of
                Nothing ->
                    availability.state

                Just reason ->
                    availability.state ++ " — " ++ reason

        actions =
            if selectable availability && not model.busy then
                [ W.view ("actions-" ++ kind)
                    [ S.flexDirection "row", S.gap 8 ]
                    [ W.button ("invite-" ++ kind) [] { label = "Invite", onPress = Invite kind, event = "lw.invite." ++ kind }
                    , W.button ("join-" ++ kind) [] { label = "Join", onPress = Join kind, event = "lw.join." ++ kind }
                    ]
                ]

            else
                []
    in
    W.view ("mechanism-" ++ kind)
        [ S.gap 4 ]
        (row ("availability-" ++ kind) label detail :: actions)


connectionRow : Bool -> Int -> Connection -> W.Widget Msg
connectionRow busy index connection =
    let
        disconnect =
            if busy then
                []

            else
                [ W.button ("disconnect-" ++ String.fromInt index)
                    []
                    { label = "Disconnect"
                    , onPress = Disconnect index
                    , event = "lw.disconnect." ++ String.fromInt index
                    }
                ]
    in
    W.view ("connection-" ++ String.fromInt index)
        [ S.gap 4 ]
        ([ W.text ("connection-label-" ++ String.fromInt index)
            [ S.bold ]
            (connection.displayLabel ++ " · " ++ connection.state)
         , W.text ("connection-detail-" ++ String.fromInt index)
            [ S.fontSize 12 ]
            (connection.rendezvous ++ " → " ++ connection.dataPlane ++ " · " ++ connection.fingerprint)
         ]
            ++ disconnect
        )


loadedStatus : Model -> String
loadedStatus model =
    if not (model.snapshotDone && model.infoDone && model.diagDone) then
        model.status

    else
        let
            failures =
                List.filterMap identity
                    [ Maybe.map (\m -> "presence (" ++ m ++ ")") model.snapshotErr
                    , Maybe.map (\m -> "host info (" ++ m ++ ")") model.infoErr
                    , Maybe.map (\m -> "peer discovery (" ++ m ++ ")") model.diagErr
                    ]
        in
        if List.isEmpty failures then
            if model.status == "" then
                "Read at "

            else
                model.status

        else
            "Partial read — unavailable: " ++ String.join "; " failures


connectOptions : String -> E.Value
connectOptions mechanism =
    E.object
        [ ( "purpose", E.string "Inspect and establish a Link Weather peer connection" )
        , ( "mechanisms"
          , if mechanism == "any" then
                E.string "any"

            else
                E.list E.string [ mechanism ]
          )
        ]


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Refresh ->
            ( { model
                | snapshotDone = False
                , infoDone = False
                , diagDone = False
                , snapshotErr = Nothing
                , infoErr = Nothing
                , diagErr = Nothing
                , status = ""
              }
            , load
            )

        Invite mechanism ->
            if model.busy then
                ( model, Effect.none )

            else
                ( { model
                    | busy = True
                    , status =
                        "Inviting via "
                            ++ (if mechanism == "any" then
                                    "host-selected mechanism"

                                else
                                    mechanism
                               )
                            ++ "…"
                  }
                , Peers.request (connectOptions mechanism) (GotHandle True mechanism)
                )

        Join mechanism ->
            if model.busy then
                ( model, Effect.none )

            else
                ( { model
                    | busy = True
                    , status =
                        "Joining via "
                            ++ (if mechanism == "any" then
                                    "host-selected mechanism"

                                else
                                    mechanism
                               )
                            ++ "…"
                  }
                , Peers.listen (connectOptions mechanism) (GotHandle False mechanism)
                )

        Disconnect index ->
            case model.connections |> List.drop index |> List.head of
                Nothing ->
                    ( model, Effect.none )

                Just connection ->
                    if model.busy then
                        ( model, Effect.none )

                    else
                        ( { model | busy = True, status = "Disconnecting " ++ connection.displayLabel ++ "…" }
                        , Peers.close connection.handle (GotClose index connection.displayLabel connection.rendezvous)
                        )

        GotSnapshot (Ok value) ->
            ( { model | snapshot = Just value, snapshotDone = True, snapshotErr = Nothing }, Effect.none )

        GotSnapshot (Err err) ->
            ( { model | snapshot = Nothing, snapshotDone = True, snapshotErr = Just (errorMessage err) }, Effect.none )

        GotInfo (Ok value) ->
            ( { model | info = Just value, infoDone = True, infoErr = Nothing }, Effect.none )

        GotInfo (Err err) ->
            ( { model | info = Nothing, infoDone = True, infoErr = Just (errorMessage err) }, Effect.none )

        GotDiag (Ok value) ->
            ( { model
                | diagnostics = D.decodeValue (D.list diagnosticDecoder) value |> Result.withDefault []
                , diagDone = True
                , diagErr = Nothing
              }
            , Effect.none
            )

        GotDiag (Err err) ->
            ( { model | diagnostics = [], diagDone = True, diagErr = Just (errorMessage err) }, Effect.none )

        GotHandle _ _ (Ok handle) ->
            ( model, Peers.info handle (GotPeerInfo handle) )

        GotHandle _ _ (Err err) ->
            ( { model | busy = False, status = "Connection failed — " ++ errorMessage err }, Effect.none )

        GotPeerInfo handle (Ok summary) ->
            let
                connection =
                    { handle = handle
                    , displayLabel = stringAt [ "displayLabel" ] summary
                    , state = stringAt [ "state" ] summary
                    , rendezvous = stringAt [ "rendezvous" ] summary
                    , dataPlane = stringAt [ "dataPlane" ] summary
                    , fingerprint = stringAt [ "fingerprint" ] summary
                    }
            in
            ( { model
                | busy = False
                , connections = model.connections ++ [ connection ]
                , status = "Connected to " ++ connection.displayLabel ++ " via " ++ connection.rendezvous ++ "; data plane: " ++ connection.dataPlane
              }
            , Effect.none
            )

        GotPeerInfo _ (Err err) ->
            ( { model | busy = False, status = "Connection failed — " ++ errorMessage err }, Effect.none )

        GotClose index label rendezvous (Ok ()) ->
            ( { model
                | busy = False
                , connections = List.indexedMap Tuple.pair model.connections |> List.filter (\( i, _ ) -> i /= index) |> List.map Tuple.second
                , status = "Disconnected " ++ label ++ " (" ++ rendezvous ++ ")"
              }
            , Effect.none
            )

        GotClose _ _ _ (Err err) ->
            ( { model | busy = False, status = "Disconnect failed — " ++ errorMessage err }, Effect.none )


view : Model -> W.Widget Msg
view model =
    let
        ifaces =
            interfaces model.info

        hasSelectable =
            List.any (\( kind, _ ) -> selectable (diagnostic kind model)) mechanisms

        anyActions =
            if hasSelectable && not model.busy then
                [ W.view "any-actions"
                    [ S.flexDirection "row", S.gap 8 ]
                    [ W.button "invite-any" [] { label = "Invite (recommended)", onPress = Invite "any", event = "lw.invite.any" }
                    , W.button "join-any" [] { label = "Join (recommended)", onPress = Join "any", event = "lw.join.any" }
                    ]
                ]

            else
                []

        connectionRows =
            if List.isEmpty model.connections then
                [ W.text "connections-empty" [] "No app-scoped peer connections" ]

            else
                List.indexedMap (connectionRow model.busy) model.connections

        advice =
            if List.member "rnode" ifaces || List.member "ble" ifaces then
                "Slow link present. Budget every byte you send."

            else
                "IP-backed link. Bulk transfer is plausible here and nowhere else."

        platform =
            model.info |> Maybe.map (\v -> stringAt [ "platform" ] v) |> Maybe.withDefault "unknown"

        hostVersion =
            model.info |> Maybe.map (\v -> stringAt [ "hostVersion" ] v) |> Maybe.withDefault "unknown"

        hostApi =
            model.info |> Maybe.map (\v -> stringAt [ "hostApiVersion" ] v) |> Maybe.withDefault "unknown"

        roles =
            model.info |> Maybe.map rolesOf |> Maybe.withDefault "none"
    in
    W.scroll "root"
        [ S.padding 16, S.gap 10 ]
        ([ W.text "title" [ S.fontSize 20, S.bold ] "Link weather"
         , W.button "refresh" [] { label = "Detect again", onPress = Refresh, event = "lw.refresh" }
         , W.divider "divider"
         , row "platform" "Platform" platform
         , row "version" "Host" hostVersion
         , row "api" "Host API" hostApi
         , row "roles" "Roles" roles
         , row "ifaces"
            "Interfaces"
            (if List.isEmpty ifaces then
                "none"

             else
                String.join ", " ifaces
            )
         , row "peers" "Peers seen" (peerCount model.snapshot)
         , row "kv" "KV quota" (kvQuota model.info)
         , row "grants" "Granted" (granted model.info)
         , W.divider "divider2"
         , W.text "mechanisms-title" [ S.fontSize 16, S.bold ] "Peer connection mechanisms"
         ]
            ++ anyActions
            ++ List.map (mechanismRow model) mechanisms
            ++ [ W.divider "divider3"
               , W.text "connections-title" [ S.fontSize 16, S.bold ] ("Connected peers (" ++ String.fromInt (List.length model.connections) ++ ")")
               ]
            ++ connectionRows
            ++ [ W.text "advice" [] advice
               , W.text "status" [ S.fontSize 12 ] (loadedStatus model)
               ]
        )
