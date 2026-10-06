import * as React from "react"
import Svg, { ClipPath, Defs, Path, Rect, G, Circle, Filter, FeFlood, FeColorMatrix, FeOffset, FeGaussianBlur, FeComposite, FeBlend } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Circle cx="22.5" cy="22.5" r="22.5" fill="white" />
            <Path d="M15.9914 19.7325C16.1832 19.5408 16.4433 19.4331 16.7145 19.4331C16.9857 19.4331 17.2457 19.5408 17.4375 19.7325L22.5 24.795L27.5625 19.7325C27.7554 19.5462 28.0138 19.4431 28.2819 19.4455C28.5501 19.4478 28.8066 19.5554 28.9962 19.745C29.1858 19.9346 29.2934 20.1911 29.2957 20.4593C29.2981 20.7274 29.195 20.9858 29.0087 21.1787L23.2231 26.9642C23.0313 27.156 22.7712 27.2637 22.5 27.2637C22.2288 27.2637 21.9688 27.156 21.777 26.9642L15.9914 21.1787C15.7997 20.9869 15.692 20.7268 15.692 20.4556C15.692 20.1844 15.7997 19.9243 15.9914 19.7325Z" fill="#1B1B1B" />
        </Svg>
    )
}

export default SvgComponent