#!/usr/bin/env node
// Generate TwistedPear.Widget / TwistedPear.Style from SPEC-WIDGET schema.
// Regenerated with: npm run generate:guida-widget
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const SCHEMA_PATH = join(
  ROOT,
  "specs",
  "spec-widget",
  "schema",
  "widget.schema.json",
);
const ELM_DIR = join(
  ROOT,
  "packages",
  "guida-twistedpear",
  "elm",
  "TwistedPear",
);

const HEADER = `{-\n   Generated from specs/spec-widget/schema/widget.schema.json\n   by scripts/generate-guida-widget.mjs — do not edit by hand.\n   Regenerated with: npm run generate:guida-widget\n-}\n`;

function kebabToCamel(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function elmFnName(widgetType) {
  if (widgetType === "view") return "view";
  return kebabToCamel(widgetType);
}

function styleAliases() {
  return `
flex : Style
flex =
    display "flex"


hidden : Style
hidden =
    display "none"


row : Style
row =
    flexDirection "row"


column : Style
column =
    flexDirection "column"


regular : Style
regular =
    fontWeight "regular"


medium : Style
medium =
    fontWeight "medium"


bold : Style
bold =
    fontWeight "bold"
`;
}

function generateStyle(schema) {
  const properties = schema.$defs.style.properties;
  const keys = Object.keys(properties).sort();
  const pctNames = keys
    .filter((key) => properties[key].oneOf)
    .map((key) => `${key}Pct`);
  const fnNames = [
    ...keys,
    ...pctNames,
    "flex",
    "hidden",
    "row",
    "column",
    "regular",
    "medium",
    "bold",
    "none",
    "batch",
    "encode",
  ];
  const exposing = fnNames.join(", ");
  const functions = keys.map((key) => {
    const spec = properties[key];
    if (spec.enum && spec.enum.every((v) => typeof v === "string")) {
      return `
${key} : String -> Style
${key} value =
    Style "${key}" (E.string value)
`;
    }
    if (spec.enum && spec.enum.every((v) => typeof v === "number")) {
      return `
${key} : Int -> Style
${key} value =
    Style "${key}" (E.int value)
`;
    }
    if (spec.oneOf) {
      return `
${key} : Float -> Style
${key} value =
    Style "${key}" (E.float value)


${key}Pct : Float -> Style
${key}Pct value =
    Style "${key}" (E.string (String.fromFloat value ++ "%"))
`;
    }
    if (spec.type === "number") {
      return `
${key} : Float -> Style
${key} value =
    Style "${key}" (E.float value)
`;
    }
    if (spec.type === "string") {
      return `
${key} : String -> Style
${key} value =
    Style "${key}" (E.string value)
`;
    }
    throw new Error(`unsupported style schema for ${key}`);
  });

  return `${HEADER}
module TwistedPear.Style exposing
    ( Style, ${exposing} )

{-| SPEC-WIDGET style builders. Generated from the schema the broker validates. -}

import Json.Encode as E


type Style
    = Style String E.Value
    | Batch (List Style)


none : Style
none =
    Batch []


batch : List Style -> Style
batch =
    Batch


encode : List Style -> Maybe E.Value
encode styles =
    let
        pairs =
            flatten styles
    in
    if List.isEmpty pairs then
        Nothing

    else
        Just (E.object pairs)


flatten : List Style -> List ( String, E.Value )
flatten styles =
    List.concatMap
        (\\style ->
            case style of
                Style key value ->
                    [ ( key, value ) ]

                Batch nested ->
                    flatten nested
        )
        styles
${functions.join("")}
${styleAliases()}
`;
}

function generateWidget(schema) {
  const branches = schema.$defs.node.allOf[0].oneOf;
  const types = branches.map((branch) => branch.properties.type.const).sort();
  const names = types.map(elmFnName);
  const exposing = ["Widget", "encodeRoot", "events", "map", ...names].join(
    ", ",
  );

  const helpers = `
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
        , events = Dict.map (\\_ decoder -> D.map tagger decoder) record.events
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
                (\\(Widget child) acc -> Dict.union child.events acc)
                extraEvents
                children
        childNodes =
            List.map (\\(Widget child) -> child.node) children
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
            , Maybe.map (\\value -> ( "props", value )) props
            , Maybe.map (\\value -> ( "style", value )) (S.encode styles)
            , Maybe.map (\\nodes -> ( "children", E.list identity nodes )) children
            ]
        )
`;

  const functions = types.map((type) => widgetFunction(type));

  return `${HEADER}
module TwistedPear.Widget exposing
    ( ${exposing} )

{-| SPEC-WIDGET node builders. Node ids are the first argument; event names are independent. -}

import Dict exposing (Dict)
import Json.Decode as D
import Json.Encode as E
import TwistedPear.Style as S

${helpers}
${functions.join("\n")}
`;
}

function widgetFunction(type) {
  const name = elmFnName(type);
  if (type === "view" || type === "scroll" || type === "list") {
    return `
${name} : String -> List S.Style -> List (Widget msg) -> Widget msg
${name} id styles children =
    parent "${type}" id styles Nothing children Dict.empty
`;
  }
  if (type === "text") {
    return `
${name} : String -> List S.Style -> String -> Widget msg
${name} id styles value =
    leaf "${type}" id styles (Just (E.object [ ( "value", E.string value ) ])) Dict.empty
`;
  }
  if (type === "button") {
    return `
${name} : String -> List S.Style -> { label : String, onPress : msg, event : String } -> Widget msg
${name} id styles config =
    leaf "${type}"
        id
        styles
        (Just (E.object [ ( "label", E.string config.label ), ( "event", E.string config.event ) ]))
        (Dict.singleton config.event (D.succeed config.onPress))
`;
  }
  if (type === "text-input") {
    return `
${name} : String -> List S.Style -> { value : String, placeholder : String, onInput : String -> msg, event : String } -> Widget msg
${name} id styles config =
    leaf "${type}"
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
`;
  }
  if (type === "switch") {
    return `
${name} : String -> List S.Style -> { value : Bool, onChange : Bool -> msg, event : String } -> Widget msg
${name} id styles config =
    leaf "${type}"
        id
        styles
        (Just (E.object [ ( "value", E.bool config.value ), ( "event", E.string config.event ) ]))
        (Dict.singleton config.event (D.map config.onChange D.bool))
`;
  }
  if (type === "image") {
    return `
${name} : String -> List S.Style -> { asset : String, alt : String } -> Widget msg
${name} id styles config =
    leaf "${type}"
        id
        styles
        (Just (E.object [ ( "asset", E.string config.asset ), ( "alt", E.string config.alt ) ]))
        Dict.empty
`;
  }
  if (type === "progress") {
    return `
${name} : String -> List S.Style -> { value : Float } -> Widget msg
${name} id styles config =
    leaf "${type}"
        id
        styles
        (Just (E.object [ ( "value", E.float config.value ) ]))
        Dict.empty
`;
  }
  if (type === "divider") {
    return `
${name} : String -> Widget msg
${name} id =
    leaf "${type}" id [] Nothing Dict.empty
`;
  }
  if (type === "spacer") {
    return `
${name} : String -> Float -> Widget msg
${name} id size =
    leaf "${type}" id [] (Just (E.object [ ( "size", E.float size ) ])) Dict.empty
`;
  }
  if (type === "qr-code") {
    return `
${name} : String -> List S.Style -> { value : String, size : Maybe Float, caption : Maybe String } -> Widget msg
${name} id styles config =
    leaf "${type}"
        id
        styles
        (Just
            (E.object
                (List.filterMap identity
                    [ Just ( "value", E.string config.value )
                    , Maybe.map (\\n -> ( "size", E.float n )) config.size
                    , Maybe.map (\\c -> ( "caption", E.string c )) config.caption
                    ]
                )
            )
        )
        Dict.empty
`;
  }
  if (type === "code-editor") {
    return `
${name} : String -> List S.Style -> { documentId : String, language : String, readOnly : Bool, event : String, onEvent : String -> msg } -> Widget msg
${name} id styles config =
    leaf "${type}"
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
`;
  }
  // Preview surfaces and remaining types: session-bearing props as a JSON object.
  return `
${name} : String -> List S.Style -> List ( String, E.Value ) -> Widget msg
${name} id styles props =
    leaf "${type}"
        id
        styles
        (if List.isEmpty props then
            Nothing

         else
            Just (E.object props)
        )
        Dict.empty
`;
}

export function generateGuidaWidget(schemaPath = SCHEMA_PATH) {
  const schema = JSON.parse(readFileSync(schemaPath, "utf8"));
  mkdirSync(ELM_DIR, { recursive: true });
  const stylePath = join(ELM_DIR, "Style.elm");
  const widgetPath = join(ELM_DIR, "Widget.elm");
  writeFileSync(stylePath, generateStyle(schema));
  writeFileSync(widgetPath, generateWidget(schema));
  return { stylePath, widgetPath };
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) ===
    (await import("node:path")).resolve(process.argv[1]);
if (invokedDirectly) {
  const written = generateGuidaWidget();
  console.log(`wrote ${written.stylePath}`);
  console.log(`wrote ${written.widgetPath}`);
}
