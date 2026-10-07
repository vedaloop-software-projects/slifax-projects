import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
} from 'react-native';
import LottieView from 'lottie-react-native';

import { rS, rV } from '../constants/responsive';
import Fonts from '../constants/Fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CustomToast = ({
    visible,
    type = 'failed',
    title,
    message,
    onHide,
    duration = 50000,
    position = 'top-left', // 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}) => {

    useEffect(() => {
        if (!visible) return;

        const timer = setTimeout(() => {
            onHide?.();
        }, duration);

        return () => clearTimeout(timer);
    }, [visible, duration, onHide]);

    if (!visible) return null;

    const isSuccess = type === 'success';

    const themeColor = isSuccess
        ? '#388D18'
        : '#AE2222';

    const defaultTitle = isSuccess
        ? 'Success'
        : 'Failed';

    const defaultMessage = isSuccess
        ? 'Table is selected'
        : 'Table is not selected';

    // Position logic
    const isTop = position.startsWith('top');
    const isBottom = position.startsWith('bottom');
    const isLeft = position.endsWith('left');
    const isRight = position.endsWith('right');

    const containerStyle = {
        top: isTop ? rV(40) : undefined,
        bottom: isBottom ? rV(40) : undefined,
    };

    // Fixed max width so it stays compact on all screen sizes
    const toastWidth = Math.min(
        SCREEN_WIDTH * 0.75,
        rS(160)
    );

    const wrapperStyle = {
        alignSelf: isLeft
            ? 'flex-start'
            : isRight
                ? 'flex-end'
                : 'center',

        width: toastWidth,
        marginHorizontal: rS(20),
    };

    return (
        <View style={[styles.container, containerStyle]}>

            <View style={[styles.toastWrapper, wrapperStyle]}>

                {/* Main Toast Body */}
                <View
                    style={[
                        styles.toast,
                        {
                            borderColor: isSuccess
                                ? '#D1E7D1'
                                : '#FAD4D4',
                        },
                    ]}
                >

                    {/* Left Border */}
                    <View
                        style={[
                            styles.leftBorder,
                            {
                                backgroundColor: themeColor,
                            },
                        ]}
                    />

                    {/* Lottie Icon */}
                    <View
                        style={[
                            styles.iconContainer,
                            // {
                            //     backgroundColor: themeColor,
                            // },
                        ]}
                    >
                        <LottieView
                            source={
                                isSuccess
                                    ? require('../assets/animations/SuccessNew.json')
                                    : require('../assets/animations/wrong.json')
                            }
                            autoPlay
                            loop={true}
                            speed={0.6}
                            resizeMode="cover"
                            style={styles.lottieIcon}
                        />
                    </View>
                    {/* Text */}
                    <View style={styles.textContainer}>

                        <Text style={styles.title}>
                            {title || defaultTitle}
                        </Text>

                        <Text
                            style={styles.message}
                            numberOfLines={2}
                        >
                            {message || defaultMessage}
                        </Text>

                    </View>

                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onHide}
                        activeOpacity={0.65}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss notification"
                    // hitSlop={6}
                    >
                        <View style={[styles.closeIconLine, styles.closeIconLineForward]} />
                        <View style={[styles.closeIconLine, styles.closeIconLineBackward]} />
                    </TouchableOpacity>
                </View>

                {/* Right Accent Block */}
                <View
                    style={[
                        styles.rightAccent,
                        {
                            backgroundColor: themeColor,
                        },
                    ]}
                />

            </View>

        </View>
    );
};

export default CustomToast;

const styles = StyleSheet.create({

    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 1000,
        elevation: 1000,
    },

    toastWrapper: {
        flexDirection: 'row',
        alignItems: 'center',

        shadowColor: '#000000',
        shadowOffset: {
            width: 0,
            height: rV(4),
        },
        shadowOpacity: 0.1,
        shadowRadius: rS(6),

        elevation: 5,
    },

    toast: {
        flex: 1,
        minHeight: rV(15),

        backgroundColor: '#FFFFFF',
        borderRadius: rS(4),
        borderWidth: 1,

        flexDirection: 'row',
        alignItems: 'center',

        paddingRight: rS(2),

        overflow: 'hidden',
        position: 'relative',
    },

    leftBorder: {
        position: 'absolute',

        left: 0,
        top: 0,
        bottom: 0,

        width: rS(4),

        borderTopLeftRadius: rS(4),
        borderBottomLeftRadius: rS(4),
    },

    iconContainer: {
        width: rS(28),
        height: rS(28),
        borderRadius: rS(7),
        // backgroundColor: 'red',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: rS(4),
        marginRight: rS(1),
        overflow: 'hidden',
    },
    lottieIcon: {
        width: '100%',
        height: '100%',
        overflow: 'hidden',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingVertical: rV(6),
    },
    closeButton: {
        width: rS(10),
        height: rS(10),
        borderRadius: rS(5),
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIconLine: {
        position: 'absolute',
        width: rS(6),
        height: 1.2,
        borderRadius: 1,
        backgroundColor: '#4B5563',
    },
    closeIconLineForward: {
        transform: [{ rotate: '45deg' }],
    },
    closeIconLineBackward: {
        transform: [{ rotate: '-45deg' }],
    },

    title: {
        fontSize: 17,
        fontFamily: Fonts.FigtreeSemiBold,
        fontWeight: '600',
        color: '#222222',
        marginBottom: rV(2),
        includeFontPadding: false,
    },

    message: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#8A8A8A',
        includeFontPadding: false,
    },

    rightAccent: {
        width: rS(12),
        height: rS(10),

        borderTopRightRadius: rS(2),
        borderBottomRightRadius: rS(2),

        marginLeft: -rS(4),

        zIndex: -1,
    },
})