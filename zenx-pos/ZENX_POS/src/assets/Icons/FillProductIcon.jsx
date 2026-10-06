

import * as React from "react"
import Svg, { ClipPath, Defs, G, Path, Rect, } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="18" height="17" viewBox="0 0 18 17" fill="none" xmlns="http://www.w3.org/2000/svg">
            <G clip-path="url(#clip0_414_2095)">
                <Path d="M8.31631 17H8.29663L0.371226 13.0727C0.118833 12.9436 -0.00490218 12.7241 1.91144e-05 12.4452V4.9274L3.37533 6.49778V9.29651C3.40204 9.65317 3.71068 9.90935 4.0622 9.90137C4.41372 9.89338 4.71884 9.62256 4.72025 9.2639L4.72868 7.1379L8.3367 8.81408L8.31701 17.0013L8.31631 17Z" fill="white" />
                <Path d="M9.68164 16.9874L9.68937 8.80941L17.993 4.93803L18 12.8877L9.68164 16.9874Z" fill="white" />
                <Path d="M9.00806 7.69484L5.44434 6.03131L13.6179 2.0834L17.3082 3.80749L9.00806 7.69484Z" fill="white" />
                <Path d="M12.0783 1.36873L3.92227 5.3153L0.68335 3.80481L8.7121 0.0598627C8.90051 -0.0233141 9.07205 -0.0139983 9.26328 0.0532085L12.079 1.36873H12.0783Z" fill="white" />
            </G>
            <Defs>
                <ClipPath id="clip0_414_2095">
                    <Rect width="18" height="17" fill="white" />
                </ClipPath>
            </Defs>
        </Svg>

    )
}

export default SvgComponent