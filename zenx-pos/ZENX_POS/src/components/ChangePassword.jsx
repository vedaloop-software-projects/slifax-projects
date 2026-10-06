import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ScrollView,
    Keyboard,
} from 'react-native';

import CrossIcon from '../assets/Icons/CrossIcon';
import ShowIcon from '../assets/Icons/ShowIcon';
import HideIcon from '../assets/Icons/HideIcon';

import Fonts from '../constants/Fonts';
import { rS, rV, rMS } from '../constants/responsive';

const { width } = Dimensions.get('window');

const ChangePassword = ({ visible, onClose, onSubmit }) => {
    const [oldPassword, setOldPassword] = useState('Ramesh@123');
    const [newPassword, setNewPassword] = useState('RamBabu@123');
    const [confirmPassword, setConfirmPassword] = useState('Ramesh@123');

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Detect keyboard — same pattern as HelpSupportModal
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    useEffect(() => {
        const keyboardShowEvent =
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';

        const keyboardHideEvent =
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const showListener = Keyboard.addListener(keyboardShowEvent, () => {
            setKeyboardVisible(true);
        });

        const hideListener = Keyboard.addListener(keyboardHideEvent, () => {
            setKeyboardVisible(false);
        });

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    const scrollViewRef = useRef(null);

    // Store each field's Y position via onLayout
    const fieldPositions = useRef({
        old: 0,
        new: 0,
        confirm: 0,
    });

    const handleSubmit = () => {
        onSubmit?.({
            oldPassword,
            newPassword,
            confirmPassword,
        });
    };

    // Generic scroll-to-field handler using measured layout
    const scrollToField = useCallback((fieldKey) => {
        setTimeout(() => {
            const y = fieldPositions.current[fieldKey] ?? 0;
            scrollViewRef.current?.scrollTo({
                y: Math.max(0, y - rV(12)), // small padding above field
                animated: true,
            });
        }, 120);
    }, []);

    return (
        <Modal
            visible={Boolean(visible)}
            transparent
            animationType="fade"
            statusBarTranslucent
            hardwareAccelerated
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.modalContainer}>

                    {/* HEADER */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>
                            Change Password
                        </Text>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <CrossIcon />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.headerLine} />

                    {/* CONTENT */}
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={[
                            styles.scrollContent,
                            keyboardVisible && styles.keyboardScrollContent,
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="none"
                        bounces={false}
                        overScrollMode="never"
                        contentInsetAdjustmentBehavior="never"
                    >

                        {/* OLD PASSWORD */}
                        <View
                            style={styles.fieldGroup}
                            onLayout={(e) => {
                                fieldPositions.current.old =
                                    e.nativeEvent.layout.y;
                            }}
                        >
                            <Text style={styles.label}>Old Password</Text>

                            <View style={styles.inputWrap}>
                                <TextInput
                                    value={oldPassword}
                                    onChangeText={setOldPassword}
                                    style={styles.input}
                                    secureTextEntry={!showOldPassword}
                                    placeholder="Enter Old Password"
                                    placeholderTextColor="#A3A3A3"
                                    returnKeyType="next"
                                    onFocus={() => scrollToField('old')}
                                />

                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() =>
                                        setShowOldPassword(v => !v)
                                    }
                                    activeOpacity={0.8}
                                >
                                    {showOldPassword ? (
                                        <ShowIcon />
                                    ) : (
                                        <HideIcon />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* NEW PASSWORD */}
                        <View
                            style={styles.fieldGroup}
                            onLayout={(e) => {
                                fieldPositions.current.new =
                                    e.nativeEvent.layout.y;
                            }}
                        >
                            <Text style={styles.label}>New Password</Text>

                            <View style={styles.inputWrap}>
                                <TextInput
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    style={styles.input}
                                    secureTextEntry={!showNewPassword}
                                    placeholder="Enter New Password"
                                    placeholderTextColor="#A3A3A3"
                                    returnKeyType="next"
                                    onFocus={() => scrollToField('new')}
                                />

                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() =>
                                        setShowNewPassword(v => !v)
                                    }
                                    activeOpacity={0.8}
                                >
                                    {showNewPassword ? (
                                        <ShowIcon />
                                    ) : (
                                        <HideIcon />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* CONFIRM PASSWORD */}
                        <View
                            style={styles.fieldGroup}
                            onLayout={(e) => {
                                fieldPositions.current.confirm =
                                    e.nativeEvent.layout.y;
                            }}
                        >
                            <Text style={styles.label}>
                                Confirm Password
                            </Text>

                            <View style={styles.inputWrap}>
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    style={styles.input}
                                    secureTextEntry={!showConfirmPassword}
                                    placeholder="Enter Confirm Password"
                                    placeholderTextColor="#A3A3A3"
                                    returnKeyType="done"
                                    onSubmitEditing={Keyboard.dismiss}
                                    onFocus={() => scrollToField('confirm')}
                                />

                                <TouchableOpacity
                                    style={styles.eyeButton}
                                    onPress={() =>
                                        setShowConfirmPassword(v => !v)
                                    }
                                    activeOpacity={0.8}
                                >
                                    {showConfirmPassword ? (
                                        <ShowIcon />
                                    ) : (
                                        <HideIcon />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* BUTTON */}
                        <View style={styles.select_container}>
                            <TouchableOpacity
                                style={styles.submitButton}
                                onPress={handleSubmit}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.submitText}>
                                    Submit
                                </Text>
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default ChangePassword;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: rS(2),
        backgroundColor: 'rgba(0,0,0,0.38)',
    },

    modalContainer: {
        width: width > 900 ? '58%' : '94%',
        maxWidth: 550,
        maxHeight: '80%',
        flexShrink: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
    },

    header: {
        height: rV(38),
        paddingHorizontal: rS(16),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    headerTitle: {
        fontFamily: Fonts.FigtreeMedium,
        fontSize: rMS(12),
        color: '#1B1B1B',
        fontWeight: '500',
        letterSpacing: 0.2,
    },

    closeButton: {
        width: rS(28),
        height: rS(28),
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerLine: {
        height: 1,
        backgroundColor: '#E5E5E5',
    },

    scrollView: {
        flexShrink: 1,
    },

    scrollContent: {
        paddingHorizontal: rS(20),
        paddingTop: rV(10),
        paddingBottom: rV(25),
    },

    // NEW — extra bottom space while the keyboard is up, same idea as HelpSupportModal
    keyboardScrollContent: {
        paddingBottom: rV(180),
    },

    fieldGroup: {
        marginBottom: rV(15),
    },

    label: {
        fontFamily: Fonts.FigtreeRegular,
        fontSize: rMS(10),
        color: '#1B1B1B',
        fontWeight: '400',
        marginBottom: rV(8),
    },

    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CFCFCF',
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        height: rV(28),
    },

    input: {
        flex: 1,
        height: '100%',
        paddingHorizontal: rS(10),
        paddingVertical: 0,
        fontFamily: Fonts.FigtreeRegular,
        fontSize: rMS(10),
        color: '#000000',
        fontWeight: '400',
    },

    eyeButton: {
        width: rS(28),
        height: rS(28),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: rS(8),
    },

    select_container: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: rV(2),
    },

    submitButton: {
        width: rV(140),
        height: rV(30),
        backgroundColor: '#264B79',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    submitText: {
        fontFamily: Fonts.FigtreeMedium,
        fontSize: rMS(10),
        fontWeight: '500',
        color: '#FFFFFF',
    },
});