module TwistedPear.Effect exposing (Effect, batch, call, foldCalls, map, none)

{-| Cmd-shaped host effects. Elm 0.19 cannot define an effect manager here, so
SDK wrappers return this type instead of `Task`. `Program.app` turns it into
the two ports. -}

import Json.Encode as E
import TwistedPear.Sdk.Error exposing (Error)


type Effect msg
    = None
    | Batch (List (Effect msg))
    | Call String String E.Value (Result Error E.Value -> msg)


none : Effect msg
none =
    None


batch : List (Effect msg) -> Effect msg
batch =
    Batch


call : String -> String -> E.Value -> (Result Error E.Value -> msg) -> Effect msg
call =
    Call


map : (a -> b) -> Effect a -> Effect b
map tagger effect =
    case effect of
        None ->
            None

        Batch list ->
            Batch (List.map (map tagger) list)

        Call namespace method payload toMsg ->
            Call namespace method payload (toMsg >> tagger)


foldCalls :
    (String -> String -> E.Value -> (Result Error E.Value -> msg) -> acc -> acc)
    -> acc
    -> Effect msg
    -> acc
foldCalls fn acc effect =
    case effect of
        None ->
            acc

        Batch list ->
            List.foldl (foldOne fn) acc list

        Call namespace method payload toMsg ->
            fn namespace method payload toMsg acc


foldOne :
    (String -> String -> E.Value -> (Result Error E.Value -> msg) -> acc -> acc)
    -> Effect msg
    -> acc
    -> acc
foldOne fn item next =
    foldCalls fn next item
