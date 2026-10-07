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
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule';
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddNewTaxModal = ({ isVisible, onClose, onSuccess, editData }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('Active');
    const [taxName, setTaxName] = useState('')
    const [taxCode, setTaxCode] = useState('')
    const [taxGST, setTaxGST] = useState('')
    const [taxNameError, setTaxNameError] = useState('')
    const [taxCodeError, setTaxCodeError] = useState('')
    const [taxGSTError, setTaxGSTError] = useState('')
    const [serverError, setServerError] = useState('');

    React.useEffect(() => {
        setTaxCodeError('');
        setTaxNameError('');
        setTaxGSTError('');
        setServerError('');
        if (editData) {
            setTaxCode(editData.taxCode);
            setTaxName(editData.taxName);
            setTaxGST(editData.taxPercent?.toString());
            setStatus(editData.status === 1 ? 'Active' : 'Inactive');
        } else {
            setTaxName('');
            setTaxCode('');
            setTaxGST('');
            setStatus('Active');
        }
    }, [editData, isVisible]);

    const handleSave = async () => {
        try {
            let isValid = true;
            setTaxCodeError('');
            setTaxNameError('');
            setTaxGSTError('');
            setServerError('');

            if (!taxCode.trim()) {
                setTaxCodeError('Please enter tax code');
                isValid = false;
            } else if (!/^\d+$/.test(taxCode.trim())) {
                setTaxCodeError('Tax code must contain only numbers');
                isValid = false;
            }
            if (!taxName.trim()) {
                setTaxNameError('Please enter tax name');
                isValid = false;
            } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9\s%]+$/.test(taxName.trim())) {
                setTaxNameError(
                    'Tax name must contain at least one letter and only letters, numbers, spaces and % are allowed'
                );
                isValid = false;
            }
            if (!taxGST.trim()) {
                setTaxGSTError('Please enter tax GST percentage');
                isValid = false;
            }
            if (!isValid) return;
            setLoading(true);
            const isEditing = !!editData;
            const apiUrl = isEditing ? ApiServices.zenxposUpdateTax : ApiServices.zenxposAddTax;

            const payload = {
                taxName: taxName,
                taxCode: taxCode,
                taxPercent: taxGST,
                status: status === 'Active' ? 1 : 0,
            };
            if (isEditing) {
                payload.id = editData.id;
            }
            const response = await postMethod(apiUrl, payload);
            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'Tax added successfully' });
                setTaxName('');
                setTaxCode('');
                setTaxGST('');
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
                            {editData ? 'Edit Tax' : 'Create Tax'}
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
                        {/* Tax Code */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Tax Code <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder="Enter tax code"
                            placeholderTextColor={'#9A9A9A'}
                            style={
                                styles.input
                            }
                            value={taxCode}
                            onChangeText={text => {
                                const filteredText = text.replace(/[^0-9]/g, '');
                                setTaxCode(filteredText);

                                if (taxCodeError) {
                                    setTaxCodeError('');
                                }
                                if (serverError) {
                                    setServerError('')
                                }
                            }}
                        />
                        {taxCodeError ? (
                            <Text style={styles.errorText}>
                                {taxCodeError}
                            </Text>
                        ) : null}
                        {/* Tax Name */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Tax Name <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder="Enter tax name"
                            placeholderTextColor={'#9A9A9A'}
                            style={styles.input}
                            value={taxName}
                            onChangeText={text => {
                                const filteredText = text.replace(/[^A-Za-z0-9\s%]/g, '');
                                setTaxName(filteredText);
                                if (taxNameError) {
                                    setTaxNameError('');
                                }
                                if (serverError) {
                                    setServerError('');
                                }
                            }}
                        />
                        {taxNameError ? (
                            <Text style={styles.errorText}>
                                {taxNameError}
                            </Text>
                        ) : null}
                        {/* GST% */}
                        <Text allowFontScaling={false} style={styles.label}>
                            GST% <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder="Enter gst"
                            placeholderTextColor={'#9A9A9A'}
                            style={styles.input}
                            value={taxGST}
                            maxLength={3}
                            keyboardType="numeric"
                            onChangeText={text => {
                                const filteredText = text.replace(/[^0-9]/g, '');
                                setTaxGST(filteredText);
                                if (taxGSTError) {
                                    setTaxGSTError('');
                                }
                                if (serverError) {
                                    setServerError('');
                                }
                            }}
                        />
                        {taxGSTError ? (
                            <Text style={styles.errorText}>
                                {taxGSTError}
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

export default AddNewTaxModal;

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