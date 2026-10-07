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
import React, { useEffect, useState } from 'react';
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


const AddSuspendModal = ({ isVisible, onClose, onSuspendSuccess }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [mobileNumber, setMobileNumber] = useState('')
    const [customerName, setCustomerName]=useState('')
    const [error, setError]=useState('')
    const [serverError, setServerError]=useState('')

    useEffect(() => {
        if (!isVisible) {
            setMobileNumber('');
            setCustomerName('');
            setError('');
            setServerError('')
        }
    }, [isVisible]);

  const handleSave = async () => {
    if (!mobileNumber.trim() && !customerName.trim()) {
        setError('*Any one field is mandatory');
        return;
    }

    setError('');
    setServerError('');
    
    try {
        setLoading(true);
        const body = {
            customerName: customerName,
            customerMobile: mobileNumber,
        };

        const response = await postMethod(ApiServices.zenxposSuspendBill, body);
        console.log(":::::Suspend response::::::", response)
        if (response?.success) {
            Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'Bill suspended successfully.' });
            if(onSuspendSuccess) {
                onSuspendSuccess();
            }
            onClose();
        } else {
            const errorMsg = response?.errors || response?.message || 'Failed to suspend bill';
            setServerError(errorMsg);
        }
    } catch (err) {
        console.log("Suspend Error Details:", err);
        const apiThrownError = err?.response?.data?.errors || err?.response?.data?.message;
        if (apiThrownError) {
            setServerError(apiThrownError);
        } else {
            Toast.show({ type: 'error', text1: 'Error', text2: "Something went wrong. Please try again." });
        }
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
                            Suspend
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
                    <Text allowFontScaling={false} style={styles.label}>
                        Mobile Number <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Enter mobile number"
                        placeholderTextColor={'#9A9A9A'}
                        style={
                            styles.input
                        }
                        value={mobileNumber}
                        onChangeText={text => {
                            setMobileNumber(text);
                            setServerError('')
                            if(error){
                                setError('');
                            }
                        }}
                        maxLength={10}
                        keyboardType='numeric'
                    />
                    <Text allowFontScaling={false} style={styles.label}>
                        Customer Name <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Enter customer name"
                        placeholderTextColor={'#9A9A9A'}
                        style={
                            styles.input
                        }
                        value={customerName}
                        onChangeText={text => {
                            setCustomerName(text);
                            setServerError('')
                            if(error){
                                setError('');
                            }
                        }}

                    />
                     {error ? <Text style={styles.errorText}>{error}</Text> : null}
                        {serverError ? (
                            // <View style={styles.serverErrorContainer}>
                                <Text style={styles.serverErrorText}>{serverError}</Text>
                            // </View>
                        ) : null}
                    {/* <Text style={{fontSize:13, fontFamily:Fonts.FigtreeMedium, color:'#AE2222',marginHorizontal: rS(14),marginTop:rV(5)}}>*Any one field is mandatory</Text> */}

                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={handleSave}
                        disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.primaryText}>{'Save'}</Text>
                        )}
                    </TouchableOpacity>
                    </KeyboardAwareScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AddSuspendModal;

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
    row: {
        flexDirection: 'row',
        paddingHorizontal: rS(14),
        justifyContent: 'space-between',
        marginTop: rV(12),
    },
    column: {
        width: '48%', // Splits the row
    },
    rowLabel: {
        fontSize: 14,
        marginBottom: rV(5),
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },
    rowInput: {
        height: rV(28),
        borderColor: '#C0C0C0',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: rS(10),
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
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
        color: '#AE2222',
        fontSize: 14,
        marginTop: rV(4),
        fontFamily: Fonts.FigtreeRegular,
        marginHorizontal: rS(14)
    },
    serverErrorText: {
        marginTop: rV(15),
        color: '#AE2222',
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        textAlign: 'center',
    },
});