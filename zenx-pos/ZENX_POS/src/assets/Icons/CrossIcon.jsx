import * as React from "react"
import Svg, { ClipPath, Defs, Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="24" height="24" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Path d="M15 5L5 15M15 15L5 5" stroke="black" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
        </Svg>
    )
}

export default SvgComponent