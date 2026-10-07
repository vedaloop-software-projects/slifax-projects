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

export default function AddNewBillBusterScreen() {
    const navigation = useNavigation()
    const dispatch = useDispatch()
    const route = useRoute();
    const editData = route.params?.billBusterData;
    const { postMethod } = HelperModule()
    const [productList, setProductList] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState(null);
    const [itemName, setItemName] = useState('')
    const [itemCode, setItemCode] = useState('');
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
    const [schemeName, setSchemeName] = useState('')
    const [billAmount, setBillAmount] = useState('')
    const [discountPercentage, setDiscountPercentage] = useState('')
    const [schemeDetails, setSchemeDetails] = useState([
        {
            id: '',
            productId: '',
            variantId: '',
            productFullName: '',
            packSize: '',
            mrp: '',
            freeQty: '',
            discountPercentage: '',
        },
    ]);

    const resetForm = () => {
        setId(null);
        setSchemeName('');
        setBillAmount('')
        setDiscountPercentage('')
        setFromDate('')
        setToDate('')
        setStatus(1);
        setSchemeDetails([{ id: '', productId: '', variantId: '', productFullName: '', packSize: '', mrp: '', freeQty: '', discountPercentage: '' }]);
        setErrors({});
    };

    useFocusEffect(
        useCallback(() => {
            if (editData) {
                populateData(editData);
            } else {
                resetForm();
            }
        }, [editData])
    );
    const populateData = (data) => {
        setId(data.id);
        setSchemeName(data.schemeName);
        setBillAmount(data.billAmount?.toString());
        setDiscountPercentage(data.discountPercentage?.toString());
        setFromDate(data.fromDate);
        setToDate(data.toDate);
        setStatus(data.status);

        if (data.discounts && data.discounts.length > 0) {
            // 1. Populate productList so dropdowns show names
            const existingProducts = data.discounts.map(d => ({
                label: d.productFullName,
                displayLabel: `${d.productFullName} - ${d.packSize}`,
                productId: d.productId,
                value: d.productId,
                ...d
            }));
            setProductList(existingProducts);

            // 2. Populate the table with actual data
            setSchemeDetails(data.discounts.map(d => ({
                id: d.id,
                productId: d.productId,
                variantId: d.variantId,
                productFullName: d.productFullName,
                packSize: d.packSize,
                mrp: d.mrp ? d.mrp.toString() : '',
                freeQty: d.freeQty?.toString(),
                discountPercentage: d.discountPercentage?.toString()
            })));
        } else {
            // --- FIX: RESET STATE IF DISCOUNTS ARE EMPTY ---
            setProductList([]); // Clear the dropdown data
            setSchemeDetails([{
                id: '',
                productId: '',
                variantId: '',
                productFullName: '',
                packSize: '',
                mrp: '',
                freeQty: '',
                discountPercentage: '',
            }]);
        }
    };

    const getProducts = async (search) => {
        try {
            const payload = { searchStr: search };
            const response = await postMethod(ApiServices.zenxposSearchProducts, payload);
            if (response?.success) {
                const formatted = response.data.map(item => ({
                    label: item.productFullName,
                    displayLabel: `${item.productFullName} - ${item.packSize} (${item.eanCode})`,
                    value: item.productId,
                    ...item,
                }));
                setProductList(formatted);
            }
        } catch (error) {
            console.log("Search Product Error", error);
        }
    };

    const handleProductSelect = (index, item) => {
        const updated = [...schemeDetails];

        updated[index] = {
            ...updated[index],
            productId: item.productId,
            variantId: item.variantId,
            productFullName: item.productFullName,
            packSize: item.packSize,
            mrp: item.mrp ? item.mrp.toString() : '',
        };

        setSchemeDetails(updated);
        setErrors(prev => ({ ...prev, itemName: null, general: null }));
    };


    const addSchemeRow = () => {
        setSchemeDetails([...schemeDetails, { id: '', productId: '', variantId: '', productFullName: '', packSize: '', mrp: '', freeQty: '', discountPercentage: '' }]);
    };

    // const removeSchemeRow = (index) => {
    //     const updated = [...schemeDetails];
    //     updated.splice(index, 1);
    //     setSchemeDetails(updated);
    // };

    const removeSchemeRow = async (index) => {
        const itemToDelete = schemeDetails[index];
        if (itemToDelete.id) {
            try {
                setLoading(true);
                const response = await postMethod(ApiServices.zenxposDeleteBillBusterChild, { id: itemToDelete.id });
                if (response?.success) {
                    Toast.show({ type: 'success', text1: 'Deleted', text2: response.message });
                    const updated = [...schemeDetails];
                    updated.splice(index, 1);
                    setSchemeDetails(updated);
                }
            } catch (error) {
                console.log("Delete Error", error);
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
        const updated = [...schemeDetails];
        updated[index][field] = value;
        setSchemeDetails(updated);
    };

    const validateForm = () => {
        let tempErrors = {};
        if (!schemeName) {
            tempErrors.schemeName = "Scheme name is required";
        }
        if (!billAmount) {
            tempErrors.billAmount = "Bill Amount is required";
        }
        // if (!itemName) {
        //     tempErrors.itemName = "item name is required";
        // }

        if (!fromDate) tempErrors.fromDate = "From date is required.";
        if (!toDate) tempErrors.toDate = "To date is required.";
        if (fromDate && toDate) {
            const from = parseDate(fromDate);
            const to = parseDate(toDate);
            if (to <= from) {
                tempErrors.toDate = "To Date must be greater than From Date";
            }
        }
        // schemeDetails.forEach((item) => {
        //     const qty = item.purchaseQty ? item.purchaseQty.toString().trim() : "";
        //     const price = item.salePrice ? item.salePrice.toString().trim() : "";

        //     if (qty === "" || price === "") {
        //         tempErrors.scheme = "All scheme rows must be filled";
        //     }
        // });
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSave = async () => {
        setErrors(prev => ({ ...prev, general: null }));
        // if (!validateForm()) return;
        const isMainDiscountActive = discountPercentage !== '' && parseFloat(discountPercentage) > 0;

        try {
            setLoading(true);

            const payload = {
                schemeName,
                billAmount: Number(billAmount),
                // discountPercentage: discountPercentage ? Number(discountPercentage) : 0,
                discountPercentage: Number(discountPercentage) || 0,
                fromDate,
                toDate,
                status,
                discounts: isMainDiscountActive ? [] : schemeDetails.map(d => ({
                    id: d.id || "",
                    productId: d.productId,
                    variantId: d.variantId,
                    freeQty: Number(d.freeQty || 0),
                    discountPercentage: Number(d.discountPercentage || 0)
                }))
            };
            if (id) {
                payload.id = id;
            }

            console.log('FINAL SENDING PAYLOAD:', JSON.stringify(payload, null, 2));

            const api = id ? ApiServices.zenxposUpdateBillBuster : ApiServices.zenxposAddBillBuster;

            const response = await postMethod(api, payload);

            console.log('API RESPONSE:', response);

            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response.message });
                resetForm();
                navigation.navigate('BillBusterScreen');
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
                        <Text style={styles.customerText}>Bill Buster</Text>

                        <Text style={styles.customerSubText}>
                            Create or Manage Bill Buster
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.newManageTouchable} onPress={() => navigation.navigate('BillBusterScreen')} >
                        <Text style={styles.addNewManageText}>
                            Manage Bill Buster
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.formContainer}>
                    {/* <ScrollView showsVerticalScrollIndicator={false}> */}
                    <KeyboardAwareScrollView
                        enableOnAndroid={true}
                        extraScrollHeight={20}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.formSubContainer}>
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Scheme Name <Text style={styles.required}>*</Text>
                                    </Text>
                                    {/* <Dropdown
                                        style={[styles.dropdown, { marginRight: rS(20) }]}
                                        data={productList}
                                        search
                                        maxHeight={300}
                                        labelField="label"
                                        valueField="value"
                                        placeholder="Search Item name"
                                        searchPlaceholder="Search Item name..."
                                        value={selectedProduct}
                                        onChange={handleProductSelect}
                                        onChangeText={getProducts}
                                        placeholderStyle={styles.placeholderStyle}
                                        selectedTextStyle={styles.selectedTextStyle}
                                        itemTextStyle={styles.itemTextStyle}
                                        inputSearchStyle={styles.inputSearchStyle}
                                        renderItem={(item) => (
                                            <View style={styles.dropdownItemRow}>
                                                <Text style={styles.dropdownItemText}>
                                                    {item.displayLabel}
                                                </Text>
                                            </View>
                                        )}
                                    /> */}
                                    <TextInput
                                        placeholder="Enter scheme name"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                            { marginRight: rS(20) }
                                        ]}
                                        value={schemeName}
                                        onChangeText={(text) => {
                                            setSchemeName(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                schemeName: null,
                                            }));
                                        }}
                                    />

                                    {errors.schemeName && <Text style={styles.errorText}>{errors.schemeName}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Bill Amount <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter bill amount"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                            { marginRight: rS(20) }
                                        ]}
                                        value={billAmount}
                                        onChangeText={(text) => {
                                            setBillAmount(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                billAmount: null,
                                            }));
                                        }}
                                    />
                                    {errors.billAmount && <Text style={styles.errorText}>{errors.billAmount}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Discount% <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter Discount%"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                        ]}
                                        value={discountPercentage}
                                        onChangeText={(text) => {
                                            setDiscountPercentage(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                discountPercentage: null,
                                            }));
                                        }}
                                    />
                                    {errors.discountPercentage && <Text style={styles.errorText}>{errors.discountPercentage}</Text>}
                                </View>
                            </View>
                            <View style={styles.firstRowContainer}>
                                {/* <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        MRP
                                    </Text>
                                    <TextInput
                                        placeholder="Enter mrp"
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
                                        placeholder="Enter sale"
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
                                </View> */}
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
                                <View style={{ flex: 0.35 }} />
                            </View>
                            {(discountPercentage === '' || discountPercentage === null || parseFloat(discountPercentage) === 0) && (
                                <>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.basicDetailsText}>FREE ITEM DETAILS</Text>
                                        <TouchableOpacity style={{ flexDirection: 'row', }} onPress={addSchemeRow}>
                                            <PlusIcon />
                                            <Text style={styles.addText}>Add</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {schemeDetails.map((item, index) => (
                                        <View key={index} style={styles.schemeRow}>
                                            <View style={{ flex: 1.5, marginRight: rS(5) }}>
                                                <Text style={styles.label}>Item Name</Text>
                                                <Dropdown
                                                    style={styles.dropdown}
                                                    data={productList}
                                                    search
                                                    labelField="label"
                                                    valueField="productId"
                                                    placeholder="Search Item Name"
                                                    searchPlaceholder="Search Item name..."
                                                    onChangeText={getProducts}
                                                    onChange={(val) => handleProductSelect(index, val)}
                                                    placeholderStyle={styles.placeholderStyle}
                                                    selectedTextStyle={styles.selectedTextStyle}
                                                    itemTextStyle={styles.itemTextStyle}
                                                    inputSearchStyle={styles.inputSearchStyle}
                                                    value={item.productId}
                                                    renderItem={(item) => (
                                                        <View style={styles.dropdownItemRow}>
                                                            <Text style={styles.dropdownItemText}>{item.displayLabel}</Text>
                                                        </View>
                                                    )}
                                                />
                                                {/* {errors.itemName && <Text style={styles.errorText}>{errors.itemName}</Text>} */}
                                            </View>
                                            <View style={{ flex: 0.8, marginRight: rS(5) }}>
                                                <Text style={styles.label}>Pack Size</Text>
                                                <TextInput style={[styles.input, styles.disabledInput]} value={item.packSize} editable={false} />
                                            </View>
                                            <View style={{ flex: 0.6, marginRight: rS(5) }}>
                                                <Text style={styles.label}>MRP</Text>
                                                <TextInput style={[styles.input, styles.disabledInput]} value={item.mrp ? item.mrp.toString() : ''} editable={false} />
                                            </View>
                                            <View style={{ flex: 0.6, marginRight: rS(5) }}>
                                                <Text style={styles.label}>Free Qty</Text>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        (item.discountPercentage && item.discountPercentage !== '0') ? { backgroundColor: '#F2F2F2' } : {}
                                                    ]}
                                                    editable={!item.discountPercentage || item.discountPercentage === '' || item.discountPercentage === '0'}
                                                    keyboardType="numeric"
                                                    value={item.freeQty}
                                                    onChangeText={(val) => updateSchemeDetail(index, 'freeQty', val)}
                                                />
                                            </View>
                                            <View style={{ flex: 0.7, marginRight: rS(5) }}>
                                                <Text style={styles.label}>Discount%</Text>
                                                <TextInput
                                                    style={[
                                                        styles.input,
                                                        (item.freeQty && item.freeQty !== '0') ? { backgroundColor: '#F2F2F2' } : {}
                                                    ]}

                                                    keyboardType="numeric"
                                                    value={item.discountPercentage}
                                                    onChangeText={(val) => updateSchemeDetail(index, 'discountPercentage', val)}
                                                    editable={!item.freeQty || item.freeQty === '' || item.freeQty === '0'}
                                                />
                                            </View>
                                            <TouchableOpacity onPress={() => removeSchemeRow(index)} style={styles.deleteBtn}>
                                                <DeleteIcon />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </>
                            )}

                            {errors.scheme && <Text style={styles.errorText}>{errors.scheme}</Text>}
                            {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
                            {discountPercentage !== '' && parseFloat(discountPercentage) > 0 && (
                                <Text style={[styles.errorText, { color: 'red', marginTop: rV(10) }]}>
                                    Note * : For Free Items update discount as 0
                                </Text>
                            )}
                            <TouchableOpacity style={styles.saveTouchable} onPress={handleSave} disabled={loading}>
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{id ? 'Update' : 'Save'} Bill Buster</Text>}
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
        marginRight: rS(10),
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
    addText: {
        marginLeft: rS(4),
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        color: '#264B79',
    },
    schemeRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
    deleteBtn: { height: rV(35), justifyContent: 'center', paddingHorizontal: 5, alignItems: 'center', marginBottom: rV(8) },
});