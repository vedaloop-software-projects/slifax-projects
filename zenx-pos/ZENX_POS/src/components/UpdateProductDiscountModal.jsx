import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import Fonts from '../constants/Fonts';
import CrossIcon from '../assets/Icons/CrossIcon';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { rS, rV } from '../constants/responsive';
import { HelperModule } from '../helper/HelperModule';
import ApiServices from '../helper/ApiServices';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const UpdateProductDiscountModal = ({
    isVisible,
    onClose,
    productId,
    variantId,
    discountPercentage,
    discountValue: existingDiscountValue,
    discountType,
    onSuccess,
}) => {
    const { postMethod } = HelperModule();

    const [loading, setLoading] = useState(false);

    const [discountValue, setDiscountValue] = useState('');
    const [discountPer, setDiscountPer] = useState('');

    const [discountValError, setDiscountValError] = useState('');
    const [discountPerError, setDiscountPerError] = useState('');

    // Same as AddManualDiscount
    const [activeMode, setActiveMode] = useState(null);

    useEffect(() => {
    if (!isVisible) return;

    // 0, "0", "0.00", null, undefined => empty
    const isZeroOrEmpty = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return true;
        }

        const num = Number(value);

        return !isNaN(num) && num === 0;
    };

    const per = isZeroOrEmpty(discountPercentage)
        ? ''
        : String(discountPercentage);

    const val = isZeroOrEmpty(existingDiscountValue)
        ? ''
        : String(existingDiscountValue);

    setDiscountPer(per);
    setDiscountValue(val);

    setDiscountPerError('');
    setDiscountValError('');

    // If API has 0 for both, no discount mode should be active
    if (per === '' && val === '') {
        setActiveMode(null);
    } else if (discountType === 'percentage' && per !== '') {
        setActiveMode('percentage');
    } else if (discountType === 'value' && val !== '') {
        setActiveMode('value');
    } else if (per !== '') {
        setActiveMode('percentage');
    } else if (val !== '') {
        setActiveMode('value');
    } else {
        setActiveMode(null);
    }
}, [
    isVisible,
    discountPercentage,
    existingDiscountValue,
    discountType,
]);

//    useEffect(() => {
//     if (!isVisible) return;

//     const per =
//         discountPercentage !== null &&
//         discountPercentage !== undefined &&
//         discountPercentage !== ''
//             ? String(discountPercentage)
//             : '';

//     const val =
//         existingDiscountValue !== null &&
//         existingDiscountValue !== undefined &&
//         existingDiscountValue !== ''
//             ? String(existingDiscountValue)
//             : '';

//     setDiscountPer(per);
//     setDiscountValue(val);

//     setDiscountPerError('');
//     setDiscountValError('');

//     // Use the actual discount type
//     if (discountType === 'percentage') {
//         setActiveMode('percentage');
//     } else if (discountType === 'value') {
//         setActiveMode('value');
//     } else {
//         setActiveMode(null);
//     }
// }, [
//     isVisible,
//     discountPercentage,
//     existingDiscountValue,
//     discountType,
// ]);

    const isPerDisabled = activeMode === 'value';
    const isValDisabled = activeMode === 'percentage';

    // =========================
    // Discount Percentage
    // =========================
    const handleDiscountPerChange = (text) => {
        const cleanedText = text.replace(/[^0-9.]/g, '');

        setDiscountPer(cleanedText);
        setDiscountPerError('');
        setDiscountValError('');

        if (cleanedText.length > 0) {
            setActiveMode('percentage');

            // Clear value when percentage is selected
            setDiscountValue('');
        } else {
            setActiveMode(null);
        }
    };

    // =========================
    // Discount Value
    // =========================
    const handleDiscountValueChange = (text) => {
        const cleanedText = text.replace(/[^0-9.]/g, '');

        setDiscountValue(cleanedText);
        setDiscountValError('');
        setDiscountPerError('');

        if (cleanedText.length > 0) {
            setActiveMode('value');

            // Clear percentage when value is selected
            setDiscountPer('');
        } else {
            setActiveMode(null);
        }
    };

    // =========================
    // Save
    // =========================
    const handleSave = async () => {
        setDiscountPerError('');
        setDiscountValError('');

        if (!productId || !variantId) {
            Toast.show({
                type: 'error',
                text1: 'Product Required',
                text2: 'Please select a product first.',
            });
            return;
        }

        // Nothing entered
        if (!discountPer.trim() && !discountValue.trim()) {
            setDiscountPerError(
                'Enter discount % or discount value'
            );
            return;
        }

        // =========================
        // Percentage validation
        // =========================
        if (activeMode === 'percentage') {
            const per = parseFloat(discountPer);

            if (isNaN(per)) {
                setDiscountPerError(
                    'Enter a valid discount percentage'
                );
                return;
            }

            if (per < 0 || per >= 100) {
                setDiscountPerError(
                    'Discount percentage must be between 0 and 99'
                );
                return;
            }
        }

        // =========================
        // Value validation
        // =========================
        if (activeMode === 'value') {
            const value = parseFloat(discountValue);

            if (isNaN(value) || value < 0) {
                setDiscountValError(
                    'Enter a valid discount value'
                );
                return;
            }
        }

        try {
            setLoading(true);

            const body = {
                productId: productId,
                variantId: variantId,

                // Send only the active discount type
                discountPercentage:
                    activeMode === 'percentage'
                        ? parseFloat(discountPer)
                        : '',

                discountValue:
                    activeMode === 'value'
                        ? parseFloat(discountValue)
                        : '',
            };

            console.log(
                'UPDATE TEMP PRODUCT DISCOUNT BODY =====>',
                body
            );

            const response = await postMethod(
                ApiServices.zenxposUpdateTempProductDiscount,
                body
            );

            console.log(
                'UPDATE TEMP PRODUCT DISCOUNT RESPONSE =====>',
                response
            );

            if (response?.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Discount Updated',
                    text2:
                        response?.message ||
                        'Discount updated successfully.',
                });

                onClose?.();
                onSuccess?.(activeMode);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Discount Error',
                    text2:
                        response?.message ||
                        'Failed to update discount.',
                });
            }
        } catch (error) {
            console.log(
                'Update Product Discount Error:',
                error
            );

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Unable to update discount.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            transparent
            animationType="fade"
            visible={isVisible}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text
                            allowFontScaling={false}
                            style={styles.modalTitle}
                        >
                            Add Discount
                        </Text>

                        <TouchableOpacity onPress={onClose}>
                            <CrossIcon />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <KeyboardAwareScrollView
                        contentContainerStyle={styles.scrollContent}
                        enableOnAndroid
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >

                        {/* =========================
                            Discount Percentage
                        ========================= */}
                        <Text
                            allowFontScaling={false}
                            style={styles.label}
                        >
                            Discount %{' '}
                            <Text style={styles.required}>*</Text>
                        </Text>

                        <TextInput
                            placeholder="Enter discount %"
                            placeholderTextColor="#9A9A9A"
                            style={[
                                styles.input,
                                isPerDisabled &&
                                    styles.disabledInput,
                            ]}
                            value={discountPer}
                            onChangeText={handleDiscountPerChange}
                            maxLength={5}
                            keyboardType="decimal-pad"
                            editable={!isPerDisabled}
                        />

                        {!!discountPerError && (
                            <Text style={styles.errorText}>
                                {discountPerError}
                            </Text>
                        )}

                        {/* =========================
                            Discount Value
                        ========================= */}
                        <Text
                            allowFontScaling={false}
                            style={styles.label}
                        >
                            Discount Value{' '}
                            <Text style={styles.required}>*</Text>
                        </Text>

                        <TextInput
                            placeholder="Enter discount value"
                            placeholderTextColor="#9A9A9A"
                            style={[
                                styles.input,
                                isValDisabled &&
                                    styles.disabledInput,
                            ]}
                            value={discountValue}
                            onChangeText={handleDiscountValueChange}
                            maxLength={10}
                            keyboardType="decimal-pad"
                            editable={!isValDisabled}
                        />

                        {!!discountValError && (
                            <Text style={styles.errorText}>
                                {discountValError}
                            </Text>
                        )}

                        {/* Save */}
                        <TouchableOpacity
                            style={[
                                styles.primaryBtn,
                                loading && {
                                    opacity: 0.7,
                                },
                            ]}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator
                                    color="#FFFFFF"
                                    size="small"
                                />
                            ) : (
                                <Text style={styles.primaryText}>
                                    Save
                                </Text>
                            )}
                        </TouchableOpacity>

                    </KeyboardAwareScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default UpdateProductDiscountModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalContainer: {
        width: wp(40),
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: rV(12),
        paddingHorizontal: rS(14),
    },

    modalTitle: {
        fontSize: 18,
        fontFamily: Fonts.FigtreeMedium,
        color: '#080808',
    },

    divider: {
        borderBottomColor: '#D9D9D9',
        borderBottomWidth: 0.8,
    },

    scrollContent: {
        paddingBottom: rV(18),
    },

    label: {
        fontSize: 14,
        paddingHorizontal: rS(14),
        marginTop: rV(12),
        marginBottom: rV(5),
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },

    required: {
        color: '#E71414',
    },

    input: {
        height: rV(28),
        borderColor: '#C0C0C0',
        borderWidth: 1,
        borderRadius: 8,
        marginHorizontal: rS(14),
        paddingHorizontal: rS(10),
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        backgroundColor: '#FFFFFF',
    },

    disabledInput: {
        backgroundColor: '#F5F5F5',
        borderColor: '#E0E0E0',
        color: '#9A9A9A',
    },

    primaryBtn: {
        backgroundColor: '#264B79',
        height: rV(25),
        width: wp(15),
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginTop: rV(22),
    },

    primaryText: {
        color: '#FFFFFF',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 14,
    },

    errorText: {
        color: 'red',
        fontSize: 12,
        marginTop: rV(4),
        fontFamily: Fonts.FigtreeRegular,
        marginHorizontal: rS(14),
    },
});