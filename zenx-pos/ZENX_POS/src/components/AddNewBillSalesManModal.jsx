import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import Fonts from '../constants/Fonts';
import CrossIcon from '../assets/Icons/CrossIcon';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';
import { rS, rV } from '../constants/responsive';
import ApiServices from '../helper/ApiServices';
import { HelperModule } from '../helper/HelperModule';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Dropdown } from 'react-native-element-dropdown';

const AddNewBillSalesManModal = ({ isVisible, onClose, onSelect }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [salesManData, setSalesManData] = useState([]);
    const [selectedSmId, setSelectedSmId] = useState(null);
    const [salesManName, setSalesManName] = useState('');

    useEffect(() => {
        if (isVisible) {
            getSalesMan();
        } else {
            // Reset fields on close
            setSelectedSmId(null);
            setSalesManName('');
        }
    }, [isVisible]);


    const getSalesMan = async () => {
        try {
            setLoading(true)
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
                teamId: ""
            };
            console.log('GET SALES MAN PAYLOAD =====>', payload);
            const response = await postMethod(
                ApiServices.zenxposGetSalesMans,
                payload,
            );
            console.log('GET SALES MAN RESPONSE =====>', response);
            if (response?.success) {
                const formattedSalesMan = response?.data?.salesMans?.map(item => ({
                    label: item.smCode,
                    name: item.smName,
                    value: item.id,
                }));
                setSalesManData(formattedSalesMan || []);
            }
        } catch (error) {
            console.log('GET SALES MAN ERROR =====>', error);
        }
    };

    const handleConfirm = () => {
        if (!selectedSmId) return;
        onSelect({
            id: selectedSmId,
            name: salesManName
        });
        onClose();
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
                    <View style={styles.modalHeader}>
                        <Text allowFontScaling={false} style={styles.modalTitle}>
                            Add SaleMan
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

                        {/* Discount Percentage Field */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Salesman Code <Text style={styles.required}>*</Text>
                        </Text>
                        <Dropdown
                            style={styles.dropdown}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            itemTextStyle={styles.itemTextStyle}
                            data={salesManData}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Code"
                            value={selectedSmId}
                            onChange={item => {
                                setSelectedSmId(item.value);
                                setSalesManName(item.name);
                            }}
                        />

                        {/* Discount Value Field */}
                        <Text allowFontScaling={false} style={styles.label}>
                            Name
                        </Text>

                        <TextInput
                            placeholder="Salesman Name"
                            placeholderTextColor={'#9A9A9A'}
                            style={[styles.input, styles.disabledInput]}
                            value={salesManName}
                            editable={false}
                        />

                        <TouchableOpacity
                            style={styles.primaryBtn}
                            onPress={handleConfirm}
                            disabled={!selectedSmId}
                        >
                            <Text style={styles.primaryText}>Select</Text>
                        </TouchableOpacity>
                    </KeyboardAwareScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AddNewBillSalesManModal;

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
    disabledInput: {
        backgroundColor: '#F5F5F5', // Grey background to show it's disabled
        borderColor: '#E0E0E0',
        color: '#9A9A9A'
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
});