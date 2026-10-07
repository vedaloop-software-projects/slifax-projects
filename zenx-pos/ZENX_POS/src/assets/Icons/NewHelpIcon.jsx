import * as React from 'react';
import Svg, {Path, Circle} from 'react-native-svg';

function SvgComponent({color = '#C1C1C1'}) {
    return (
        <Svg width="17" height="17" viewBox="0 0 17 17" fill="none">
            <Circle cx="8.5" cy="8.5" r="6.75" stroke={color} strokeWidth="1.4" />
            <Path
                d="M6.8 6.6C6.95 5.65 7.65 5.1 8.55 5.1C9.5 5.1 10.2 5.7 10.2 6.55C10.2 7.35 9.7 7.75 9.05 8.15C8.55 8.45 8.35 8.8 8.35 9.3M8.35 11.55V11.6"
                stroke={color}
                strokeWidth="1.4"
                strokeLinecap="round"
            />
        </Svg>
    );
}

export default SvgComponent;