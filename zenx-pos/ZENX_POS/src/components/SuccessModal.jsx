// components/SuccessModal.js
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import LottieView from 'lottie-react-native';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';

const SuccessModal = ({
    visible,
    isDraft = false,
    message = '',
    numberLabel = '',
    numberValue = '',
    onClose,
    onViewNote,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <LottieView
                        source={require('../assets/animations/Sucess.json')}
                        autoPlay
                        loop={true}
                        speed={0.8}
                        style={styles.lottie}
                    />

                    <Text style={styles.title}>
                        {isDraft ? 'Draft Saved' : 'Success'}
                    </Text>

                    <Text style={styles.message}>{message}</Text>

                    {numberValue ? (
                        <View style={styles.numberChip}>
                            <Text style={styles.numberLabel}>{numberLabel}</Text>
                            <Text style={styles.numberValue}>{numberValue}</Text>
                        </View>
                    ) : null}

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity
                            style={styles.secondaryBtn}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.secondaryBtnText}>Close</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={onViewNote}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.primaryBtnText}>View Transfer Note</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default SuccessModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
        paddingHorizontal: rS(15),
    },
    card: {
        width: '100%',
        maxWidth: rS(180),
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingHorizontal: rS(10),
        paddingTop: rV(4),
        paddingBottom: rV(16),
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
    },
    lottie: { width: rS(60), height: rS(60) },
    title: {
        fontSize: 16,
        fontFamily: Fonts.FigtreeSemiBold,
        color: '#1B1B1B',
        fontWeight: '600',
        marginTop: rV(1),
        marginBottom: rV(4),
        textAlign: 'center',
    },
    message: {
        fontSize: 12,
        fontFamily: Fonts.FigtreeRegular,
        color: '#666666',
        textAlign: 'center',
        marginBottom: rV(5),
        lineHeight: 16,
        paddingHorizontal: rS(4),
    },
    numberChip: {
        width: '100%',
        backgroundColor: '#EEF9FF',
        borderWidth: 1,
        borderColor: '#D6EAF8',
        borderRadius: 8,
        paddingVertical: rV(4),
        paddingHorizontal: rS(4),
        alignItems: 'center',
        marginBottom: rV(6),
    },
    numberLabel: {
        fontSize: 9,
        fontFamily: Fonts.FigtreeMedium,
        color: '#5A6C7D',
        letterSpacing: 0.8,
        marginBottom: rV(2),
        textTransform: 'uppercase',
    },
    numberValue: {
        fontSize: 15,
        fontFamily: Fonts.FigtreeSemiBold,
        color: '#264B79',
        fontWeight: '700',
        letterSpacing: 0.4,
    },
    buttonsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    secondaryBtn: {
        flex: 1,
        height: rV(24),
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#264B79',
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: rS(6),
    },
    secondaryBtnText: {
        color: '#264B79',
        fontSize: 12,
        fontFamily: Fonts.FigtreeSemiBold,
        fontWeight: '600',
    },
    primaryBtn: {
        flex: 1.5,
        height: rV(24),
        borderRadius: 7,
        backgroundColor: '#264B79',
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontFamily: Fonts.FigtreeSemiBold,
        fontWeight: '600',
    },
});