module Main exposing (main)

import Json.Decode as D
import Json.Encode as E
import TwistedPear.Effect as Effect
import TwistedPear.Program as Program
import TwistedPear.Sdk.Ai as Ai
import TwistedPear.Sdk.Error exposing (Error)
import TwistedPear.Sdk.Workspace as Workspace
import TwistedPear.Style as S
import TwistedPear.Widget as W


dir : String
dir =
    "docs"


contextBudget : Int
contextBudget =
    6000


type alias Doc =
    { path : String
    , text : String
    , score : Float
    }


type alias Model =
    { files : List String
    , question : String
    , answer : String
    , usedFiles : List String
    , inFlight : Bool
    , status : String
    , pendingReads : List String
    , documents : List { path : String, text : String }
    }


type Msg
    = Question String
    | Ask
    | GotList (Result Error D.Value)
    | GotRead String (Result Error String)
    | GotSearch (List { path : String, text : String }) (Result Error D.Value)
    | GotChat String (List String) (Result Error D.Value)


main =
    Program.app
        { init =
            ( { files = []
              , question = ""
              , answer = ""
              , usedFiles = []
              , inFlight = False
              , status = ""
              , pendingReads = []
              , documents = []
              }
            , Workspace.list dir GotList
            )
        , update = update
        , view = view
        , subscriptions = \_ -> Sub.none
        }


filePath : D.Decoder String
filePath =
    D.oneOf [ D.field "path" D.string, D.string ]


isWordChar : Char -> Bool
isWordChar c =
    Char.isAlphaNum c || c == '_'


termsOf : String -> List String
termsOf question =
    question
        |> String.toLower
        |> String.toList
        |> List.foldl
            (\c ( current, acc ) ->
                if isWordChar c then
                    ( current ++ String.fromChar c, acc )

                else if current == "" then
                    ( "", acc )

                else
                    ( "", acc ++ [ current ] )
            )
            ( "", [] )
        |> (\( current, acc ) ->
                if current == "" then
                    acc

                else
                    acc ++ [ current ]
           )
        |> List.filter (\word -> String.length word > 3)


score : String -> List String -> Int
score text terms =
    let
        lower =
            String.toLower text
    in
    List.sum
        (List.map
            (\term ->
                max 0 (List.length (String.split term lower) - 1)
            )
            terms
        )


fullPath : String -> String
fullPath name =
    if String.contains "/" name then
        name

    else
        dir ++ "/" ++ name


searchRequest : String -> List { path : String, text : String } -> E.Value
searchRequest question documents =
    E.object
        [ ( "query", E.string question )
        , ( "documents"
          , E.list
                (\doc -> E.object [ ( "id", E.string doc.path ), ( "text", E.string doc.text ) ])
                documents
          )
        , ( "limit", E.int 5 )
        ]


chatRequest : String -> String -> E.Value
chatRequest context question =
    E.object
        [ ( "messages"
          , E.list identity
                [ E.object
                    [ ( "role", E.string "system" )
                    , ( "content", E.string "Answer only from the supplied documents. If they do not answer the question, say so." )
                    ]
                , E.object
                    [ ( "role", E.string "user" )
                    , ( "content", E.string ("Documents:" ++ context ++ "\n\nQuestion: " ++ question) )
                    ]
                ]
          )
        , ( "maxTokens", E.int 1024 )
        ]


assistantText : D.Value -> String
assistantText value =
    D.decodeValue (D.at [ "message", "content" ] D.string) value
        |> Result.withDefault ""
        |> String.trim


gather : List Doc -> ( String, List String )
gather scored =
    let
        sorted =
            List.sortBy (\doc -> -(doc.score)) scored

        step doc ( context, used ) =
            if doc.score <= 0 then
                ( context, used )

            else
                let
                    remaining =
                        contextBudget - String.length context
                in
                if remaining <= 0 then
                    ( context, used )

                else
                    ( context ++ "\n\n# " ++ doc.path ++ "\n" ++ String.left remaining doc.text
                    , used ++ [ doc.path ]
                    )
    in
    List.foldl step ( "", [] ) sorted


keywordDocs : List String -> List { path : String, text : String } -> List Doc
keywordDocs terms documents =
    List.map
        (\doc -> { path = doc.path, text = doc.text, score = toFloat (score doc.text terms) })
        documents


finishGather : Model -> String -> List Doc -> ( Model, Effect.Effect Msg )
finishGather model retrieval scored =
    let
        ( context, used ) =
            gather scored
    in
    if context == "" then
        ( { model
            | inFlight = False
            , answer = ""
            , usedFiles = used
            , status = "Nothing in the workspace matched that question"
          }
        , Effect.none
        )

    else
        ( { model | usedFiles = used, status = "Asking the model…", answer = "" }
        , Ai.chat (chatRequest context model.question) (GotChat retrieval used)
        )


update : Msg -> Model -> ( Model, Effect.Effect Msg )
update msg model =
    case msg of
        Question question ->
            ( { model | question = question }, Effect.none )

        Ask ->
            if String.trim model.question == "" || model.inFlight then
                ( model, Effect.none )

            else
                let
                    names =
                        List.take 63 model.files
                in
                if List.isEmpty names then
                    ( { model
                        | inFlight = False
                        , answer = ""
                        , usedFiles = []
                        , status = "Nothing in the workspace matched that question"
                      }
                    , Effect.none
                    )

                else
                    ( { model
                        | inFlight = True
                        , status = "Reading local files…"
                        , pendingReads = names
                        , documents = []
                      }
                    , case names of
                        first :: _ ->
                            Workspace.read (fullPath first) (GotRead first)

                        [] ->
                            Effect.none
                    )

        GotList (Ok value) ->
            ( { model | files = D.decodeValue (D.list filePath) value |> Result.withDefault [] }, Effect.none )

        GotList (Err _) ->
            ( { model | files = [], status = "Put text files in the workspace under " ++ dir ++ "/ first" }, Effect.none )

        GotRead name (Ok text) ->
            let
                rest =
                    List.drop 1 model.pendingReads

                documents =
                    model.documents ++ [ { path = fullPath name, text = String.left 16384 text } ]
            in
            case rest of
                [] ->
                    let
                        terms =
                            termsOf model.question
                    in
                    if List.isEmpty terms then
                        finishGather { model | pendingReads = [], documents = documents } "keyword fallback" []

                    else
                        ( { model | pendingReads = [], documents = documents }
                        , Ai.search (searchRequest model.question documents) (GotSearch documents)
                        )

                next :: _ ->
                    ( { model | pendingReads = rest, documents = documents }
                    , Workspace.read (fullPath next) (GotRead next)
                    )

        GotRead _ (Err _) ->
            ( { model | pendingReads = List.drop 1 model.pendingReads }, Effect.none )

        GotSearch documents (Ok value) ->
            let
                matches =
                    D.decodeValue (D.field "matches" (D.list (D.map2 Tuple.pair (D.field "id" D.string) (D.field "score" D.float)))) value
                        |> Result.withDefault []

                scored =
                    List.map
                        (\doc ->
                            { path = doc.path
                            , text = doc.text
                            , score =
                                matches
                                    |> List.filter (\( id, _ ) -> id == doc.path)
                                    |> List.head
                                    |> Maybe.map Tuple.second
                                    |> Maybe.withDefault -1
                            }
                        )
                        documents
            in
            finishGather model "semantic" scored

        GotSearch documents (Err _) ->
            finishGather model "keyword fallback" (keywordDocs (termsOf model.question) documents)

        GotChat retrieval used (Ok value) ->
            ( { model
                | inFlight = False
                , answer = assistantText value
                , usedFiles = used
                , status = "Answered from " ++ String.fromInt (List.length used) ++ " file(s) · " ++ retrieval
              }
            , Effect.none
            )

        GotChat _ _ (Err _) ->
            ( { model | inFlight = False, status = "Model unavailable" }, Effect.none )


view : Model -> W.Widget Msg
view model =
    W.view "root"
        [ S.padding 16, S.gap 12 ]
        [ W.text "title" [ S.fontSize 20, S.bold ] "Ask the handbook"
        , W.textInput "question"
            []
            { value = model.question
            , placeholder = "Ask about your documents"
            , onInput = Question
            , event = "ah.q"
            }
        , W.button "ask"
            []
            { label =
                if model.inFlight then
                    "Working…"

                else
                    "Ask"
            , onPress = Ask
            , event = "ah.ask"
            }
        , W.divider "divider"
        , W.scroll "answer"
            []
            [ W.text "answer-text"
                []
                (if model.answer == "" then
                    "—"

                 else
                    model.answer
                )
            ]
        , W.text "sources"
            [ S.fontSize 12 ]
            (if List.isEmpty model.usedFiles then
                ""

             else
                "Sources: " ++ String.join ", " model.usedFiles
            )
        , W.text "status"
            [ S.fontSize 12 ]
            (model.status ++ " · " ++ String.fromInt (List.length model.files) ++ " local files")
        ]
