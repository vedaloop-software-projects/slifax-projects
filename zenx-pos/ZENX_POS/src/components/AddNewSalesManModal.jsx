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

const AddNewSalesManModal = ({ isVisible, onClose, onSuccess, editData }) => {
    const { postMethod } = HelperModule();
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('Active');
    const [salesManName, setSalesManName] = useState('')
    const [salesManCode, setSalesManCode] = useState('')
    const [salesManCommission, setSalesManCommission] = useState('')
    const [salesManNameError, setSalesManNameError] = useState('')
    const [salesManCodeError, setSalesManCodeError] = useState('')
    const [serverError, setServerError] = useState('');
    const [team, setTeam] = useState(null);
    const [teamData, setTeamData] = useState([]);

    const getTeams = async () => {
        try {
            const payload = {
                searchStr: '',
                status: 1,
                page: '',
            };
            console.log('GET TEAMS PAYLOAD =====>', payload);
            const response = await postMethod(
                ApiServices.zenxposGetTeams,
                payload,
            );
            console.log('GET TEAMS RESPONSE =====>', response);
            if (response?.success) {
                const formattedTeams = response?.data?.teams?.map(item => ({
                    label: item.teamName,
                    value: item.id,
                }));
                setTeamData(formattedTeams || []);
            }
        } catch (error) {
            console.log('GET TEAMS ERROR =====>', error);
        }
    };

    React.useEffect(() => {
        setSalesManCodeError('');
        setSalesManNameError('');
        setServerError('');
        if (isVisible) {
            getTeams();
        }
        if (editData) {
            setSalesManName(editData.smName);
            setSalesManCode(editData.smCode);
            setSalesManCommission(
                editData.commissionPercent?.toString() || '',
            );
            setTeam(editData.teamId);

            setStatus(
                editData.status === 1 ? 'Active' : 'Inactive',
            );
        } else {
            setSalesManName('');
            setSalesManCode('');
            setSalesManCommission('');
            setTeam(null);
            setStatus('Active');
        }

    }, [editData, isVisible]);

    const handleSave = async () => {
        try {
            let isValid = true;
            setSalesManCodeError('');
            setSalesManNameError('');
            setServerError('');
            if (!salesManCode.trim()) {
                setSalesManCodeError('Please enter SM code');
                isValid = false;
            } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9]+$/.test(salesManCode.trim())) {
                setSalesManCodeError('Sales man code must contain at least one letter and only letters/numbers are allowed');
                isValid = false;
            }
            if (!salesManName.trim()) {
                setSalesManNameError('Please enter SM name');
                isValid = false;
            } else if (!/^(?=.*[A-Za-z])[A-Za-z0-9\s]+$/.test(salesManName.trim())) {
                setSalesManNameError('Sales man name must contain at least one letter and only letters, numbers, and spaces are allowed');
                isValid = false;
            }
            if (!isValid) return;
            setLoading(true);
            const isEditing = !!editData;
            const apiUrl = isEditing ? ApiServices.zenxposUpdateSalesMan : ApiServices.zenxposAddSalesMan;
            const payload = {
                smCode: salesManCode,
                smName: salesManName,
                teamId: team,
                commissionPercent: salesManCommission,
                status: status === 'Active' ? 1 : 0,
            };
            if (isEditing) {
                payload.id = editData.id;
            }
            const response = await postMethod(apiUrl, payload);
            console.log('SAVE SALESMAN RESPONSE =====>', response);
            if (response?.success) {
                Toast.show({ type: 'success', text1: 'Success', text2: response?.message || 'Brand added successfully' });
                setSalesManName('');
                setSalesManCode('');
                setSalesManCommission('');
                setTeam(null);
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
                            {editData ? 'Edit SalesMan' : 'Create SalesMan'}
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
                        {/* Sales Man Code */}
                        <Text allowFontScaling={false} style={styles.label}>
                            SM Code <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder="Enter SM code"
                            placeholderTextColor={'#9A9A9A'}
                            style={styles.input}
                            value={salesManCode}
                            onChangeText={text => {
                                const filteredText = text.replace(/[^A-Za-z0-9]/g, '');
                                setSalesManCode(filteredText);

                                if (salesManCodeError) {
                                    setSalesManCodeError('');
                                }
                                if (serverError) {
                                    setServerError('')
                                }
                            }}
                        />
                        {salesManCodeError ? (
                            <Text style={styles.errorText}>
                                {salesManCodeError}
                            </Text>
                        ) : null}
                        {/* SalesMan Name */}
                        <Text allowFontScaling={false} style={styles.label}>
                            SM Name <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            placeholder="Enter SM name"
                            placeholderTextColor={'#9A9A9A'}
                            style={
                                styles.input
                            }
                            value={salesManName}
                            onChangeText={text => {
                                const filteredText = text.replace(/[^A-Za-z0-9\s]/g, '');
                                setSalesManName(filteredText);
                                if (salesManNameError) {
                                    setSalesManNameError('');
                                }
                                if (serverError) {
                                    setServerError('')
                                }
                            }}
                        />
                        {salesManNameError ? (
                            <Text style={styles.errorText}>
                                {salesManNameError}
                            </Text>
                        ) : null}
                        <Text allowFontScaling={false} style={styles.label}>
                            Commission%
                        </Text>
                        <TextInput
                            placeholder="Enter Commission"
                            placeholderTextColor={'#9A9A9A'}
                            style={styles.input}
                            value={salesManCommission}
                            onChangeText={setSalesManCommission}
                            keyboardType="numeric"
                        />
                        <Text allowFontScaling={false} style={styles.label}>
                            Team
                        </Text>
                        <Dropdown
                            style={styles.dropdown}
                            containerStyle={{ marginTop: rV(-20) }}
                            data={teamData}
                            labelField="label"
                            valueField="value"
                            placeholder="Select Team"
                            value={team}
                            onChange={item => setTeam(item.value)}
                            placeholderStyle={styles.placeholderStyle}
                            selectedTextStyle={styles.selectedTextStyle}
                            itemTextStyle={styles.itemTextStyle}
                            iconColor="#1B1B1B"
                        />
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
                                }}
                            >
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
                            disabled={loading}
                        >
                            {
                                loading ? (
                                    <ActivityIndicator color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.primaryText}>
                                        {editData ? 'Update Changes' : 'Save'}
                                    </Text>
                                )
                            }

                        </TouchableOpacity>
                    </KeyboardAwareScrollView>
                </View>
            </View>
        </Modal>
    );
};

export default AddNewSalesManModal;

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