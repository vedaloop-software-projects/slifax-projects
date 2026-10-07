import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import Fonts from '../constants/Fonts';
import CrossIcon from '../assets/Icons/CrossIcon';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { rS, rV } from '../constants/responsive';
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Toast from 'react-native-toast-message';

const AddManualDiscount = ({ isVisible, onClose, onDiscountSuccess, initialData, subTotal }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [discountValue, setDiscountValue] = useState('');
    const [discountPer, setDiscountPer] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [activeMode, setActiveMode] = useState(null)

    useEffect(() => {
        if (isVisible) {
            const per = initialData?.per?.toString() || '';
            const val = initialData?.val?.toString() || '';
            setDiscountPer(per);
            setDiscountValue(val);
            setErrorMessage('');
            if (Number(per) > 0) {
                setActiveMode('percentage');
            }
            else if (Number(val) > 0) {
                setActiveMode('value');
            }
            else {
                setActiveMode(null);
            }
        }
    }, [isVisible, initialData]);

    const isPerDisabled = activeMode === 'value';
    const isValDisabled = activeMode === 'percentage';


   const handleSave = async () => {
    setErrorMessage('');

    if (!discountPer && !discountValue) {
        setErrorMessage("Please enter either Discount % or Discount Value");
        return;
    }

    if (discountPer !== '' && (parseFloat(discountPer) < 0 || parseFloat(discountPer) >= 100)) {
        setErrorMessage("Discount percentage must be between 0 and 99");
        return;
    }

    if (discountValue !== '' && parseFloat(discountValue) > subTotal) {
        setErrorMessage(`Discount value cannot exceed Subtotal (₹${subTotal})`);
        return;
    }

    try {
        setLoading(true);
        const body = {
            customerId: '',
            discountPercentage: activeMode === 'percentage' ? parseFloat(discountPer) : "",
            discountValue: activeMode === 'value' ? parseFloat(discountValue) : ""
        };

        const response = await postMethod(ApiServices.zenxposUpdateManualDiscount, body);
        console.log("::::::: update manual discount:::::: ", response)

        if (response?.success) {
            Toast.show({ type: 'success', text1: 'Success', text2: response?.message });
            onDiscountSuccess({ per: discountPer, val: discountValue });
            onClose();
        } else {
            const serverMsg = response?.errors || response?.message || "Failed to update discount";
            setErrorMessage(serverMsg);
        }
    } catch (error) {
        console.error("Discount Error Details:", error);
        const serverError = error?.response?.data?.errors || 
                            error?.response?.data?.message || 
                            error?.message || 
                            "Network error. Please try again.";

        setErrorMessage(serverError);
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
            statusBarTranslucent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text allowFontScaling={false} style={styles.modalTitle}>
                            Add Discount
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <CrossIcon />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.divider} />
                    <KeyboardAwareScrollView
                        contentContainerStyle={styles.scrollContent}
                        enableOnAndroid={true}
                        //   extraScrollHeight={20}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >

                        {/* Discount Percentage Field */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Discount % <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder={"Enter discount%"}
                            placeholderTextColor={'#9A9A9A'}
                            style={[
                                styles.input,
                                isPerDisabled && styles.disabledInput
                            ]}
                            value={discountPer}
                            onChangeText={(text) => {
                                setDiscountPer(text);
                                if (text.length > 0) {
                                    setActiveMode('percentage');
                                    setDiscountValue('');
                                } else {
                                    setActiveMode(null); 
                                }
                                setErrorMessage('');
                            }}
                            maxLength={5}
                            keyboardType='numeric'
                            editable={!isPerDisabled}
                        />

                        {/* Discount Value Field */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Discount Value  <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder={"Enter discount value"}
                            placeholderTextColor={'#9A9A9A'}
                            style={[
                                styles.input,
                                isValDisabled && styles.disabledInput
                            ]}
                            value={discountValue}
                            onChangeText={(text) => {
                                setDiscountValue(text);
                                if (text.length > 0) {
                                    setActiveMode('value');
                                    setDiscountPer('');
                                } else {
                                    setActiveMode(null);
                                }
                                setErrorMessage('');
                            }}
                            maxLength={5}
                            keyboardType='numeric'
                            editable={!isValDisabled}
                        />

                        {errorMessage !== '' && (
                            <Text style={styles.errorText}>{errorMessage}</Text>
                        )}

                        <TouchableOpacity
                            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
                            onPress={handleSave}
                            disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.primaryText}>Save</Text>
                            )}
                        </TouchableOpacity>
                    </KeyboardAwareScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AddManualDiscount;

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
        // paddingBottom: rV(18),
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
        flexGrow: 1,
        justifyContent: 'center',
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
        color: '#9A9A9A'
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
        fontSize: 14,
        marginTop: rV(4),
        fontFamily: Fonts.FigtreeRegular,
        marginHorizontal: rS(14)
    },
});