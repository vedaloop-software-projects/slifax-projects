import * as React from "react"
import Svg, { Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="20" height="20" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Rect width="15" height="15" rx="2" fill="white" />
            <Rect x="0.5" y="0.5" width="14" height="14" rx="1.5" stroke="#264B79" stroke-opacity="0.24" />
        </Svg>

    )
}

export default SvgComponent