import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
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

const AddNewCustomerModal = ({ isVisible, onClose, onSelectCustomer }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [mobileNumber, setMobileNumber] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [address, setAddress] = useState('')
    const [gstNo, setGstNo] = useState('');
    const [discount, setDiscount] = useState('');
    const [searching, setSearching] = useState(false);
    const [isExisting, setIsExisting] = useState(false)
    const [customerType, setCustomerType] = useState(1)
    const [customerId, setCustomerId]=useState(null);

    useEffect(() => {
        if (mobileNumber.length === 10) {
            fetchCustomerDetails(mobileNumber);
        } else {
            setIsExisting(false)
        }
    }, [mobileNumber]);

    const fetchCustomerDetails = async (mobile) => {
        setSearching(true);
        try {
            const body = {
                searchStr: mobile,
                status: "1",
                page: "",
                customerType: ""
            };
            const response = await postMethod(ApiServices.zenxposGetCustomers, body);
            console.log(":::::::: fetch customer details::::", response)

            if (response?.success && response.data?.customers?.length > 0) {
                const cust = response.data.customers[0];
                // Auto-fill details
                setCustomerName(cust.customerName || '');
                setAddress(cust.address || '')
                setGstNo(cust.gst || '')
                setDiscount(cust.discount?.toString() || '');
                setCustomerType(cust.customerType);
                setCustomerId(cust.id);
                setIsExisting(true)
                Toast.show({ type: 'info', text1: 'Customer details found' });
            } else {
                setIsExisting(false)
                setCustomerId(null)
                setCustomerType(1)
            }
        } catch (error) {
            console.log('Lookup Error:', error);
        } finally {
            setSearching(false);
        }
    };
    


const handleSave = async () => {
    if (!mobileNumber || !customerName) {
        Toast.show({
            type: 'error',
            text1: 'Please fill required fields',
        });
        return;
    }

    // Existing customer must have an ID
    if (isExisting && !customerId) {
        Toast.show({
            type: 'error',
            text1: 'Customer ID not found',
        });
        return;
    }

    setLoading(true);

    try {
        const body = {
            ...(isExisting && { id: customerId }),

            customerName: customerName,
            mobile: mobileNumber,
            city: '',
            address: address,
            gst: gstNo,
            discount: discount || '',
            customerType: customerType,
            creditLimit: '',
            creditDays: '',
            outstandingAmount: '',
            birthday: '',
            anniversary: '',
            preferredTable: '',
            status: 1,
        };

        console.log(
            isExisting
                ? 'UPDATE CUSTOMER REQUEST:'
                : 'ADD CUSTOMER REQUEST:',
            body,
        );

        const api = isExisting
            ? ApiServices.zenxposUpdateCustomer
            : ApiServices.zenxposAddCustomer;

        const response = await postMethod(api, body);

        console.log(
            isExisting
                ? 'UPDATE CUSTOMER RESPONSE:'
                : 'ADD CUSTOMER RESPONSE:',
            response,
        );

        if (response?.success) {
            Toast.show({
                type: 'success',
                text1:
                    response.message ||
                    (isExisting
                        ? 'Customer updated successfully'
                        : 'Customer saved successfully'),
            });

            // For new customer, get ID from response.
            // For existing customer, use existing customerId.
            const newId =
                customerId ||
                response.data?.id ||
                response.data?.customer?.id ||
                response.id ||
                null;

            onSelectCustomer({
                id: newId,
                customerName,
                mobile: mobileNumber,
                customerType,
                discount: parseFloat(discount) || 0,
            });

            resetForm();
            onClose();
        } else {
            const errorMessage =
                response?.errors ||
                response?.message ||
                'Failed to save customer';

            Toast.show({
                type: 'error',
                text1: 'Error',
                text2:
                    typeof errorMessage === 'string'
                        ? errorMessage
                        : JSON.stringify(errorMessage),
            });
        }
    } catch (error) {
        console.log('Customer Save/Update Error:', error);

        const serverError =
            error?.response?.data?.errors ||
            error?.response?.data?.message ||
            error?.message ||
            'An unexpected error occurred';

        Toast.show({
            type: 'error',
            text1: 'Request Failed',
            text2:
                typeof serverError === 'string'
                    ? serverError
                    : JSON.stringify(serverError),
        });
    } finally {
        setLoading(false);
    }
};

    const resetForm = () => {
        setMobileNumber('');
        setCustomerName('');
        setAddress('');
        setGstNo('');
        setDiscount('');
        setCustomerId(null)
        // setCity('');
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
                            Add Customer
                        </Text>

                        <TouchableOpacity onPress={() => { onClose(); resetForm(); }}>
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
                            }}

                        />
                        <Text allowFontScaling={false} style={styles.label}>
                            Address
                        </Text>
                        <TextInput
                            placeholder='Enter address'
                            placeholderTextColor={'#9A9A9A'}
                            style={styles.input}
                            value={address}
                            onChangeText={text => {
                                setAddress(text)
                            }}
                        />
                        <View style={styles.row}>
                            <View style={styles.column}>
                                <Text allowFontScaling={false} style={styles.rowLabel}>
                                    GST No
                                </Text>
                                <TextInput
                                    placeholder='GST No'
                                    placeholderTextColor={'#9A9A9A'}
                                    style={styles.rowInput}
                                    value={gstNo}
                                    maxLength={15}
                                    onChangeText={setGstNo}
                                />
                            </View>

                            <View style={styles.column}>
                                <Text allowFontScaling={false} style={styles.rowLabel}>
                                    Discount %
                                </Text>
                                <TextInput
                                    placeholder='Discount %'
                                    placeholderTextColor={'#9A9A9A'}
                                    style={styles.rowInput}
                                    value={discount}
                                    editable={false}
                                    onChangeText={setDiscount}
                                    keyboardType='numeric'
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={handleSave}
                            disabled={loading || searching}>
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

export default AddNewCustomerModal;

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