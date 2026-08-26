{-
   Generated from specs/spec-widget/schema/widget.schema.json
   by scripts/generate-guida-widget.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-widget
-}

module TwistedPear.Widget exposing
    ( Widget, encodeRoot, events, map, audioMeter, button, cameraPreview, codeEditor, date, divider, image, list, mapPreview, progress, qrCode, remoteVideo, scroll, select, slider, spacer, switch, text, textInput, view, waveform )

{-| SPEC-WIDGET node builders. Node ids are the first argument; event names are independent. -}

import Dict exposing (Dict)
import Json.Decode as D
import Json.Encode as E
import TwistedPear.Style as S


type Widget msg
    = Widget
        { node : E.Value
        , events : Dict String (D.Decoder msg)
        }


encodeRoot : Widget msg -> E.Value
encodeRoot (Widget { node }) =
    E.object [ ( "root", node ) ]


events : Widget msg -> Dict String (D.Decoder msg)
events (Widget record) =
    record.events


map : (a -> b) -> Widget a -> Widget b
map tagger (Widget record) =
    Widget
        { node = record.node
        , events = Dict.map (\_ decoder -> D.map tagger decoder) record.events
        }


leaf : String -> String -> List S.Style -> Maybe E.Value -> Dict String (D.Decoder msg) -> Widget msg
leaf type_ id styles props eventMap =
    Widget
        { node = encodeNode id type_ props styles Nothing
        , events = eventMap
        }


parent : String -> String -> List S.Style -> Maybe E.Value -> List (Widget msg) -> Dict String (D.Decoder msg) -> Widget msg
parent type_ id styles props children extraEvents =
    let
        childEvents =
            List.foldl
                (\(Widget child) acc -> Dict.union child.events acc)
                extraEvents
                children
        childNodes =
            List.map (\(Widget child) -> child.node) children
    in
    Widget
        { node = encodeNode id type_ props styles (Just childNodes)
        , events = childEvents
        }


encodeNode : String -> String -> Maybe E.Value -> List S.Style -> Maybe (List E.Value) -> E.Value
encodeNode id type_ props styles children =
    E.object
        (List.filterMap identity
            [ Just ( "id", E.string id )
            , Just ( "type", E.string type_ )
            , Maybe.map (\value -> ( "props", value )) props
            , Maybe.map (\value -> ( "style", value )) (S.encode styles)
            , Maybe.map (\nodes -> ( "children", E.list identity nodes )) children
            ]
        )


audioMeter : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
audioMeter id styles props =
    leaf "audio-meter"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty


button : String -> List S.Style -> { label : String, onPress : msg, event : String } -> Widget msg
button id styles config =
    leaf "button"
        id
        styles
        (Just (E.object [ ( "label", E.string config.label ), ( "event", E.string config.event ) ]))
        (Dict.singleton config.event (D.succeed config.onPress))


cameraPreview : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
cameraPreview id styles props =
    leaf "camera-preview"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty


codeEditor : String -> List S.Style -> { documentId : String, language : String, readOnly : Bool, event : String, onEvent : String -> msg } -> Widget msg
codeEditor id styles config =
    leaf "code-editor"
        id
        styles
        (Just
            (E.object
                [ ( "documentId", E.string config.documentId )
                , ( "language", E.string config.language )
                , ( "readOnly", E.bool config.readOnly )
                , ( "event", E.string config.event )
                ]
            )
        )
        (Dict.singleton config.event (D.map config.onEvent D.string))


date : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
date id styles props =
    leaf "date"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty


divider : String -> Widget msg
divider id =
    leaf "divider" id [] Nothing Dict.empty


image : String -> List S.Style -> { asset : String, alt : String } -> Widget msg
image id styles config =
    leaf "image"
        id
        styles
        (Just (E.object [ ( "asset", E.string config.asset ), ( "alt", E.string config.alt ) ]))
        Dict.empty


list : String -> List S.Style -> List (Widget msg) -> Widget msg
list id styles children =
    parent "list" id styles Nothing children Dict.empty


mapPreview : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
mapPreview id styles props =
    leaf "map-preview"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty


progress : String -> List S.Style -> { value : Float } -> Widget msg
progress id styles config =
    leaf "progress"
        id
        styles
        (Just (E.object [ ( "value", E.float config.value ) ]))
        Dict.empty


qrCode : String -> List S.Style -> { value : String, size : Maybe Float, caption : Maybe String } -> Widget msg
qrCode id styles config =
    leaf "qr-code"
        id
        styles
        (Just
            (E.object
                (List.filterMap identity
                    [ Just ( "value", E.string config.value )
                    , Maybe.map (\n -> ( "size", E.float n )) config.size
                    , Maybe.map (\c -> ( "caption", E.string c )) config.caption
                    ]
                )
            )
        )
        Dict.empty


remoteVideo : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
remoteVideo id styles props =
    leaf "remote-video"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty


scroll : String -> List S.Style -> List (Widget msg) -> Widget msg
scroll id styles children =
    parent "scroll" id styles Nothing children Dict.empty


select : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
select id styles props =
    leaf "select"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty


slider : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
slider id styles props =
    leaf "slider"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty


spacer : String -> Float -> Widget msg
spacer id size =
    leaf "spacer" id [] (Just (E.object [ ( "size", E.float size ) ])) Dict.empty


switch : String -> List S.Style -> { value : Bool, onChange : Bool -> msg, event : String, accessibilityLabel : Maybe String, accessibilityHint : Maybe String } -> Widget msg
switch id styles config =
    leaf "switch"
        id
        styles
        (Just
            (E.object
                (List.filterMap identity
                    [ Just ( "value", E.bool config.value )
                    , Just ( "event", E.string config.event )
                    , Maybe.map (\label -> ( "accessibilityLabel", E.string label )) config.accessibilityLabel
                    , Maybe.map (\hint -> ( "accessibilityHint", E.string hint )) config.accessibilityHint
                    ]
                )
            )
        )
        (Dict.singleton config.event (D.map config.onChange D.bool))


text : String -> List S.Style -> String -> Widget msg
text id styles value =
    leaf "text" id styles (Just (E.object [ ( "value", E.string value ) ])) Dict.empty


textInput : String -> List S.Style -> { value : String, placeholder : String, onInput : String -> msg, event : String } -> Widget msg
textInput id styles config =
    leaf "text-input"
        id
        styles
        (Just
            (E.object
                [ ( "value", E.string config.value )
                , ( "placeholder", E.string config.placeholder )
                , ( "event", E.string config.event )
                ]
            )
        )
        (Dict.singleton config.event (D.map config.onInput D.string))


view : String -> List S.Style -> List (Widget msg) -> Widget msg
view id styles children =
    parent "view" id styles Nothing children Dict.empty


waveform : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
waveform id styles props =
    leaf "waveform"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty

