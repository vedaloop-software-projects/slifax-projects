import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import Fonts from '../constants/Fonts'
import GroupIcon from '../assets/Icons/GroupIcon'
import CrossIcon from '../assets/Icons/CrossIcon'
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

const AvailableModal = ({ isVisible, onClose, selectedTable, onReserve }) => {
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
borderBottomColor:'#D9D9D9', borderBottomWidth:0.5}}/>
                    {/* Content */}
                    <View style={{ alignItems: 'center', marginVertical: 20 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' , marginTop:hp(2)}}>
                            <GroupIcon />
                            <Text style={styles.modalPeople}>
                                {selectedTable?.people}
                            </Text>
                        </View>
                        <Text style={styles.modalSubText}>
                            Seats Available
                        </Text>
                    </View>
                    {/* Buttons */}
                    <TouchableOpacity style={styles.primaryBtn}>
                        <Text style={styles.primaryText}>Start New Order</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={onReserve}>
                        <Text style={styles.secondaryText}>Reserve Table</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default AvailableModal;

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
        paddingVertical:17,
        paddingHorizontal:25
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
    modalSubText: {
        fontSize: 16,
        color: '#9A9A9A',
        marginTop: hp(2),
        fontFamily: Fonts.FigtreeMedium
    },
    primaryBtn: {
        backgroundColor: '#264B79',
        height: 48,
        width:wp(32),
        borderRadius: 8,
        justifyContent: 'center',
        marginTop: 10,
        alignSelf:'center'
    },
    primaryText: {
        color: '#FFFFFF',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 14,
        textAlign: 'center'
    },
    secondaryBtn: {
        borderWidth: 0.7,
        borderColor: '#264B79',
        height: 48,
        width:wp(32),
        borderRadius: 8,
        justifyContent: 'center',
        marginTop: hp(3),
        alignSelf:'center',
        marginBottom:hp(5)
    },
    secondaryText: {
        color: '#264B79',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 14,
        textAlign: 'center'
    },
})