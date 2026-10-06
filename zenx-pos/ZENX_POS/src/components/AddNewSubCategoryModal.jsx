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
import { Dropdown } from 'react-native-element-dropdown';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddNewSubCategoryModal = ({ isVisible, onClose, onSuccess, editData }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('Active');
    const [subCategoryName, setSubCategoryName] = useState('')
    const [subCategoryCode, setSubCategoryCode] = useState('')
    const [subCategoryNameError, setSubCategoryNameError] = useState('')
    const [subCategoryCodeError, setSubCategoryCodeError] = useState('')
    const [categoryError, setCategoryError] = useState('')
    const [serverError, setServerError] = useState('');
    const [category, setCategory] = useState(null);
    const [categoryData, setCategoryData] = useState([]);

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
                const formattedCategories = response?.data?.categories?.map(item => ({
                    label: item.categoryName,
                    value: item.id,
                }));
                setCategoryData(formattedCategories || []);
            }
        } catch (error) {
            console.log('GET CATEGORIES ERROR =====>', error);
        }
    };

    React.useEffect(() => {
        setSubCategoryCodeError('');
        setSubCategoryNameError('');
        setCategoryError('');
        setServerError('');
        if (isVisible) {
            getCategories();
        }
        if (editData) {
            setSubCategoryName(editData.subCategoryName);
            setSubCategoryCode(editData.subCategoryCode);
            setCategory(editData.categoryId);
            setStatus(
                editData.status === 1 ? 'Active' : 'Inactive',
            );
        } else {
            setSubCategoryName('');
            setSubCategoryCode('');
            setCategory(null);
            setStatus('Active');
        }
    }, [editData, isVisible]);

    const handleSave = async () => {
        try {
            let isValid = true;
            setSubCategoryCodeError('');
            setSubCategoryNameError('');
            setCategoryError('');
            setServerError('');
            if (!subCategoryCode.trim()) {
                setSubCategoryCodeError('Please enter Sub Category code');
                isValid = false;
            } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9]+$/.test(subCategoryCode.trim())) {
                setSubCategoryCodeError('Sub category code must contain at least one letter and only letters/numbers are allowed');
                isValid = false;
            }
            if (!subCategoryName.trim()) {
                setSubCategoryNameError('Please enter Sub Category name');
                isValid = false;
            } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9\s]+$/.test(subCategoryName.trim())) {
                setSubCategoryNameError('Sub category name must contain at least one letter and only letters, numbers, and spaces are allowed');
                isValid = false;
            }
            if (!category) {
                setCategoryError('Please select a category');
                isValid = false;
            }
            if (!isValid) return;
            setLoading(true);
            const isEditing = !!editData;
            const apiUrl = isEditing ? ApiServices.zenxposUpdateSubCategory : ApiServices.zenxposAddSubCategory;
            const payload = {
                subCategoryCode: subCategoryCode,
                subCategoryName: subCategoryName,
                categoryId: category,
                status: status === 'Active' ? 1 : 0,
            };
            console.log('SAVE SUBCATEGORY PAYLOAD =====>', payload);
            if (isEditing) {
                payload.id = editData.id;
            }
            const response = await postMethod(apiUrl, payload);
            console.log('SAVE SUBCATEGORY RESPONSE =====>', response);
            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'Sub Category added successfully' });
                setSubCategoryName('');
                setSubCategoryCode('');
                setCategory(null);
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
                            {editData ? 'Create Subcategory' : 'Edit Subcategory'}
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
                        {/* Category Name */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Category Name <Text style={styles.required}>*</Text>
                        </Text>
                        <Dropdown
                            style={styles.dropdown}
                            containerStyle={{ marginTop: rV(-20) }}
                            data={categoryData}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Category"
                            value={category}
                            onChange={item => {
                                setCategory(item.value);
                                if (categoryError) {
                                    setCategoryError('');
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
                        {categoryError ? (
                            <Text style={styles.errorText}>
                                {categoryError}
                            </Text>
                        ) : null}
                        {/* Sub category Code */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Subcategory Code <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder="Enter subcategory code"
                            placeholderTextColor={'#9A9A9A'}
                            style={styles.input}
                            value={subCategoryCode}
                            onChangeText={text => {
                                const filteredText = text.replace(/[^A-Za-z0-9]/g, '');
                                setSubCategoryCode(filteredText);
                                if (subCategoryCodeError) {
                                    setSubCategoryCodeError('');
                                }
                                if (serverError) {
                                    setServerError('')
                                }
                            }}
                        />
                        {subCategoryCodeError ? (
                            <Text style={styles.errorText}>
                                {subCategoryCodeError}
                            </Text>
                        ) : null}
                        <Text allowFontScaling={false} style={styles.label}>
                            Sub-Category Name <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder="Enter subcategory name"
                            placeholderTextColor={'#9A9A9A'}
                            style={
                                styles.input
                            }
                            value={subCategoryName}
                            onChangeText={text => {
                                const filteredText = text.replace(/[^A-Za-z0-9\s]/g, '');
                                setSubCategoryName(filteredText);
                                if (subCategoryNameError) {
                                    setSubCategoryNameError('');
                                }
                                if (serverError) {
                                    setServerError('')
                                }
                            }}
                        />
                        {subCategoryNameError ? (
                            <Text style={styles.errorText}>
                                {subCategoryNameError}
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

export default AddNewSubCategoryModal;

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