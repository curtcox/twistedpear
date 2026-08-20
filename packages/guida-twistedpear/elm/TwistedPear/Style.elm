{-
   Generated from specs/spec-widget/schema/widget.schema.json
   by scripts/generate-guida-widget.mjs — do not edit by hand.
   Regenerated with: npm run generate:guida-widget
-}

module TwistedPear.Style exposing
    ( Style, alignItems, backgroundColor, color, display, flexDirection, fontSize, fontWeight, gap, height, justifyContent, margin, padding, width, heightPct, widthPct, flex, hidden, row, column, regular, medium, bold, none, batch, encode )

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
        (\style ->
            case style of
                Style key value ->
                    [ ( key, value ) ]

                Batch nested ->
                    flatten nested
        )
        styles

alignItems : String -> Style
alignItems value =
    Style "alignItems" (E.string value)

backgroundColor : String -> Style
backgroundColor value =
    Style "backgroundColor" (E.string value)

color : String -> Style
color value =
    Style "color" (E.string value)

display : String -> Style
display value =
    Style "display" (E.string value)

flexDirection : String -> Style
flexDirection value =
    Style "flexDirection" (E.string value)

fontSize : Int -> Style
fontSize value =
    Style "fontSize" (E.int value)

fontWeight : String -> Style
fontWeight value =
    Style "fontWeight" (E.string value)

gap : Float -> Style
gap value =
    Style "gap" (E.float value)

height : Float -> Style
height value =
    Style "height" (E.float value)


heightPct : Float -> Style
heightPct value =
    Style "height" (E.string (String.fromFloat value ++ "%"))

justifyContent : String -> Style
justifyContent value =
    Style "justifyContent" (E.string value)

margin : Float -> Style
margin value =
    Style "margin" (E.float value)

padding : Float -> Style
padding value =
    Style "padding" (E.float value)

width : Float -> Style
width value =
    Style "width" (E.float value)


widthPct : Float -> Style
widthPct value =
    Style "width" (E.string (String.fromFloat value ++ "%"))


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

