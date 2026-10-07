import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import Fonts from '../constants/Fonts';
import { rS, rV } from '../constants/responsive';
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import CrossIcon from '../assets/Icons/CrossIcon'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddPaymentModal = ({ isVisible, onClose, onSave, paymentModes, totalBill, initialPayments }) => {
    const [amounts, setAmounts] = useState({});
    const [selectedModeId, setSelectedModeId] = useState(null);

    useEffect(() => {
        if (isVisible) {
            const initialMap = {};

            if (initialPayments && initialPayments.length > 0) {
                initialPayments.forEach(p => {
                    initialMap[p.mode.id] = p.amount;
                });
                setAmounts(initialMap);
                setSelectedModeId(initialPayments[0].mode.id);
            } else {
                resetToDefault()
            }
        }
    }, [isVisible, initialPayments, totalBill]);

    const resetToDefault = () => {
        const cashMode = paymentModes.find(m => m.allowChange === 1) || paymentModes[0];
        setAmounts({ [cashMode.id]: totalBill });
        setSelectedModeId(cashMode.id);
    };

    // Calculate Total Paid and Remaining Due
    const totalPaid = Object.values(amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    const remainingDue = Math.max(0, totalBill - totalPaid);
    const changeCash = totalPaid > totalBill ? totalPaid - totalBill : 0;

    const handleModeSelect = (mode) => {
        setSelectedModeId(mode.id);

        // Logic: If clicking a mode that has 0, and there is still due, auto-fill it
        if (!amounts[mode.id] || amounts[mode.id] === 0) {
            if (remainingDue > 0) {
                setAmounts(prev => ({ ...prev, [mode.id]: remainingDue }));
            }
        }
    };

    // const handleAmountChange = (text) => {
    //     const val = text === '' ? 0 : parseFloat(text);
    //     setAmounts(prev => ({
    //         ...prev,
    //         [selectedModeId]: val
    //     }));
    // };

    const handleAmountChange = (text) => {
        let val = text === '' ? 0 : parseFloat(text);
        if (isNaN(val)) val = 0;

        const currentMode = paymentModes.find(m => m.id === selectedModeId);

        // VALIDATION: If mode doesn't allow change (Card/UPI), don't let it exceed balance
        if (currentMode?.allowChange === 0) {
            // Calculate what is paid by OTHER modes
            const otherModesTotal = Object.entries(amounts).reduce((sum, [id, amt]) => {
                return parseInt(id) !== selectedModeId ? sum + (parseFloat(amt) || 0) : sum;
            }, 0);

            const maxAllowed = Math.max(0, totalBill - otherModesTotal);

            if (val > maxAllowed) {
                val = maxAllowed; // Cap it at the remaining balance
            }
        }

        setAmounts(prev => ({
            ...prev,
            [selectedModeId]: val
        }));
    };

    const handleConfirm = () => {
        // Convert the amounts map back into the Array format the Screen expects
        const finalPayments = paymentModes
            .filter(mode => amounts[mode.id] > 0)
            .map(mode => ({
                mode: mode,
                amount: amounts[mode.id]
            }));

        onSave(finalPayments);
        onClose();
    };

    return (
        <Modal visible={isVisible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text allowFontScaling={false} style={styles.modalTitle}>
                            Payment Summary
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
                        {/* <Text style={styles.totalAmount}>
                                    Total Amount: <Text style={{ color: '#000000' }}>₹{totalBill.toFixed(2)}</Text>
                                </Text> */}
                        <View style={styles.summaryTopBox}>
                            <Text style={styles.totalAmountLabel}>Total Bill: <Text style={styles.boldBlack}>₹{totalBill.toFixed(2)}</Text></Text>

                        </View>
                        <View style={styles.labelRow}>
                            <Text style={styles.label}>Select Mode</Text>
                            {/* CLEAR ALL BUTTON */}
                            <TouchableOpacity onPress={resetToDefault}>
                                <Text style={styles.clearAllText}>Clear All</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modeGrid}>
                            {paymentModes.map((mode) => {
                                const hasAmount = amounts[mode.id] > 0;
                                const isSelected = selectedModeId === mode.id;

                                // Disable mode if bill is fully paid AND this mode isn't already used
                                const isDisabled = totalPaid >= totalBill && !hasAmount && !isSelected;

                                return (
                                    <TouchableOpacity
                                        key={mode.id}
                                        disabled={isDisabled}
                                        style={[
                                            styles.modeItem,
                                            isSelected && styles.selectedMode,
                                            isDisabled && styles.disabledMode
                                        ]}
                                        onPress={() => handleModeSelect(mode)}
                                    >
                                        <Text style={[
                                            styles.modeText,
                                            isSelected && { color: '#FFF' },
                                            isDisabled && { color: '#CCC' }
                                        ]}>
                                            {mode.paymentMode}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <View style={styles.amountHeaderRow}>
                            <Text style={styles.amountLabel}>Amount</Text>
                            <View style={{ alignItems: 'right' }}>

                                <Text style={styles.dueAmount}>
                                    Due: <Text style={{ color: remainingDue > 0 ? '#C8682D' : '#388D18', fontFamily: Fonts.FigtreeBold }}>
                                        ₹{remainingDue.toFixed(2)}
                                    </Text>
                                </Text>
                            </View>
                        </View>

                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={amounts[selectedModeId]?.toString() || ''}
                            onChangeText={handleAmountChange}
                            placeholder="0.00"
                            placeholderTextColor="#999"
                            selectTextOnFocus={true}
                        />
                        {changeCash > 0 && (
                            <Text style={styles.changeCashLabel}>Change Cash: <Text style={styles.boldGreen}>₹{changeCash.toFixed(2)}</Text></Text>
                        )}

                        <TouchableOpacity style={styles.saveBtn} onPress={handleConfirm}>
                            <Text style={styles.saveBtnText}>Confirm Payment</Text>
                        </TouchableOpacity>
                    </KeyboardAwareScrollView>
                </View>
            </View>
        </Modal>
    );
};

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
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: rS(14),
        marginTop: rV(10)
    },
    clearAllText: {
        fontSize: 13,
        color: '#C8682D',
        fontFamily: Fonts.FigtreeSemiBold,
        textDecorationLine: 'underline'
    },
    summaryTopBox: {
        paddingHorizontal: rS(14),
        marginTop: rV(12),
        gap: 4
    },
    totalAmountLabel: {
        fontSize: 16,
        fontFamily: Fonts.FigtreeRegular,
        color: '#444'
    },
    changeCashLabel: {
        fontSize: 15,
        fontFamily: Fonts.FigtreeMedium,
        color: '#388D18',
        textAlign: 'center',
        marginBottom: rV(10)
    },
    boldBlack: {
        color: '#000',
        fontFamily: Fonts.FigtreeBold
    },
    boldGreen: {
        color: '#388D18',
        fontFamily: Fonts.FigtreeBold
    },
    amountLabel: {
        fontSize: 14,
        // paddingHorizontal: rS(14),
        // marginTop: rV(5),
        // marginBottom: rV(5),
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
    },
    modeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginVertical: rV(8),
        paddingHorizontal: rS(14),
    },
    modeItem: {
        paddingHorizontal: rS(10),
        paddingVertical: rV(6),
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#DDD'
    },
    selectedMode: {
        backgroundColor: '#264B79',
        borderColor: '#264B79'
    },
    disabledMode: {
        backgroundColor: '#F5F5F5',
        borderColor: '#EEE'
    },
    modeText: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        color: '#000000'
    },
    amountHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: rS(14)
    },
    totalAmount: {
        fontSize: 16,
        fontFamily: Fonts.FigtreeRegular,
        color: '#000000',
        marginHorizontal: rS(14),
        marginTop: rV(12),
    },
    dueAmount: {
        fontSize: 13,
        fontFamily: Fonts.FigtreeMedium,
        color: '#666',
        textAlign: 'right'
    },
    input: {
        borderColor: '#C0C0C0',
        borderWidth: 1,
        borderRadius: 8,
        marginHorizontal: rS(14),
        height: rV(28),
        fontSize: 16,
        marginVertical: rV(10),
        color: '#000000',
        fontFamily: Fonts.FigtreeRegular,
        textAlign: 'center'
    },
    saveBtn: {
        backgroundColor: '#264B79',
        height: rV(25),
        width: wp(15),
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
    },
    saveBtnText: {
        color: '#FFFFFF',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 14,
    },
});

export default AddPaymentModal;