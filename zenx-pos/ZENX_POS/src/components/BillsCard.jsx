import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import GraphIcon from '../assets/Icons/GraphIcon';
import DashboardBillIcon from '../assets/Icons/DashboardBillIcon';
import Fonts from '../constants/Fonts';
import { rS, rV, rMS } from '../constants/responsive';

export default function BillsCard() {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Today’s Bills</Text>
        <Text style={styles.value}>₹7,500</Text>
      </View>
      <View style={styles.iconBox}>
        <DashboardBillIcon />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    card: {
      flex:1, 
      backgroundColor: '#FFFFFF',
      borderRadius: rMS(8),
      paddingHorizontal:rS(8),
      paddingVertical:rV(8),
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginRight: rS(8), 
    },
  title: {
    fontSize: 16,
    color: '#264B79',
    fontFamily: Fonts.FigtreeMedium,
  },
 value: {
    fontSize: 22,
    // marginTop: hp(1),
    marginTop:rV(5),
    color: '#000000',
    fontFamily: Fonts.FigtreeMedium,
  },
  iconBox: {
    backgroundColor: '#EEF9FF',
    paddingHorizontal:rS(6),
    paddingVertical:rV(6),
    borderRadius: rMS(7),
  },
});