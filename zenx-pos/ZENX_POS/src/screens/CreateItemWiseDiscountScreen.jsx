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
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import GreySearchIcon from '../assets/Icons/GreySearchIcon'
import CrossIcon from '../assets/Icons/CrossIcon'

export default function CreateItemWiseDiscountScreen() {
    const navigation = useNavigation()
    const dispatch = useDispatch()
    const route = useRoute();
    const itemWiseData = route.params?.itemWiseData;
    const { postMethod } = HelperModule()
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    // Main Product States
    const [mainSearchText, setMainSearchText] = useState('');
    const [showMainResults, setShowMainResults] = useState(false);
    const [productList, setProductList] = useState([]);
    // Free Product States
    const [freeSearchText, setFreeSearchText] = useState('');
    const [showFreeResults, setShowFreeResults] = useState(false);
    const [freeProductList, setFreeProductList] = useState([]);
    // Form States
    const [itemName, setItemName] = useState('')
    const [selectedProductId, setSelectedProductId] = useState(null)
    const [itemCode, setItemCode] = useState('');
    const [variantCode, setVariantCode] = useState('');
    const [variantId, setVariantId] = useState(null);
    const [mrp, setMrp] = useState('');
    const [unitPrice, setUnitPrice] = useState('');
    const [purchaseQty, setPurchaseQty] = useState('');

    const [freeItemName, setFreeItemName] = useState('');
    const [selectedFreeProductId, setSelectedFreeProductId] = useState(null);
    const [freeItemCode, setFreeItemCode] = useState('');
    const [freeVariantCode, setFreeVariantCode] = useState('');
    const [freeVariantId, setFreeVariantId] = useState(null);
    const [freeMrp, setFreeMrp] = useState('');
    const [freeUnitPrice, setFreeUnitPrice] = useState('');
    const [freeQty, setFreeQty] = useState('');

    const [discountPercentage, setDiscountPercentage] = useState('');
    const [discountValue, setDiscountValue] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [showFromDatePicker, setShowFromDatePicker] = useState(false);
    const [showToDatePicker, setShowToDatePicker] = useState(false);
    const [tempFromDate, setTempFromDate] = useState(new Date());
    const [tempToDate, setTempToDate] = useState(new Date());
    const [status, setStatus] = useState('Active');
    // const [productList, setProductList] = useState([]);
    // const [freeProductList, setFreeProductList] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedFreeProduct, setSelectedFreeProduct] = useState(null);
    const [existingDiscountData, setExistingDiscountData] = useState(null);
    const resetAllFields = () => {
        // Reset Main Product
        setMainSearchText('');
        setFreeSearchText('');
        setSelectedProductId(null);
        setItemName('');
        setItemCode('');
        setVariantCode('');
        setVariantId(null);
        setMrp('');
        setUnitPrice('');
        setPurchaseQty('');
        setSelectedFreeProductId(null);
        setFreeItemName('');
        setFreeItemCode('');
        setFreeVariantCode('');
        setFreeVariantId(null);
        setFreeMrp('');
        setFreeUnitPrice('');
        setFreeQty('');
        setDiscountPercentage('');
        setDiscountValue('');
        setFromDate('');
        setToDate('');
        setStatus('Active');
        setExistingDiscountData(null);
        setErrors({});
    };
    // Add this inside CreateItemWiseDiscountScreen
useFocusEffect(
    useCallback(() => {
        // If we navigated here and there is NO itemWiseData, reset everything
        if (!route.params?.itemWiseData) {
            resetAllFields();
        }
    }, [route.params?.itemWiseData])
);
    useEffect(() => {
        setErrors({})
        if (itemWiseData) {
            // Main Product
            setMainSearchText(itemWiseData.productFullName || '');
            setSelectedProductId(itemWiseData.productId);
            setItemName(itemWiseData.productFullName || '');
            setItemCode(itemWiseData.productCode?.toString() || '');
            setVariantId(itemWiseData.variantId);
            setVariantCode(itemWiseData.packSize?.toString() || '');
            setMrp(itemWiseData.mrp?.toString() || '');
            setUnitPrice(itemWiseData.salePrice?.toString() || '');
            setPurchaseQty(itemWiseData.purchaseQty?.toString() || '');

            setFreeSearchText(itemWiseData.freeProductFullName || '');
            setSelectedFreeProductId(itemWiseData.freeProductId);
            setFreeItemName(itemWiseData.freeProductFullName || '');
            setFreeItemCode(itemWiseData.freeProductCode || '');
            setFreeVariantId(itemWiseData.freeVariantId);
            setFreeVariantCode(itemWiseData.freePackSize?.toString() || '');
            setFreeMrp(itemWiseData.freeMrp?.toString() || '');
            setFreeUnitPrice(itemWiseData.freeSalePrice?.toString() || '');
            setFreeQty(itemWiseData.freeQty?.toString() || '');

            setDiscountPercentage(itemWiseData.discountPercentage?.toString() || '');
            setDiscountValue(itemWiseData.discountValue?.toString() || '');
            setFromDate(itemWiseData.fromDate || '');
            setToDate(itemWiseData.toDate || '');
            setStatus(itemWiseData.status === 1 ? 'Active' : 'In-Active');
        } else {
            resetAllFields();
        }
    }, [itemWiseData]);

    const getProducts = async (search, type) => {
        if (!search || search.trim().length < 2) {
            type === 'main' ? setProductList([]) : setFreeProductList([]);
            type === 'main' ? setShowMainResults(false) : setShowFreeResults(false);
            return;
        }
        try {
            const payload = { searchStr: search };
            const response = await postMethod(ApiServices.zenxposSearchProducts, payload);
            console.log(":::::search products:::::", response)
            if (response?.success) {
                if (type === 'main') {
                    setProductList(response.data || []);
                    setShowMainResults(true);
                } else {
                    setFreeProductList(response.data || []);
                    setShowFreeResults(true);
                }
            }
        } catch (error) {
            console.log('GET PRODUCTS ERROR', error);
        }
    };
    console.log('Item Wise Data in the Screen ===>', itemWiseData);
    const onSelectMainProduct = (item) => {
        setMainSearchText(item.productFullName);
        setSelectedProductId(item.productId);
        setItemName(item.productFullName);
        setItemCode(item.productCode);
        setVariantId(item.variantId);
        setVariantCode(item.packSize?.toString() || '');
        setMrp(item.mrp?.toString());
        setUnitPrice(item.salePrice?.toString());
        setShowMainResults(false);
        clearSchemeDetails();
        searchItemWiseDiscount(item.productId, item.variantId);
        setErrors(prev => ({ ...prev, itemName: null }));
    };
    const onSelectFreeProduct = (item) => {
        setFreeSearchText(item.productFullName);
        setSelectedFreeProductId(item.productId);
        setFreeItemName(item.productFullName);
        setFreeItemCode(item.productCode);
        setFreeVariantId(item.variantId);
        setFreeVariantCode(item.packSize?.toString() || '');
        setFreeMrp(item.mrp?.toString());
        setFreeUnitPrice(item.salePrice?.toString());
        setShowFreeResults(false);
        setErrors(prev => ({ ...prev, freeItemName: null }));
    };
    const clearSchemeDetails = () => {
        setExistingDiscountData(null);
        setPurchaseQty('');
        setFreeSearchText('');
        setSelectedFreeProductId(null);
        setFreeItemName('');
        setFreeItemCode('');
        setFreeVariantCode('');
        setFreeMrp('');
        setFreeUnitPrice('');
        setFreeQty('');
        setDiscountPercentage('');
        setDiscountValue('');
    };

    const handleClearMainProduct = () => {
    setMainSearchText('');
    setSelectedProductId(null);
    setItemName('');
    setItemCode('');
    setVariantCode('');
    setVariantId(null);
    setMrp('');
    setUnitPrice('');
    setShowMainResults(false);
    setProductList([]);
    // Clear scheme details as they depend on the main product
    // clearSchemeDetails();
};

const handleClearFreeProduct = () => {
    setFreeSearchText('');
    setSelectedFreeProductId(null);
    setFreeItemName('');
    setFreeItemCode('');
    setFreeVariantCode('');
    setFreeVariantId(null);
    setFreeMrp('');
    setFreeUnitPrice('');
    setFreeQty('');
    setShowFreeResults(false);
    setFreeProductList([]);
};

    // const isFreeProductActive = !!selectedFreeProduct || (parseFloat(freeQty) > 0);
const hasFreeQty = freeQty.length > 0 && parseFloat(freeQty) > 0;
const hasDiscountPercentage = discountPercentage.length > 0 && parseFloat(discountPercentage) > 0;
const hasDiscountValue = discountValue.length > 0 && parseFloat(discountValue) > 0;

    const searchItemWiseDiscount = async (
        productId,
        variantId,
    ) => {
        try {
            const payload = {
                productId,
                variantId,
            };
            const response = await postMethod(
                ApiServices.zenxposSearchItemWiseDiscount,
                payload,
            );
            console.log(
                'SEARCH ITEM WISE DISCOUNT RESPONSE',
                response,
            );
            if (
                response?.success &&
                response?.data?.length > 0
            ) {
                const data = response.data[0];
                setExistingDiscountData(data);
                setPurchaseQty(
                    data.purchaseQty?.toString() || '',
                );
                setSelectedFreeProductId(
                    data.freeProductId,
                );
                setFreeSearchText(data.freeProductFullName || '');
                setFreeItemName(
                    data.freeProductFullName || '',
                );
                setFreeItemCode(
                    data.freeProductCode || '',
                );
                setFreeVariantId(data.freeVariantId);
                setFreeVariantCode(
                    data.freeVariantId?.toString() || '',
                );
                setFreeMrp(
                    data.freeMrp?.toString() || '',
                );
                setFreeUnitPrice(
                    data.freeSalePrice?.toString() || '',
                );
                setFreeQty(
                    data.freeQty?.toString() || '',
                );
                setDiscountPercentage(
                    data.discountPercentage?.toString() || '',
                );
                setDiscountValue(
                    data.discountValue?.toString() || '',
                );
                setFromDate(data.fromDate || '');
                setToDate(data.toDate || '');
            }
        } catch (error) {
            console.log(
                'SEARCH ITEM WISE DISCOUNT ERROR',
                error,
            );
        }
    };

    const validateForm = () => {
        let tempErrors = {};

        // Basic Product Validation (Always Required)
        if (!itemName) tempErrors.itemName = "Product Name is required";
        if (!itemCode.trim()) tempErrors.itemCode = "Product code is required.";
        if (!variantCode.trim()) tempErrors.variantCode = "Variant Name/Pack Size is required.";
        if (!mrp.trim()) tempErrors.mrp = "The MRP is required.";
        if (!unitPrice.trim()) tempErrors.unitPrice = "Unit Price is required.";
        if (!purchaseQty) tempErrors.purchaseQty = "Purchase Quantity is required.";

        // SCHEME VALIDATION LOGIC
        // Only require Free Product details if BOTH Discount % and Discount Value are empty/zero
         if (!hasFreeQty && !hasDiscountPercentage && !hasDiscountValue) {
        tempErrors.general = "Please provide either Free Qty, Discount %, or Discount Value.";

         if (!freeItemName.trim()) tempErrors.freeItemName = "Free Product Name is required.";
        // if (!freeItemCode.trim()) tempErrors.freeItemCode = "Free Product code is required.";
        // if (!freeVariantCode.trim()) tempErrors.freeVariantCode = "Free Variant Name/Pack Size is required.";
        // if (!freeMrp.trim()) tempErrors.freeMrp = "Free MRP is required.";
        // if (!freeUnitPrice.trim()) tempErrors.freeUnitPrice = "Free Unit Price is required.";

    //       if (hasFreeQty) {
       
    // }
    }

        // if (!isDiscountScheme) {
        //     // If it's NOT a discount scheme, then Free Product fields are MANDATORY
        //     if (!freeItemName.trim()) tempErrors.freeItemName = "Free Product Name is required.";
        //     if (!freeItemCode.trim()) tempErrors.freeItemCode = "Free Product code is required.";
        //     if (!freeVariantCode.trim()) tempErrors.freeVariantCode = "Free Variant Name/Pack Size is required.";
        //     if (!freeMrp.trim()) tempErrors.freeMrp = "Free MRP is required.";
        //     if (!freeUnitPrice.trim()) tempErrors.freeUnitPrice = "Free Unit Price is required.";
        //     if (!freeQty?.trim() || parseFloat(freeQty) <= 0) tempErrors.freeQty = "Free Quantity is required.";
        // }

        // Date Validation (Always Required)
        if (!fromDate) tempErrors.fromDate = "From date is required.";
        if (!toDate) tempErrors.toDate = "To date is required.";
        if (fromDate && toDate) {
            const from = parseDate(fromDate);
            const to = parseDate(toDate);
            if (to <= from) {
                tempErrors.toDate = "To Date must be greater than From Date";
            }
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    // const validateForm = () => {
    //     let tempErrors = {};
    //     if (!itemName) {
    //         tempErrors.itemName = "Product Name is required";
    //     }
    //     if (!itemCode.trim()) {
    //         tempErrors.itemCode = "item code is required.";
    //     }
    //     if (!variantCode.trim()) {
    //         tempErrors.variantCode = "Variant Name/Pack Size is required.";
    //     }
    //     if (!mrp.trim()) {
    //         tempErrors.mrp = "The MRP is required.";
    //     }
    //     if (!unitPrice.trim()) {
    //         tempErrors.unitPrice = "Unit Price is required.";
    //     }
    //     if (!purchaseQty) {
    //         tempErrors.purchaseQty = "Purchase Quantity is required.";
    //     }
    //     if (!freeItemName.trim()) {
    //         tempErrors.freeItemName = "Free Product Name is required.";
    //     }
    //     if (!freeItemCode.trim()) {
    //         tempErrors.freeItemCode = "Free Product code is required.";
    //     }
    //     if (!freeVariantCode.trim()) {
    //         tempErrors.freeVariantCode = "Free Variant Name/Pack Size is required.";
    //     }
    //     if (!freeMrp.trim()) {
    //         tempErrors.freeMrp = "Free MRP is required.";
    //     }
    //     if (!freeUnitPrice.trim()) {
    //         tempErrors.freeUnitPrice = "Free Unit Price is required.";
    //     }
    //     if (
    //         !freeQty?.trim() &&
    //         !discountPercentage?.trim() &&
    //         !discountValue?.trim()
    //     ) {
    //         tempErrors.freeQty =
    //             "Enter Free Qty or Discount % or Discount Value.";
    //     }
    //     if (!fromDate) tempErrors.fromDate = "From date is required.";
    //     if (!toDate) tempErrors.toDate = "To date is required.";
    //     if (fromDate && toDate) {
    //         const from = parseDate(fromDate);
    //         const to = parseDate(toDate);
    //         if (to <= from) {
    //             tempErrors.toDate = "To Date must be greater than From Date";
    //         }
    //     }
    //     setErrors(tempErrors);
    //     return Object.keys(tempErrors).length === 0;
    // };

    const handleSaveItemWiseDiscount = async () => {
        setErrors({});
        if (!validateForm()) return;
        try {
            setLoading(true);
            const isEditing =
                !!itemWiseData?.id ||
                !!existingDiscountData?.id;
            const apiUrl = isEditing
                ? ApiServices.zenxposUpdateItemWiseDiscount
                : ApiServices.zenxposAddItemWiseDiscount;
            const payload = {
                productId: selectedProductId,
                variantId: variantId,
                purchaseQty: Number(purchaseQty),
                freeProductId: selectedFreeProductId,
                freeVariantId: freeVariantId,
                freeQty: parseFloat(freeQty) || "0",
                discountPercentage: parseFloat(discountPercentage),
                discountValue: parseFloat(discountValue),
                fromDate,
                toDate,
                status: status === 'Active' ? 1 : 0,
            };
            if (isEditing) {
                payload.id =
                    itemWiseData?.id ||
                    existingDiscountData?.id;
            }
            console.log('ITEM WISE PAYLOAD ===>', payload);
            const response = await postMethod(apiUrl, payload);
            if (response?.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: response.message,
                });
                navigation.navigate('ItemWiseDiscountScreen');
            } else {
                setErrors({
                    general: response.message || 'Something went wrong',
                });
            }
        } catch (error) {
            console.log('ITEM WISE ERROR ===>', error?.response?.data);
            const backendError =
                error?.response?.data?.errors ||
                error?.response?.data?.error ||
                error?.response?.data?.message;
            setErrors({
                general: Array.isArray(backendError)
                    ? backendError.join(', ')
                    : typeof backendError === 'object'
                        ? Object.values(backendError).flat().join(', ')
                        : backendError || 'Failed to connect to server',
            });
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
                setErrors(prev => ({ ...prev, fromDate: null }));
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
                setErrors(prev => ({ ...prev, toDate: null }));
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
                        <Text style={styles.customerText}>Product-Wise Discounts</Text>

                        <Text style={styles.customerSubText}>
                            Create or Manage Product-Wise Discounts
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.newManageTouchable} onPress={() => navigation.navigate('ItemWiseDiscountScreen')} >
                        <Text style={styles.addNewManageText}>
                            Manage Product-Wise
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
                            <View style={[styles.firstRowContainer, {  position: 'relative' }]}>
                                <View style={{ flex: 0.35, }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Product Name <Text style={styles.required}>*</Text>
                                    </Text>
                                    <View style={styles.searchWrapper}>
                                        <View style={styles.searchInputContainer}>
                                            <TextInput
                                                style={[styles.searchTextInput, { marginRight: rS(10) }]}
                                                placeholder="Search Name or Code"
                                                placeholderTextColor={'#9A9A9A'}
                                                value={mainSearchText}
                                                onChangeText={(text) => {
                                                    setMainSearchText(text);
                                                    getProducts(text, 'main');
                                                }}
                                            />
                                            {selectedProductId ? (
        <TouchableOpacity onPress={handleClearMainProduct}>
            <CrossIcon width={rS(18)} height={rS(18)} />
        </TouchableOpacity>
    ) : (
        <GreySearchIcon />
    )}
                                        </View>
                                        {showMainResults && productList.length > 0 && (
                                            <View style={styles.searchResultsDropdown}>
                                                <FlatList
                                                    data={productList}
                                                    keyExtractor={(item, index) =>
                                                        `${item.productId}-${item.variantId}-${index}`
                                                    }
                                                    renderItem={({ item }) => (
                                                        <TouchableOpacity
                                                            style={styles.searchResultItem}
                                                            onPress={() => onSelectMainProduct(item)}
                                                        >
                                                            <Text style={styles.resItemName}>
                                                                {item.productFullName} - {item.packSize}
                                                            </Text>

                                                            <Text style={styles.resItemSub}>
                                                                {item.productCode} | {item.eanCode}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                     style={{ maxHeight: rV(150) }} 
                                                    contentContainerStyle={{ flexGrow: 1 }} 
                                                    nestedScrollEnabled={true}
                                                    scrollEnabled={true}
                                                    showsVerticalScrollIndicator={true}
                                                    keyboardShouldPersistTaps="handled"
                                                />
                                            </View>
                                        )}
                                    </View>

                                    {errors.itemName && <Text style={styles.errorText}>{errors.itemName}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Item Code <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter product code"
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
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        MRP <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter mrp"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, styles.disabledInput, { marginRight: rS(20) }]}
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
                                        keyboardType="numeric"
                                    />
                                    {errors.mrp && <Text style={styles.errorText}>{errors.mrp}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Unit Price <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter Unit Price"
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
                                    />
                                    {errors.unitPrice && <Text style={styles.errorText}>{errors.unitPrice}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Purchase Quantity <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter purchase quantity"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={styles.input}
                                        value={purchaseQty}
                                        maxLength={3}
                                        onChangeText={(text) => {
                                            setPurchaseQty(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                purchaseQty: null,
                                            }));
                                        }}
                                        keyboardType='numeric'
                                    />
                                    {errors.purchaseQty && <Text style={styles.errorText}>{errors.purchaseQty}</Text>}
                                </View>
                            </View>
                            <Text style={styles.basicDetailsText}>SCHEME DETAILS</Text>
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.35, }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Free Product Name <Text style={styles.required}>*</Text>
                                    </Text>
                                    <View style={styles.searchWrapper}>
                                        <View style={styles.searchInputContainer}>
                                            <TextInput
                                                style={styles.searchTextInput}
                                                placeholder="Search Free Product"
                                                value={freeSearchText}
                                                onChangeText={(text) => {
                                                    setFreeSearchText(text);
                                                    getProducts(text, 'free');
                                                }}
                                            />
                                             {selectedFreeProductId ? (
        <TouchableOpacity 
            onPress={handleClearFreeProduct}
        >
            <CrossIcon />
        </TouchableOpacity>
    ) : (
        <GreySearchIcon />
    )}
                                        </View>
                                        {showFreeResults && freeProductList.length > 0 && (
                                            <View style={styles.searchResultsDropdown}>
                                                <FlatList
                                                    data={freeProductList}
                                                    keyExtractor={(item, index) =>
                                                        `${item.productId}-${item.variantId}-${index}`
                                                    }
                                                    
                                                    renderItem={({ item }) => (
                                                        <TouchableOpacity
                                                            style={styles.searchResultItem}
                                                            onPress={() => onSelectFreeProduct(item)}
                                                        >
                                                            <Text style={styles.resItemName}>
                                                                {item.productFullName} - {item.packSize}
                                                            </Text>

                                                            <Text style={styles.resItemSub}>
                                                                {item.productCode}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                     style={{ maxHeight: rV(150) }} 
                                                    contentContainerStyle={{ flexGrow: 1 }} 
                                                    nestedScrollEnabled={true}
                                                    scrollEnabled={true}
                                                    showsVerticalScrollIndicator={true}
                                                    keyboardShouldPersistTaps="handled"
                                                />
                                            </View>
                                        )}
                                    </View>
                                    {errors.freeItemName && <Text style={styles.errorText}>{errors.freeItemName}</Text>}

                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Free Product Code <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter Free Product code"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, styles.disabledInput, { marginRight: rS(20) }]}
                                        value={freeItemCode}
                                        editable={false}
                                        onChangeText={(text) => {
                                            setFreeItemCode(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                freeItemCode: null,
                                            }));
                                        }}
                                    />
                                    {errors.freeItemCode && <Text style={styles.errorText}>{errors.freeItemCode}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Free Variant Name/Pack Size <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Variant Name/Pack Size"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, styles.disabledInput]}
                                        value={freeVariantCode}
                                        editable={false}
                                        // onChangeText={setFreeVariantCode}
                                        onChangeText={(text) => {
                                            setFreeVariantCode(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                freeVariantCode: null,
                                            }));
                                        }}
                                    />
                                    {errors.freeVariantCode && <Text style={styles.errorText}>{errors.freeVariantCode}</Text>}
                                </View>
                            </View>
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        MRP
                                    </Text>
                                    <TextInput
                                        placeholder="Enter mrp"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, styles.disabledInput, { marginRight: rS(10) }]}
                                        value={freeMrp}
                                        editable={false}
                                        // onChangeText={setFreeMrp}
                                        onChangeText={(text) => {
                                            setFreeMrp(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                freeMrp: null,
                                            }));
                                        }}
                                        maxLength={10}
                                        keyboardType='number-pad'
                                    />
                                    {errors.freeMrp && <Text style={styles.errorText}>{errors.freeMrp}</Text>}
                                </View>
                                <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Unit Price
                                    </Text>
                                    <TextInput
                                        placeholder="Enter unit"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, styles.disabledInput, { marginRight: rS(20) }]}
                                        value={freeUnitPrice}
                                        editable={false}
                                        onChangeText={(text) => {
                                            setFreeUnitPrice(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                freeUnitPrice: null,
                                            }));
                                        }}
                                        maxLength={10}
                                        keyboardType='number-pad'
                                    />
                                    {errors.freeUnitPrice && <Text style={styles.errorText}>{errors.freeUnitPrice}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Free Quantity
                                    </Text>
                                    <TextInput
                                        placeholder="Enter Free Quantity"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, { marginRight: rS(20) }, (hasDiscountPercentage || hasDiscountValue) && styles.disabledInput]}
                                        value={freeQty}
                                        onChangeText={(text) => {
                                            setFreeQty(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                freeQty: null,
                                            }));
                                        }}
                                        editable={!hasDiscountPercentage && !hasDiscountValue}
                                        keyboardType='number-pad'
                                    />
                                    {errors.freeQty && <Text style={styles.errorText}>{errors.freeQty}</Text>}
                                </View>
                                <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Discount %
                                    </Text>
                                    <TextInput
                                        placeholder="Enter discount"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[styles.input, { marginRight: rS(10) }, (hasFreeQty || hasDiscountValue) && styles.disabledInput]}
                                        value={discountPercentage}
                                        onChangeText={(text) => {
                                            setDiscountPercentage(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                discountPercentage: null,
                                            }));
                                        }}
                                        editable={!hasFreeQty && !hasDiscountValue}
                                        maxLength={10}
                                        keyboardType='number-pad'
                                    />
                                    {errors.discountPercentage && <Text style={styles.errorText}>{errors.discountPercentage}</Text>}
                                </View>
                                <View style={{ flex: 0.175 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Discount Value
                                    </Text>
                                    <TextInput
                                        placeholder="Enter discount value"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                            (hasFreeQty || hasDiscountPercentage)  && styles.disabledInput
                                        ]}
                                        value={discountValue}
                                        editable={!hasFreeQty && !hasDiscountPercentage}
                                        onChangeText={(text) => {
                                            setDiscountValue(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                discountValue: null,
                                            }));
                                        }}
                                        maxLength={10}
                                        keyboardType="numeric"
                                    />
                                    {errors.discountValue && <Text style={styles.errorText}>{errors.discountValue}</Text>}
                                </View>
                            </View>
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.35 }}>
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
                                                marginRight: rS(20),
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
                                <View style={{ flex: 0.35 }}>
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
                                </View>
                            </View>
                            {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
                            <TouchableOpacity
                                style={styles.saveTouchable}
                                onPress={handleSaveItemWiseDiscount}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.saveText}>
                                        <Text style={styles.saveText}>
                                            {(itemWiseData?.id || existingDiscountData?.id)
                                                ? 'Update Changes'
                                                : 'Save'}
                                        </Text>
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </KeyboardAwareScrollView>
                </View>
            </View>
            {/* Android Pickers */}
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

            {/* iOS From Date Modal */}
            <Modal visible={Platform.OS === 'ios' && showFromDatePicker} transparent animationType="slide">
                <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                        <TouchableOpacity onPress={() => setShowFromDatePicker(false)}>
                            <Text style={styles.iosCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            setFromDate(formatDate(tempFromDate));
                            setShowFromDatePicker(false);
                        }}>
                            <Text style={styles.iosDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <DateTimePicker value={tempFromDate} mode="date" display="spinner" onChange={handleFromDateChange} />
                </View>
            </Modal>

            {/* iOS To Date Modal */}
            <Modal visible={Platform.OS === 'ios' && showToDatePicker} transparent animationType="slide">
                <View style={styles.iosPickerContainer}>
                    <View style={styles.iosPickerHeader}>
                        <TouchableOpacity onPress={() => setShowToDatePicker(false)}>
                            <Text style={styles.iosCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => {
                            setToDate(formatDate(tempToDate));
                            setShowToDatePicker(false);
                        }}>
                            <Text style={styles.iosDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                    <DateTimePicker value={tempToDate} mode="date" display="spinner" onChange={handleToDateChange} />
                </View>
            </Modal>
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
        marginBottom: rV(5)
    },
    disabledInput: {
        backgroundColor: '#F2F0EF',
    },
    searchWrapper: {
        position: 'relative',
        width: '89%', 
    },
    searchResultItem: {
        // padding: rS(10),
        paddingVertical: rV(8),
        paddingHorizontal: rS(10),
        borderBottomWidth: 1,
        borderBottomColor: '#F4F4F4',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderColor: '#C0C0C0',
        borderWidth: 1,
        borderRadius: 8,
        height: rV(28),
        paddingHorizontal: rS(10),
        marginBottom: rV(5)
    },
    searchTextInput: { flex: 1, fontSize: 14, color: '#000000', fontFamily: Fonts.FigtreeRegular, },
    searchResultsDropdown: {
        position: 'absolute',
        top: rV(30),
        left: 0,
        right: 0,
        height: rV(150),
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#C0C0C0',
        zIndex: 9999,
        overflow: 'hidden',
    },
    searchResultItem: { padding: rV(8), borderBottomWidth: 1, borderBottomColor: '#F4F4F4' },
    resItemName: { fontSize: 14, color: '#000000', fontFamily: Fonts.FigtreeRegular },
    resItemSub: { fontSize: 11, color: '#919191' },
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
});