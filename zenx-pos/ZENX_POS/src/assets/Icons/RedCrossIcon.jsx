

import * as React from "react"
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Path d="M10.5 3.5L3.5 10.5M10.5 10.5L3.5 3.5" stroke="#E71414" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
        </Svg>
    )
}

export default SvgComponent
