port module TwistedPear.Program exposing (app)

{-| `Platform.worker` over `tpOut` / `tpIn`. View is rendered after every update. -}

import Dict exposing (Dict)
import Json.Decode as D
import Json.Encode as E
import Platform
import TwistedPear.Effect as Effect exposing (Effect)
import TwistedPear.Sdk.Error as Error exposing (Error)
import TwistedPear.Widget as Widget exposing (Widget)


port tpOut : E.Value -> Cmd msg


port tpIn : (E.Value -> msg) -> Sub msg


type alias Config model msg =
    { init : ( model, Effect msg )
    , update : msg -> model -> ( model, Effect msg )
    , view : model -> Widget msg
    , subscriptions : model -> Sub msg
    }


type alias Wrapper model msg =
    { model : model
    , nextId : Int
    , pending : Dict String (Result Error D.Value -> msg)
    , handlers : Dict String (D.Decoder msg)
    , initEffect : Maybe (Effect msg)
    }


type WrapperMsg msg
    = AppMsg msg
    | Incoming E.Value


app : Config model msg -> Platform.Program () (Wrapper model msg) (WrapperMsg msg)
app config =
    Platform.worker
        { init = \_ -> initApp config
        , update = updateApp config
        , subscriptions = subscriptionsApp config
        }


initApp : Config model msg -> ( Wrapper model msg, Cmd (WrapperMsg msg) )
initApp config =
    let
        ( model, effect ) =
            config.init
    in
    ( { model = model
      , nextId = 0
      , pending = Dict.empty
      , handlers = Dict.empty
      , initEffect = Just effect
      }
    , Cmd.none
    )


updateApp : Config model msg -> WrapperMsg msg -> Wrapper model msg -> ( Wrapper model msg, Cmd (WrapperMsg msg) )
updateApp config wrapped wrapper =
    case wrapped of
        AppMsg msg ->
            let
                ( model, effect ) =
                    config.update msg wrapper.model
            in
            finish config { wrapper | model = model } effect

        Incoming value ->
            handleIncoming config wrapper value


subscriptionsApp : Config model msg -> Wrapper model msg -> Sub (WrapperMsg msg)
subscriptionsApp config wrapper =
    Sub.batch
        [ tpIn Incoming
        , Sub.map AppMsg (config.subscriptions wrapper.model)
        ]


finish : Config model msg -> Wrapper model msg -> Effect msg -> ( Wrapper model msg, Cmd (WrapperMsg msg) )
finish config wrapper effect =
    let
        ( withCalls, callCmd ) =
            runEffect wrapper effect

        widget =
            config.view withCalls.model

        rendered =
            { withCalls | handlers = Widget.events widget }
    in
    ( rendered
    , Cmd.batch
        [ callCmd
        , tpOut
            (E.object
                [ ( "type", E.string "render" )
                , ( "tree", Widget.encodeRoot widget )
                ]
            )
        ]
    )


runEffect : Wrapper model msg -> Effect msg -> ( Wrapper model msg, Cmd (WrapperMsg msg) )
runEffect wrapper effect =
    Effect.foldCalls stepCall ( wrapper, [] ) effect
        |> Tuple.mapSecond (List.reverse >> Cmd.batch)


stepCall :
    String
    -> String
    -> E.Value
    -> (Result Error D.Value -> msg)
    -> ( Wrapper model msg, List (Cmd (WrapperMsg msg)) )
    -> ( Wrapper model msg, List (Cmd (WrapperMsg msg)) )
stepCall namespace method payload toMsg ( wrapper, cmds ) =
    let
        id =
            "g-" ++ String.fromInt wrapper.nextId
    in
    ( { wrapper
        | nextId = wrapper.nextId + 1
        , pending = Dict.insert id toMsg wrapper.pending
      }
    , tpOut
        (E.object
            [ ( "type", E.string "call" )
            , ( "id", E.string id )
            , ( "namespace", E.string namespace )
            , ( "method", E.string method )
            , ( "payload", payload )
            ]
        )
        :: cmds
    )


handleIncoming : Config model msg -> Wrapper model msg -> E.Value -> ( Wrapper model msg, Cmd (WrapperMsg msg) )
handleIncoming config wrapper value =
    case D.decodeValue incomingDecoder value of
        Err _ ->
            ( wrapper, Cmd.none )

        Ok GotBoot ->
            finish config
                { wrapper | initEffect = Nothing }
                (Maybe.withDefault Effect.none wrapper.initEffect)

        Ok (GotEvent event payload) ->
            case Dict.get event wrapper.handlers of
                Nothing ->
                    ( wrapper, Cmd.none )

                Just decoder ->
                    case D.decodeValue decoder payload of
                        Err _ ->
                            ( wrapper, Cmd.none )

                        Ok msg ->
                            let
                                ( model, effect ) =
                                    config.update msg wrapper.model
                            in
                            finish config { wrapper | model = model } effect

        Ok (GotReply id ok result error) ->
            case Dict.get id wrapper.pending of
                Nothing ->
                    ( wrapper, Cmd.none )

                Just toMsg ->
                    let
                        outcome =
                            if ok then
                                Ok result

                            else
                                Err (Maybe.withDefault (Error.fromCode "BROKER_ERROR" "Host request failed") error)

                        ( model, effect ) =
                            config.update (toMsg outcome) wrapper.model
                    in
                    finish config
                        { wrapper | model = model, pending = Dict.remove id wrapper.pending }
                        effect


type Incoming
    = GotBoot
    | GotEvent String D.Value
    | GotReply String Bool D.Value (Maybe Error)


incomingDecoder : D.Decoder Incoming
incomingDecoder =
    D.field "type" D.string
        |> D.andThen decodeIncomingKind


decodeIncomingKind : String -> D.Decoder Incoming
decodeIncomingKind kind =
    case kind of
        "boot" ->
            D.succeed GotBoot

        "event" ->
            D.map2 GotEvent
                (D.oneOf [ D.field "event" D.string, D.field "nodeId" D.string ])
                (D.oneOf [ D.field "value" D.value, D.succeed E.null ])

        "reply" ->
            D.map4 GotReply
                (D.field "id" D.string)
                (D.field "ok" D.bool)
                (D.oneOf [ D.field "result" D.value, D.succeed E.null ])
                (D.maybe (D.field "error" Error.decoder))

        _ ->
            D.fail ("unknown incoming type: " ++ kind)
