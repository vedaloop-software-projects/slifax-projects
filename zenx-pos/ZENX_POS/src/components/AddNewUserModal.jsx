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

const AddNewUserModal = ({ isVisible, onClose, onSuccess, editData }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [mobileNumber, setMobileNumber] = useState('')
    const [maxDiscount, setMaxDiscount] = useState('')
    const [fullNameError, setFullNameError] = useState('')
    const [emailError, setEmailError] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [mobileNumberError, setMobileNumberError] = useState('')
    const [maxDiscountError, setMaxDiscountError] = useState('')
    const [serverError, setServerError] = useState('');
    const [role, setRole] = useState(null);
    const [roleError, setRoleError] = useState('')
    const [roleData, setRoleData] = useState([]);
    const [status, setStatus] = useState('Active');

    const getRoles = async () => {
        try {
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
            };
            console.log('GET ROLES PAYLOAD =====>', payload);
            const response = await postMethod(
                ApiServices.zenxposGetRoles,
                payload,
            );
            console.log('GET ROLES RESPONSE =====>', response);
            if (response?.success) {
                const formattedRoles = response?.data?.roles?.map(item => ({
                    label: item.roleTitle,
                    value: item.id,
                }));
                setRoleData(formattedRoles || []);
            }
        } catch (error) {
            console.log('GET ROLES ERROR =====>', error);
        }
    };

    React.useEffect(() => {
        setFullNameError('');
        setEmailError('');
        setMobileNumberError('');
        setRoleError('');
        setMaxDiscountError('')
        setPasswordError('')
        setServerError('');
        if (isVisible) {
            getRoles();
        }
        if (editData) {
            setFullName(editData.name);
            setEmail(editData.email);
            setMobileNumber(editData.mobile);
            setPassword('')
            setMaxDiscount(editData.maxDiscountPercentage.toString());
            setRole(editData.roleId);

            setStatus(
                editData.status === 1 ? 'Active' : 'In-Active',
            );
        } else {

            setFullName('');
            setEmail('');
            setMobileNumber('');
            setRole(null);
            setPassword('');
            setMaxDiscount('')
            setStatus('Active');
        }
    }, [editData, isVisible]);

    const validateEmail = email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    const validateMobile = mobile => {
        if (!mobile.trim()) {
            return 'Mobile number is required';
        }
        if (!/^\d+$/.test(mobile)) {
            return 'Mobile number must contain only digits';
        }
        if (mobile.length !== 10) {
            return 'Mobile number must be exactly 10 digits';
        }
        if (!/^[6-9]/.test(mobile)) {
            return 'Please enter a valid mobile number starting with 6, 7, 8, or 9';
        }
        return '';
    };

    const handleSave = async () => {
        try {
            let isValid = true;
            setFullNameError('');
            setEmailError('');
            setMobileNumberError('');
            setRoleError('');
            setPasswordError('')
            setServerError('');
            if (!fullName.trim()) {
                setFullNameError('Please enter full name');
                isValid = false;
            } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9\s]+$/.test(fullName.trim())) {
                setFullNameError('Ful name must contain at least one letter and only letters, numbers, and spaces are allowed');
                isValid = false;
            }
            if (!email.trim()) {
                setEmailError('Email is required');
                isValid = false;
            } else if (!validateEmail(email.trim())) {
                setEmailError('Please enter a valid email address');
                isValid = false;
            }
            if (!editData && !password.trim()) {
                setPasswordError('Please enter password');
                isValid = false;
            }
            const mobileError = validateMobile(mobileNumber);
            if (mobileError) {
                setMobileNumberError(mobileError);
                isValid = false;
            }
            if (!role) {
                setRoleError('Please select a role')
                isValid = false
            }
            if (!maxDiscount.trim()) {
                setMaxDiscountError('Please enter max discount percentage')
                isValid = false
            }
            if (!isValid) return;
            setLoading(true);
            const isEditing = !!editData;
            const apiUrl = isEditing ? ApiServices.zenxposUpdateUser : ApiServices.zenxposAddUser;
            const payload = {
                name: fullName,
                email: email,
                mobile: mobileNumber,
                password: password,
                maxDiscountPercentage: maxDiscount,
                roleId: role,
                status: status === 'Active' ? 1 : 0,
            };
            if (isEditing) {
                payload.id = editData.id;
            }
            const response = await postMethod(apiUrl, payload);
            console.log('SAVE USER RESPONSE =====>', response);
            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'User added successfully' });
                setFullName('');
                setEmail('');
                setMobileNumber('');
                setRole(null);
                setPassword('');
                setMaxDiscount('')
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
                            {editData ? 'Edit User' : 'Create User'}
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
                                    Full Name <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    placeholder="Enter full name"
                                    placeholderTextColor={'#9A9A9A'}
                                    style={[styles.input, { marginRight: rS(12) }]}
                                    value={fullName}
                                    onChangeText={text => {
                                        const filteredText = text.replace(/[^A-Za-z0-9\s]/g, '');

                                        setFullName(filteredText);

                                        if (fullNameError) {
                                            setFullNameError('');
                                        }

                                        if (serverError) {
                                            setServerError('');
                                        }
                                    }}
                                />
                                {fullNameError ? (
                                    <Text style={styles.errorText}>
                                        {fullNameError}
                                    </Text>
                                ) : null}
                            </View>
                            <View style={{ flex: 0.5 }}>
                                <Text allowFontScaling={false} style={styles.label}>
                                    Email <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    placeholder="Enter email"
                                    placeholderTextColor={'#9A9A9A'}
                                    style={styles.input}
                                    keyboardType='email-address'
                                    value={email}
                                    onChangeText={text => {
                                        setEmail(text);
                                        if (emailError) {
                                            setEmailError('')
                                        }
                                        if (serverError) {
                                            setServerError('');
                                        }
                                    }}
                                />
                                {emailError ? (
                                    <Text style={styles.errorText}>
                                        {emailError}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', marginHorizontal: rS(14) }}>
                            <View style={{ flex: 0.5 }}>
                                {/* Password */}
                                <Text allowFontScaling={false} style={styles.label}>
                                    Password {!editData ? <Text style={styles.required}>*</Text> : null}
                                </Text>
                                <TextInput
                                    placeholder="Enter password"
                                    placeholderTextColor={'#9A9A9A'}
                                    style={[styles.input, { marginRight: rS(12) }]}
                                    value={password}
                                    onChangeText={text => {
                                        setPassword(text)
                                        if (passwordError) {
                                            setPasswordError('')
                                        }
                                        if (serverError) {
                                            setServerError('');
                                        }
                                    }}
                                />
                                {passwordError ? (
                                    <Text style={styles.errorText}>
                                        {passwordError}
                                    </Text>
                                ) : null}
                            </View>
                            <View style={{ flex: 0.5 }}>
                                <Text allowFontScaling={false} style={styles.label}>
                                    Role <Text style={styles.required}>*</Text>
                                </Text>
                                <Dropdown
                                    style={styles.dropdown}
                                    data={roleData}
                                    labelField="label"
                                    valueField="value"
                                    containerStyle={{ marginTop: rV(-20) }}
                                    placeholder="Select Role"
                                    value={role}
                                    onChange={item => {
                                        setRole(item.value);
                                        if (roleError) {
                                            setRoleError('');
                                        }
                                        if (serverError) {
                                            setServerError('');
                                        }
                                    }}
                                    placeholderStyle={styles.placeholderStyle}
                                    selectedTextStyle={styles.selectedTextStyle}
                                    itemTextStyle={styles.itemTextStyle}
                                    iconColor='#1B1B1B'
                                />
                                {roleError ? (
                                    <Text style={styles.errorText}>
                                        {roleError}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                        <View style={{ flexDirection: 'row', marginHorizontal: rS(14) }}>
                            <View style={{ flex: 0.5 }}>
                                <Text allowFontScaling={false} style={styles.label}>
                                    Mobile Number <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    placeholder="Enter mobile number"
                                    placeholderTextColor={'#9A9A9A'}
                                    style={[styles.input, { marginRight: rS(12) }]}
                                    value={mobileNumber}
                                    keyboardType='number-pad'
                                    maxLength={10}
                                    onChangeText={text => {
                                        const numericValue = text.replace(/[^0-9]/g, '');
                                        setMobileNumber(numericValue);
                                        if (mobileNumberError) {
                                            setMobileNumberError('');
                                        }
                                        if (serverError) {
                                            setServerError('');
                                        }
                                    }}
                                />
                                {mobileNumberError ? (
                                    <Text style={styles.errorText}>
                                        {mobileNumberError}
                                    </Text>
                                ) : null}
                            </View>
                            <View style={{ flex: 0.5 }}>
                                <Text allowFontScaling={false} style={styles.label}>
                                    Max. Discount % <Text style={styles.required}>*</Text>
                                </Text>
                                <TextInput
                                    placeholder="Enter max discount"
                                    placeholderTextColor={'#9A9A9A'}
                                    style={styles.input}
                                    value={maxDiscount}
                                    keyboardType='number-pad'
                                    onChangeText={text => {
                                        const numericValue = text.replace(/[^0-9]/g, '');
                                        setMaxDiscount(numericValue)
                                        if (maxDiscountError) {
                                            setMaxDiscountError('')
                                        }
                                        if (serverError) {
                                            setServerError('');
                                        }
                                    }}
                                />
                                {maxDiscountError ? (
                                    <Text style={styles.errorText}>
                                        {maxDiscountError}
                                    </Text>
                                ) : null}
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
                            {/* In-Active */}
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={styles.radioContainer}
                                onPress={() => {
                                    setStatus('In-Active');
                                    setServerError('');
                                }}>
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

export default AddNewUserModal;

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