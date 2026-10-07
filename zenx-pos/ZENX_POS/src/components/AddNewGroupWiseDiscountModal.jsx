import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform
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
import { Dropdown } from 'react-native-element-dropdown';
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import colors from '../constants/colors';
import CalenderIcon from '../assets/Icons/CalenderIcon'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddNewGroupWiseDiscountModal = ({ isVisible, onClose, onSuccess, editData }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [groupType, setGroupType] = useState(null);
    const [groupId, setGroupId] = useState(null);
    const [discount, setDiscount] = useState('')
    const [fromDate, setFromDate] = useState('')
    const [toDate, setToDate] = useState('')
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [tempFromDate, setTempFromDate] = useState(new Date());
    const [tempToDate, setTempToDate] = useState(new Date());
    const [status, setStatus] = useState('Active');
    const [groupTypeError, setGroupTypeError] = useState('')
    const [groupIdError, setGroupIdError] = useState('')
    const [discountError, setDiscountError] = useState('')
    const [fromDateError, setFromDateError] = useState('');
    const [toDateError, setToDateError] = useState('');
    const [serverError, setServerError] = useState('');
    const [groupNameData, setGroupNameData] = useState([])
    const groupTypeData = [
        { label: 'Category', value: '1' },
        { label: 'Sub-Category', value: '2' },
        { label: 'Brand', value: '3' },
        { label: 'Colour', value: '4' },
        { label: 'Size', value: '5' },
    ];

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

    const getCategories = async () => {
        try {
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
            };
            console.log('GET CATEGORIES PAYLOAD =====>', payload);
            const response = await postMethod(
                ApiServices.zenxposGetCategories,
                payload,
            );
            console.log('GET CATEGORIES RESPONSE =====>', response);
            if (response?.success) {
                const formattedRoles = response?.data?.categories?.map(item => ({
                    label: item.categoryName,
                    value: item.id,
                }));
                setGroupNameData(formattedRoles || []);
            }
        } catch (error) {
            console.log('GET CATEGORIES ERROR =====>', error);
        }
    };

    const getSubCategories = async () => {
        try {
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
                categoryId: "",
            };
            console.log('GET SUB-CATEGORIES PAYLOAD =====>', payload);
            const response = await postMethod(
                ApiServices.zenxposGetSubCategories,
                payload,
            );
            console.log('GET SUB-CATEGORIES RESPONSE =====>', response);
            if (response?.success) {

                const formattedCategories = response?.data?.subCategories?.map(item => ({
                    label: item.subCategoryName,
                    value: item.id,
                }));
                setGroupNameData(formattedCategories || []);
            }
        } catch (error) {
            console.log('GET SUB-CATEGORIES ERROR =====>', error);
        }
    };

    const getBrands = async () => {
        try {
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
            };
            console.log('GET BRANDS PAYLOAD =====>', payload);
            const response = await postMethod(
                ApiServices.zenxposGetBrands,
                payload,
            )
            console.log('GET BRANDS RESPONSE =====>', response);
            if (response?.success) {

                const formattedBrands = response?.data?.brands?.map(item => ({
                    label: item.brandName,
                    value: item.id,
                }));
                setGroupNameData(formattedBrands || []);
            }
        } catch (error) {
            console.log('GET BRANDS ERROR =====>', error);
        }
    };
    const getColours = async () => {
        try {
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
            };
            console.log('GET COLOURS PAYLOAD =====>', payload);
            const response = await postMethod(
                ApiServices.zenxposGetColours,
                payload,
            );
            console.log('GET COLOURS RESPONSE =====>', response);
            if (response?.success) {

                const formattedColours = response?.data?.colours?.map(item => ({
                    label: item.colourName,
                    value: item.id,
                }));
                setGroupNameData(formattedColours || []);
            }
        } catch (error) {
            console.log('GET COLOURS ERROR =====>', error);
        }
    };

    const getSizes = async () => {
        try {
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
            };
            console.log('GET SIZES PAYLOAD =====>', payload);
            const response = await postMethod(
                ApiServices.zenxposGetSizes,
                payload,
            );
            console.log('GET SIZES RESPONSE =====>', response);
            if (response?.success) {
                const formattedSizes = response?.data?.sizes?.map(item => ({
                    label: item.sizeName,
                    value: item.id,
                }));
                setGroupNameData(formattedSizes || []);
            }

        } catch (error) {
            console.log('GET SIZES ERROR =====>', error);
        }
    };

    useEffect(() => {
        if (!groupType) {
            setGroupNameData([]);
            return;
        }
        setGroupNameData([]);
        if (groupType === '1') {
            getCategories();
        } else if (groupType === '2') {
            getSubCategories();
        } else if (groupType === '3') {
            getBrands();
        } else if (groupType === '4') {
            getColours();
        } else if (groupType === '5') {
            getSizes();
        }
    }, [groupType]);

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

    React.useEffect(() => {
        setDiscountError('')
        setGroupIdError('')
        setGroupTypeError('')
        setFromDateError('')
        setToDateError('')
        setServerError('')
        if (editData) {
            setGroupType(editData.groupType?.toString());
            setGroupId(editData.groupId?.toString());
            setDiscount(editData.discount?.toString());
            setFromDate(editData.fromDate || '');
            setToDate(editData.toDate || '');
            setStatus(
                editData.status === 1 ? 'Active' : 'Inactive',
            );
        } else {
            setGroupType(null);
            setGroupId(null);
            setDiscount('');
            setFromDate('');
            setToDate('');
            setStatus('Active');
        }
    }, [editData, isVisible]);

    useEffect(() => {
        if (
            editData &&
            groupNameData.length > 0
        ) {
            setGroupId(editData.groupId);
        }
    }, [groupNameData]);
    const parseDate = (dateString) => {
        const [day, month, year] = dateString.split('-');
        return new Date(year, month - 1, day);
    };
    const handleSave = async () => {
        try {
            let isValid = true;
            setGroupTypeError('');
            setGroupIdError('');
            setDiscountError('');
            setFromDateError('');
            setToDateError('');
            setServerError('');
            if (!groupType) {
                setGroupTypeError('Please select group type');
                isValid = false;
            }
            if (!groupId) {
                setGroupIdError('Please select group name');
                isValid = false;
            }
            if (!discount.trim()) {
                setDiscountError('Please enter discount');
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
                const from = parseDate(fromDate);
                const to = parseDate(toDate);
                if (to <= from) {
                    setToDateError('To Date must be greater than From Date');
                    isValid = false;
                }
            }
            if (!isValid) {
                return;
            }
            setLoading(true);
            const isEditing = !!editData;
            const apiUrl = isEditing ? ApiServices.zenxposUpdateGroupWiseDiscount : ApiServices.zenxposAddGroupWiseDiscount;
            const payload = {
                groupType: Number(groupType),
                groupId: Number(groupId),
                discount: Number(discount),
                fromDate,
                toDate,
                status: status === 'Active' ? 1 : 0,
            };
            if (isEditing) {
                payload.id = editData.id;
            }
            const response = await postMethod(apiUrl, payload);
            console.log('SAVE USER RESPONSE =====>', response);
            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'User added successfully' });
                setGroupType(null);
                setGroupId(null);
                setDiscount('');
                setFromDate('');
                setToDate('');
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
                            {editData ? 'Edit Group-Wise Discount' : 'Create Group-Wise Discount'}
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
                            {/* Tax Code */}
                            <Text allowFontScaling={false} style={styles.label}>
                                Group Type <Text style={styles.required}>*</Text>
                            </Text>
                            <Dropdown
                                style={[styles.dropdown, { marginRight: rS(12) }]}
                                data={groupTypeData}
                                labelField="label"
                                valueField="value"
                                containerStyle={{ marginTop: rV(-20) }}
                                placeholder="Select Group Type"
                                value={groupType}
                                search
                                searchPlaceholder='Search group type..'
                                onChange={item => {
                                    setGroupType(item.value);
                                    setGroupId(null)
                                    setGroupNameData([])
                                    if (groupTypeError) {
                                        setGroupTypeError('');
                                    }
                                    if (serverError) {
                                        setServerError('');
                                    }
                                }}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                itemTextStyle={styles.itemTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                iconColor='#1B1B1B'
                            />
                            {groupTypeError ? (
                                <Text style={styles.errorText}>
                                    {groupTypeError}
                                </Text>
                            ) : null}
                        </View>
                        <View style={{ flex: 0.5 }}>
                            <Text allowFontScaling={false} style={styles.label}>
                                Group Name <Text style={styles.required}>*</Text>
                            </Text>
                            <Dropdown
                                style={styles.dropdown}
                                data={groupNameData}
                                labelField="label"
                                valueField="value"
                                containerStyle={{ marginTop: rV(-20) }}
                                placeholder="Select Group Name"
                                search
                                searchPlaceholder='Search group type..'
                                value={groupId}
                                onChange={item => {
                                    setGroupId(item.value);
                                    if (groupIdError) {
                                        setGroupIdError('');
                                    }
                                    if (serverError) {
                                        setServerError('');
                                    }
                                }}
                                placeholderStyle={styles.placeholderStyle}
                                selectedTextStyle={styles.selectedTextStyle}
                                itemTextStyle={styles.itemTextStyle}
                                inputSearchStyle={styles.inputSearchStyle}
                                iconColor='#1B1B1B'
                            />
                            {!groupType && (
                                <TouchableOpacity
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        zIndex: 10,
                                    }}
                                    activeOpacity={1}
                                    onPress={() => {
                                        setGroupTypeError('Please first select group type');
                                    }}
                                />
                            )}
                            {groupIdError ? (
                                <Text style={styles.errorText}>
                                    {groupIdError}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                    {/* Tax Code */}
                    <Text allowFontScaling={false} style={[styles.label, { paddingHorizontal: rS(14), }]}>
                        Discount % <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="Enter discount"
                        placeholderTextColor={'#9A9A9A'}
                        style={[styles.input, { marginHorizontal: rS(14) }]}
                        value={discount}
                        keyboardType='number-pad'
                        onChangeText={text => {
                            const numericValue = text.replace(/[^0-9.]/g, '');
                            setDiscount(numericValue)
                            if (discountError) {
                                setDiscountError('')
                            }
                            if (serverError) {
                                setServerError('');
                            }
                        }}
                    />
                    {discountError ? (
                        <Text style={[styles.errorText, { marginHorizontal: rS(14) }]}>
                            {discountError}
                        </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', marginHorizontal: rS(14) }}>
                        <View style={{ flex: 0.5 }}>
                            {/* From Date */}
                            <Text allowFontScaling={false} style={styles.label}>
                                From Date <Text style={styles.required}>*</Text>
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[
                                    styles.input,
                                    {
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
                                style={[styles.input,{
                                        // marginRight: rS(12),
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    },]}
                                onPress={() => {
                                    setTempToDate(convertStringToDate(toDate));
                                    setShowToDatePicker(true);
                                }}>
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

export default AddNewGroupWiseDiscountModal;

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
        paddingBottom: rV(18),
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
    inputSearchStyle: {
    fontSize: 14,
    color: '#000000',
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
    dateInput: {
        height: rV(28),
        borderColor: '#C0C0C0',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: rS(10),
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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