import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native'
import React, { useCallback, useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import CustomHeader from '../components/CustomHeader'
import { rS, rV } from '../constants/responsive'
import Fonts from '../constants/Fonts'
import { Dropdown } from 'react-native-element-dropdown'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import CalenderIcon from '../assets/Icons/CalenderIcon'
import RadioIcon from '../assets/Icons/RadioIcon'
import UnRadioIcon from '../assets/Icons/UnRadioIcon'
import { HelperModule } from '../helper/HelperModule'
import ApiServices from '../helper/ApiServices'
import Toast from 'react-native-toast-message';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

export default function CustomerFormScreen() {
    const navigation = useNavigation()
    const dispatch = useDispatch()
    const route = useRoute();
    const customerData = route.params?.customerData;
    const { postMethod } = HelperModule()
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [mobile, setMobile] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [city, setCity] = useState('')
    const [address, setAddress] = useState('')
    const [gstNo, setGSTNo] = useState('')
    const [discount, setDiscount] = useState('0')
    const [creditLimit, setCreditLimit] = useState('0')
    const [creditDays, setCreditDays] = useState('')
    const [outStandingBal, setOutStandingBal] = useState('')
    const [birthday, setBirthday] = useState('')
    const [anniversary, setAnniversary] = useState('')
    const customerTypeData = [
        { label: 'Regular', value: '1' },
        { label: 'Whole-Sale', value: '2' },
    ];

    const tableData = [
        { label: 'T1', value: '1' },
        { label: 'T2', value: '2' },
    ];
    const [preferredTable, setPreferredTable] = useState('')
    const [customerType, setCustomerType] = useState('1');
    const [status, setStatus] = useState('Active');

    console.log('Customer Data in Form Screen ===>', customerData);
   
    
     const resetForm = useCallback(() => {
        setMobile('');
        setCustomerName('');
        setCity('');
        setAddress('');
        setGSTNo('');
        setDiscount('0');
        setCreditLimit('0');
        setCreditDays('');
        setOutStandingBal('');
        setBirthday('');
        setAnniversary('');
        setPreferredTable('');
        setCustomerType('1');
        setStatus('Active');
        setErrors({});
    }, []);

     useFocusEffect(
        useCallback(() => {
            setErrors({})
            // If there is no customerData in the route params, it's a "New" entry
            if (!route.params?.customerData) {
                resetForm();
            }
        }, [route.params?.customerData, resetForm])
    );



    useEffect(() => {
        if (customerData) {
            setMobile(customerData.mobile || '')
            setCustomerName(customerData.customerName || '')
            setCity(customerData.city || '')
            setAddress(customerData.address || '')
            setGSTNo(customerData.gst || '')
            setDiscount(customerData.discount.toString() || '')
            setCreditLimit(customerData.creditLimit?.toString() || '')
            setCreditDays(customerData.creditDays?.toString() || '')
            setOutStandingBal(customerData.outstandingAmount?.toString() || '')
            setBirthday(customerData.birthday?.toString() || '')
            setAnniversary(customerData.anniversary?.toString() || '')
            setCustomerType(customerData.customerType?.toString() || null);
            setPreferredTable(customerData.preferredTable || '')
            setStatus(customerData.status === 1 ? 'Active' : 'In-Active')
        }
    }, [customerData])

    const user = useSelector(state => state.auth.user);

    const businessTypeId = user?.businessTypeId;

    console.log('BUSINESS TYPE ID ===>', businessTypeId);

    const validateForm = () => {
        let tempErrors = {};
        const mobileRegex = /^[6-9]\d{9}$/;

        if (!mobile) {
            tempErrors.mobile = "Mobile number is required";
        }
        if (!mobileRegex.test(mobile)) {
            tempErrors.mobile = "Mobile number must be 10 digits and start with 6, 7, 8, or 9.";
        }
        if (!city.trim()) {
            tempErrors.city = "The city field is required.";
        }
        if (!discount.trim()) {
            tempErrors.discount = "The discount field must be between 1 and 100.";
        }
        if (!customerName.trim()) {
            tempErrors.customerName = "Customer name is required";
        } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9]+$/.test(customerName.trim())) {
            tempErrors.customerName = "Customer name must contain at least one letter and only letters/numbers are allowed";
        }
        if (!customerType) {
            tempErrors.customerType = "Customer type is required";
        }
        if ((businessTypeId === 3 || businessTypeId === 4) && !creditLimit) {
            tempErrors.creditLimit = "Credit Limit is required";
        }
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSaveCustomer = async () => {
        setErrors({});
        if (!validateForm()) return;
        setLoading(true);
        const isEditing = !!customerData;
        const apiUrl = isEditing ? ApiServices.zenxposUpdateCustomer : ApiServices.zenxposAddCustomer;
        const payload = {
            customerName: customerName,
            mobile: mobile,
            city: city,
            address: address,
            gst: gstNo,
            discount: parseFloat(discount) || 0,
            customerType: parseInt(customerType),
            creditLimit: parseFloat(creditLimit) || 0,
            creditDays: parseInt(creditDays) || 0,
            outstandingAmount: parseFloat(outStandingBal) || 0,
            birthday: birthday,
            anniversary: anniversary,
            preferredTable: preferredTable || "",
            status: status === 'Active' ? 1 : 0
        };
        if (isEditing) {
            payload.id = customerData.id;
        }
        try {
            const response = await postMethod(apiUrl, payload);
            if (response.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: response?.message,
                });
                navigation.navigate('CustomerScreen');
            } else {
                setErrors({ general: response.message || "Something went wrong" });
            }
        } catch (error) {
            console.log("API Error Object:", error.response?.data);
            const backendErrorMessage = error.response?.data?.errors || error.response?.data?.message || "Failed to connect to the server";
            setErrors({ general: backendErrorMessage });
        } finally {
            setLoading(false);
        }
    };

    const formatDateInput = (text) => {
        const cleaned = text.replace(/\D/g, '').slice(0, 8);
        if (cleaned.length <= 2) {
            return cleaned;
        } else if (cleaned.length <= 4) {
            return `${cleaned.slice(0, 2)}-${cleaned.slice(2)}`;
        } else {
            return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 4)}-${cleaned.slice(4)}`;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <CustomHeader />
            <View style={styles.subContainer}>
                {/* Top Header */}
                <View style={styles.customerRowContainer}>
                    <View>
                        <Text style={styles.customerText}>Customers</Text>

                        <Text style={styles.customerSubText}>
                            Create or Manage Customers
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.newManageTouchable} onPress={() => navigation.navigate('CustomerScreen')} >
                        <Text style={styles.addNewManageText}>
                            Manage Customers
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.formContainer}>
                    <KeyboardAwareScrollView
                        enableOnAndroid={true}
                        extraScrollHeight={20}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.formSubContainer}>
                            {/* <Text style={styles.basicDetailsText}>BASIC Details</Text> */}
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Mobile Number <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter mobile number"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, { marginRight: rS(20) }]}
                                        value={mobile}
                                        onChangeText={(val) => {
                                            setMobile(val.replace(/[^0-9]/g, ''));
                                            if (errors.mobile) setErrors({ ...errors, mobile: null });
                                        }}
                                        maxLength={10}
                                        keyboardType="numeric"
                                    />
                                    {errors.mobile && <Text style={styles.errorText}>{errors.mobile}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Customer Name <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter customer name"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, { marginRight: rS(20) }]}
                                        value={customerName}
                                        onChangeText={(val) => {
                                            const filteredText = val.replace(/[^A-Za-z0-9 ]/g, '');
                                            setCustomerName(filteredText);
                                            if (errors.customerName) setErrors({ ...errors, customerName: null });
                                        }}
                                    />
                                    {errors.customerName && <Text style={styles.errorText}>{errors.customerName}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        City <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter your city"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={styles.input}
                                        value={city}
                                        // onChangeText={setCity}
                                        onChangeText={(val) => {
                                            setCity(val);
                                            if (errors.city) setErrors({ ...errors, city: null });
                                        }}
                                    />
                                    {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
                                </View>
                            </View>
                            <Text allowFontScaling={false} style={styles.label}>
                                Address
                            </Text>
                            <TextInput
                                placeholder="Enter address"
                                placeholderTextColor={'#9A9A9A'}
                                style={styles.input}
                                value={address}
                                onChangeText={setAddress}
                            />
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        GST No
                                    </Text>
                                    <TextInput
                                        placeholder="Enter GST.No"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, { marginRight: rS(20) }]}
                                        value={gstNo}
                                        maxLength={15}
                                        onChangeText={setGSTNo}
                                    />
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Discount% <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter discount"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, { marginRight: rS(20) }]}
                                        value={discount}
                                        maxLength={2}
                                        keyboardType="numeric"
                                        onChangeText={(val) => {
                                            setDiscount(val);
                                            if (errors.discount) setErrors({ ...errors, discount: null });
                                        }}
                                    />
                                    {errors.discount && <Text style={styles.errorText}>{errors.discount}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Customer Type <Text style={styles.required}>*</Text>
                                    </Text>
                                    <Dropdown
                                        style={styles.dropdown}
                                        data={customerTypeData}
                                        labelField="label"
                                        valueField="value"
                                        placeholder="Select Customer Type"
                                        value={customerType}
                                        onChange={item => {
                                            setCustomerType(item.value);
                                            if (errors.customerType) setErrors({ ...errors, customerType: null });
                                        }}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        itemTextStyle={styles.itemTextStyle}
                                        iconColor='#1B1B1B'
                                    />
                                    {errors.customerType && <Text style={styles.errorText}>{errors.customerType}</Text>}
                                </View>
                            </View>
                            {(businessTypeId === 3 || businessTypeId === 4) && (
                                <View style={styles.firstRowContainer}>
                                    <View style={{ flex: 0.35 }}>
                                        <Text allowFontScaling={false} style={styles.label}>
                                            Credit Limit <Text style={styles.required}>*</Text>
                                        </Text>
                                        <TextInput
                                            placeholder="Enter credit limit"
                                            placeholderTextColor={'#9A9A9A'}
                                            style={[styles.input, { marginRight: rS(20) }]}
                                            value={creditLimit}
                                            keyboardType='numeric'
                                            onChangeText={(val) => {
                                                setCreditLimit(val);
                                                if (errors.creditLimit) setErrors({ ...errors, creditLimit: null });
                                            }}
                                        />
                                        {errors.creditLimit && <Text style={styles.errorText}>{errors.creditLimit}</Text>}
                                    </View>
                                    <View style={{ flex: 0.35 }}>
                                        <Text allowFontScaling={false} style={styles.label}>
                                            Credit Days
                                        </Text>
                                        <TextInput
                                            placeholder="Enter credit days"
                                            placeholderTextColor={'#9A9A9A'}
                                            style={[styles.input, { marginRight: rS(20) }]}
                                            value={creditDays}
                                            onChangeText={setCreditDays}
                                        />
                                    </View>
                                    <View style={{ flex: 0.35 }}>
                                        <Text allowFontScaling={false} style={styles.label}>
                                            Out Standing Balance
                                        </Text>
                                        <TextInput
                                            placeholder="Enter out standing balance"
                                            placeholderTextColor={'#9A9A9A'}
                                            style={styles.input}
                                            value={outStandingBal}
                                            onChangeText={setOutStandingBal}
                                        />
                                    </View>
                                </View>)}
                            {(businessTypeId === 1 || businessTypeId === 2) && (
                                <View style={styles.firstRowContainer}>
                                    <View style={{ flex: 0.35 }}>
                                        <Text allowFontScaling={false} style={styles.label}>
                                            Birthday
                                        </Text>
                                        <TextInput
                                            placeholder="DD-MM-YYYY"
                                            placeholderTextColor={'#9A9A9A'}
                                            style={[styles.input, { marginRight: rS(20) }]}
                                            value={birthday}
                                            onChangeText={text => {
                                                const formatted = formatDateInput(text);
                                                setBirthday(formatted);
                                            }}
                                        />
                                    </View>
                                    <View style={{ flex: 0.35 }}>
                                        <Text allowFontScaling={false} style={styles.label}>
                                            Anniversary
                                        </Text>
                                        <TextInput
                                            placeholder="DD-MM-YYYY"
                                            placeholderTextColor={'#9A9A9A'}
                                            style={[styles.input, { marginRight: rS(20) }]}
                                            value={anniversary}
                                            onChangeText={setAnniversary}
                                        />
                                    </View>
                                    {businessTypeId === 2 && (
                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                Preferred Table
                                            </Text>
                                            <Dropdown
                                                style={styles.dropdown}
                                                data={tableData}
                                                labelField="label"
                                                valueField="value"
                                                placeholder="Select Type"
                                                value={preferredTable}
                                                onChange={item => setPreferredTable(item.value)}
                                                placeholderStyle={styles.placeholderStyle}
                                                selectedTextStyle={styles.selectedTextStyle}
                                                itemTextStyle={styles.itemTextStyle}
                                                iconColor='#1B1B1B'
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                            <View style={styles.statusRow}>
                                <Text style={styles.statusLabel}>Change Status:</Text>
                                {/* Active */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.radioContainer}
                                    onPress={() => {
                                        setStatus('Active');
                                    }}>
                                    {status === 'Active' ? <RadioIcon /> : <UnRadioIcon />}
                                    <Text style={styles.radioText}>Active</Text>
                                </TouchableOpacity>
                                {/* Inactive */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.radioContainer}
                                    onPress={() => {
                                        setStatus('In-Active');
                                    }}
                                >
                                    {status === 'In-Active' ? <RadioIcon /> : <UnRadioIcon />}
                                    <Text style={styles.radioText}>In-Active</Text>
                                </TouchableOpacity>
                            </View>
                            {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
                            <TouchableOpacity
                                style={styles.saveTouchable}
                                onPress={handleSaveCustomer}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.saveText}>{customerData ? 'Update Changes' : 'Save'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                        {/* </ScrollView> */}
                    </KeyboardAwareScrollView>
                </View>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    subContainer: {
        flex: 1,
        backgroundColor: '#F9F9F9',
        paddingHorizontal: rS(12),
        paddingBottom: rV(10),
        borderTopColor: '#F4F4F4',
        borderTopWidth: 1,
    },
    customerRowContainer: {
        flexDirection: 'row',
        marginTop: rV(10),
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    customerText: {
        color: '#000000',
        fontFamily: Fonts.FigtreeSemiBold,
        fontSize: 22,
    },
    customerSubText: {
        color: '#919191',
        fontSize: 12,
        fontFamily: Fonts.FigtreeRegular,
        marginTop: rV(2),
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        marginBottom: rV(10),
    },
    newManageTouchable: {
        flexDirection: 'row',
        borderColor: '#264B79',
        borderWidth: 1,
        borderRadius: 8,
        height: rV(27),
        alignItems: 'center',
        paddingHorizontal: rS(10),
    },
    addNewManageText: {
        marginLeft: rS(4),
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        color: '#264B79',
    },
    formContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginTop: rV(14)
    },
    formSubContainer: {
        marginHorizontal: rS(14),
        marginVertical: rV(16),
    },
    basicDetailsText: {
        fontSize: 18,
        fontFamily: Fonts.FigtreeSemiBold,
        textTransform: 'uppercase',
        color: '#264B79',
        marginBottom: rV(10)
    },
    firstRowContainer: {
        flexDirection: 'row',
    },
    label: {
        fontSize: 14,
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
        paddingHorizontal: rS(10),
        fontSize: 16,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        backgroundColor: '#FFFFFF',
        marginBottom: rV(10)
    },
    dropdown: {
        height: rV(28),
        borderColor: '#C0C0C0',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: rS(10),
        fontSize: 16,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        backgroundColor: '#FFFFFF',
        marginBottom: rV(10)
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
    saveTouchable: {
        backgroundColor: '#264B79',
        borderRadius: 8,
        paddingVertical: rV(8),
        width: rS(100),
        alignSelf: 'flex-end',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: rV(10),
        marginBottom: rV(10),
    },
    saveText: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        color: '#FFFFFF',
        textAlign: 'center',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: rV(10),
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
    radioText: {
        marginLeft: rS(6),
        fontSize: 16,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },
});