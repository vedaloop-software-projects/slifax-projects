import * as React from 'react';
import Svg, {Path} from 'react-native-svg';

function SvgComponent({color = '#848484'}) {
    return (
        <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <Path
                d="M8 2V10M8 10L4.7 6.7M8 10L11.3 6.7M2.7 10.7V12.7C2.7 13.4 3.3 14 4 14H12C12.7 14 13.3 13.4 13.3 12.7V10.7"
                stroke={color}
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export default SvgComponent;