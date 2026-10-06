import { View, Text, StyleSheet } from 'react-native';
import React from 'react';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import GraphIcon from '../assets/Icons/GraphIcon';
import DashboardProfitIcon from '../assets/Icons/DashboardProfitIcon';
import Fonts from '../constants/Fonts';
import { rMS, rS, rV } from '../constants/responsive';

export default function ProfitCard() {
  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Today’s Profit</Text>
        <Text style={styles.value}>₹20,060</Text>
      </View>
      <View style={styles.iconBox}>
        <DashboardProfitIcon />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex:1, 
    backgroundColor: '#FFFFFF',
    borderRadius: rMS(8),
    // padding: 15,
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
    backgroundColor: '#EFFFE9',
    // padding: 12,
    paddingHorizontal:rS(6),
    paddingVertical:rV(6),
    borderRadius: rMS(7),
  },
});