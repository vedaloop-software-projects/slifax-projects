
import * as React from "react"
import Svg, { Circle, ClipPath, Defs, Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Circle cx="14" cy="14" r="13.5" stroke="#E7E7E7" />
            <Circle cx="14.0002" cy="14" r="6.93333" fill="#264B79" />
        </Svg>
    )
}

export default SvgComponent