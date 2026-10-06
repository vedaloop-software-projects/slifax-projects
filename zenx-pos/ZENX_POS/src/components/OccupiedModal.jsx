import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native'
import React, { useState } from 'react'
import Fonts from '../constants/Fonts'
import GroupIcon from '../assets/Icons/GroupIcon'
import CrossIcon from '../assets/Icons/CrossIcon'
import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import KOTTableIcon from '../assets/Icons/KOTTableIcon'
import ShiftTableIcon from '../assets/Icons/ShiftTableIcon'

const OccupiedModal = ({ isVisible, onClose, selectedTable, onShiftTable }) => {
    return (
        <Modal transparent animationType="fade" visible={isVisible} onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Table {selectedTable?.id}{' '}
                            <Text style={{ color: '#C8682D', fontSize: 14 }}>• Occupied</Text>
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
                         <View style={{ flexDirection: 'row', alignItems: 'center' , marginTop:hp(2)}}>
                            <Text style={{fontFamily:Fonts.FigtreeRegular, fontSize:14, color:'#000000'}}>Waiter: </Text>
                            <Text style={styles.modalWaiter}>
                                {selectedTable?.waiter}
                            </Text>
                        </View>
                    </View>
                  <View style={styles.buttonRow}>
  <TouchableOpacity style={styles.kotBtn}>
    <KOTTableIcon />
    <Text style={styles.secondaryText}>Add Item</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.kotBtn} onPress={onShiftTable}>
    <ShiftTableIcon />
    <Text style={styles.secondaryText}>Shift Table</Text>
  </TouchableOpacity>
</View>
                    {/* Buttons */}
                    <TouchableOpacity style={styles.primaryBtn}> 
                        <Text style={styles.primaryText}>View Order Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default OccupiedModal;

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
     modalWaiter: {
        fontSize: 14,
        fontFamily: Fonts.FigtreeRegular,
        //   marginTop: 10,
        color: '000000',
        marginLeft: wp(0.2)
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
        alignSelf:'center',
        marginBottom:hp(5)
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
    buttonRow: {
  flexDirection: 'row',
  alignSelf: 'center',
  justifyContent: 'center',
  marginTop: hp(2),
},
kotBtn: {
  borderWidth: 0.7,
  borderColor: '#264B79',
  height: hp('6%'),
  width: wp(15),
  borderRadius: 8,
  justifyContent: 'center',
  alignItems: 'center',
  flexDirection: 'row',
  marginHorizontal: wp(1), // 🔥 spacing
  marginBottom:hp(2)
},
    secondaryText: {
        color: '#264B79',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 14,
        textAlign: 'center',
        marginLeft:wp(0.5)
    },
})