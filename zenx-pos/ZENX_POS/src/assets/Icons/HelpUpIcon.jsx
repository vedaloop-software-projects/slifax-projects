import * as React from "react"
import Svg, { ClipPath, Defs, Path, Rect, G, Circle, Filter, FeFlood, FeColorMatrix, FeOffset, FeGaussianBlur, FeComposite, FeBlend } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="45" height="45" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Circle cx="22.5" cy="22.5" r="22.5" fill="white" />
            <Path d="M15.9916 25.2684C16.1834 25.4602 16.4435 25.5679 16.7146 25.5679C16.9858 25.5679 17.2459 25.4602 17.4377 25.2684L22.5002 20.2059L27.5627 25.2684C27.7556 25.4547 28.0139 25.5578 28.2821 25.5555C28.5503 25.5532 28.8068 25.4456 28.9964 25.256C29.186 25.0664 29.2936 24.8099 29.2959 24.5417C29.2982 24.2735 29.1952 24.0152 29.0089 23.8223L23.2233 18.0367C23.0315 17.845 22.7714 17.7373 22.5002 17.7373C22.229 17.7373 21.9689 17.845 21.7771 18.0367L15.9916 23.8223C15.7998 24.0141 15.6921 24.2742 15.6921 24.5454C15.6921 24.8166 15.7998 25.0767 15.9916 25.2684Z" fill="#1B1B1B" />
        </Svg>
    )
}

export default SvgComponent