import * as React from "react"
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="17" height="17" viewBox="0 0 17 17" fill="none" {...props}>
            <G clipPath="url(#clip0_4088_1317)">
                <Path d="M6.53012 16.5438C7.16176 17.1755 8.19455 17.134 8.80625 16.5231L16.6355 8.6946C16.8421 8.48883 16.9944 8.1475 16.9944 7.85401L17 1.4818C16.8899 0.696238 16.3038 0.109261 15.5182 0L9.14599 0.00558266C8.8541 0.00558266 8.51117 0.157112 8.307 0.361278L0.474527 8.19535C-0.135578 8.80545 -0.171465 9.84143 0.447412 10.4595L6.53012 16.5438ZM12.754 2.96439C12.754 2.25699 13.3274 1.68277 14.0356 1.68277C14.7438 1.68277 15.3172 2.25619 15.3172 2.96439C15.3172 3.67259 14.7438 4.24601 14.0356 4.24601C13.3274 4.24601 12.754 3.67259 12.754 2.96439Z" fill="#A69A9A" />
            </G>
            <Defs>
                <ClipPath id="clip0_4088_1317">
                    <Rect width="17" height="17" fill="white" transform="matrix(-1 0 0 1 17 0)" />
                </ClipPath>
            </Defs>
        </Svg>


    )
}

export default SvgComponent