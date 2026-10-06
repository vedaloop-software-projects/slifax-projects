import Svg, { Path } from 'react-native-svg';

const SalesReportIcon = ({ size = 24, color = '#17365D' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M3 3V21H21"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M7 16V12"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
        <Path
            d="M12 16V8"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
        <Path
            d="M17 16V5"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
        />
    </Svg>
);

export default SalesReportIcon;