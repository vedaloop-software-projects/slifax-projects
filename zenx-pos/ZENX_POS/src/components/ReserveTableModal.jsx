import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput } from 'react-native'
import React, { useState } from 'react'
import Fonts from '../constants/Fonts'
import GroupIcon from '../assets/Icons/GroupIcon'
import CrossIcon from '../assets/Icons/CrossIcon'
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import ReserveCalenderIcon from '../assets/Icons/ReserveCalenderIcon'
import DateTimePicker from '@react-native-community/datetimepicker';

const ReserveTableModal = ({ isVisible, onClose, selectedTable }) => {
    const [date, setDate] = useState(new Date());
    const [time, setTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const onTimeChange = (event, selectedTime) => {
        setShowTimePicker(false);
        if (selectedTime) setTime(selectedTime);
    };

    const formatDate = (date) => {
        return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
    };

    const formatTime = (time) => {
        return time.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    return (
        <Modal transparent animationType="fade" visible={isVisible} onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Table {selectedTable?.id}{' '}
                            <Text style={{ color: '#388D18', fontSize: 14 }}>• Available</Text>
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <CrossIcon />
                        </TouchableOpacity>
                    </View>
                    <View style={{
                        borderBottomColor: '#D9D9D9', borderBottomWidth: 0.5
                    }} />
                    {/* Content */}
                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: hp(2) }}>
                            <GroupIcon />
                            <Text style={styles.modalPeople}>
                                {selectedTable?.people}
                            </Text>
                        </View>
                        <View style={styles.acRow}>
                            <Text style={styles.acActive}>AC</Text>
                            <Text style={styles.acInactive}>NON-AC</Text>
                            <Text style={styles.divider}>|</Text>
                            <Text style={styles.tableType}>
                                Table Type: <Text style={styles.tableValue}>Regular</Text>
                            </Text>
                        </View>
                        <View style={styles.line} />
                        <View style={styles.formContainer}>
                            <View style={styles.formRow}>
                                <View style={styles.inputBox}>
                                    <Text style={styles.label}>Full Name</Text>
                                    <TextInput
                                        placeholder="Enter full name"
                                        style={styles.textInput}
                                        placeholderTextColor="#999"
                                    />
                                </View>
                                <View style={styles.inputBox}>
                                    <Text style={styles.label}>Mobile Number</Text>
                                    <TextInput
                                        placeholder="Enter mobile number"
                                        style={styles.textInput}
                                        keyboardType="numeric"
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            </View>
                            <View style={styles.formRow}>
                                <View style={styles.inputBox}>
                                    <Text style={styles.label}>Date</Text>
                                    <TouchableOpacity
                                        style={styles.inputWrapper}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={styles.textInputWithIcon}>
                                            {formatDate(date)}
                                        </Text>
                                        <ReserveCalenderIcon />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.inputBox}>
                                    <Text style={styles.label}>Time</Text>
                                    <TouchableOpacity
                                        style={styles.inputWrapper}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Text style={styles.textInputWithIcon}>
                                            {formatTime(time)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.primaryBtn}>

                        <Text style={styles.primaryText}>Reserve</Text>
                    </TouchableOpacity>
   </View>
            </View>
            {showDatePicker && (
                <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                />
            )}
            {showTimePicker && (
                <DateTimePicker
                    value={time}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                />
            )}
        </Modal>

    );
};

export default ReserveTableModal;

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '40%',
        backgroundColor: '#fff',
        borderRadius: 12,
        // padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 17,
        paddingHorizontal: 25
    },
    modalTitle: {
        fontSize: 16,
        fontFamily: Fonts.FigtreeMedium,
        color: '#080808',
    },
    modalPeople: {
        fontSize: 18,
        fontFamily: Fonts.FigtreeRegular,
        //   marginTop: 10,
        color: '#231F20',
        marginLeft: wp(1)
    },
    acRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: hp(1),
        gap: wp(2),
    },
    acActive: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#1B1B1B'
    },
    acInactive: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#919191'
    },
    divider: {
        color: '#9A9A9A',
    },
    tableType: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        color: '#9A9A9A'
    },
    tableValue: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeMedium,
        color: '#000000'
    },
    line: {
        borderBottomWidth: 0.5,
        borderColor: '#DDDDDD',
        marginVertical: hp(4),
        width: '80%',
    },
    primaryBtn: {
        backgroundColor: '#264B79',
        height: 48,
        width: wp(20),
        borderRadius: 8,
        justifyContent: 'center',
        // marginTop: 10,
        alignSelf: 'center',
        marginBottom: hp(5)
    },
    primaryText: {
        color: '#FFFFFF',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 14,
        textAlign: 'center'
    },
    formContainer: {
        width: '80%',
    },
    formRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: hp(2),
    },
    inputBox: {
        width: '48%',
    },
    label: {
        fontSize: 14,
        color: '#000000',
        marginBottom: 6,
        fontFamily: Fonts.FigtreeMedium,
    },
    textInput: {
        borderWidth: 1,
        borderColor: '#C0C0C0',
        borderRadius: 6,
        paddingVertical: hp(1.2),
        paddingHorizontal: wp(1),
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#000000',
        height: 50
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C0C0C0',
        borderRadius: 6,
        height: 50,
        paddingHorizontal: wp(1),
    },
    textInputWithIcon: {
        flex: 1,
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#000000',
    },
    icon: {
        marginLeft: wp(1),
    },
})