import * as React from "react"
import Svg, { ClipPath, Defs, Path, Rect, G } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="12" height="12" viewBox="0 0 7 5" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Path d="M6.86052 3.49069C7.02723 3.66419 7.04376 3.87816 6.91301 4.0552C6.80074 4.20695 6.52758 4.28232 6.36962 4.11843L3.5005 1.13956L0.631387 4.11893C0.48363 4.2722 0.229915 4.21606 0.10889 4.0815C-0.0237999 3.93329 -0.0481021 3.68897 0.108404 3.52609L3.5005 -9.15527e-05L6.86101 3.49119L6.86052 3.49069Z" fill="black" />
        </Svg>
    )
}

export default SvgComponent