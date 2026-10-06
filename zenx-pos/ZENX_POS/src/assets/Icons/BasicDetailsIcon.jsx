import * as React from "react"
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from "react-native-svg"

function BasicDetailsIcon(props) {
    return (
        <Svg width="51" height="51" viewBox="0 0 41 41" fill="none" xmlns="http://www.w3.org/2000/svg">
            <Circle cx="20.5" cy="20.5" r="20.5" fill="#264B79" />
            <G clip-path="url(#clip0_453_688)">
                <Path d="M19.9304 28H19.914L13.3095 24.7658C13.0991 24.6595 12.996 24.4786 13.0001 24.249V18.0579L15.8129 19.3511V21.656C15.8351 21.9497 16.0923 22.1606 16.3853 22.1541C16.6782 22.1475 16.9325 21.9245 16.9336 21.6291L16.9407 19.8783L19.9474 21.2587L19.9309 28.0011L19.9304 28Z" fill="white" />
                <Path d="M21.0679 27.9896L21.0743 21.2548L27.994 18.0667L27.9999 24.6135L21.0679 27.9896Z" fill="white" />
                <Path d="M20.5069 20.337L17.5371 18.967L24.3484 15.7158L27.4236 17.1357L20.5069 20.337Z" fill="white" />
                <Path d="M23.0651 15.1271L16.2684 18.3772L13.5693 17.1333L20.26 14.0492C20.417 13.9807 20.5599 13.9884 20.7193 14.0437L23.0657 15.1271H23.0651Z" fill="white" />
            </G>
            <Defs>
                <ClipPath id="clip0_453_688">
                    <Rect width="15" height="14" fill="white" transform="translate(13 14)" />
                </ClipPath>
            </Defs>
        </Svg>
    )
}

export default BasicDetailsIcon