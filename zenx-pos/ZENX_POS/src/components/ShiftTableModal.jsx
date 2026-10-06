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
import ACIcon from '../assets/Icons/ACIcon'
import UpArrow from '../assets/Icons/UpArrow'

const ShiftTableModal = ({ isVisible, onClose, selectedTable }) => {
    return (
        <Modal transparent animationType="fade" visible={isVisible} onRequestClose={onClose} statusBarTranslucent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>
                            Shift Table
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <CrossIcon />
                        </TouchableOpacity>
                    </View>
                    <View style={{
                        borderBottomColor: '#D9D9D9', borderBottomWidth: 0.5
                    }} />
                    <View style={styles.contentContainer}>
  {/* Current Table */}
  <View style={styles.currentTableBox}>
    <Text style={styles.currentLabel}>Current Table</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={styles.currentTableText}>
        Table {selectedTable?.id}
      </Text>
      <ACIcon />
    </View>
  </View>
  {/* New Table */}
  <View style={{ marginTop: hp(3), width: '80%' }}>
    <Text style={styles.newTableLabel}>
      New Table <Text style={{ color: '#9A9A9A', fontSize:14, fontFamily:Fonts.FigtreeRegular }}>(Available only)</Text>
    </Text>
    <View style={styles.dropdownBox}>
      <Text style={styles.dropdownText}>Table 5 (AC)</Text>
      <UpArrow />
    </View>
  </View>
</View>
                    {/* Buttons */}
                    <TouchableOpacity style={styles.primaryBtn}>
                        <Text style={styles.primaryText}>Update</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default ShiftTableModal;

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
    contentContainer: {
  alignItems: 'center',
  marginVertical: hp(3),
},
currentTableBox: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#EEF9FF',
  borderRadius: 10,
  width: '80%',
  height: hp(6),
//   paddingVertical: hp(1.5),
  paddingHorizontal: wp(1),
},
currentLabel: {
  fontSize: 14,
  fontFamily: Fonts.FigtreeMedium,
  color: '#231F20',
},
currentTableText: {
  fontSize: 16,
  fontFamily: Fonts.FigtreeMedium,
  color: '#231F20',
  marginRight:wp(1)
},
snowIcon: {
  marginLeft: wp(1),
},
newTableLabel: {
  fontSize: 14,
  fontFamily: Fonts.FigtreeRegular,
  marginBottom: hp(1),
  color: '#000000',
},
dropdownBox: {
  borderWidth: 1,
  borderColor: '#DADADA',
  borderRadius: 8,
  height: 45,
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingHorizontal: wp(2),
},
dropdownText: {
  fontSize: 16,
  fontFamily: Fonts.FigtreeRegular,
  color: '#000000',
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
        width: wp(20),
        borderRadius: 8,
        justifyContent: 'center',
        marginTop: 10,
        alignSelf: 'center',
        marginBottom: hp(5)
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
        width: wp(32),
        borderRadius: 8,
        justifyContent: 'center',
        marginTop: hp(3),
        alignSelf: 'center',
        marginBottom: hp(5)
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
        marginBottom: hp(2)
    },
    secondaryText: {
        color: '#264B79',
        fontFamily: Fonts.FigtreeMedium,
        fontSize: 14,
        textAlign: 'center',
        marginLeft: wp(0.5)
    },
})