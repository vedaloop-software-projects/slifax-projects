import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Platform,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Fonts from '../constants/Fonts';
import CrossIcon from '../assets/Icons/CrossIcon';
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { rS, rV } from '../constants/responsive';
import RadioIcon from '../assets/Icons/RadioIcon';
import UnRadioIcon from '../assets/Icons/UnRadioIcon';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddRePrintModal = ({ isVisible, onClose }) => {
    const [dateType, setDateType] = useState('Current Date'); // 'Current Date' or 'Previous Date'
    const [billDate, setBillDate] = useState(new Date());
    const [billNo, setBillNo] = useState('');
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(false);
     const getYesterdayDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d;
    };

    // Reset to current date when "Current Date" is selected
    useEffect(() => {
        if (dateType === 'Current Date') {
            setBillDate(new Date());
        } 
        else {
            setBillDate(getYesterdayDate())
        }
    }, [dateType]);

    const formatDate = (date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };

    const onDateChange = (event, selectedDate) => {
        setShowPicker(Platform.OS === 'ios');
        if (selectedDate) {
            setBillDate(selectedDate);
        }
    };

    const handleOkay = () => {
        const data = {
            dateType,
            billDate: formatDate(billDate),
            billNo,
        };
        console.log('Submit Data:', data);
        // Add your API logic here
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
                            Reprint
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <CrossIcon />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.divider} />

                    {/* Radio Group */}
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Date:</Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.radioContainer}
                            onPress={() => setDateType('Current Date')}>
                            {dateType === 'Current Date' ? <RadioIcon /> : <UnRadioIcon />}
                            <Text style={styles.radioText}>Current Date</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            activeOpacity={0.8}
                            style={styles.radioContainer}
                            onPress={() => setDateType('Previous Date')}>
                            {dateType === 'Previous Date' ? <RadioIcon /> : <UnRadioIcon />}
                            <Text style={styles.radioText}>Previous Date</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Bill Date Input */}
                    <Text allowFontScaling={false} style={styles.label}>
                        Bill Date <Text style={styles.required}>*</Text>
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.7}
                        disabled={dateType === 'Current Date'} 
                        onPress={() => setShowPicker(true)}
                        style={[
                            styles.input,
                            { justifyContent: 'center', backgroundColor: dateType === 'Current Date' ? '#F5F5F5' : '#FFFFFF' }
                        ]}>
                        <Text style={{ 
                            color: dateType === 'Current Date' ? '#666' : '#000',
                            fontFamily: Fonts.FigtreeRegular 
                        }}>
                            {formatDate(billDate)}
                        </Text>
                    </TouchableOpacity>

                    {/* Bill Number Input */}
                    <Text allowFontScaling={false} style={styles.label}>
                        Bill.No <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                        placeholder="XXXXXXXX"
                        placeholderTextColor={'#9A9A9A'}
                        style={styles.input}
                        value={billNo}
                        onChangeText={setBillNo}
                    />

                    {/* Action Button */}
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={handleOkay}
                        disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <Text style={styles.primaryText}>{'Okay'}</Text>
                        )}
                    </TouchableOpacity>

                    {/* Date Picker Component */}
                    {showPicker && (
                        <DateTimePicker
                            value={billDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            maximumDate={getYesterdayDate()} 
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
};

export default AddRePrintModal;

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
        marginBottom: rV(10)
    },
    label: {
        fontSize: 14,
        paddingHorizontal: rS(14),
        marginTop: rV(12),
        marginBottom: rV(5),
        color: '#000000',
        fontFamily: Fonts.FigtreeMedium,
    },
    required: {
        color: '#E71414',
    },
    input: {
        height: rV(28), // Increased height to match image
        borderColor: '#C0C0C0',
        borderWidth: 1,
        borderRadius: 8,
        marginHorizontal: rS(14),
        paddingHorizontal: rS(10),
        fontSize: 14,
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: rS(14),
        marginTop: rV(5),
        marginBottom: rV(5)
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
        fontSize: 14,
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
});