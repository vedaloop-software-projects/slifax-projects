import * as React from "react"
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Path d="M6.40002 18.308L5.69202 17.6L11.292 12L5.69202 6.40002L6.40002 5.69202L12 11.292L17.6 5.69202L18.308 6.40002L12.708 12L18.308 17.6L17.6 18.308L12 12.708L6.40002 18.308Z" fill="black" />
        </Svg>
    )
}

export default SvgComponent
