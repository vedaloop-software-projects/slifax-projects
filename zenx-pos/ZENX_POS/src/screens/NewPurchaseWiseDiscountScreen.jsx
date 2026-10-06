import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, ScrollView, FlatList, Modal, Platform } from 'react-native'
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
import PlusIcon from '../assets/Icons/PlusIcon';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import DeleteIcon from '../assets/Icons/DeleteIcon'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'

export default function NewPurchaseWiseDiscountScreen() {
    const navigation = useNavigation()
    const dispatch = useDispatch()
    const route = useRoute();
    const editData = route.params?.purchaseWiseData;
    const { postMethod } = HelperModule()
    const [productList, setProductList] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState(null);
    const [itemName, setItemName] = useState('')
    const [itemCode, setItemCode] = useState('');
    const [variantId, setVariantId] = useState(null);
    const [variantCode, setVariantCode] = useState('');
    const [mrp, setMrp] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [tempFromDate, setTempFromDate] = useState(new Date());
    const [tempToDate, setTempToDate] = useState(new Date());
    const [status, setStatus] = useState(1);
    const [schemeDetails, setSchemeDetails] = useState([{ purchaseQty: '', salePrice: '' }]);

    const resetForm = () => {
        setId(null);
        setSelectedProduct(null);
        setItemName('');
        setItemCode('');
        setVariantId(null);
        setVariantCode('');
        setMrp('');
        setUnitPrice('');
        setFromDate('');
        setToDate('');
        setStatus(1);
        setSchemeDetails([{ purchaseQty: '', salePrice: '' }]);
        setErrors({});
        setProductList([]);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            setErrors({})
            if (editData) {
                populateData(editData);
            } else {
                resetForm();
            }
        }, [editData])
    );
    const populateData = (data) => {
        setId(data.id);
        setSelectedProduct(data.productId);
        setProductList([{ label: data.productFullName, value: data.productId, ...data }]);
        setItemName(data.productFullName);
        setItemCode(data.productCode);
        setVariantId(data.variantId);
        setVariantCode(data.packSize?.toString());
        setMrp(data.mrp?.toString());
        setUnitPrice(data.salePrice?.toString());
        setFromDate(data.fromDate);
        setToDate(data.toDate);
        setStatus(data.status);
        if (data.discounts && data.discounts.length > 0) {
            setSchemeDetails(data.discounts.map(d => ({
                id: d.id,
                purchaseQty: d.purchaseQty.toString(),
                salePrice: d.salePrice.toString()
            })));
        }
    };

    const getProducts = async (search) => {
        try {
            const payload = { searchStr: search };
            const response = await postMethod(ApiServices.zenxposSearchProducts, payload);
            if (response?.success) {
                const formatted = response.data.map(item => ({
                    label: item.productFullName,
                    searchLabel: `${item.productFullName} ${item.productCode} ${item.eanCode}`,
                    value: item.productId,
                    ...item,
                }));
                setProductList(formatted);
            }
        } catch (error) {
            console.log("Search Product Error", error);
        }
    };

    const handleProductSelect = (item) => {
        setSelectedProduct(item.productId);
        setItemName(item.productFullName);
        setItemCode(item.productCode);
        setVariantId(item.variantId);
        setVariantCode(item.packSize?.toString() || '');
        setMrp(item.mrp?.toString());
        setUnitPrice(item.salePrice?.toString());
        setErrors(prev => ({ ...prev, itemName: null }));
        checkExistingScheme(item.productId, item.variantId);
        setErrors(prev => ({ ...prev, itemName: null, general: null }));


    };


    const checkExistingScheme = async (pId, vId) => {
        try {
            const response = await postMethod(ApiServices.zenxposSearchPurchaseWiseDiscount, { productId: pId, variantId: vId });
            if (response?.success && response.data.length > 0) {
            }
        } catch (e) { console.log(e); }
    };

    const addSchemeRow = () => {
        setSchemeDetails([...schemeDetails, { id: '', purchaseQty: '', salePrice: '' }]);
    };

    // const removeSchemeRow = (index) => {
    //     const updated = [...schemeDetails];
    //     updated.splice(index, 1);
    //     setSchemeDetails(updated);
    // };

    const removeSchemeRow = async (index) => {
        const itemToDelete = schemeDetails[index];

        if (itemToDelete.id && itemToDelete.id !== "") {
            try {
                setLoading(true);
                const payload = { id: itemToDelete.id };

                const response = await postMethod(ApiServices.zenxposDeleteChildPurchaseWiseDiscount, payload);

                if (response?.success) {
                    Toast.show({ type: 'success', text1: 'Success', text2: response.message });

                    const updated = [...schemeDetails];
                    updated.splice(index, 1);
                    setSchemeDetails(updated);
                } else {
                    Toast.show({ type: 'error', text1: 'Error', text2: response.message || 'Failed to delete' });
                }
            } catch (error) {
                console.log("Delete Child Scheme Error:", error);
                Toast.show({ type: 'error', text1: 'Error', text2: 'Something went wrong' });
            } finally {
                setLoading(false);
            }
        } else {
            const updated = [...schemeDetails];
            updated.splice(index, 1);
            setSchemeDetails(updated);
        }
    };

    const updateSchemeDetail = (index, field, value) => {
        const updated = schemeDetails.map((item, i) => {
            if (i === index) {
                return { ...item, [field]: value };
            }
            return item;
        });

        setSchemeDetails(updated);

        if (errors.scheme) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.scheme;
                return newErrors;
            });
        }
    };

    const validateForm = () => {
        let tempErrors = {};
        if (!itemName) {
            tempErrors.itemName = "Product Name is required";
        }

        if (!fromDate) tempErrors.fromDate = "From date is required.";
        if (!toDate) tempErrors.toDate = "To date is required.";
        if (fromDate && toDate) {
            const from = parseDate(fromDate);
            const to = parseDate(toDate);
            if (to <= from) {
                tempErrors.toDate = "To Date must be greater than From Date";
            }
        }
        schemeDetails.forEach((item) => {
            const qty = item.purchaseQty ? item.purchaseQty.toString().trim() : "";
            const price = item.salePrice ? item.salePrice.toString().trim() : "";

            if (qty === "" || price === "") {
                tempErrors.scheme = "All scheme rows must be filled";
            }
        });
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSave = async () => {
        setErrors(prev => ({ ...prev, general: null }));
        if (!validateForm()) return;

        try {
            setLoading(true);

            const discountItems = schemeDetails.map(d => {
                if (id) {
                    return {
                        id: d.id || "",
                        purchaseQty: Number(d.purchaseQty),
                        salePrice: Number(d.salePrice)
                    };
                } else {
                    return {
                        purchaseQty: Number(d.purchaseQty),
                        salePrice: Number(d.salePrice)
                    };
                }
            });

            const payload = {
                productId: Number(selectedProduct),
                variantId: Number(variantId),
                fromDate: fromDate,
                toDate: toDate,
                status: status,
                discounts: discountItems
            };

            if (id) {
                payload.id = id;
            }

            console.log('FINAL SENDING PAYLOAD:', JSON.stringify(payload, null, 2));

            const apiEndpoint = id
                ? ApiServices.zenxposUpdatePurchaseWiseDiscount
                : ApiServices.zenxposAddPurchaseWiseDiscount;

            const response = await postMethod(apiEndpoint, payload);

            console.log('API RESPONSE:', response);

            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response.message });
                resetForm();
                navigation.navigate('PurchaseWiseSchemesScreen');
            } else {
                setErrors(prev => ({ ...prev, general: response?.message || "Failed to save scheme" }));
            }
        } catch (error) {
            console.log('FULL ERROR RESPONSE DATA:', error.response?.data);
            const serverErrorMessage =
                error.response?.data?.errors ||
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                "Internal Server Error";

            setErrors(prev => ({
                ...prev,
                general: serverErrorMessage
            }));
        } finally {
            setLoading(false);
        }
    };

    const formatDate = date => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const convertStringToDate = dateString => {
        if (!dateString) return new Date();
        const [day, month, year] = dateString.split('-');
        return new Date(year, month - 1, day);
    };

    const parseDate = (dateString) => {
        const [day, month, year] = dateString.split('-');
        return new Date(year, month - 1, day);
    };

    const handleFromDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowFromDatePicker(false);
            if (selectedDate) {
                setFromDate(formatDate(selectedDate));
                setErrors(prev => ({ ...prev, fromDate: null, general: null }));
            }
        } else {
            if (selectedDate) setTempFromDate(selectedDate);
        }
    };

    const handleToDateChange = (event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowToDatePicker(false);
            if (selectedDate) {
                setToDate(formatDate(selectedDate));
                setErrors(prev => ({ ...prev, toDate: null, general: null }));
            }
        } else {
            if (selectedDate) setTempToDate(selectedDate);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <CustomHeader />
            <View style={styles.subContainer}>
                {/* Top Header */}
                <View style={styles.customerRowContainer}>
                    <View>
                        <Text style={styles.customerText}>Purchase-Wise Schemes</Text>

                        <Text style={styles.customerSubText}>
                            Create or Manage Schemes
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.newManageTouchable} onPress={() => navigation.navigate('PurchaseWiseSchemesScreen')} >
                        <Text style={styles.addNewManageText}>
                            Manage Schemes
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.formContainer}>
                    {/* <ScrollView showsVerticalScrollIndicator={false}> */}
                    <KeyboardAwareScrollView
                        contentContainerStyle={{ paddingBottom: rV(50) }}
                        enableOnAndroid={true}
                        extraScrollHeight={20}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.formSubContainer}>
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Product Name <Text style={styles.required}>*</Text>
                                    </Text>
                                    <Dropdown
                                        style={[styles.dropdown, { marginRight: rS(20) }]}
                                        data={productList}
                                        search
                                        maxHeight={300}
                                        labelField="label"
                                        searchField="searchLabel"
                                        valueField="value"
                                        placeholder="Search Product Name"
                                        searchPlaceholder="Search Product Name..."
                                        value={selectedProduct}
                                        onChange={handleProductSelect}
                                        onChangeText={getProducts}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        itemTextStyle={styles.itemTextStyle}
                                        inputSearchStyle={styles.inputSearchStyle}
                                        renderItem={(item) => (
                                            <View style={styles.dropdownItemRow}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.dropdownItemText}>
                                                        {item.productFullName} - {item.packSize}
                                                    </Text>
                                                    <Text style={styles.dropdownSubItemText}>
                                                        {item.productCode} |{item.eanCode}
                                                    </Text>
                                                </View>
                                            </View>
                                        )}
                                    />

                                    {errors.itemName && <Text style={styles.errorText}>{errors.itemName}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Product Code <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Product Code"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                            styles.disabledInput,
                                            { marginRight: rS(20) }
                                        ]}
                                        value={itemCode}
                                        editable={false}
                                        onChangeText={(text) => {
                                            setItemCode(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                itemCode: null,
                                            }));
                                        }}
                                    />
                                    {errors.itemCode && <Text style={styles.errorText}>{errors.itemCode}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Variant Name/Pack Size <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Variant Name/Pack Size"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                            styles.disabledInput
                                        ]}
                                        value={variantCode}
                                        editable={false}
                                        onChangeText={(text) => {
                                            setVariantCode(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                variantCode: null,
                                            }));
                                        }}
                                    />
                                    {errors.variantCode && <Text style={styles.errorText}>{errors.variantCode}</Text>}
                                </View>
                            </View>
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        MRP
                                    </Text>
                                    <TextInput
                                        placeholder="Mrp"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, styles.disabledInput, { marginRight: rS(10) }]}
                                        value={mrp}
                                        editable={false}
                                        onChangeText={(text) => {
                                            setMrp(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                mrp: null,
                                            }));
                                        }}
                                        maxLength={10}
                                        keyboardType='number-pad'
                                    />
                                    {errors.mrp && <Text style={styles.errorText}>{errors.mrp}</Text>}
                                </View>
                                <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Sale Price
                                    </Text>
                                    <TextInput
                                        placeholder="Sale Price"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, styles.disabledInput, { marginRight: rS(20) }]}
                                        value={unitPrice}
                                        editable={false}
                                        onChangeText={(text) => {
                                            setUnitPrice(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                unitPrice: null,
                                            }));
                                        }}
                                        maxLength={10}
                                        keyboardType='number-pad'
                                    />
                                    {errors.unitPrice && <Text style={styles.errorText}>{errors.unitPrice}</Text>}
                                </View>
                                <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        From Date <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            setTempFromDate(convertStringToDate(fromDate));
                                            setShowFromDatePicker(true);
                                        }}
                                        style={[
                                            styles.input,
                                            {
                                                marginRight: rS(10),
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={{
                                                color: fromDate ? '#000' : '#9A9A9A',
                                                fontFamily: Fonts.FigtreeRegular,
                                            }}>
                                            {fromDate || 'From Date'}
                                        </Text>
                                        <CalenderIcon />
                                    </TouchableOpacity>
                                    {errors.fromDate && <Text style={styles.errorText}>{errors.fromDate}</Text>}
                                </View>
                                <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        To Date <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            setTempToDate(convertStringToDate(toDate));
                                            setShowToDatePicker(true);
                                        }}
                                        style={[styles.input, {
                                            marginRight: rS(20),
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        },]}
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
                                    {errors.toDate && <Text style={styles.errorText}>{errors.toDate}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <View style={styles.statusRow}>
                                        <Text style={styles.statusLabel}>Change Status:</Text>
                                        {/* Active */}
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            style={styles.radioContainer}
                                            onPress={() => {
                                                setStatus(1);
                                            }}>
                                            {status === 1 ? <RadioIcon /> : <UnRadioIcon />}
                                            <Text style={styles.radioText}>Active</Text>
                                        </TouchableOpacity>
                                        {/* Inactive */}
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            style={styles.radioContainer}
                                            onPress={() => {
                                                setStatus(0);
                                            }}
                                        >
                                            {status === 0 ? <RadioIcon /> : <UnRadioIcon />}

                                            <Text style={styles.radioText}>In-Active</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={styles.basicDetailsText}>SCHEME DETAILS</Text>
                                <TouchableOpacity style={{ flexDirection: 'row', }} onPress={addSchemeRow}>
                                    <PlusIcon />
                                    <Text style={styles.addText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                            {schemeDetails.map((item, index) => (
                                <View key={index} style={styles.schemeRow}>
                                    <View style={{ flex: 1, marginRight: rS(10) }}>
                                        <Text style={styles.label}>Purchase Qty <Text style={styles.required}>*</Text></Text>
                                        <TextInput
                                            placeholder="Enter Purchase Qty"
                                            placeholderTextColor={'#9A9A9A'}
                                            style={styles.input}
                                            keyboardType="numeric"
                                            value={item.purchaseQty}
                                            onChangeText={(val) => updateSchemeDetail(index, 'purchaseQty', val)}
                                        />
                                    </View>
                                    <View style={{ flex: 1, }}>
                                        <Text style={styles.label}>Unit Price <Text style={styles.required}>*</Text></Text>
                                        <TextInput
                                            placeholder="Enter Unit Price"
                                            placeholderTextColor={'#9A9A9A'}
                                            style={styles.input}
                                            keyboardType="numeric"
                                            value={item.salePrice}
                                            onChangeText={(val) => updateSchemeDetail(index, 'salePrice', val)}
                                        />
                                    </View>
                                    {schemeDetails.length > 1 && (
                                        <TouchableOpacity onPress={() => removeSchemeRow(index)} style={styles.deleteBtn}>
                                            <DeleteIcon />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}
                            {errors.scheme && <Text style={styles.errorText}>{errors.scheme}</Text>}
                            {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
                            <TouchableOpacity style={styles.saveTouchable} onPress={handleSave} disabled={loading}>
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{id ? 'Update' : 'Save'} Scheme</Text>}
                            </TouchableOpacity>

                        </View>

                    </KeyboardAwareScrollView>
                </View>
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
                        minimumDate={fromDate ? new Date(convertStringToDate(fromDate).getTime() + 86400000) : undefined}
                        onChange={handleToDateChange}
                    />
                )}
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
    searchList: {
        borderWidth: 1,
        borderColor: '#EAEAEA',
        borderRadius: 8,
        backgroundColor: '#FFF',
        maxHeight: 200,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '70%',
        maxHeight: '60%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontFamily: Fonts.FigtreeSemiBold,
        color: '#000',
        marginBottom: 10,
    },
    searchItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F2',
    },
    searchItemText: {
        fontSize: 14,
        color: '#000',
        fontFamily: Fonts.FigtreeRegular,
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
        marginVertical: rV(10)
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
    disabledInput: {
        backgroundColor: '#F2F0EF',
    },
    iosPickerContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    iosCancelText: {
        color: '#000',
        fontFamily: Fonts.FigtreeMedium
    },
    iosDoneText: {
        color: '#264B79',
        fontFamily: Fonts.FigtreeSemiBold
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
    inputSearchStyle: {
        height: 40,
        borderRadius: 8,
        fontSize: 14,
        color: '#000',
        fontFamily: Fonts.FigtreeRegular,
    },
    dropdownItemRow: {
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: '#EAEAEA',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#333',
        fontFamily: Fonts.FigtreeRegular,
    },
    dropdownSubItemText: {
        fontSize: 11,
        color: '#919191',
        fontFamily: Fonts.FigtreeRegular,
        marginTop: 2,
    },
    addText: {
        marginLeft: rS(4),
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        color: '#264B79',
    },
    schemeRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
    deleteBtn: { height: rV(35), justifyContent: 'center', paddingHorizontal: 5, alignItems: 'center', marginBottom: rV(8) },
});