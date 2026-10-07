import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ActivityIndicator, ScrollView, FlatList, Modal, Platform } from 'react-native'
import React, { useCallback, useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import CustomHeader from '../components/CustomHeader'
import { rS, rV } from '../constants/responsive'
import Fonts from '../constants/Fonts'
import { Dropdown } from 'react-native-element-dropdown'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import RadioIcon from '../assets/Icons/RadioIcon'
import UnRadioIcon from '../assets/Icons/UnRadioIcon'
import { HelperModule } from '../helper/HelperModule'
import ApiServices from '../helper/ApiServices'
import Toast from 'react-native-toast-message'

export default function AddNewHotKeyScreen() {
    const navigation = useNavigation()
    const dispatch = useDispatch()
    const route = useRoute();
    const editData = route.params?.hotKeyData;
    const { postMethod } = HelperModule()
    const [productList, setProductList] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [id, setId] = useState(null);
    const [itemName, setItemName] = useState('')
    const [itemCode, setItemCode] = useState('');
    const [hotKey, setHotKey] = useState('');
    const [errors, setErrors] = useState({});

    const [status, setStatus] = useState('Active');

    const resetForm = () => {
        setId(null)
        setSelectedProduct(null);
        setSelectedProductId(null);
        setItemName('');
        setItemCode('');
        setHotKey('');
        setErrors({});
        setStatus('Active');
        setProductList([]);
    };

    useFocusEffect(
        useCallback(() => {
            if (editData) {
                populateData(editData);
            } else {
                setId(null)
                resetForm();
            }
        }, [editData])
    );
    const populateData = (data) => {
        setId(data.id);
        setSelectedProduct(data.variantId);
        setSelectedProductId(data.productId);
        setItemCode(data.productCode);
        setItemName(`${data.productFullName} - ${data.packSize}`);
        setHotKey(data.key || ''); 
        setStatus(data.status === 1 ? 'Active' : 'In-Active');
        setProductList([{
            label: data.productCode,
            searchLabel: `${data.productCode} ${data.productFullName}`,
            displayLabel: `${data.productFullName} - ${data.packSize}`,
            value: data.variantId,
            productId: data.productId,
            productCode: data.productCode,
            productFullName: data.productFullName,
            packSize: data.packSize
        }]);
    };
    const getProducts = async (search) => {
        try {
            const payload = { searchStr: search };
            const response = await postMethod(ApiServices.zenxposSearchProducts, payload);
            console.log(":::::::get products::::::", response)
            if (response?.success) {
                const formatted = response.data.map(item => ({
                    label: item.productCode,
                    searchLabel: `${item.productCode} ${item.productFullName} ${item.eanCode}`,
                    displayLabel: `${item.productFullName} - ${item.packSize} (${item.eanCode})`,

                    value: item.variantId,
                    ...item,
                }));
                setProductList(formatted);
            }
        } catch (error) {
            console.log("Search Product Error", error);
        }
    };
    const handleProductSelect = (item) => {
        setSelectedProduct(item.value);
        setSelectedProductId(item.productId);
        const displayName = `${item.productFullName} - ${item.packSize}`;
        setItemName(displayName);
        setItemCode(item.productCode);
        setErrors(prev => ({
            ...prev,
            itemCode: null,
        }));
    };


    const validateForm = () => {
        let tempErrors = {};

        if (!itemCode) {
            tempErrors.itemCode = "Item Code/Item Name are required";
        }
        if (!hotKey.trim()) {
            tempErrors.hotKey = "The key field is required.";
        }
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };
    const handleSave = async () => {
        setErrors({});
        if (!validateForm()) return;
        setLoading(true);
        const isEditing = !!id;
        const apiUrl = isEditing ? ApiServices.zenxposUpdateHotKey : ApiServices.zenxposAddHotKey;

        const payload = {
            productId: selectedProductId,
            variantId: selectedProduct,
            shortKey: hotKey,
            status: status === 'Active' ? 1 : 0
        };
        if (isEditing) {
            payload.id = id;
        }

        try {
            const response = await postMethod(apiUrl, payload);
            if (response.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: response?.message || (isEditing ? 'Updated Successfully' : 'Added Successfully'),
                });
                navigation.navigate('SettingScreen');
            } else {
                setErrors({ general: response.message || "Something went wrong" });
            }
        } catch (error) {
            const backendErrorMessage = error.response?.data?.message || "Failed to connect to the server";
            setErrors({ general: backendErrorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <CustomHeader />
            <View style={styles.subContainer}>
                {/* Top Header */}
                <View style={styles.customerRowContainer}>
                    <View>
                        <Text style={styles.customerText}>Hot Key</Text>

                        <Text style={styles.customerSubText}>
                            Create or Manage Hot Key
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.newManageTouchable} onPress={() => navigation.navigate('SettingScreen')} >
                        <Text style={styles.addNewManageText}>
                            Manage Hot Key
                        </Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.formContainer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.formSubContainer}>
                            <View style={styles.firstRowContainer}>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Item Code/Item Name <Text style={styles.required}>*</Text>
                                    </Text>
                                    <Dropdown
                                        style={[styles.dropdown, { marginRight: rS(20) }]}
                                        data={productList}
                                        search
                                        maxHeight={300}
                                        labelField="label"
                                        searchField="searchLabel"
                                        valueField="value"
                                        placeholder="Search Item code/Item Name"
                                        searchPlaceholder="Search Item code/Item Name..."
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
                                    />


                                    {errors.itemCode && <Text style={styles.errorText}>{errors.itemCode}</Text>}
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Product Name
                                    </Text>
                                    <TextInput
                                        placeholder="Enter Product Name"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                            { marginRight: rS(20) },
                                            styles.disabledInput
                                        ]}
                                        editable={false}
                                        value={itemName}
                                    />
                                </View>
                                <View style={{ flex: 0.35 }}>
                                    <Text allowFontScaling={false} style={styles.label}>
                                        Key <Text style={styles.required}>*</Text>
                                    </Text>
                                    <TextInput
                                        placeholder="Enter Key"
                                        placeholderTextColor={'#9A9A9A'}
                                        style={[
                                            styles.input,
                                        ]}
                                        value={hotKey}
                                        onChangeText={(text) => {
                                            setHotKey(text);
                                            setErrors(prev => ({
                                                ...prev,
                                                hotKey: null,
                                            }));
                                        }}
                                    />
                                    {errors.hotKey && <Text style={styles.errorText}>{errors.hotKey}</Text>}
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
                                    }}
                                >
                                    {status === 'In-Active' ? <RadioIcon /> : <UnRadioIcon />}
                                    <Text style={styles.radioText}>In-Active</Text>
                                </TouchableOpacity>
                            </View>
                            {errors.general && <Text style={[styles.errorText, { alignSelf: 'center' }]}>{errors.general}</Text>}
                            <TouchableOpacity
                                style={styles.saveTouchable}
                                onPress={handleSave}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <Text style={styles.saveText}>{id ? 'Update' : 'Save'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                    </ScrollView>
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