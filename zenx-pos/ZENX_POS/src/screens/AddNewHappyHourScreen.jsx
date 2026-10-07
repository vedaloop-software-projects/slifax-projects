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

export default function AddNewHappyHourScreen() {
    const navigation = useNavigation()
    const dispatch = useDispatch()
    const route = useRoute();
    const editData = route.params?.happyHourData;
    const intialTab = route.params?.type;

    console.log("::::: initial tab:::::", intialTab)
    const { postMethod } = HelperModule()
    const [id, setId] = useState(null);
    const [happyHourName, setHappyHourName] = useState('');
    const [groupWiseHappyHourName, setGroupWiseHappyHourName] = useState('');
    const [discountPercentage, setDiscountPercentage] = useState('');
    const [groupWiseDiscountPercentage, setGroupWiseDiscountPercentage] = useState('');
    const [groupWiseFromDate, setGroupWiseFromDate] = useState('');
    const [groupWiseToDate, setGroupWiseToDate] = useState('');
    const [groupWiseFromTime, setGroupWiseFromTime] = useState('');
    const [groupWiseToTime, setGroupWiseToTime] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [fromTime, setFromTime] = useState('');
    const [toTime, setToTime] = useState('');
    const [status, setStatus] = useState(1);
    const [selectedTab, setSelectedTab] = useState(intialTab || 'happyHours');

    const [products, setProducts] = useState([{ productId: '', variantId: '', productCode: '', packSize: '', mrp: '', productFullName: '', id: '' }]);
    const [productList, setProductList] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPicker, setShowPicker] = useState({ field: null, mode: 'date' });
    // const [groupRows, setGroupRows] = useState([
    //     { id: '', groupType: '', groupId: '', discountPercentage: '', groupOptions: [] },
    // ]);
    const [groupRows, setGroupRows] = useState([]);
    const [tempGroup, setTempGroup] = useState({
        groupType: '',
        groupId: '',
        groupName: '', // For display in table
        groupTypeName: '', // For display in table
        discountPercentage: '',
        groupOptions: []
    });
    const groupTypeData = [
        { label: 'Category', value: '1' },
        { label: 'Sub-Category', value: '2' },
        { label: 'Brand', value: '3' },
        { label: 'Colour', value: '4' },
        { label: 'Size', value: '5' },
    ];

    const getGroupOptions = async (type) => {
        try {
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
            };

            if (type === '1') {
                const response = await postMethod(ApiServices.zenxposGetCategories, payload);
                if (response?.success) {
                    return (response?.data?.categories || []).map(item => ({
                        label: item.categoryName,
                        value: item.id.toString(),
                    }));
                }
            }

            if (type === '2') {
                const response = await postMethod(ApiServices.zenxposGetSubCategories, { ...payload, categoryId: '' });
                if (response?.success) {
                    return (response?.data?.subCategories || []).map(item => ({
                        label: item.subCategoryName,
                        value: item.id.toString(),
                    }));
                }
            }

            if (type === '3') {
                const response = await postMethod(ApiServices.zenxposGetBrands, payload);
                if (response?.success) {
                    return (response?.data?.brands || []).map(item => ({
                        label: item.brandName,
                        value: item.id.toString(),
                    }));
                }
            }

            if (type === '4') {
                const response = await postMethod(ApiServices.zenxposGetColours, payload);
                if (response?.success) {
                    return (response?.data?.colours || []).map(item => ({
                        label: item.colourName,
                        value: item.id.toString(),
                    }));
                }
            }

            if (type === '5') {
                const response = await postMethod(ApiServices.zenxposGetSizes, payload);
                if (response?.success) {
                    return (response?.data?.sizes || []).map(item => ({
                        label: item.sizeName,
                        value: item.id.toString(),
                    }));
                }
            }

            return [];
        } catch (error) {
            console.log('GET GROUP OPTIONS ERROR =====>', error);
            return [];
        }
    };

    const loadGroupOptions = async (index, type, selectedId = '') => {
        setErrors(prev => ({ ...prev, groupRows: null }));
        if (!type) {
            setGroupRows(prev => prev.map((row, rowIndex) => rowIndex === index ? { ...row, groupType: '', groupId: '', groupOptions: [] } : row));
            return;
        }

        const options = await getGroupOptions(type);
        setGroupRows(prev => prev.map((row, rowIndex) => rowIndex === index ? { ...row, groupType: type, groupId: selectedId, groupOptions: options } : row));
    };

    const updateGroupRow = (index, field, value) => {
        setGroupRows(prev => prev.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
        setErrors(prev => ({ ...prev, groupRows: null }));
    };

    const handleTempGroupTypeChange = async (type) => {
        const typeLabel = groupTypeData.find(item => item.value === type)?.label || '';
        const options = await getGroupOptions(type);
        setTempGroup(prev => ({
            ...prev,
            groupType: type,
            groupTypeName: typeLabel,
            groupId: '',
            groupName: '',
            groupOptions: options
        }));
    };

    const addGroupRow = () => {
        // 1. Basic Validation: Ensure user filled the temporary fields
        if (!tempGroup.groupType || !tempGroup.groupId || !tempGroup.discountPercentage) {
            Toast.show({
                type: 'error',
                text1: 'Missing Fields',
                text2: 'Please fill Group Type, Name, and Discount before adding.'
            });
            return;
        }

        // 2. DUPLICATE CHECK: Check if this Group Type + Group Name combination already exists in the table
        const isDuplicate = groupRows.some(
            row => row.groupType === tempGroup.groupType && row.groupId === tempGroup.groupId
        );

        if (isDuplicate) {
            Toast.show({
                type: 'error',
                text1: 'Duplicate Entry',
                text2: `${tempGroup.groupTypeName}: ${tempGroup.groupName} is already selected.`
            });
            return; // Stop the function here
        }

        // 3. Add the current temp data to the table list if not a duplicate
        setGroupRows(prev => [...prev, {
            id: '',
            groupType: tempGroup.groupType,
            groupTypeName: tempGroup.groupTypeName,
            groupId: tempGroup.groupId,
            groupName: tempGroup.groupName,
            discountPercentage: tempGroup.discountPercentage
        }]);

        // 4. Reset the tempGroup state
        setTempGroup({
            groupType: null,
            groupId: null,
            groupTypeName: '',
            groupName: '',
            discountPercentage: '',
            groupOptions: []
        });

        setErrors(prev => ({ ...prev, groupRows: null }));
    };

    // const addGroupRow = () => {
    //     // 1. Validation: Ensure user filled the temporary fields
    //     if (!tempGroup.groupType || !tempGroup.groupId || !tempGroup.discountPercentage) {
    //         Toast.show({
    //             type: 'error',
    //             text1: 'Missing Fields',
    //             text2: 'Please fill Group Type, Name, and Discount before adding.'
    //         });
    //         return;
    //     }

    //     // 2. Add the current temp data to the table list
    //     setGroupRows(prev => [...prev, {
    //         id: '', // New entry has no ID yet
    //         groupType: tempGroup.groupType,
    //         groupTypeName: tempGroup.groupTypeName,
    //         groupId: tempGroup.groupId,
    //         groupName: tempGroup.groupName,
    //         discountPercentage: tempGroup.discountPercentage
    //     }]);

    //     // 3. CRITICAL: Reset the tempGroup state to clear the input fields
    //     setTempGroup({
    //         groupType: null,         // Use null to force dropdown reset
    //         groupId: null,           // Use null to force dropdown reset
    //         groupTypeName: '',
    //         groupName: '',
    //         discountPercentage: '',  // Clear text input
    //         groupOptions: []         // Clear the options list for the next selection
    //     });

    //     // Clear any group-related errors
    //     setErrors(prev => ({ ...prev, groupRows: null }));
    // };

    const removeGroupRow = async (index) => {
        const rowToDelete = groupRows[index];

        if (rowToDelete?.id) {
            // If it has an ID, call the API
            try {
                setLoading(true);
                const response = await postMethod(ApiServices.zenxposDeleteGroupWiseHappyHourChild, { id: rowToDelete.id });
                if (response?.success) {
                    setGroupRows(prev => prev.filter((_, i) => i !== index));
                    Toast.show({ type: 'success', text1: 'Deleted', text2: 'Group removed successfully' });
                }
            } catch (error) {
                console.log('Delete API Error:', error);
            } finally {
                setLoading(false);
            }
        } else {
            // If no ID, just delete locally
            setGroupRows(prev => prev.filter((_, i) => i !== index));
        }
    };
    const resetForm = () => {
        setId(null);
        setHappyHourName('');
        setGroupWiseHappyHourName('')
        setDiscountPercentage('');
        setGroupWiseDiscountPercentage('')
        setGroupWiseFromDate('')
        setGroupWiseToDate('')
        setGroupWiseToTime('')
        setGroupWiseFromTime('')
        setFromDate('');
        setToDate('');
        setFromTime('');
        setToTime('');
        setStatus(1);
        setSelectedTab(route.params?.type === 'groupWise' ? 'groupWise' : 'happyHours');
        setProducts([{ productId: '', variantId: '', productCode: '', packSize: '', mrp: '', productFullName: '', id: '' }]);
        setGroupRows([]); // Initialize as an empty array
        setTempGroup({
            groupType: null,
            groupId: null,
            groupName: '',
            groupTypeName: '',
            discountPercentage: '',
            groupOptions: []
        });
        setErrors({});
    };

    useFocusEffect(
        useCallback(() => {
            setErrors({})
            if (route.params?.type) {
                setSelectedTab(route.params.type === 'groupWise' ? 'groupWise' : 'happyHours');
            }
            if (editData) {
                populateData(editData);
            } else {
                resetForm();
            }
        }, [editData, route.params?.type])
    );

    const populateData = async (data) => {
        setId(data.id);

        // Determine if it's Group-wise or standard Happy Hour
        const isGroupWise = Array.isArray(data?.groups) && data.groups.length > 0;
        setSelectedTab(isGroupWise ? 'groupWise' : 'happyHours');
        setStatus(data.status ?? 1);

        if (isGroupWise) {
            // --- LOGIC FOR GROUP-WISE TAB ---
            setGroupWiseHappyHourName(data.happyHourName || '');
            setGroupWiseFromDate(data.fromDate || '');
            setGroupWiseToDate(data.toDate || '');
            setGroupWiseFromTime(data.fromTime || '');
            setGroupWiseToTime(data.toTime || '');

            const mappedGroups = data.groups.map(group => {
                const typeInfo = groupTypeData.find(t => t.value === group.groupType?.toString());
                return {
                    id: group.id || '',
                    groupType: group.groupType?.toString() || '',
                    groupTypeName: typeInfo ? typeInfo.label : '',
                    groupId: group.groupId?.toString() || '',
                    groupName: group.groupName || '',
                    discountPercentage: parseFloat(group.discountPercentage || 0).toString(),
                };
            });
            setGroupRows(mappedGroups);
        } else {
            // --- LOGIC FOR STANDARD HAPPY HOURS TAB (FIX) ---
            setHappyHourName(data.happyHourName || '');
            // Convert to string for TextInput
            setDiscountPercentage(data.discountPercentage ? parseFloat(data.discountPercentage).toString() : '');
            setFromDate(data.fromDate || '');
            setToDate(data.toDate || '');
            setFromTime(data.fromTime || '');
            setToTime(data.toTime || '');

            // Map the products array from API to your local state
            if (data.products && data.products.length > 0) {
                const mappedProducts = data.products.map(p => ({
                    id: p.id,
                    productId: p.productId,
                    variantId: p.variantId,
                    productCode: p.productCode,
                    packSize: p.packSize,
                    mrp: p.mrp?.toString(),
                    productFullName: p.productFullName
                }));
                setProducts(mappedProducts);

                // 2. FIX: Initialize productList so the Dropdown can find the "Product Name"
                const initialProductList = data.products.map(p => ({
                    label: p.productFullName,
                    displayLabel: `${p.productFullName} - ${p.packSize} (${p.productCode})`,
                    value: p.productId, // This matches what getProducts does
                    ...p // Keep all other fields
                }));
                setProductList(initialProductList);

            } else {
                setProducts([{ productId: '', variantId: '', productCode: '', packSize: '', mrp: '', productFullName: '', id: '' }]);
                setProductList([])
            }
        }
    };

    const getProducts = async (search) => {
        try {
            const payload = { searchStr: search };
            const response = await postMethod(ApiServices.zenxposSearchProducts, payload);
            if (response?.success) {
                const formatted = response.data.map(item => ({
                    label: item.productFullName,
                    searchLabel: `${item.productFullName} - ${item.productCode} (${item.eanCode})`,
                    value: item.productId,
                    ...item,
                }));
                setProductList(formatted);
            }
        } catch (error) {
            console.log('Search Product Error', error);
        }
    };

    const handleProductSelect = (index, item) => {
    // 1. Check if this product is already selected in another row
    const isDuplicate = products.some((p, i) =>
        i !== index && p.productId === item.productId
    );

    if (isDuplicate) {
        Toast.show({
            type: 'error',
            text1: 'Duplicate Item',
            text2: `${item.productFullName} is already added to the exempted list.`
        });
        
        // Optional: Clear the specific row if it's a duplicate
        const updatedProducts = [...products];
        updatedProducts[index] = { 
            productId: '', variantId: '', productCode: '', 
            packSize: '', mrp: '', productFullName: '', id: '' 
        };
        setProducts(updatedProducts);
        return;
    }

    // 2. CRITICAL FIX: Update the state with the selected product details
    const updatedProducts = [...products];
    updatedProducts[index] = {
        ...updatedProducts[index],
        productId: item.productId,
        variantId: item.variantId,
        productCode: item.productCode,
        packSize: item.packSize,
        mrp: item.mrp?.toString(),
        productFullName: item.productFullName
    };
    
    setProducts(updatedProducts);

    // 3. Clear errors
    if (errors.products) {
        setErrors(prev => ({ ...prev, products: null }));
    }
};

    // const handleProductSelect = (index, item) => {
    //     const isDuplicate = products.some((p, i) =>
    //         i !== index && p.productId === item.productId
    //     );

    //     if (isDuplicate) {
    //         Toast.show({
    //             type: 'error',
    //             text1: 'Duplicate Item',
    //             text2: `${item.productFullName} is already added to the exempted list.`
    //         });
    //         const updatedProducts = [...products];
    //         updatedProducts[index] = {
    //             ...updatedProducts[index],
    //             productId: item.productId,
    //             variantId: item.variantId,
    //             productCode: item.productCode,
    //             packSize: item.packSize,
    //             mrp: item.mrp?.toString(),
    //             productFullName: item.productFullName
    //         };
    //         setProducts(updatedProducts);
    //         return;
    //     }

    //     if (errors.products) {
    //         setErrors(prev => ({ ...prev, products: null }));
    //     }
    // };

    const addProductRow = () => {
        setProducts([...products, { productId: '', variantId: '', productCode: '', packSize: '', mrp: '', productFullName: '', id: '' }]);
    };

    const removeProductRow = async (index) => {
        const itemToDelete = products[index];
        if (itemToDelete.id) {
            try {
                setLoading(true);
                const response = await postMethod(ApiServices.zenxposDeleteHappyHourChild, { id: itemToDelete.id });
                if (response?.success) {
                    setProducts(products.filter((_, i) => i !== index));
                }
            } catch (error) {
                console.log("Delete Child Error:", error);
            } finally {
                setLoading(false);
            }
        } else {
            setProducts(products.filter((_, i) => i !== index));
        }
    };

    const validateForm = () => {
        let tempErrors = {};
        if (!happyHourName) tempErrors.happyHourName = "Name is required";
        if (!discountPercentage) tempErrors.discountPercentage = "Discount is required";

        // Date Validation
        if (!fromDate) tempErrors.fromDate = "From date is required.";
        if (!toDate) tempErrors.toDate = "To date is required.";
        if (fromDate && toDate) {
            const from = parseDate(fromDate);
            const to = parseDate(toDate);
            if (to <= from) {
                tempErrors.toDate = "To Date must be greater than From Date";
            }
        }

        // Time Validation
        if (!fromTime) tempErrors.fromTime = "From time is required";
        if (!toTime) tempErrors.toTime = "To time is required";

        if (fromTime && toTime) {
            const startTime = parseTime(fromTime);
            const endTime = parseTime(toTime);

            if (endTime <= startTime) {
                tempErrors.toTime = "To time must be greater than from time";
            }
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const validateGroupWiseForm = () => {
        let tempErrors = {};
        if (!groupWiseHappyHourName) tempErrors.groupWiseHappyHourName = "Happy Hour Name is required";
        if (!groupWiseFromDate) tempErrors.groupWiseFromDate = "From date is required.";
        if (!groupWiseToDate) tempErrors.groupWiseToDate = "To date is required.";
        if (groupWiseFromDate && groupWiseToDate) {
            const from = parseDate(groupWiseFromDate);
            const to = parseDate(groupWiseToDate);
            if (to <= from) {
                tempErrors.groupWiseToDate = "To Date must be greater than From Date";
            }
        }

        if (!groupWiseFromTime) tempErrors.groupWiseFromTime = "From time is required";
        if (!groupWiseToTime) tempErrors.groupWiseToTime = "To time is required";

        if (groupWiseFromTime && groupWiseToTime) {
            const startTime = parseTime(groupWiseFromTime);
            const endTime = parseTime(groupWiseToTime);
            if (endTime <= startTime) {
                tempErrors.groupWiseToTime = "To time must be greater than from time";
            }
        }

        const hasValidRows = groupRows.some(row => row.groupType && row.groupId && row.discountPercentage);
        if (!hasValidRows) {
            tempErrors.groupRows = "Please add at least one group row with group type, group name and discount";
        }

        const hasIncompleteRows = groupRows.some(row => (row.groupType && !row.groupId) || (!row.groupType && row.groupId) || (row.groupType && row.groupId && !row.discountPercentage));
        if (hasIncompleteRows) {
            tempErrors.groupRows = "Please complete all group rows";
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSave = async () => {
        if (selectedTab === 'groupWise') {
            if (!validateGroupWiseForm()) return;

            try {
                setLoading(true);
                const groupsPayload = groupRows
                    .filter(row => row.groupType && row.groupId && row.discountPercentage)
                    .map(row => ({
                        id: id ? (row.id || '') : undefined,
                        groupType: Number(row.groupType),
                        groupId: Number(row.groupId),
                        discountPercentage: Number(row.discountPercentage),
                    }));

                const payload = {
                    happyHourName: groupWiseHappyHourName,
                    fromTime: groupWiseFromTime,
                    toTime: groupWiseToTime,
                    fromDate: groupWiseFromDate,
                    toDate: groupWiseToDate,
                    status,
                    groups: groupsPayload,
                };

                if (id) payload.id = id;

                const endpoint = id ? ApiServices.zenxposUpdateGroupWiseHappyHour : ApiServices.zenxposGetAddGroupWiseHappyHours;
                const response = await postMethod(endpoint, payload);

                if (response?.success) {
                    Toast.show({ type: 'success', text1: 'Success', text2: response.message });
                    resetForm();
                    navigation.navigate('HappyHourScreen');
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
            return;
        }

        if (!validateForm()) return;

        try {
            setLoading(true);
            const validProducts = products.filter(p => p.productId !== '');

            const productPayload = validProducts.map(p => ({
                id: id ? (p.id || "") : undefined,
                productId: p.productId,
                variantId: p.variantId
            }));

            const payload = {
                happyHourName,
                discountPercentage: Number(discountPercentage),
                fromTime,
                toTime,
                fromDate,
                toDate,
                status,
                products: productPayload
            };

            if (id) payload.id = id;

            const endpoint = id ? ApiServices.zenxposUpdateHappyHour : ApiServices.zenxposAddHappyHours;
            const response = await postMethod(endpoint, payload);

            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response.message });
                resetForm();
                navigation.navigate('HappyHourScreen');
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

    // Function to get the day after fromDate
    const getMinToDate = () => {
        const activeFromDate = selectedTab === 'groupWise' ? groupWiseFromDate : fromDate;
        if (!activeFromDate) return new Date();
        const date = parseDate(activeFromDate);
        date.setDate(date.getDate() + 1); // Adds 1 day
        return date;
    };

    // Function to get one minute after fromTime
    const getMinToTime = () => {
        const activeFromTime = selectedTab === 'groupWise' ? groupWiseFromTime : fromTime;
        if (!activeFromTime) {
            const now = new Date();
            now.setMinutes(now.getMinutes() + 1);
            return now;
        }
        const time = parseTime(activeFromTime);
         if (!time) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 1);
        return now;
    }

        time.setMinutes(time.getMinutes() + 1); // Adds 1 minute
        return time;
    };

    const parseTime = (timeStr) => {
        if (!timeStr) return null;
        const [time, modifier] = timeStr.split(' ');
        let [hours, minutes] = time.split(':');
        hours = parseInt(hours, 10);
        minutes = parseInt(minutes, 10);

        if (modifier === 'PM' && hours < 12) hours += 12;
        if (modifier === 'AM' && hours === 12) hours = 0;

        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    };

    const formatTime = (date) => {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const strHours = String(hours).padStart(2, '0'); // Add leading zero
        const strMinutes = String(minutes).padStart(2, '0');
        return `${strHours}:${strMinutes} ${ampm}`;
    };

    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${day}-${month}-${date.getFullYear()}`;
    };

    const onPickerChange = (event, selectedValue) => {
        setShowPicker({ field: null, mode: 'date' });
        if (Platform.OS === 'android' && event.type === 'dismissed') return;
        if (!selectedValue) return;

        const isGroupWise = selectedTab === 'groupWise';

        if (showPicker.mode === 'date') {
            const formatted = formatDate(selectedValue);
            if (showPicker.field === 'fromDate') {
                if (isGroupWise) {
                    setGroupWiseFromDate(formatted);
                    setErrors(prev => ({ ...prev, groupWiseFromDate: null }));
                } else {
                    setFromDate(formatted);
                    setErrors(prev => ({ ...prev, fromDate: null }));
                }
            } else {
                if (isGroupWise) {
                    setGroupWiseToDate(formatted);
                    setErrors(prev => ({ ...prev, groupWiseToDate: null }));
                } else {
                    setToDate(formatted);
                    setErrors(prev => ({ ...prev, toDate: null }));
                }
            }
        } else {
            const formatted = formatTime(selectedValue);

            if (showPicker.field === 'fromTime') {
                if (isGroupWise) {
                    setGroupWiseFromTime(formatted);
                    setErrors(prev => ({ ...prev, groupWiseFromTime: null }));
                    if (groupWiseToTime) {
                        const startTime = selectedValue;
                        const endTime = parseTime(groupWiseToTime);
                        if (endTime <= startTime) {
                            setErrors(prev => ({ ...prev, groupWiseToTime: "To time must be greater than from time" }));
                        } else {
                            setErrors(prev => ({ ...prev, groupWiseToTime: null }));
                        }
                    }
                } else {
                    setFromTime(formatted);
                    setErrors(prev => ({ ...prev, fromTime: null }));
                    if (toTime) {
                        const startTime = selectedValue;
                        const endTime = parseTime(toTime);
                        if (endTime <= startTime) {
                            setErrors(prev => ({ ...prev, toTime: "To time must be greater than from time" }));
                        } else {
                            setErrors(prev => ({ ...prev, toTime: null }));
                        }
                    }
                }
            } else {
                if (isGroupWise) {
                    setGroupWiseToTime(formatted);
                    if (groupWiseFromTime) {
                        const startTime = parseTime(groupWiseFromTime);
                        if (selectedValue <= startTime) {
                            setErrors(prev => ({ ...prev, groupWiseToTime: "To time must be greater than from time" }));
                        } else {
                            setErrors(prev => ({ ...prev, groupWiseToTime: null }));
                        }
                    } else {
                        setErrors(prev => ({ ...prev, groupWiseToTime: null }));
                    }
                } else {
                    setToTime(formatted);
                    if (fromTime) {
                        const startTime = parseTime(fromTime);
                        if (selectedValue <= startTime) {
                            setErrors(prev => ({ ...prev, toTime: "To time must be greater than from time" }));
                        } else {
                            setErrors(prev => ({ ...prev, toTime: null }));
                        }
                    } else {
                        setErrors(prev => ({ ...prev, toTime: null }));
                    }
                }
            }
        }
    };
    const parseDate = (str) => {
        if (!str) return new Date();
        const [d, m, y] = str.split('-');
        return new Date(y, m - 1, d);
    };

    return (
        <SafeAreaView style={styles.container}>
            <CustomHeader />
            <View style={styles.subContainer}>
                {/* Top Header */}
                <View style={styles.customerRowContainer}>
                    <View>
                        <Text style={styles.customerText}>Happy Hours</Text>

                        <Text style={styles.customerSubText}>
                            Create or Manage Happy Hours
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.newManageTouchable} onPress={() => navigation.navigate('HappyHourScreen', { type: selectedTab })} >
                        <Text style={styles.addNewManageText}>
                            Manage Happy Hours
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
                            <View style={styles.tabRow}>
                                <TouchableOpacity style={[styles.tabBtn, selectedTab === 'happyHours' && styles.activeTabBtn]} onPress={() => setSelectedTab('happyHours')}>
                                    <Text style={[styles.tabText, selectedTab === 'happyHours' && styles.activeTabText]}>Happy Hours</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.tabBtn, selectedTab === 'groupWise' && styles.activeTabBtn]} onPress={() => setSelectedTab('groupWise')}>
                                    <Text style={[styles.tabText, selectedTab === 'groupWise' && styles.activeTabText]}>Group-wise Happy Hours</Text>
                                </TouchableOpacity>
                            </View>

                            {selectedTab === 'happyHours' ?
                                <>
                                    <View style={styles.firstRowContainer}>
                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                Happy Hour Name <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TextInput
                                                placeholder="Enter happy hour name"
                                                placeholderTextColor={'#9A9A9A'}
                                                style={[
                                                    styles.input,
                                                    { marginRight: rS(20) }
                                                ]}
                                                value={happyHourName}
                                                onChangeText={(text) => {
                                                    setHappyHourName(text);
                                                    setErrors(prev => ({
                                                        ...prev,
                                                        happyHourName: null,
                                                    }));
                                                }}
                                            />
                                            {errors.happyHourName && <Text style={styles.errorText}>{errors.happyHourName}</Text>}
                                        </View>
                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                Discount % <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TextInput
                                                placeholder="Enter discount%"
                                                placeholderTextColor={'#9A9A9A'}
                                                style={[
                                                    styles.input,
                                                    { marginRight: rS(20) }
                                                ]}
                                                value={discountPercentage}
                                                onChangeText={(text) => {
                                                    // 1. Remove any non-numeric characters
                                                    let numericValue = text.replace(/[^0-9]/g, '');

                                                    // 2. Check if the number is greater than 100
                                                    if (numericValue !== '' && parseInt(numericValue, 10) > 100) {
                                                        numericValue = '100'; // Force it to 100
                                                    }

                                                    setDiscountPercentage(numericValue);
                                                    setErrors(prev => ({
                                                        ...prev,
                                                        discountPercentage: null,
                                                    }));
                                                }}
                                            />
                                            {errors.discountPercentage && <Text style={styles.errorText}>{errors.discountPercentage}</Text>}
                                        </View>
                                        <View style={{ flex: 0.175 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                From Time <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => setShowPicker({ field: 'fromTime', mode: 'time' })}
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
                                                        color: fromTime ? '#000' : '#9A9A9A',
                                                        fontFamily: Fonts.FigtreeRegular,
                                                    }}>
                                                    {fromTime || 'From Time'}
                                                </Text>
                                                <CalenderIcon />
                                            </TouchableOpacity>
                                            {errors.fromTime && <Text style={styles.errorText}>{errors.fromTime}</Text>}
                                        </View>
                                        <View style={{ flex: 0.175 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                To Time <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => setShowPicker({ field: 'toTime', mode: 'time' })}
                                                style={[styles.input, {
                                                    // marginRight: rS(20),
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                },]}
                                            >
                                                <Text
                                                    style={{
                                                        color: toTime ? '#000' : '#9A9A9A',
                                                        fontFamily: Fonts.FigtreeRegular,
                                                    }}>
                                                    {toTime || 'To Time'}
                                                </Text>
                                                <CalenderIcon />
                                            </TouchableOpacity>
                                            {errors.toTime && <Text style={styles.errorText}>{errors.toTime}</Text>}
                                        </View>
                                    </View>
                                    <View style={styles.firstRowContainer}>

                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                From Date <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => setShowPicker({ field: 'fromDate', mode: 'date' })}
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
                                                onPress={() => setShowPicker({ field: 'toDate', mode: 'date' })}
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
                                        <Text style={styles.basicDetailsText}>EXEMPTED ITEMS</Text>
                                        <TouchableOpacity style={{ flexDirection: 'row', }} onPress={addProductRow}>
                                            <PlusIcon />
                                            <Text style={styles.addText}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {products.map((item, index) => (
                                        <View key={index} style={styles.schemeRow}>
                                            <View style={{ flex: 1, marginRight: rS(10) }}>
                                                <Text style={styles.label}>Product Name</Text>
                                                <Dropdown
                                                    style={styles.dropdown}
                                                    data={productList}
                                                    search
                                                    labelField="label"
                                                    searchField="searchLabel"
                                                    valueField="productId"
                                                    placeholder="Search Product Name"
                                                    searchPlaceholder="Search Product Name..."
                                                    onChangeText={getProducts}
                                                    onChange={(val) => handleProductSelect(index, val)}
                                                    placeholderStyle={styles.placeholderStyle}
                                                    selectedTextStyle={styles.selectedTextStyle}
                                                    itemTextStyle={styles.itemTextStyle}
                                                    inputSearchStyle={styles.inputSearchStyle}
                                                    value={item.productId}
                                                    renderItem={(item) => (
                                                        <View style={styles.dropdownItemRow}>
                                                            <View style={{ flex: 1 }}>
                                                                <Text style={styles.dropdownItemText}>
                                                                    {item.productFullName} - {item.packSize}
                                                                </Text>
                                                                <Text style={styles.dropdownSubItemText}>
                                                                    {item.productCode} | {item.eanCode}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    )}
                                                />
                                            </View>
                                            <View style={{ flex: 1, marginRight: rS(10) }}>
                                                <Text style={styles.label}>Pack Size/ Variant Name</Text>
                                                <TextInput
                                                    placeholder="Enter pack size"
                                                    placeholderTextColor={'#9A9A9A'}
                                                    style={[styles.input, styles.disabledInput]}
                                                    value={item.packSize}
                                                />
                                            </View>
                                            <View style={{ flex: 1, }}>
                                                <Text style={styles.label}>MRP </Text>
                                                <TextInput
                                                    placeholder="Enter mrp"
                                                    placeholderTextColor={'#9A9A9A'}
                                                    style={[styles.input, styles.disabledInput]}
                                                    value={item.mrp ? `₹${item.mrp}` : ''}
                                                    editable={false}
                                                />
                                            </View>
                                            {products.length > 1 && (
                                                <TouchableOpacity onPress={() => removeProductRow(index)} style={styles.deleteBtn}>
                                                    <DeleteIcon />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                    {errors.products && <Text style={styles.errorText}>{errors.products}</Text>}
                                    {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
                                    <TouchableOpacity style={styles.saveTouchable} onPress={handleSave} disabled={loading}>
                                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{id ? 'Update' : 'Save'} </Text>}
                                    </TouchableOpacity>

                                </>
                                :
                                <>
                                    <View style={styles.firstRowContainer}>
                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                Happy Hour Name <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TextInput
                                                placeholder="Enter happy hour name"
                                                placeholderTextColor={'#9A9A9A'}
                                                style={[
                                                    styles.input,
                                                    { marginRight: rS(20) }
                                                ]}
                                                value={groupWiseHappyHourName}
                                                onChangeText={(text) => {
                                                    setGroupWiseHappyHourName(text);
                                                    setErrors(prev => ({
                                                        ...prev,
                                                        groupWiseHappyHourName: null,
                                                    }));
                                                }}
                                            />
                                            {errors.groupWiseHappyHourName && <Text style={styles.errorText}>{errors.groupWiseHappyHourName}</Text>}
                                        </View>
                                        {/* <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Discount % <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter discount%"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                            { marginRight: rS(20) }
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
                                </View> */}
                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                From Time <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => setShowPicker({ field: 'fromTime', mode: 'time' })}
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
                                                        color: groupWiseFromTime ? '#000' : '#9A9A9A',
                                                        fontFamily: Fonts.FigtreeRegular,
                                                    }}>
                                                    {groupWiseFromTime || 'From Time'}
                                                </Text>
                                                <CalenderIcon />
                                            </TouchableOpacity>
                                            {errors.groupWiseFromTime && <Text style={styles.errorText}>{errors.groupWiseFromTime}</Text>}
                                        </View>
                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                To Time <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => setShowPicker({ field: 'toTime', mode: 'time' })}
                                                style={[styles.input, {
                                                    // marginRight: rS(20),
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                },]}
                                            >
                                                <Text
                                                    style={{
                                                        color: groupWiseToTime ? '#000' : '#9A9A9A',
                                                        fontFamily: Fonts.FigtreeRegular,
                                                    }}>
                                                    {groupWiseToTime || 'To Time'}
                                                </Text>
                                                <CalenderIcon />
                                            </TouchableOpacity>
                                            {errors.groupWiseToTime && <Text style={styles.errorText}>{errors.groupWiseToTime}</Text>}
                                        </View>
                                    </View>
                                    <View style={styles.firstRowContainer}>

                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                From Date <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => setShowPicker({ field: 'fromDate', mode: 'date' })}
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
                                                        color: groupWiseFromDate ? '#000' : '#9A9A9A',
                                                        fontFamily: Fonts.FigtreeRegular,
                                                    }}>
                                                    {groupWiseFromDate || 'From Date'}
                                                </Text>
                                                <CalenderIcon />
                                            </TouchableOpacity>
                                            {errors.groupWiseFromDate && <Text style={styles.errorText}>{errors.groupWiseFromDate}</Text>}
                                        </View>
                                        <View style={{ flex: 0.35 }}>
                                            <Text allowFontScaling={false} style={styles.label}>
                                                To Date <Text style={styles.required}>*</Text>
                                            </Text>
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                onPress={() => setShowPicker({ field: 'toDate', mode: 'date' })}
                                                style={[styles.input, {
                                                    marginRight: rS(20),
                                                    flexDirection: 'row',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                },]}
                                            >
                                                <Text
                                                    style={{
                                                        color: groupWiseToDate ? '#000' : '#9A9A9A',
                                                        fontFamily: Fonts.FigtreeRegular,
                                                    }}>
                                                    {groupWiseToDate || 'To Date'}
                                                </Text>
                                                <CalenderIcon />
                                            </TouchableOpacity>
                                            {errors.groupWiseToDate && <Text style={styles.errorText}>{errors.groupWiseToDate}</Text>}
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

                                    <View style={styles.groupInputContainer}>
                                        <View style={{ flex: 1, marginRight: rS(20) }}>
                                            <Text style={styles.label}>Group Type <Text style={styles.required}>*</Text></Text>
                                            <Dropdown
                                                style={styles.dropdown}
                                                data={groupTypeData}
                                                labelField="label"
                                                valueField="value"
                                                placeholder="Select Type"
                                                value={tempGroup.groupType}
                                                onChange={item => handleTempGroupTypeChange(item.value)}
                                                placeholderStyle={styles.placeholderStyle}
                                                itemTextStyle={styles.itemTextStyle}
                                                selectedTextStyle={styles.selectedTextStyle}
                                            />
                                        </View>
                                        <View style={{ flex: 1, marginRight: rS(20) }}>
                                            <Text style={styles.label}>Group Name <Text style={styles.required}>*</Text></Text>
                                            <Dropdown
                                                style={[styles.dropdown,]}
                                                data={tempGroup.groupOptions}
                                                labelField="label"
                                                valueField="value"
                                                placeholder="Select Name"
                                                value={tempGroup.groupId}
                                                onChange={item => setTempGroup(prev => ({ ...prev, groupId: item.value, groupName: item.label }))}
                                                placeholderStyle={styles.placeholderStyle}
                                                selectedTextStyle={styles.selectedTextStyle}
                                                itemTextStyle={styles.itemTextStyle}
                                                temTextStyle={styles.itemTextStyle}
                                                iconColor="#1B1B1B"

                                            />
                                        </View>
                                        <View style={{ flex: 1, marginRight: rS(10) }}>
                                            <Text style={styles.label}>Discount % <Text style={styles.required}>*</Text></Text>
                                            <TextInput
                                                placeholder="Enter discount"
                                                placeholderTextColor={'#9A9A9A'}
                                                style={[styles.input]}
                                                value={tempGroup.discountPercentage}
                                                keyboardType="number-pad"
                                                onChangeText={text => {
                                                    let numericValue = text.replace(/[^0-9.]/g, '');
                                                    if (numericValue !== '' && parseInt(numericValue, 10) > 100) {
                                                        numericValue = '100';
                                                    }

                                                    setTempGroup(prev => ({
                                                        ...prev,
                                                        discountPercentage: numericValue
                                                    }));
                                                }}
                                            //    onChangeText={text => setTempGroup(prev => ({ ...prev, discountPercentage: text.replace(/[^0-9]/g, '') }))}
                                            />
                                            {/* <TextInput
                    placeholder="5%"
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={tempGroup.discountPercentage}
                    keyboardType="numeric"
                    onChangeText={text => setTempGroup(prev => ({ ...prev, discountPercentage: text.replace(/[^0-9]/g, '') }))}
                /> */}

                                        </View>
                                        <TouchableOpacity onPress={addGroupRow} style={{ alignItems: 'center', marginTop: rS(20) }}>
                                            <PlusIcon color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                    {groupRows.length > 0 &&
                                        <View style={styles.tableContainer}>
                                            <View style={styles.tableHeader}>
                                                <Text style={[styles.headerText, { width: '10%' }]}>S.No</Text>
                                                <Text style={[styles.headerText, { width: '25%' }]}>Group Type</Text>
                                                <Text style={[styles.headerText, { width: '35%' }]}>Group Name</Text>
                                                <Text style={[styles.headerText, { width: '15%' }]}>Discount%</Text>
                                                <Text style={[styles.headerText, { width: '15%' }]}>Action</Text>
                                            </View>

                                            {
                                                groupRows.map((row, index) => (
                                                    <View key={index} style={styles.tableRow}>
                                                        <Text style={[styles.rowText, { width: '10%' }]}>{index + 1}</Text>
                                                        <Text style={[styles.rowText, { width: '25%' }]}>{row.groupTypeName}</Text>
                                                        <Text style={[styles.rowText, { width: '35%' }]}>{row.groupName}</Text>
                                                        <Text style={[styles.rowText, { width: '15%' }]}>{row.discountPercentage}%</Text>
                                                        <TouchableOpacity
                                                            style={[styles.rowText, { width: '15%', alignItems: 'center' }]}
                                                            onPress={() => removeGroupRow(index)}
                                                        >
                                                            <DeleteIcon color="#E71414" />
                                                        </TouchableOpacity>
                                                    </View>
                                                )
                                                )}
                                        </View>
                                    }
                                    {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={styles.basicDetailsText}>GROUPS</Text>
                                        <TouchableOpacity style={{ flexDirection: 'row', }} onPress={addGroupRow}>
                                            <PlusIcon />
                                            <Text style={styles.addText}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {groupRows.map((row, index) => (
                                        <View key={`${row.id || 'new'}-${index}`} style={styles.schemeRow}>
                                            <View style={{ flex: 1, marginRight: rS(10) }}>
                                                <Text allowFontScaling={false} style={styles.label}>
                                                    Group Type <Text style={styles.required}>*</Text>
                                                </Text>
                                                <Dropdown
                                                    style={[styles.dropdown, { marginRight: rS(10) }]}
                                                    data={groupTypeData}
                                                    labelField="label"
                                                    valueField="value"
                                                    placeholder="Select Group Type"
                                                    value={row.groupType}
                                                    onChange={item => loadGroupOptions(index, item.value)}
                                                    placeholderStyle={styles.placeholderStyle}
                                                    selectedTextStyle={styles.selectedTextStyle}
                                                    itemTextStyle={styles.itemTextStyle}
                                                    iconColor="#1B1B1B"
                                                />
                                            </View>
                                            <View style={{ flex: 1, marginRight: rS(10) }}>
                                                <Text allowFontScaling={false} style={styles.label}>
                                                    Group Name <Text style={styles.required}>*</Text>
                                                </Text>
                                                <Dropdown
                                                    style={[styles.dropdown, { marginRight: rS(10) }]}
                                                    data={row.groupOptions}
                                                    labelField="label"
                                                    valueField="value"
                                                    placeholder="Select Group Name"
                                                    value={row.groupId}
                                                    onChange={item => updateGroupRow(index, 'groupId', item.value)}
                                                    placeholderStyle={styles.placeholderStyle}
                                                    selectedTextStyle={styles.selectedTextStyle}
                                                    itemTextStyle={styles.itemTextStyle}
                                                    iconColor="#1B1B1B"
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text allowFontScaling={false} style={styles.label}>
                                                    Discount% <Text style={styles.required}>*</Text>
                                                </Text>
                                                <TextInput
                                                    placeholder="Enter discount"
                                                    placeholderTextColor={'#9A9A9A'}
                                                    style={[styles.input]}
                                                    value={row.discountPercentage}
                                                    keyboardType="number-pad"
                                                    onChangeText={text => updateGroupRow(index, 'discountPercentage', text.replace(/[^0-9]/g, ''))}
                                                />
                                            </View>
                                            {groupRows.length > 1 && (
                                                <TouchableOpacity onPress={() => removeGroupRow(index)} style={styles.deleteBtn}>
                                                    <DeleteIcon />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))} */}

                                    {errors.groupRows && <Text style={styles.errorText}>{errors.groupRows}</Text>}
                                    {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
                                    <TouchableOpacity style={styles.saveTouchable} onPress={handleSave} disabled={loading}>
                                        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{id ? 'Update' : 'Save'} </Text>}
                                    </TouchableOpacity>
                                </>
                            }

                        </View>

                    </KeyboardAwareScrollView>
                </View>
                {showPicker.field && (
                    <DateTimePicker
                         value={
        showPicker.field === 'toDate' 
            ? (parseDate(selectedTab === 'groupWise' ? groupWiseToDate : toDate) || getMinToDate())
            : showPicker.field === 'toTime'
            ? (parseTime(selectedTab === 'groupWise' ? groupWiseToTime : toTime) || getMinToTime())
            : showPicker.field === 'fromDate'
            ? parseDate(selectedTab === 'groupWise' ? groupWiseFromDate : fromDate)
            : parseTime(selectedTab === 'groupWise' ? groupWiseFromTime : fromTime) || new Date()
    }
                        mode={showPicker.mode}
                        is24Hour={false}
                        display="default"

                        minimumDate={
                            showPicker.field === 'fromDate' ? new Date() :
                                showPicker.field === 'toDate' ? getMinToDate() :
                                    undefined
                        }
                        onChange={onPickerChange}
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
    groupInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: rV(10),
        backgroundColor: '#FFF',
        paddingVertical: rV(10),
    },
    // addButtonCircle: {
    //     backgroundColor: '#264B79',
    //     width: rS(28),
    //     height: rV(28),
    //     borderRadius: 14,
    //     justifyContent: 'center',
    //     alignItems: 'center',
    //     marginLeft: rS(10),
    // },
    tableContainer: {
        marginTop: rV(20),
        // borderWidth: 1,
        // borderColor: '#EEF9FF',
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#EEF9FF',
        paddingVertical: rV(10),
    },
    headerText: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeSemiBold,
        color: '#264B79',
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: rV(12),
        // borderBottomWidth: 1,
        // borderBottomColor: '#F2F2F2',
        alignItems: 'center',
    },
    rowText: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#333',
        textAlign: 'center',
    },
    emptyTableText: {
        textAlign: 'center',
        padding: 20,
        color: '#999',
        fontFamily: Fonts.FigtreeRegular,
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
    tabRow: { flexDirection: 'row', marginBottom: rV(15) },
    tabBtn: { paddingHorizontal: rS(15), paddingVertical: rV(5), borderRadius: 25, marginRight: rS(10), borderWidth: 1, borderColor: '#264B79' },
    activeTabBtn: { backgroundColor: '#264B79' },
    tabText: { color: '#264B79', fontSize: 14, fontFamily: Fonts.FigtreeMedium },
    activeTabText: { color: '#FFF' },
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