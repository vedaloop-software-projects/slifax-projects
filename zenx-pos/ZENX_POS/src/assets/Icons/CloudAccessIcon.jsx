import * as React from "react"
import Svg, { G, Path, ClipPath, Defs, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="21" height="14" viewBox="0 0 21 14" fill="none" {...props}>
            <G clipPath="url(#clip0_4088_1351)">
                <Path d="M3.88682 13.9556C1.75564 13.9484 0.113553 12.0784 0.00522967 10.1021C-0.108018 8.03102 1.3404 6.26634 3.38214 5.85855C3.48061 5.00195 3.97217 4.24991 4.62868 3.80592C5.4132 3.27427 6.33477 3.16246 7.21777 3.448C8.21566 1.23773 10.4987 -0.13364 12.9425 0.0103329C16.1791 0.200957 18.6681 2.93002 18.4621 6.11593C20.0779 6.80201 21.0999 8.4002 20.9913 10.119C20.8616 12.1869 19.2277 13.7875 17.122 13.9999L3.88682 13.9556Z" fill="#71A2BC" />
            </G>
            <Defs>
                <ClipPath id="clip0_4088_1351">
                    <Rect width="21" height="14" fill="white" />
                </ClipPath>
            </Defs>
        </Svg>

    )
}

export default SvgComponent