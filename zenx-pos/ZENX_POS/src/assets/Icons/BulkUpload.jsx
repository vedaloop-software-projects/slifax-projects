

import * as React from "react"
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <G clip-path="url(#clip0_494_721)">
                <Path d="M7.39238 15H7.37489L0.330087 11.5347C0.105738 11.4208 -0.00424899 11.2271 0.000125498 10.9811V4.34766L3.0004 5.73328V8.20275C3.02415 8.51745 3.29849 8.7435 3.61095 8.73645C3.92342 8.72941 4.19463 8.49045 4.19588 8.17398L4.20338 6.2981L7.41051 7.77708L7.39301 15.0011L7.39238 15Z" fill="white" />
                <Path d="M8.60596 14.9889L8.61283 7.7731L15.9938 4.35718L16.0001 11.3716L8.60596 14.9889Z" fill="white" />
                <Path d="M8.00711 6.78965L4.83936 5.32182L12.1048 1.83838L15.385 3.35963L8.00711 6.78965Z" fill="white" />
                <Path d="M10.7362 1.20783L3.48646 4.6901L0.607422 3.35731L7.74409 0.052943C7.91157 -0.0204483 8.06405 -0.0122285 8.23403 0.0470717L10.7369 1.20783H10.7362Z" fill="white" />
            </G>
            <Defs>
                <ClipPath id="clip0_494_721">
                    <Rect width="16" height="15" fill="white" />
                </ClipPath>
            </Defs>
        </Svg>



    )
}

export default SvgComponent