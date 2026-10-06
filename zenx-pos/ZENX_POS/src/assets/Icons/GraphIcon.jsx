import * as React from "react"
import Svg, { ClipPath, Defs, G, Path, Rect } from "react-native-svg"

function SvgComponent(props) {
    return (
        <Svg width="10" height="7" viewBox="0 0 10 7" fill="none" xmlns="http://www.w3.org/2000/svg">
            <G clip-path="url(#clip0_330_489)">
                <Path d="M3.08851 4.37678L0.730881 6.85013C0.551541 7.03829 0.307178 7.04923 0.132034 6.87857C-0.04311 6.70792 -0.0483538 6.43225 0.140424 6.23316L2.61761 3.6351C2.70886 3.5629 2.8431 3.49836 2.95322 3.49945L5.68002 3.50273L8.54105 0.8817L7.49648 0.872949C7.26995 0.870761 7.10319 0.665104 7.09271 0.461635C7.08222 0.240663 7.25107 0.00328176 7.49753 0.00328176L9.58772 0C9.78279 0 9.99989 0.164088 9.99989 0.381778V2.68339C9.99989 2.90327 9.7807 3.05423 9.6108 3.06188C9.42202 3.07064 9.19129 2.90545 9.185 2.67245L9.15668 1.47898L5.9894 4.37568L3.08851 4.37787V4.37678Z" fill="#55AC32" />
            </G>
            <Defs>
                <ClipPath id="clip0_330_489">
                    <Rect width="10" height="7" fill="white" />
                </ClipPath>
            </Defs>
        </Svg>
    )
}

export default SvgComponent