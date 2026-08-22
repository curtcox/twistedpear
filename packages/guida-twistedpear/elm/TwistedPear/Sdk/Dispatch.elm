{-
   Generated from specs/spec-sdk/schema/calls.descriptor.json
   by scripts/generate-guida-sdk.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-sdk
-}

module TwistedPear.Sdk.Dispatch exposing (run)

{-| Route a namespace/method/payload triple through the generated typed wrappers. -}

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect exposing (Effect)
import TwistedPear.Sdk.Core as Core
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Identity as Identity
import TwistedPear.Sdk.Lxmf as Lxmf
import TwistedPear.Sdk.Announce as Announce
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Sdk.StorageBee as StorageBee
import TwistedPear.Sdk.Resource as Resource
import TwistedPear.Sdk.Presence as Presence
import TwistedPear.Sdk.Host as Host
import TwistedPear.Sdk.Workspace as Workspace
import TwistedPear.Sdk.Ai as Ai
import TwistedPear.Sdk.Apps as Apps
import TwistedPear.Sdk.AppsChannel as AppsChannel
import TwistedPear.Sdk.Notify as Notify
import TwistedPear.Sdk.ShareCas as ShareCas
import TwistedPear.Sdk.Peers as Peers
import TwistedPear.Sdk.Links as Links
import TwistedPear.Sdk.Relay as Relay
import TwistedPear.Sdk.Freenet as Freenet
import TwistedPear.Sdk.Device as Device
import TwistedPear.Sdk.Crypto as Crypto


run : String -> String -> D.Value -> (Result Error D.Value -> msg) -> Effect msg
run namespace method payload toMsg =
    case ( namespace, method ) of
        ( "identity", "destinationHash" ) ->
            Identity.destinationHash (mapResult E.string toMsg)

        ( "identity", "sign" ) ->
            case D.decodeValue (D.map (\decoded0 -> Identity.sign decoded0 (mapResult Core.encodeBytes toMsg)) (D.field "payload" (D.list D.int))) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "lxmf", "send" ) ->
            case D.decodeValue (D.map (\decoded0 -> Lxmf.send decoded0 (mapResult identity toMsg)) (D.field "request" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "lxmf", "receive" ) ->
            Lxmf.receive (mapResult identity toMsg)

        ( "announce", "publish" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> Announce.publish decoded0 decoded1 (mapResult (\_ -> E.null) toMsg)) (D.field "appData" (D.list D.int)) (D.field "namespace" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "announce", "subscribe" ) ->
            case D.decodeValue (D.map (\decoded0 -> Announce.subscribe decoded0 (mapResult identity toMsg)) (D.field "namespace" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "storage.kv", "get" ) ->
            case D.decodeValue (D.map (\decoded0 -> StorageKv.get decoded0 (mapResult encodeMaybeBytes toMsg)) (D.field "key" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "storage.kv", "set" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> StorageKv.set decoded0 decoded1 (mapResult (\_ -> E.null) toMsg)) (D.field "key" D.string) (D.field "value" (D.list D.int))) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "storage.kv", "delete" ) ->
            case D.decodeValue (D.map (\decoded0 -> StorageKv.delete decoded0 (mapResult (\_ -> E.null) toMsg)) (D.field "key" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "storage.bee", "open" ) ->
            StorageBee.open (mapResult identity toMsg)

        ( "storage.bee", "get" ) ->
            case D.decodeValue (D.map (\decoded0 -> StorageBee.get decoded0 (mapResult encodeMaybeBytes toMsg)) (D.field "key" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "storage.bee", "put" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> StorageBee.put decoded0 decoded1 (mapResult (\_ -> E.null) toMsg)) (D.field "key" D.string) (D.field "value" (D.list D.int))) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "storage.bee", "del" ) ->
            case D.decodeValue (D.map (\decoded0 -> StorageBee.del decoded0 (mapResult (\_ -> E.null) toMsg)) (D.field "key" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "storage.bee", "list" ) ->
            case D.decodeValue (D.map (\decoded0 -> StorageBee.list decoded0 (mapResult identity toMsg)) (D.field "options" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "resource", "fetch" ) ->
            case D.decodeValue (D.map (\decoded0 -> Resource.fetch decoded0 (mapResult Core.encodeBytes toMsg)) (D.field "request" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "presence", "snapshot" ) ->
            Presence.snapshot (mapResult identity toMsg)

        ( "host", "info" ) ->
            Host.info (mapResult identity toMsg)

        ( "host", "requestWake" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> Host.requestWake decoded0 decoded1 (mapResult identity toMsg)) (D.field "intervalMs" D.int) (D.field "budgetMs" D.int)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "workspace", "list" ) ->
            case D.decodeValue (D.map (\decoded0 -> Workspace.list decoded0 (mapResult identity toMsg)) (D.field "prefix" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "workspace", "read" ) ->
            case D.decodeValue (D.map (\decoded0 -> Workspace.read decoded0 (mapResult E.string toMsg)) (D.field "path" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "workspace", "write" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> Workspace.write decoded0 decoded1 (mapResult identity toMsg)) (D.field "path" D.string) (D.field "content" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "workspace", "patch" ) ->
            case D.decodeValue (D.map3 (\decoded0 decoded1 decoded2 -> Workspace.patch decoded0 decoded1 decoded2 (mapResult identity toMsg)) (D.field "path" D.string) (D.field "baseLength" D.int) (D.field "edits" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "workspace", "remove" ) ->
            case D.decodeValue (D.map (\decoded0 -> Workspace.remove decoded0 (mapResult (\_ -> E.null) toMsg)) (D.field "path" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "ai", "chat" ) ->
            case D.decodeValue (D.map (\decoded0 -> Ai.chat decoded0 (mapResult identity toMsg)) (D.field "request" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "ai", "embed" ) ->
            case D.decodeValue (D.map (\decoded0 -> Ai.embed decoded0 (mapResult identity toMsg)) (D.field "request" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "ai", "search" ) ->
            case D.decodeValue (D.map (\decoded0 -> Ai.search decoded0 (mapResult identity toMsg)) (D.field "request" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps", "compile" ) ->
            case D.decodeValue (D.map (\decoded0 -> Apps.compile decoded0 (mapResult identity toMsg)) (D.field "projectPrefix" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps", "format" ) ->
            case D.decodeValue (D.map (\decoded0 -> Apps.format decoded0 (mapResult identity toMsg)) (D.field "content" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps", "diagnostics" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> Apps.diagnostics decoded0 decoded1 (mapResult identity toMsg)) (D.field "projectPrefix" D.string) (D.field "path" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps", "packageProject" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> Apps.packageProject decoded0 decoded1 (mapResult identity toMsg)) (D.field "projectPrefix" D.string) (D.field "manifest" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps", "publish" ) ->
            case D.decodeValue (D.map (\decoded0 -> Apps.publish decoded0 (mapResult identity toMsg)) (D.field "t256" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps", "install" ) ->
            case D.decodeValue (D.map (\decoded0 -> Apps.install decoded0 (mapResult identity toMsg)) (D.field "t256" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps", "preview" ) ->
            case D.decodeValue (D.map3 (\decoded0 decoded1 decoded2 -> Apps.preview decoded0 decoded1 decoded2 (mapResult identity toMsg)) (D.field "projectPrefix" D.string) (D.field "manifest" D.value) (D.field "grants" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps", "stopPreview" ) ->
            Apps.stopPreview (mapResult (\_ -> E.null) toMsg)

        ( "apps.channel", "open" ) ->
            case D.decodeValue (D.map (\decoded0 -> AppsChannel.open decoded0 (mapResult identity toMsg)) (D.field "destination" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps.channel", "send" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> AppsChannel.send decoded0 decoded1 (mapResult identity toMsg)) (D.field "destination" D.value) (D.field "payload" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps.channel", "receive" ) ->
            AppsChannel.receive (mapResult identity toMsg)

        ( "apps.channel", "close" ) ->
            case D.decodeValue (D.map (\decoded0 -> AppsChannel.close decoded0 (mapResult identity toMsg)) (D.field "destination" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "apps.channel", "peers" ) ->
            AppsChannel.peers (mapResult identity toMsg)

        ( "notify", "post" ) ->
            case D.decodeValue (D.map (\decoded0 -> Notify.post decoded0 (mapResult identity toMsg)) (D.field "request" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "share.cas", "put" ) ->
            case D.decodeValue (D.map (\decoded0 -> ShareCas.put decoded0 (mapResult identity toMsg)) (D.field "content" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "share.cas", "get" ) ->
            case D.decodeValue (D.map (\decoded0 -> ShareCas.get decoded0 (mapResult identity toMsg)) (D.field "t256" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "peers", "request" ) ->
            case D.decodeValue (D.map (\decoded0 -> Peers.request decoded0 (mapResult identity toMsg)) (D.field "options" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "peers", "listen" ) ->
            case D.decodeValue (D.map (\decoded0 -> Peers.listen decoded0 (mapResult identity toMsg)) (D.field "options" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "peers", "diagnostics" ) ->
            Peers.diagnostics (mapResult identity toMsg)

        ( "peers", "info" ) ->
            case D.decodeValue (D.map (\decoded0 -> Peers.info decoded0 (mapResult identity toMsg)) (D.field "handle" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "peers", "close" ) ->
            case D.decodeValue (D.map (\decoded0 -> Peers.close decoded0 (mapResult (\_ -> E.null) toMsg)) (D.field "handle" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "links", "peers" ) ->
            Links.peers (mapResult identity toMsg)

        ( "links", "probe" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> Links.probe decoded0 decoded1 (mapResult identity toMsg)) (D.field "peer" D.value) (D.field "options" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "relay", "setMode" ) ->
            case D.decodeValue (D.map (\decoded0 -> Relay.setMode decoded0 (mapResult (\_ -> E.null) toMsg)) (D.field "mode" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "relay", "list" ) ->
            Relay.list (mapResult identity toMsg)

        ( "relay", "status" ) ->
            Relay.status (mapResult identity toMsg)

        ( "relay", "diagnostics" ) ->
            Relay.diagnostics (mapResult identity toMsg)

        ( "freenet", "get" ) ->
            case D.decodeValue (D.map (\decoded0 -> Freenet.get decoded0 (mapResult identity toMsg)) (D.field "keyHex" D.string)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "freenet", "put" ) ->
            case D.decodeValue (D.map (\decoded0 -> Freenet.put decoded0 (mapResult identity toMsg)) (D.field "options" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "freenet", "update" ) ->
            case D.decodeValue (D.map (\decoded0 -> Freenet.update decoded0 (mapResult (\_ -> E.null) toMsg)) (D.field "options" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "device", "inventory" ) ->
            Device.inventory (mapResult identity toMsg)

        ( "device", "diagnostics" ) ->
            Device.diagnostics (mapResult identity toMsg)

        ( "device", "open" ) ->
            case D.decodeValue (D.map (\decoded0 -> Device.open decoded0 (mapResult identity toMsg)) (D.field "request" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "device", "close" ) ->
            case D.decodeValue (D.map (\decoded0 -> Device.close decoded0 (mapResult (\_ -> E.null) toMsg)) (D.field "session" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "device", "read" ) ->
            case D.decodeValue (D.map (\decoded0 -> Device.read decoded0 (mapResult identity toMsg)) (D.field "session" D.value)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "crypto", "randomBytes" ) ->
            case D.decodeValue (D.map (\decoded0 -> Crypto.randomBytes decoded0 (mapResult Core.encodeBytes toMsg)) (D.field "n" D.int)) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "crypto", "hash" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> Crypto.hash decoded0 decoded1 (mapResult Core.encodeBytes toMsg)) (D.field "alg" D.string) (D.field "bytes" (D.list D.int))) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "crypto", "hmac" ) ->
            case D.decodeValue (D.map3 (\decoded0 decoded1 decoded2 -> Crypto.hmac decoded0 decoded1 decoded2 (mapResult Core.encodeBytes toMsg)) (D.field "alg" D.string) (D.field "key" (D.list D.int)) (D.field "bytes" (D.list D.int))) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        ( "crypto", "timingSafeEqual" ) ->
            case D.decodeValue (D.map2 (\decoded0 decoded1 -> Crypto.timingSafeEqual decoded0 decoded1 (mapResult identity toMsg)) (D.field "a" (D.list D.int)) (D.field "b" (D.list D.int))) payload of
                Ok effect ->
                    effect

                Err _ ->
                    Effect.call namespace method payload toMsg

        _ ->
            Effect.call namespace method payload toMsg


mapResult : (a -> E.Value) -> (Result Error E.Value -> msg) -> Result Error a -> msg
mapResult encode toMsg result =
    toMsg (Result.map encode result)


encodeMaybeBytes : Maybe (List Int) -> E.Value
encodeMaybeBytes value =
    case value of
        Nothing ->
            E.null

        Just bytes ->
            Core.encodeBytes bytes
