module Main exposing (main)

import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.StorageKv as StorageKv
import TwistedPear.Style as S
import TwistedPear.Widget as W


key : String
key =
    "note"


type alias Model =
    { text : String
    , status : String
    }


type Msg
    = Changed String
    | Save
    | Clear
    | GotLoad (Result Error (Maybe (List Int)))
    | GotSave Int (Result Error ())


main =
    Program.app
        { init = ( { text = "", status = "" }, StorageKv.get key GotLoad )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


utf8Encode : String -> List Int
utf8Encode string =
    string |> String.toList |> List.concatMap encodeChar


encodeChar : Char -> List Int
encodeChar char =
    let
        code =
            Char.toCode char
    in
    if code < 128 then
        [ code ]

    else if code < 2048 then
        [ 192 + code // 64, 128 + remainderBy 64 code ]

    else if code < 65536 then
        [ 224 + code // 4096, 128 + remainderBy 64 (code // 64), 128 + remainderBy 64 code ]

    else
        [ 240 + code // 262144
        , 128 + remainderBy 64 (code // 4096)
        , 128 + remainderBy 64 (code // 64)
        , 128 + remainderBy 64 code
        ]


utf8Decode : List Int -> String
utf8Decode bytes =
    decodeBytes bytes [] |> List.reverse |> String.fromList


decodeBytes : List Int -> List Char -> List Char
decodeBytes bytes acc =
    case bytes of
        [] ->
            acc

        b :: rest ->
            if b < 128 then
                decodeBytes rest (Char.fromCode b :: acc)

            else if b < 224 then
                case rest of
                    c :: more ->
                        decodeBytes more (Char.fromCode ((b - 192) * 64 + (c - 128)) :: acc)

                    _ ->
                        acc

            else if b < 240 then
                case rest of
                    c :: d :: more ->
                        decodeBytes more (Char.fromCode ((b - 224) * 4096 + (c - 128) * 64 + (d - 128)) :: acc)

                    _ ->
                        acc

            else
                case rest of
                    c :: d :: e :: more ->
                        decodeBytes more (Char.fromCode ((b - 240) * 262144 + (c - 128) * 4096 + (d - 128) * 64 + (e - 128)) :: acc)

                    _ ->
                        acc


save : String -> Effect.Effect Msg
save text =
    StorageKv.set key (utf8Encode text) (GotSave (String.length text))


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Changed text ->
            ( { model | text = text, status = "Unsaved changes" }, Effect.none )

        Save ->
            ( model, save model.text )

        Clear ->
            ( { model | text = "" }, save "" )

        GotLoad (Ok Nothing) ->
            ( { model | text = "", status = "New note" }, Effect.none )

        GotLoad (Ok (Just stored)) ->
            ( { model
                | text = utf8Decode stored
                , status = "Loaded " ++ String.fromInt (List.length stored) ++ " bytes"
              }
            , Effect.none
            )

        GotLoad (Err _) ->
            ( { model | status = "Storage unavailable — this note will not be saved" }, Effect.none )

        GotSave n (Ok ()) ->
            ( { model | status = "Saved " ++ String.fromInt n ++ " characters" }, Effect.none )

        GotSave _ (Err _) ->
            ( { model | status = "Save failed — storage unavailable" }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Pocket notes"
        , W.textInput "editor"
            [ S.height 240 ]
            { value = model.text
            , placeholder = "Write anything"
            , onInput = Changed
            , event = "note.change"
            }
        , W.view "actions"
            [ S.flexDirection "row", S.gap 8 ]
            [ W.button "save" [] { label = "Save", onPress = Save, event = "note.save" }
            , W.button "clear" [] { label = "Clear", onPress = Clear, event = "note.clear" }
            ]
        , W.text "status" [ S.fontSize 12 ] model.status
        ]
