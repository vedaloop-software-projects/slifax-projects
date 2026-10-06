import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import CalenderIcon from '../assets/Icons/CalenderIcon'
import colors from '../constants/colors';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddNewCouponModal = ({ isVisible, onClose, onSuccess, editData }) => {
    const { postMethod, getMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [couponName, setCouponName] = useState('')
    const [couponCode, setCouponCode] = useState('')
    const [lockDays, setLockDays] = useState('')
    const [minAmount, setMinAmount] = useState('')
    const [discountPercentage, setDiscountPercentage] = useState('')
    const [discountValue, setDiscountValue] = useState('')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [tempFromDate, setTempFromDate] = useState(new Date());
    const [tempToDate, setTempToDate] = useState(new Date());
    const [fromDateError, setFromDateError] = useState('');
    const [toDateError, setToDateError] = useState('');
    const [couponNameError, setCouponNameError] = useState('')
    const [couponCodeError, setCouponCodeError] = useState('')
    const [lockDaysError, setLockDaysError] = useState('')
    const [minAmountError, setMinAmountError] = useState('')
    const [discountPercentageError, setDiscountPercentageError] = useState('')
    const [discountValueError, setDiscountValueError] = useState('')
    const [serverError, setServerError] = useState('');
    const [couponUsageTypeError, setCouponUsageTypeError] = useState('')
    const [couponUsageTypeData, setCouponUsageTypeData] = useState([]);
    const [couponUsageType, setCouponUsageType] = useState(null);
    const [validateMode, setValidateMode] = useState('')
    const [validateModeError, setValidateModeError] = useState('')
    const [status, setStatus] = useState('Active');

    const validateModeData = [
        { label: 'Calender', value: '1' },
        { label: 'Rolling', value: '2' },
    ];

    const getCouponUsageType = async () => {
        try {
            const response = await getMethod(
                ApiServices.zenxposGetCouponUsageTypes,
            );

            console.log('COUPON USAGE TYPE RESPONSE =====>', response);

            if (response?.success) {
                const formattedData = response.data.map(item => ({
                    label: item.couponUsageType,
                    value: item.id,
                }));

                setCouponUsageTypeData(formattedData);
            }
        } catch (error) {
            console.log('COUPON USAGE TYPE ERROR =====>', error);
        }
    };

    React.useEffect(() => {
        setCouponNameError('');
        setCouponCodeError('')
        setDiscountPercentageError('')
        setDiscountValueError('')
        setFromDateError('')
        setToDateError('')
        setCouponUsageTypeError('')
        setValidateModeError('')
        setLockDaysError('')
        setMinAmountError('')
        setServerError('');
        if (isVisible) {
            getCouponUsageType();
        }
        if (editData) {
            setCouponName(editData.couponName || '');
            setCouponCode(editData.couponCode || '');
            setMinAmount(editData.minAmount?.toString() || '');
            setFromDate(editData.fromDate || '');
            setToDate(editData.toDate || '');
            setCouponUsageType(editData.couponUsageTypeId || null);
            setValidateMode(editData.validationMode?.toString() || '');
            setLockDays(editData.lockDays?.toString() || '');
            setStatus(editData.status === 1 ? 'Active' : 'In-Active');

            const percentage = editData.discountPercentage?.toString() || '';
            const value = editData.discountValue?.toString() || '';

            // Allow only one discount type
            if (percentage && percentage !== '0') {
                setDiscountPercentage(percentage);
                setDiscountValue('');
            } else if (value && value !== '0') {
                setDiscountValue(value);
                setDiscountPercentage('');
            } else {
                setDiscountPercentage('');
                setDiscountValue('');
            }

        } else {

            setCouponName('');
            setCouponCode('')
            setDiscountPercentage('')
            setDiscountValue('')
            setFromDate('')
            setToDate('')
            setCouponUsageType(null)
            setValidateMode('')
            setLockDays('')
            setMinAmount('')
            setStatus('Active');
        }
    }, [editData, isVisible]);

    const formatDate = date => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const convertStringToDate = dateString => {
        if (!dateString) {
            return new Date();
        }
        const [day, month, year] = dateString.split('-');
        return new Date(year, month - 1, day);
    };

    const handleFromDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowFromDatePicker(false);
            if (selectedDate) {
                setFromDate(formatDate(selectedDate));
                setFromDateError('')
                setServerError('')
            }
        } else {
            if (selectedDate) {
                setTempFromDate(selectedDate);
            }
        }
    };

    const handleToDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowToDatePicker(false);
            if (selectedDate) {
                setToDate(formatDate(selectedDate));
                setToDateError('');
                setServerError('');
            }
        } else {
            if (selectedDate) {
                setTempToDate(selectedDate);
            }
        }
    };

    const updateLockDays = (usageType, validationMode) => {
        // Calendar mode
        if (validationMode === '1') {
            setLockDays('');
            return;
        }

        // Rolling mode
        if (validationMode === '2') {
            switch (usageType) {
                case 1: // Once
                    setLockDays('1');
                    break;

                case 2: // Daily
                    setLockDays('1');
                    break;

                case 3: // Weekly
                    setLockDays('7');
                    break;

                case 4: // Monthly
                    setLockDays('30');
                    break;

                default:
                    setLockDays('');
                    break;
            }
        }
    };

    const handleSave = async () => {
        try {
            let isValid = true;
            setCouponNameError('');
            setCouponCodeError('')
            setDiscountPercentage('')
            setDiscountValue('')
            setFromDate('')
            setToDate('')
            setCouponUsageType('')
            setValidateMode('')
            setLockDays('')
            setMinAmount('')
            setServerError('');
            if (!couponName.trim()) {
                setCouponNameError('Please enter coupon name');
                isValid = false;
            } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9\s]+$/.test(couponName.trim())) {
                setCouponNameError('coupon name must contain at least one letter and only letters, numbers, and spaces are allowed');
                isValid = false;
            }
            if (!couponCode.trim()) {
                setCouponCodeError('Please enter coupon code');
                isValid = false;
            } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9]+$/.test(couponCode.trim())) {
                setCouponCodeError('Coupon code must contain at least one letter and only letters/numbers are allowed');
                isValid = false;
            }
            if (!discountPercentage.trim() && !discountValue.trim()) {
                setDiscountPercentageError(
                    'Enter either Discount % or Discount Value'
                );
                setDiscountValueError(
                    'Enter either Discount % or Discount Value'
                );
                isValid = false;
            }
            if (!fromDate.trim()) {
                setFromDateError('Please select from date');
                isValid = false;
            }
            if (!toDate.trim()) {
                setToDateError('Please select to date');
                isValid = false;
            }
            if (fromDate && toDate) {
                const from = convertStringToDate(fromDate);
                const to = convertStringToDate(toDate);
                if (to <= from) {
                    setToDateError('To Date must be greater than From Date');
                    isValid = false;
                }
            } if (!couponUsageType) {
                setCouponUsageTypeError('please select coupon usage type');
                isValid = false;
            }
            if (!validateMode) {
                setValidateModeError('Please select a validation mode')
                isValid = false
            }
            // if (!lockDays.trim()) {
            //     setLockDaysError('Please enter lock days')
            //     isValid = false
            // } 
            if (!minAmount.trim()) {
                setMinAmountError('Please enter min amount')
                isValid = false
            }
            if (!isValid) return;
            setLoading(true);
            const isEditing = !!editData;
            const apiUrl = isEditing ? ApiServices.zenxposUpdateCoupon : ApiServices.zenxposAddCoupon;
            const payload = {
                couponName: couponName,
                couponCode: couponCode,
                minAmount: minAmount,
                discountPercentage: discountPercentage,
                discountValue: discountValue,
                fromDate,
                toDate,
                couponUsageTypeId: couponUsageType,
                validationMode: validateMode,
                lockDays: validateMode === '1' ? '' : lockDays,
                status: status === 'Active' ? 1 : 0,
            };
            if (isEditing) {
                payload.id = editData.id;
            }
            const response = await postMethod(apiUrl, payload);
            console.log('SAVE USER RESPONSE =====>', response);
            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'User added successfully' });
                setCouponName('');
                setCouponCode('')
                setDiscountPercentage('')
                setDiscountValue('')
                setFromDate('')
                setToDate('')
                setCouponUsageType(null)
                setValidateMode('')
                setLockDays('')
                setMinAmount('')
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
                            {editData ? 'Edit Coupon' : 'Create Coupon'}
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

                    <View style={{ flexDirection: 'row', marginHorizontal: rS(14) }}>
                        <View style={{ flex: 0.5 }}>
                            {/* Full Name */}
                            <Text allowFontScaling={false} style={styles.label}>
                                Coupon Name <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Enter coupon name"
                                placeholderTextColor={'#9A9A9A'}
                                style={[styles.input, { marginRight: rS(12) }]}
                                value={couponName}
                                onChangeText={text => {
                                    const filteredText = text.replace(/[^A-Za-z0-9\s]/g, '');

                                    setCouponName(filteredText);

                                    if (couponNameError) {
                                        setCouponNameError('');
                                    }

                                    if (serverError) {
                                        setServerError('');
                                    }
                                }}
                            />
                            {couponNameError ? (
                                <Text style={styles.errorText}>
                                    {couponNameError}
                                </Text>
                            ) : null}
                        </View>
                        <View style={{ flex: 0.5 }}>
                            <Text allowFontScaling={false} style={styles.label}>
                                Coupon Code <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Enter coupon code"
                                placeholderTextColor={'#9A9A9A'}
                                style={styles.input}
                                value={couponCode}
                                onChangeText={text => {
                                    const filteredText = text.replace(/[^A-Za-z0-9]/g, '');
                                    setCouponCode(filteredText);
                                    if (couponCodeError) {
                                        setCouponCodeError('')
                                    }
                                    if (serverError) {
                                        setServerError('');
                                    }
                                }}
                            />
                            {couponCodeError ? (
                                <Text style={styles.errorText}>
                                    {couponCodeError}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginHorizontal: rS(14) }}>
                        <View style={{ flex: 0.5 }}>
                            {/* Discount */}
                            <Text allowFontScaling={false} style={styles.label}>
                                Discount % <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Enter Discount %"
                                placeholderTextColor={'#9A9A9A'}
                                style={[
                                    styles.input,
                                    { marginRight: rS(12) },
                                    discountValue ? { backgroundColor: '#F2F2F2', color: '#999' } : {},
                                ]}
                                value={discountPercentage}
                                editable={!discountValue}
                                onChangeText={text => {
                                    const value = text.replace(/[^0-9]/g, '');
                                    setDiscountPercentage(value);

                                    if (value !== '') {
                                        setDiscountValue('');
                                        setDiscountPercentageError('');
                                        setDiscountValueError('');
                                    }

                                    else {
                                        setDiscountPercentageError('');
                                    }
                                    setServerError('');
                                }}
                            />
                            {discountPercentageError ? (
                                <Text style={styles.errorText}>
                                    {discountPercentageError}
                                </Text>
                            ) : null}
                        </View>
                        <View style={{ flex: 0.5 }}>
                            <Text allowFontScaling={false} style={styles.label}>
                                Discount Value <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Enter Discount value"
                                placeholderTextColor={'#9A9A9A'}
                                style={[
                                    styles.input,
                                    discountPercentage ? { backgroundColor: '#F2F2F2', color: '#999' } : {},
                                ]}
                                value={discountValue}
                                editable={!discountPercentage}
                                onChangeText={text => {
                                    const value = text.replace(/[^0-9]/g, '');
                                    setDiscountValue(value);

                                    if (value !== '') {
                                        setDiscountPercentage('');
                                        setDiscountPercentageError(''); // <-- Clear this also
                                        setDiscountValueError('');
                                    }

                                    else {
                                        setDiscountValueError('');
                                    }
                                    setServerError('');
                                }}
                            />
                            {discountValueError ? (
                                <Text style={styles.errorText}>
                                    {discountValueError}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginHorizontal: rS(14) }}>
                        <View style={{ flex: 0.5 }}>
                            <Text allowFontScaling={false} style={styles.label}>
                                From Date <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[
                                    styles.input,
                                    {
                                        // marginRight: rS(12),
                                        marginRight: rS(12),
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    },
                                ]}
                                onPress={() => {
                                    setTempFromDate(convertStringToDate(fromDate));
                                    setShowFromDatePicker(true);
                                }}>
                                <Text
                                    style={{
                                        color: fromDate ? '#000' : '#9A9A9A',
                                        fontFamily: Fonts.FigtreeRegular,
                                    }}>
                                    {fromDate || 'From Date'}
                                </Text>
                                <CalenderIcon />
                            </TouchableOpacity>
                            {fromDateError ? (
                                <Text style={styles.errorText}>
                                    {fromDateError}
                                </Text>
                            ) : null}
                        </View>
                        <View style={{ flex: 0.5 }}>
                            <Text allowFontScaling={false} style={styles.label}>
                                To Date <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[styles.input, {
                                    // marginRight: rS(12),
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                },]}
                                // onPress={() => {
                                //     setTempToDate(convertStringToDate(toDate));
                                //     setShowToDatePicker(true);
                                // }}
                                onPress={() => {
    if (!fromDate) {
        setFromDateError('Please select from date');
        return;
    }

    setFromDateError('');
    setTempToDate(convertStringToDate(toDate));
    setShowToDatePicker(true);
}}
                                >
                                <Text
                                    style={{
                                        color: toDate ? '#000' : '#9A9A9A',
                                        fontFamily: Fonts.FigtreeRegular,
                                    }}>
                                    {toDate || 'To Date'}
                                </Text>
                                <CalenderIcon />
                            </TouchableOpacity>
                            {toDateError ? (
                                <Text style={styles.errorText}>
                                    {toDateError}
                                </Text>
                            ) : null}
                            {Platform.OS === 'android' && showFromDatePicker && (
                                <DateTimePicker
                                    value={convertStringToDate(fromDate)}
                                    mode="date"
                                    display="default"
                                    onChange={handleFromDateChange}
                                />
                            )}
                            {Platform.OS === 'android' && showToDatePicker && (
                                <DateTimePicker
                                    value={convertStringToDate(toDate)}
                                    mode="date"
                                    display="default"
                                    minimumDate={
                                        fromDate
                                            ? new Date(
                                                convertStringToDate(fromDate).getTime() +
                                                24 * 60 * 60 * 1000
                                            )
                                            : undefined
                                    }
                                    onChange={handleToDateChange}
                                />
                            )}
                            <Modal
                                visible={Platform.OS === 'ios' && showFromDatePicker}
                                transparent
                                animationType="slide">
                                <View
                                    style={{
                                        flex: 1,
                                        justifyContent: 'flex-end',
                                        backgroundColor: 'rgba(0,0,0,0.4)',
                                    }}>
                                    <View
                                        style={{
                                            backgroundColor: '#fff',
                                            paddingBottom: 30,
                                        }}>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                padding: 15,
                                                borderBottomWidth: 1,
                                                borderBottomColor: '#eee',
                                            }}>
                                            <TouchableOpacity
                                                onPress={() => setShowFromDatePicker(false)}>
                                                <Text style={{ color: colors.black, fontFamily: Fonts.FigtreeMedium }}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setFromDate(formatDate(tempFromDate));
                                                    setFromDateError('')
                                                    setShowFromDatePicker(false);
                                                }}>
                                                <Text style={{ color: '#264B79', fontFamily: Fonts.FigtreeSemiBold }}>
                                                    Done
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <DateTimePicker
                                            value={tempFromDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={handleFromDateChange}
                                        />
                                    </View>
                                </View>
                            </Modal>
                            <Modal
                                visible={Platform.OS === 'ios' && showToDatePicker}
                                transparent
                                animationType="slide">
                                <View
                                    style={{
                                        flex: 1,
                                        justifyContent: 'flex-end',
                                        backgroundColor: 'rgba(0,0,0,0.4)',
                                    }}>
                                    <View
                                        style={{
                                            backgroundColor: '#fff',
                                            paddingBottom: 30,
                                        }}>
                                        <View
                                            style={{
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                padding: 15,
                                                borderBottomWidth: 1,
                                                borderBottomColor: '#eee',
                                            }}>
                                            <TouchableOpacity
                                                onPress={() => setShowToDatePicker(false)}>
                                                <Text style={{ color: colors.black, fontFamily: Fonts.FigtreeMedium }}>Cancel</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setToDate(formatDate(tempToDate));
                                                    setShowToDatePicker(false);
                                                }}>
                                                <Text style={{ color: '#264B79', fontFamily: Fonts.FigtreeSemiBold }}>
                                                    Done
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                        <DateTimePicker
                                            value={tempToDate}
                                            mode="date"
                                            display="spinner"
                                            onChange={handleToDateChange}
                                        />
                                    </View>
                                </View>
                            </Modal>
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginHorizontal: rS(14) }}>
                        <View style={{ flex: 0.5 }}>
                            {/* Discount */}
                            <Text allowFontScaling={false} style={styles.label}>
                                Usage Type <Text style={styles.required}>*</Text>
                            </Text>
                            <Dropdown
                                style={[styles.dropdown, { marginRight: rS(12) }]}
                                data={couponUsageTypeData}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Usage Type"
                                value={couponUsageType}
                                onChange={item => {
                                    setCouponUsageType(item.value);
                                    updateLockDays(item.value, validateMode)
                                    if (couponUsageTypeError) {
                                        setCouponUsageTypeError('')
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
                            {couponUsageTypeError ? (
                                <Text style={styles.errorText}>
                                    {couponUsageTypeError}
                                </Text>
                            ) : null}
                        </View>
                        <View style={{ flex: 0.5 }}>
                            <Text allowFontScaling={false} style={styles.label}>
                                Validation Mode <Text style={styles.required}>*</Text>
                            </Text>
                            <Dropdown
                                style={[styles.dropdown]}
                                data={validateModeData}
                                labelField="label"
                                valueField="value"
                                placeholder="Select Validate Mode"
                                value={validateMode}
                                onChange={item => {
                                    setValidateMode(item.value);
                                    updateLockDays(couponUsageType, item.value)
                                    if (validateModeError) {
                                        setValidateModeError('')
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
                            {validateModeError ? (
                                <Text style={styles.errorText}>
                                    {validateModeError}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                    <View style={{ flexDirection: 'row', marginHorizontal: rS(14) }}>
                        <View style={{ flex: 0.5 }}>
                            {/* Discount */}
                            <Text allowFontScaling={false} style={styles.label}>
                                Lock Days<Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Enter lock days"
                                placeholderTextColor={'#9A9A9A'}
                                // style={[styles.input, { marginRight: rS(12) }]}
                                // style={[
                                //     styles.input,
                                //     { marginRight: rS(12) },
                                //     lockDays ? { backgroundColor: '#F2F2F2', color: '#999' } : {},
                                // ]}
                                editable={false}
                                style={[styles.input, styles.disabledInput, { marginRight: rS(12) }]}
                                value={lockDays}
                                onChangeText={text => {
                                    const numericValue = text.replace(/[^0-9]/g, '');
                                    setLockDays(numericValue);
                                    if (lockDaysError) {
                                        setLockDaysError('')
                                    }
                                    if (serverError) {
                                        setServerError('');
                                    }
                                }}
                            />
                            {lockDaysError ? (
                                <Text style={styles.errorText}>
                                    {lockDaysError}
                                </Text>
                            ) : null}
                        </View>
                        <View style={{ flex: 0.5 }}>
                            <Text allowFontScaling={false} style={styles.label}>
                                Min Amount<Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                placeholder="Enter min amount"
                                placeholderTextColor={'#9A9A9A'}
                                style={[styles.input]}
                                value={minAmount}
                                onChangeText={text => {
                                    const numericValue = text.replace(/[^0-9]/g, '');
                                    setMinAmount(numericValue);
                                    if (minAmountError) {
                                        setMinAmountError('')
                                    }
                                    if (serverError) {
                                        setServerError('');
                                    }
                                }}
                            />
                            {minAmountError ? (
                                <Text style={styles.errorText}>
                                    {minAmountError}
                                </Text>
                            ) : null}
                        </View>
                    </View>
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
                                setStatus('In-Active');
                                setServerError('');
                            }}
                        >
                            {status === 'In-Active' ? <RadioIcon /> : <UnRadioIcon />}
                            <Text style={styles.radioText}>In-Active</Text>
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

export default AddNewCouponModal;

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
        // height: rV(28),
        height: rV(28),
        borderColor: '#C0C0C0',
        borderWidth: 1,
        borderRadius: 8,
        // marginHorizontal: rS(14),
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
        // paddingHorizontal: rS(14),
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
        // marginHorizontal: rS(14),
        paddingHorizontal: rS(10),
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        backgroundColor: '#FFFFFF',
    },
    disabledInput: {
        backgroundColor: '#F2F0EF',
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
        alignSelf: 'center',
        marginRight: rS(10),
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
        // marginHorizontal: rS(14)
    },
    serverErrorText: {
        marginTop: rV(15),
        color: 'red',
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        textAlign: 'center',
    },
});