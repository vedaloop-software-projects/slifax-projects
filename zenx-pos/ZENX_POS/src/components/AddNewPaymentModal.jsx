import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';
import React, { useState } from 'react';
import Fonts from '../constants/Fonts';
import CrossIcon from '../assets/Icons/CrossIcon';
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { rS, rV } from '../constants/responsive';
import RadioIcon from '../assets/Icons/RadioIcon'
import UnRadioIcon from '../assets/Icons/UnRadioIcon'
import { Dropdown } from 'react-native-element-dropdown';
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddNewPaymentModal = ({ isVisible, onClose, onSuccess, editData }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('Active');
    const [paymentMode, setPaymentMode] = useState('')
    const [allowChange, setAllowChange] = useState(null);
    const [paymentTypeError, setPaymentTypeError] = useState('')
    const [allowChangeError, setAllowChangeError] = useState('')
    const [serverError, setServerError] = useState('');
    React.useEffect(() => {
        setPaymentTypeError('');
        setAllowChangeError('')
        setServerError('');
        if (editData) {
            setPaymentMode(editData.paymentMode);
            setAllowChange(editData.allowChange === 1 ? '1' : '0')
            setStatus(editData.status === 1 ? 'Active' : 'Inactive');
        } else {
            setPaymentMode('');
            setAllowChange(null);
            setStatus('Active');
        }
    }, [editData, isVisible]);

    const allowChangeData = [
        { label: 'Yes', value: '1' },
        { label: 'No', value: '0' },
    ];

    const handleSave = async () => {
        try {
            let isValid = true;
            setPaymentTypeError('');
            setAllowChangeError('')
            setServerError('');
            if (!paymentMode.trim()) {
                setPaymentTypeError('Please enter payment type');
                isValid = false;
            } else if (!/^[A-Za-z\s]+$/.test(paymentMode.trim())) {
                setPaymentTypeError('Payment type should contain only alphabets');
                isValid = false;
            }
            if (!allowChange) {
                setAllowChangeError('Please select allow change');
                isValid = false;
            }
            if (!isValid) return;
            setLoading(true);
            const isEditing = !!editData;
            const apiUrl = isEditing ? ApiServices.zenxposUpdatePaymentMode : ApiServices.zenxposAddPaymentMode;
            const payload = {
                paymentMode: paymentMode,
                allowChange: allowChange === '1' ? 1 : 0,
                status: status === 'Active' ? 1 : 0,
            };
            if (isEditing) {
                payload.id = editData.id;
            }
            const response = await postMethod(apiUrl, payload);
            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'Payment type added successfully' });
                setPaymentMode('');
                setAllowChange(null);
                setStatus('Active');
                onClose();
                onSuccess && onSuccess();
            } else {
                setServerError(response?.errors || response?.message || "Something went wrong");
            }
        } catch (error) {
            console.log('CATCH ERROR:', error.response);
            const backendError = error?.response?.data?.errors || error?.response?.data?.message || error?.message;

            setServerError(backendError || "An unexpected error occurred.");
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
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text allowFontScaling={false} style={styles.modalTitle}>
                            {editData ? 'Edit Payment Mode' : 'Create Payment Mode'}
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
                        {/* Payment Code */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Payment Type <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder="Enter payment type"
                            placeholderTextColor={'#9A9A9A'}
                            style={
                                styles.input
                            }
                            value={paymentMode}
                            onChangeText={text => {
                                const filteredText = text.replace(/[^a-zA-Z\s]/g, '');
                                setPaymentMode(filteredText);

                                if (paymentTypeError) {
                                    setPaymentTypeError('');
                                }
                                if (serverError) {
                                    setServerError('')
                                }
                            }}
                        />
                        {paymentTypeError ? (
                            <Text style={styles.errorText}>
                                {paymentTypeError}
                            </Text>
                        ) : null}
                        {/* Allow Change */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Allow Change <Text style={styles.required}>*</Text>
                        </Text>
                        <Dropdown
                            style={styles.dropdown}
                            containerStyle={{ marginTop: rV(-20) }}
                            data={allowChangeData}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Allow Change"
                            value={allowChange}
                            onChange={item => {
                                setAllowChange(item.value);
                                if (allowChangeError) {
                                    setAllowChangeError('');
                                }
                                if (serverError) {
                                    setServerError('');
                                }
                            }}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            itemTextStyle={styles.itemTextStyle}
                            iconColor="#1B1B1B"
                        />
                        {allowChangeError ? (
                            <Text style={styles.errorText}>
                                {allowChangeError}
                            </Text>
                        ) : null}
                        {/* Status */}
                        <View style={styles.statusRow}>
                            <Text style={styles.statusLabel}>Change Status:</Text>
                            {/* Active */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.radioContainer}
                                onPress={() => {
                                    setStatus('Active');
                                    setServerError('');
                                }}>
                                {status === 'Active' ? <RadioIcon /> : <UnRadioIcon />}
                                <Text style={styles.radioText}>Active</Text>
                            </TouchableOpacity>
                            {/* Inactive */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.radioContainer}
                                onPress={() => {
                                    setStatus('Inactive');
                                    setServerError('');
                                }}>
                                {status === 'Inactive' ? <RadioIcon /> : <UnRadioIcon />}
                                <Text style={styles.radioText}>Inactive</Text>
                            </TouchableOpacity>
                        </View>
                        {serverError ? (
                            <Text style={styles.serverErrorText}>{serverError}</Text>
                        ) : null}
                        {/* Save Button */}
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={handleSave}
                            disabled={loading}>
                            {loading ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.primaryText}>{editData ? 'Update Changes' : 'Save'}</Text>
                            )}
                        </TouchableOpacity>
                    </KeyboardAwareScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AddNewPaymentModal;

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
    dropdown: {
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
    placeholderStyle: {
        fontSize: 14,
        color: '#919191',
        fontFamily: Fonts.FigtreeRegular,
    },
    selectedTextStyle: {
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },
    itemTextStyle: {
        fontSize: 14,
        color: '#000',
        fontFamily: Fonts.FigtreeRegular,
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
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: rS(14),
        marginTop: rV(16),
    },
    statusLabel: {
        fontSize: 14,
        color: '#838383',
        fontFamily: Fonts.FigtreeRegular,
        marginRight: rS(12),
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: rS(18),
    },
    outerCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: '#CFCFCF',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    innerCircle: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#264B79',
    },
    radioText: {
        marginLeft: rS(6),
        fontSize: 16,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
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
    serverErrorText: {
        marginTop: rV(15),
        color: 'red',
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        textAlign: 'center',
    },
});