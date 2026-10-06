import * as React from "react"
import Svg, { ClipPath, Defs, G, Mask, Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width={props.width || 18} height={props.height || 18} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <G clip-path="url(#clip0_358_1491)">
                <Mask id="mask0_358_1491" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="0" y="0" width="18" height="18">
                    <Path d="M9 16.5C13.1423 16.5 16.5 13.1423 16.5 9C16.5 4.85775 13.1423 1.5 9 1.5C4.85775 1.5 1.5 4.85775 1.5 9C1.5 13.1423 4.85775 16.5 9 16.5Z" fill="white" stroke="white" stroke-width="2" stroke-linejoin="round" />
                    <Path d="M9 6V12M6 9H12" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </Mask>
                <G mask="url(#mask0_358_1491)">
                    <Path d="M0 0H18V18H0V0Z" fill="#264B79" />
                </G>
            </G>
            <Defs>
                <ClipPath id="clip0_358_1491">
                    <Rect width="18" height="18" fill="white" />
                </ClipPath>
            </Defs>
        </Svg>
    )
}

export default SvgComponent